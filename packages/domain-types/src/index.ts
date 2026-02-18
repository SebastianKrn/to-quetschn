import { z } from "zod";

export const TUNINGS = ["GCFB", "ADGC", "BEADG", "CFBB"] as const;
export type Tuning = (typeof TUNINGS)[number];

export const ConversionJobStatusSchema = z.enum([
  "queued",
  "processing",
  "needs_transpose_confirmation",
  "completed",
  "failed"
]);
export type ConversionJobStatus = z.infer<typeof ConversionJobStatusSchema>;

export const ConversionJobSchema = z.object({
  id: z.string().min(1),
  status: ConversionJobStatusSchema,
  inputFileId: z.string().min(1),
  tuning: z.enum(TUNINGS),
  progress: z.number().min(0).max(100),
  errorCode: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});
export type ConversionJob = z.infer<typeof ConversionJobSchema>;

export const CreateConversionRequestSchema = z.object({
  inputFileId: z.string().min(1).optional(),
  tuning: z.enum(TUNINGS).default("GCFB")
});
export type CreateConversionRequest = z.infer<typeof CreateConversionRequestSchema>;

export const ConfirmTransposeRequestSchema = z.object({
  semitones: z.number().int(),
  targetKey: z.string().min(1)
});
export type ConfirmTransposeRequest = z.infer<typeof ConfirmTransposeRequestSchema>;

export const OmrErrorCodeSchema = z.enum([
  "OMR_TIMEOUT",
  "OMR_UNAVAILABLE",
  "OMR_PARSE_FAILED",
  "OMR_INPUT_INVALID"
]);
export type OmrErrorCode = z.infer<typeof OmrErrorCodeSchema>;

export const OmrErrorSchema = z.object({
  code: OmrErrorCodeSchema,
  message: z.string().min(1),
  retryable: z.boolean(),
  details: z.record(z.string(), z.string()).optional()
});
export type OmrError = z.infer<typeof OmrErrorSchema>;

export const OmrNoteSchema = z.object({
  pitch: z.string().min(1),
  duration: z.string().min(1),
  measure: z.number().int().min(1),
  beat: z.number().min(0)
});
export type OmrNote = z.infer<typeof OmrNoteSchema>;

export const OmrScoreSchema = z.object({
  title: z.string().default("Untitled"),
  tempoBpm: z.number().int().positive().default(80),
  timeSignature: z.string().default("4/4"),
  notes: z.array(OmrNoteSchema)
});
export type OmrScore = z.infer<typeof OmrScoreSchema>;

export const GriffDirectionSchema = z.enum(["push", "pull"]);
export type GriffDirection = z.infer<typeof GriffDirectionSchema>;

export const GriffTokenSchema = z.object({
  id: z.string().min(1),
  pitch: z.string().min(1),
  row: z.number().int().min(1),
  button: z.number().int().min(1),
  direction: GriffDirectionSchema,
  measure: z.number().int().min(1),
  beat: z.number().min(0),
  duration: z.string().min(1)
});
export type GriffToken = z.infer<typeof GriffTokenSchema>;

export const MeasureSchema = z.object({
  index: z.number().int().min(1),
  tokens: z.array(GriffTokenSchema)
});
export type Measure = z.infer<typeof MeasureSchema>;

export const ArrangementSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  tuning: z.enum(TUNINGS),
  tempoBpm: z.number().int().positive(),
  measures: z.array(MeasureSchema),
  metadata: z.record(z.string(), z.string()).default({})
});
export type Arrangement = z.infer<typeof ArrangementSchema>;

export const UpdateArrangementTokenRequestSchema = z.object({
  tokenId: z.string().min(1),
  row: z.number().int().min(1),
  button: z.number().int().min(1),
  direction: GriffDirectionSchema
});
export type UpdateArrangementTokenRequest = z.infer<typeof UpdateArrangementTokenRequestSchema>;

export const TransposeSuggestionSchema = z.object({
  semitones: z.number().int(),
  targetKey: z.string().min(1),
  playabilityScore: z.number().min(0).max(1),
  estimatedBellowsChanges: z.number().int().min(0),
  reason: z.string().min(1)
});
export type TransposeSuggestion = z.infer<typeof TransposeSuggestionSchema>;

export const MappingOptionsSchema = z.object({
  optimizeBellows: z.boolean().default(true),
  maxConsecutiveDirection: z.number().int().min(1).default(8)
});
export type MappingOptions = z.infer<typeof MappingOptionsSchema>;

