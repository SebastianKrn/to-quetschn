import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const createConversion = mutation({
  args: {
    id: v.string(),
    inputFileId: v.string(),
    tuning: v.union(v.literal("GCFB"), v.literal("ADGC"), v.literal("BEADG"), v.literal("CFBB"))
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const existing = await ctx.db
      .query("conversions")
      .withIndex("by_conversion_id", (q) => q.eq("conversionId", args.id))
      .unique();

    const doc = {
      conversionId: args.id,
      status: "queued" as const,
      inputFileId: args.inputFileId,
      tuning: args.tuning,
      progress: 0,
      errorCode: null,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      transposeSuggestions: existing?.transposeSuggestions ?? [],
      confirmedTranspose: existing?.confirmedTranspose ?? null
    };

    if (!existing) {
      await ctx.db.insert("conversions", doc);
    } else {
      await ctx.db.patch(existing._id, doc);
    }

    return {
      id: doc.conversionId,
      status: doc.status,
      inputFileId: doc.inputFileId,
      tuning: doc.tuning,
      progress: doc.progress,
      errorCode: doc.errorCode,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt
    };
  }
});

export const getConversion = query({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("conversions")
      .withIndex("by_conversion_id", (q) => q.eq("conversionId", args.id))
      .unique();

    if (!existing) {
      return null;
    }

    return {
      job: {
        id: existing.conversionId,
        status: existing.status,
        inputFileId: existing.inputFileId,
        tuning: existing.tuning,
        progress: existing.progress,
        errorCode: existing.errorCode,
        createdAt: existing.createdAt,
        updatedAt: existing.updatedAt
      },
      transposeSuggestions: existing.transposeSuggestions ?? [],
      confirmedTranspose: existing.confirmedTranspose ?? null
    };
  }
});

export const updateConversion = mutation({
  args: {
    id: v.string(),
    status: v.union(
      v.literal("queued"),
      v.literal("processing"),
      v.literal("needs_transpose_confirmation"),
      v.literal("completed"),
      v.literal("failed")
    ),
    progress: v.number(),
    errorCode: v.optional(v.union(v.string(), v.null())),
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
    )
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("conversions")
      .withIndex("by_conversion_id", (q) => q.eq("conversionId", args.id))
      .unique();

    if (!existing) {
      return null;
    }

    await ctx.db.patch(existing._id, {
      status: args.status,
      progress: args.progress,
      errorCode: args.errorCode ?? existing.errorCode,
      transposeSuggestions: args.transposeSuggestions ?? existing.transposeSuggestions,
      updatedAt: new Date().toISOString()
    });

    const updated = await ctx.db.get(existing._id);
    if (!updated) {
      return null;
    }

    return {
      job: {
        id: updated.conversionId,
        status: updated.status,
        inputFileId: updated.inputFileId,
        tuning: updated.tuning,
        progress: updated.progress,
        errorCode: updated.errorCode,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt
      },
      transposeSuggestions: updated.transposeSuggestions ?? [],
      confirmedTranspose: updated.confirmedTranspose ?? null
    };
  }
});

export const confirmTranspose = mutation({
  args: {
    id: v.string(),
    semitones: v.number(),
    targetKey: v.string()
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("conversions")
      .withIndex("by_conversion_id", (q) => q.eq("conversionId", args.id))
      .unique();

    if (!existing) {
      return null;
    }

    await ctx.db.patch(existing._id, {
      status: "queued",
      progress: 0,
      errorCode: null,
      confirmedTranspose: {
        semitones: args.semitones,
        targetKey: args.targetKey
      },
      updatedAt: new Date().toISOString()
    });

    const updated = await ctx.db.get(existing._id);
    if (!updated) {
      return null;
    }

    return {
      job: {
        id: updated.conversionId,
        status: updated.status,
        inputFileId: updated.inputFileId,
        tuning: updated.tuning,
        progress: updated.progress,
        errorCode: updated.errorCode,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt
      },
      transposeSuggestions: updated.transposeSuggestions ?? [],
      confirmedTranspose: updated.confirmedTranspose ?? null
    };
  }
});

export const getConversionSource = query({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("conversions")
      .withIndex("by_conversion_id", (q) => q.eq("conversionId", args.id))
      .unique();

    if (!existing) {
      return null;
    }

    return {
      inputFileId: existing.inputFileId,
      tuning: existing.tuning
    };
  }
});
