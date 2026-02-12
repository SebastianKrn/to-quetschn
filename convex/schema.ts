import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  conversions: defineTable({
    ownerUserId: v.optional(v.string()),
    conversionId: v.string(),
    status: v.union(
      v.literal("queued"),
      v.literal("processing"),
      v.literal("needs_transpose_confirmation"),
      v.literal("completed"),
      v.literal("failed")
    ),
    inputFileId: v.string(),
    tuning: v.union(v.literal("GCFB"), v.literal("ADGC"), v.literal("BEADG"), v.literal("CFBB")),
    progress: v.number(),
    errorCode: v.union(v.string(), v.null()),
    createdAt: v.string(),
    updatedAt: v.string(),
    transposeSuggestions: v.optional(
      v.array(
        v.object({
          semitones: v.number(),
          targetKey: v.string(),
          playabilityScore: v.number(),
          estimatedBellowsChanges: v.number(),
          reason: v.string()
        })
      )
    ),
    confirmedTranspose: v.optional(
      v.union(
        v.null(),
        v.object({
          semitones: v.number(),
          targetKey: v.string()
        })
      )
    )
  }).index("by_conversion_id", ["conversionId"]),
  arrangements: defineTable({
    ownerUserId: v.optional(v.string()),
    arrangementId: v.string(),
    payload: v.any(),
    updatedAt: v.string()
  }).index("by_arrangement_id", ["arrangementId"]),
  exports: defineTable({
    ownerUserId: v.optional(v.string()),
    exportId: v.string(),
    arrangementId: v.string(),
    status: v.union(
      v.literal("queued"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed")
    ),
    format: v.literal("pdf"),
    artifactKey: v.union(v.string(), v.null()),
    errorCode: v.union(
      v.literal("EXPORT_RENDER_FAILED"),
      v.literal("EXPORT_STORAGE_FAILED"),
      v.literal("EXPORT_ARRANGEMENT_NOT_FOUND"),
      v.literal("EXPORT_UNKNOWN_ERROR"),
      v.null()
    ),
    correlationId: v.string(),
    createdAt: v.string(),
    updatedAt: v.string()
  })
    .index("by_export_id", ["exportId"])
    .index("by_arrangement_id", ["arrangementId"]),
  exportHistory: defineTable({
    ownerUserId: v.optional(v.string()),
    exportId: v.string(),
    arrangementId: v.string(),
    status: v.union(
      v.literal("queued"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed")
    ),
    format: v.literal("pdf"),
    artifactKey: v.union(v.string(), v.null()),
    errorCode: v.union(
      v.literal("EXPORT_RENDER_FAILED"),
      v.literal("EXPORT_STORAGE_FAILED"),
      v.literal("EXPORT_ARRANGEMENT_NOT_FOUND"),
      v.literal("EXPORT_UNKNOWN_ERROR"),
      v.null()
    ),
    correlationId: v.string(),
    createdAt: v.string(),
    updatedAt: v.string()
  })
    .index("by_export_id", ["exportId"])
    .index("by_arrangement_id", ["arrangementId"])
});
