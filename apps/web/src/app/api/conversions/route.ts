import { randomUUID } from "node:crypto";
import {
  ConversionJobSchema,
  CreateConversionRequestSchema,
  TUNINGS,
  type Tuning
} from "@grifftab/domain-types";
import { requireSession, UnauthorizedError, type SessionLike } from "@/lib/auth";
import { getDomainStore } from "@/lib/convex";
import { getQueueClient } from "@/lib/queue";
import { createConversionObjectKey, getStorageClient } from "@/lib/storage";
import { jsonError, jsonOk } from "@/lib/http";

async function parseInput(
  request: Request
): Promise<{ inputFileId?: string; file?: File; tuning: Tuning }> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const file = formData.get("file");
    const tuningRaw = String(formData.get("tuning") ?? "GCFB");
    const inputFileIdRaw = String(formData.get("inputFileId") ?? "");

    if (!TUNINGS.includes(tuningRaw as Tuning)) {
      throw new Error("Unsupported tuning");
    }

    if (file && file instanceof File) {
      return {
        file,
        tuning: tuningRaw as Tuning,
        inputFileId: inputFileIdRaw || undefined
      };
    }

    if (inputFileIdRaw) {
      return {
        inputFileId: inputFileIdRaw,
        tuning: tuningRaw as Tuning
      };
    }

    throw new Error("multipart/form-data requires file or inputFileId");
  }

  const bodyRaw = (await request.json().catch(() => ({}))) as unknown;
  const body = CreateConversionRequestSchema.parse(bodyRaw);

  return {
    inputFileId: body.inputFileId,
    tuning: body.tuning
  };
}

export async function POST(request: Request) {
  let session: SessionLike;
  try {
    session = await requireSession(request);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return jsonError(401, error.message);
    }

    return jsonError(401, "Not authenticated");
  }

  let parsed: { inputFileId?: string; file?: File; tuning: Tuning };
  try {
    parsed = await parseInput(request);
  } catch (error) {
    return jsonError(400, "Invalid conversion request", {
      error: error instanceof Error ? error.message : "unknown"
    });
  }

  const id = `conversion-${Date.now()}-${randomUUID()}`;
  const correlationId = randomUUID();
  let sourceDownloadUrl: string | undefined;

  let inputFileId = parsed.inputFileId;
  if (!inputFileId && parsed.file) {
    const extension = parsed.file.name.toLowerCase().endsWith(".pdf") ? "pdf" : "bin";
    const objectKey = createConversionObjectKey({ conversionId: id, extension });

    await getStorageClient().putObject({
      key: objectKey,
      body: Buffer.from(await parsed.file.arrayBuffer()),
      contentType: parsed.file.type || "application/pdf"
    });

    inputFileId = objectKey;
    sourceDownloadUrl = (await getStorageClient().getSignedUrl({
      key: objectKey,
      expiresInSeconds: 15 * 60
    })).url;
  }

  if (!inputFileId) {
    return jsonError(400, "inputFileId or file is required");
  }

  const created = await getDomainStore().createConversion({
    id,
    inputFileId,
    tuning: parsed.tuning,
    ownerUserId: session.user.id
  });

  const queueResult = await getQueueClient().enqueueConversion({
    conversionId: created.id,
    sourceFileId: created.inputFileId,
    sourceDownloadUrl,
    tuning: created.tuning,
    ownerUserId: session.user.id,
    correlationId
  });

  return jsonOk({
    ok: true,
    job: ConversionJobSchema.parse(created),
    queueJobId: queueResult.id
  });
}