export const MappingResultSchema = z.object({
  arrangement: ArrangementSchema,
  warnings: z.array(z.string()),
  transposeSuggestions: z.array(TransposeSuggestionSchema)
});
export type MappingResult = z.infer<typeof MappingResultSchema>;

export const ConversionQueuePayloadSchema = z.object({
  conversionId: z.string().min(1),
  sourceFileId: z.string().min(1),
  sourceDownloadUrl: z.string().url().optional(),
  tuning: z.enum(TUNINGS),
  ownerUserId: z.string().min(1),
  correlationId: z.string().min(1),
  transposeSemitones: z.number().int().optional()
});
export type ConversionQueuePayload = z.infer<typeof ConversionQueuePayloadSchema>;

export const ExportJobStatusSchema = z.enum(["queued", "processing", "completed", "failed"]);
export type ExportJobStatus = z.infer<typeof ExportJobStatusSchema>;

export const ExportErrorCodeSchema = z.enum([
  "EXPORT_RENDER_FAILED",
  "EXPORT_STORAGE_FAILED",
  "EXPORT_ARRANGEMENT_NOT_FOUND",
  "EXPORT_UNKNOWN_ERROR"
]);
export type ExportErrorCode = z.infer<typeof ExportErrorCodeSchema>;

export const ExportJobSchema = z.object({
  id: z.string().min(1),
  arrangementId: z.string().min(1),
  status: ExportJobStatusSchema,
  format: z.literal("pdf"),
  artifactKey: z.string().min(1).nullable(),
  errorCode: ExportErrorCodeSchema.nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});
export type ExportJob = z.infer<typeof ExportJobSchema>;

export const ExportArrangementRequestSchema = z
  .object({
    force: z.boolean().optional()
  })
  .default({});
export type ExportArrangementRequest = z.infer<typeof ExportArrangementRequestSchema>;

export const ListArrangementExportsQuerySchema = z.object({
  limit: z.number().int().min(1).max(50).optional()
});
export type ListArrangementExportsQuery = z.infer<typeof ListArrangementExportsQuerySchema>;

export const ExportHistoryResponseSchema = z.object({
  exports: z.array(ExportJobSchema)
});
export type ExportHistoryResponse = z.infer<typeof ExportHistoryResponseSchema>;

export const ExportQueuePayloadSchema = z.object({
  exportId: z.string().min(1),
  arrangementId: z.string().min(1),
  ownerUserId: z.string().min(1),
  correlationId: z.string().min(1)
});
export type ExportQueuePayload = z.infer<typeof ExportQueuePayloadSchema>;

export interface OmrProvider {
  extractScore(input: {
    sourceFilePath: string;
    correlationId?: string;
  }): Promise<OmrScore>;
}

export interface MappingEngine {
  mapScoreToGriffschrift(
    score: OmrScore,
    tuning: Tuning,
    options?: MappingOptions
  ): Promise<MappingResult>;
}

export const QueueTopics = {
  ConversionRequested: "conversion.requested",
  ConversionCompleted: "conversion.completed",
  ConversionFailed: "conversion.failed",
  ExportRequested: "export.requested",
  ExportCompleted: "export.completed",
  ExportFailed: "export.failed"
} as const;

export type QueueTopic = (typeof QueueTopics)[keyof typeof QueueTopics];

export interface StorageClient {
  putObject(input: {
    key: string;
    body: Buffer;
    contentType: string;
  }): Promise<{ key: string }>;
  getSignedUrl(input: {
    key: string;
    expiresInSeconds: number;
  }): Promise<{ url: string }>;
  deleteObject(input: { key: string }): Promise<void>;
}

export const ApiContracts = {
  createConversion: { method: "POST", path: "/api/conversions" },
  getConversion: { method: "GET", path: "/api/conversions/:id" },
  confirmTranspose: {
    method: "POST",
    path: "/api/conversions/:id/confirm-transpose"
  },
  getArrangement: { method: "GET", path: "/api/arrangements/:id" },
  updateArrangement: { method: "PATCH", path: "/api/arrangements/:id" },
  exportArrangement: { method: "POST", path: "/api/arrangements/:id/export" },
  getArrangementExport: { method: "GET", path: "/api/arrangements/:id/export" },
  listArrangementExports: { method: "GET", path: "/api/arrangements/:id/exports" }
} as const;
