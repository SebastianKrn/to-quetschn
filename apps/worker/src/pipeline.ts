import {
  OmrErrorSchema,
  type Arrangement,
  type ConversionQueuePayload,
  type MappingEngine,
  type OmrScore,
  type Tuning,
  type TransposeSuggestion
} from "@grifftab/domain-types";

export interface DomainClient {
  updateConversion(input: {
    id: string;
    status: "processing" | "needs_transpose_confirmation" | "completed" | "failed" | "queued";
    progress: number;
    errorCode?: string | null;
    transposeSuggestions?: TransposeSuggestion[];
  }): Promise<void>;
  upsertArrangement(arrangement: Arrangement): Promise<void>;
}

export interface OmrClient {
  extractScore(input: {
    sourceFilePath: string;
    correlationId: string;
  }): Promise<OmrScore>;
}

export async function runConversionPipeline(input: {
  payload: ConversionQueuePayload;
  mappingEngine: MappingEngine;
  domainClient: DomainClient;
  omrClient: OmrClient;
}): Promise<{ status: "completed" | "needs_transpose_confirmation" }> {
  const { payload, mappingEngine, domainClient, omrClient } = input;

  await domainClient.updateConversion({
    id: payload.conversionId,
    status: "processing",
    progress: 10,
    errorCode: null
  });

  const score = await omrClient.extractScore({
    sourceFilePath: payload.sourceDownloadUrl ?? payload.sourceFileId,
    correlationId: payload.correlationId
  });

  await domainClient.updateConversion({
    id: payload.conversionId,
    status: "processing",
    progress: 55,
    errorCode: null
  });

  const mapped = await mappingEngine.mapScoreToGriffschrift(score, payload.tuning as Tuning);

  if (mapped.transposeSuggestions.length > 0) {
    await domainClient.updateConversion({
      id: payload.conversionId,
      status: "needs_transpose_confirmation",
      progress: 100,
      errorCode: null,
      transposeSuggestions: mapped.transposeSuggestions
    });

    return { status: "needs_transpose_confirmation" };
  }

  await domainClient.upsertArrangement({
    ...mapped.arrangement,
    id: payload.conversionId,
    metadata: {
      ...mapped.arrangement.metadata,
      conversionId: payload.conversionId,
      correlationId: payload.correlationId
    }
  });

  await domainClient.updateConversion({
    id: payload.conversionId,
    status: "completed",
    progress: 100,
    errorCode: null
  });

  return { status: "completed" };
}

export function getErrorCode(error: unknown): string {
  const parsed = OmrErrorSchema.safeParse(error);
  if (parsed.success) {
    return parsed.data.code;
  }

  if (error instanceof Error && typeof error.message === "string") {
    return error.message.includes("OMR_") ? error.message : "UNKNOWN_ERROR";
  }

  return "UNKNOWN_ERROR";
}

export function isRetryableOmrError(error: unknown): boolean {
  const parsed = OmrErrorSchema.safeParse(error);
  if (parsed.success) {
    return parsed.data.retryable;
  }

  return false;
}
