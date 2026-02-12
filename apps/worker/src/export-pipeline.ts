import {
  ExportErrorCodeSchema,
  type Arrangement,
  type ExportErrorCode,
  type ExportQueuePayload
} from "@grifftab/domain-types";
import { PdfArrangementRenderer } from "@grifftab/renderer-pdf";
import type { WorkerStorageClient } from "./storage.js";

export interface ExportDomainClient {
  getArrangement(input: { arrangementId: string; ownerUserId: string }): Promise<Arrangement | null>;
  markExportProcessing(input: { exportId: string }): Promise<void>;
  markExportCompleted(input: { exportId: string; artifactKey: string }): Promise<void>;
  markExportFailed(input: { exportId: string; errorCode: ExportErrorCode }): Promise<void>;
}

class ExportPipelineError extends Error {
  constructor(
    readonly code: ExportErrorCode,
    message: string,
    options?: {
      cause?: unknown;
    }
  ) {
    super(message, options);
    this.name = "ExportPipelineError";
  }
}

function buildArtifactKey(input: {
  arrangementId: string;
  exportId: string;
}): string {
  return `exports/${input.arrangementId}/${input.exportId}.pdf`;
}

export async function runExportPipeline(input: {
  payload: ExportQueuePayload;
  domainClient: ExportDomainClient;
  storageClient: WorkerStorageClient;
  renderer: PdfArrangementRenderer;
}): Promise<{ status: "completed"; artifactKey: string }> {
  const { payload, domainClient, storageClient, renderer } = input;

  await domainClient.markExportProcessing({
    exportId: payload.exportId
  });

  const arrangement = await domainClient.getArrangement({
    arrangementId: payload.arrangementId,
    ownerUserId: payload.ownerUserId
  });

  if (!arrangement) {
    throw new ExportPipelineError(
      "EXPORT_ARRANGEMENT_NOT_FOUND",
      `Arrangement ${payload.arrangementId} not found for export ${payload.exportId}`
    );
  }

  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await renderer.render(arrangement);
  } catch (error) {
    throw new ExportPipelineError("EXPORT_RENDER_FAILED", "PDF rendering failed", { cause: error });
  }

  const artifactKey = buildArtifactKey({
    arrangementId: arrangement.id,
    exportId: payload.exportId
  });

  try {
    await storageClient.putObject({
      key: artifactKey,
      body: pdfBuffer,
      contentType: "application/pdf"
    });
  } catch (error) {
    throw new ExportPipelineError("EXPORT_STORAGE_FAILED", "Storing export PDF failed", {
      cause: error
    });
  }

  await domainClient.markExportCompleted({
    exportId: payload.exportId,
    artifactKey
  });

  return {
    status: "completed",
    artifactKey
  };
}

export function getExportErrorCode(error: unknown): ExportErrorCode {
  if (error instanceof ExportPipelineError) {
    return error.code;
  }

  if (error instanceof Error) {
    const parsed = ExportErrorCodeSchema.safeParse(error.message);
    if (parsed.success) {
      return parsed.data;
    }
  }

  return "EXPORT_UNKNOWN_ERROR";
}

export async function runExportPipelineWithFailureHandling(input: {
  payload: ExportQueuePayload;
  domainClient: ExportDomainClient;
  storageClient: WorkerStorageClient;
  renderer: PdfArrangementRenderer;
}): Promise<{ status: "completed"; artifactKey: string }> {
  try {
    return await runExportPipeline(input);
  } catch (error) {
    await input.domainClient.markExportFailed({
      exportId: input.payload.exportId,
      errorCode: getExportErrorCode(error)
    });
    throw error;
  }
}
