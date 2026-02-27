import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

async function getAuthorizedConversion(
  ctx: any,
  input: { id: string; ownerUserId?: string }
) {
  const existing = await ctx.db
    .query("conversions")
    .withIndex("by_conversion_id", (q) => q.eq("conversionId", input.id))
    .unique();

  if (!existing) {
    return null;
  }

  if (!input.ownerUserId) {
    return existing;
  }

  if (existing.ownerUserId && existing.ownerUserId !== input.ownerUserId) {
    return null;
  }

  if (!existing.ownerUserId) {
    await ctx.db.patch(existing._id, {
      ownerUserId: input.ownerUserId
    });

    return await ctx.db.get(existing._id);
  }

  return existing;
}

export const createConversion = mutation({
  args: {
    id: v.string(),
    inputFileId: v.string(),
    tuning: v.union(v.literal("GCFB"), v.literal("ADGC"), v.literal("BEADG"), v.literal("CFBB")),
    ownerUserId: v.string(),
    rightsConfirmedAt: v.optional(v.union(v.string(), v.null())),
    rightsConfirmationSource: v.optional(
      v.union(v.literal("upload_form"), v.literal("api_json"), v.null())
    )
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const existing = await ctx.db
      .query("conversions")
      .withIndex("by_conversion_id", (q) => q.eq("conversionId", args.id))
      .unique();

    if (existing?.ownerUserId && existing.ownerUserId !== args.ownerUserId) {
      throw new Error("Conversion id already belongs to another user");
    }

    const doc = {
      ownerUserId: existing?.ownerUserId ?? args.ownerUserId,
      conversionId: args.id,
      status: "queued" as const,
      inputFileId: args.inputFileId,
      tuning: args.tuning,
      progress: 0,
      errorCode: null,
      rightsConfirmedAt: args.rightsConfirmedAt ?? existing?.rightsConfirmedAt ?? null,
      rightsConfirmationSource:
        args.rightsConfirmationSource ?? existing?.rightsConfirmationSource ?? null,
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
      rightsConfirmedAt: doc.rightsConfirmedAt,
      rightsConfirmationSource: doc.rightsConfirmationSource,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt
    };
  }
});

export const getConversion = query({
  args: {
    id: v.string(),
    ownerUserId: v.string()
  },
  handler: async (ctx, args) => {
    const existing = await getAuthorizedConversion(ctx, {
      id: args.id,
      ownerUserId: args.ownerUserId
    });

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
        rightsConfirmedAt: existing.rightsConfirmedAt ?? null,
        rightsConfirmationSource: existing.rightsConfirmationSource ?? null,
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
    ownerUserId: v.optional(v.string()),
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
    const existing = await getAuthorizedConversion(ctx, {
      id: args.id,
      ownerUserId: args.ownerUserId
    });

    if (!existing) {
      return null;
    }

    await ctx.db.patch(existing._id, {
      ownerUserId: existing.ownerUserId ?? args.ownerUserId,
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
        rightsConfirmedAt: updated.rightsConfirmedAt ?? null,
        rightsConfirmationSource: updated.rightsConfirmationSource ?? null,
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
    targetKey: v.string(),
    ownerUserId: v.string()
  },
  handler: async (ctx, args) => {
    const existing = await getAuthorizedConversion(ctx, {
      id: args.id,
      ownerUserId: args.ownerUserId
    });

    if (!existing) {
      return null;
    }

    await ctx.db.patch(existing._id, {
      ownerUserId: existing.ownerUserId ?? args.ownerUserId,
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
        rightsConfirmedAt: updated.rightsConfirmedAt ?? null,
        rightsConfirmationSource: updated.rightsConfirmationSource ?? null,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt
      },
      transposeSuggestions: updated.transposeSuggestions ?? [],
      confirmedTranspose: updated.confirmedTranspose ?? null
    };
  }
});

export const getConversionSource = query({
  args: {
    id: v.string(),
    ownerUserId: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const existing = await getAuthorizedConversion(ctx, {
      id: args.id,
      ownerUserId: args.ownerUserId
    });

    if (!existing) {
      return null;
    }

    return {
      inputFileId: existing.inputFileId,
      tuning: existing.tuning
    };
  }
});
