import { randomUUID } from "node:crypto";
import {
  ConversionJobSchema,
  CreateConversionRequestSchema,
  TUNINGS,
  type Tuning
} from "@grifftab/domain-types";
import { requireSession, UnauthorizedError, type SessionLike } from "@/lib/auth";
import { getDomainStore } from "@/lib/convex";
import { getWebEnv } from "@/lib/env";
import { getQueueClient } from "@/lib/queue";
import { createConversionObjectKey, getStorageClient } from "@/lib/storage";
import { jsonError, jsonOk } from "@/lib/http";

async function parseInput(
  request: Request
): Promise<{
  inputFileId?: string;
  file?: File;
  tuning: Tuning;
  rightsConfirmed: boolean;
  rightsConfirmationSource: "upload_form" | "api_json";
}> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const file = formData.get("file");
    const tuningRaw = String(formData.get("tuning") ?? "GCFB");
    const inputFileIdRaw = String(formData.get("inputFileId") ?? "");
    const rightsConfirmedRaw = String(formData.get("rightsConfirmed") ?? "").trim().toLowerCase();
    const rightsConfirmed =
      rightsConfirmedRaw === "true" ||
      rightsConfirmedRaw === "1" ||
      rightsConfirmedRaw === "on" ||
      rightsConfirmedRaw === "yes";

    if (!TUNINGS.includes(tuningRaw as Tuning)) {
      throw new Error("Unsupported tuning");
    }

    if (file && file instanceof File) {
      return {
        file,
        tuning: tuningRaw as Tuning,
        inputFileId: inputFileIdRaw || undefined,
        rightsConfirmed,
        rightsConfirmationSource: "upload_form"
      };
    }

    if (inputFileIdRaw) {
      return {
        inputFileId: inputFileIdRaw,
        tuning: tuningRaw as Tuning,
        rightsConfirmed,
        rightsConfirmationSource: "upload_form"
      };
    }

    throw new Error("multipart/form-data requires file or inputFileId");
  }

  const bodyRaw = (await request.json().catch(() => ({}))) as unknown;
  const body = CreateConversionRequestSchema.parse(bodyRaw);

  return {
    inputFileId: body.inputFileId,
    tuning: body.tuning,
    rightsConfirmed: body.rightsConfirmed ?? false,
    rightsConfirmationSource: "api_json"
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

  let parsed: {
    inputFileId?: string;
    file?: File;
    tuning: Tuning;
    rightsConfirmed: boolean;
    rightsConfirmationSource: "upload_form" | "api_json";
  };
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
    try {
      const storageClient = getStorageClient();
      await storageClient.putObject({
        key: objectKey,
        body: Buffer.from(await parsed.file.arrayBuffer()),
        contentType: parsed.file.type || "application/pdf"
      });

      inputFileId = objectKey;
      sourceDownloadUrl = (await storageClient.getSignedUrl({
        key: objectKey,
        expiresInSeconds: 15 * 60
      })).url;
    } catch (error) {
      return jsonError(503, "Datei konnte nicht im Objektspeicher abgelegt werden.", {
        error: error instanceof Error ? error.message : "unknown"
      });
    }
  }

  if (!inputFileId) {
    return jsonError(400, "inputFileId or file is required");
  }

  const env = getWebEnv();
  if (env.ENFORCE_UPLOAD_RIGHTS_CONFIRMATION === "true" && !parsed.rightsConfirmed) {
    return jsonError(400, "Bitte Upload-Rechte bestätigen, bevor die Konvertierung gestartet wird.");
  }

  const created = await getDomainStore().createConversion({
    id,
    inputFileId,
    tuning: parsed.tuning,
    ownerUserId: session.user.id,
    rightsConfirmedAt: parsed.rightsConfirmed ? new Date().toISOString() : null,
    rightsConfirmationSource: parsed.rightsConfirmed ? parsed.rightsConfirmationSource : null
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
