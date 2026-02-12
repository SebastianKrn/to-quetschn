import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const exportErrorCode = v.union(
  v.literal("EXPORT_RENDER_FAILED"),
  v.literal("EXPORT_STORAGE_FAILED"),
  v.literal("EXPORT_ARRANGEMENT_NOT_FOUND"),
  v.literal("EXPORT_UNKNOWN_ERROR")
);

const exportJobValidator = v.object({
  id: v.string(),
  arrangementId: v.string(),
  status: v.union(
    v.literal("queued"),
    v.literal("processing"),
    v.literal("completed"),
    v.literal("failed")
  ),
  format: v.literal("pdf"),
  artifactKey: v.union(v.string(), v.null()),
  errorCode: v.union(exportErrorCode, v.null()),
  createdAt: v.string(),
  updatedAt: v.string()
});

function toExportJob(doc: {
  exportId: string;
  arrangementId: string;
  status: "queued" | "processing" | "completed" | "failed";
  format: "pdf";
  artifactKey: string | null;
  errorCode:
    | "EXPORT_RENDER_FAILED"
    | "EXPORT_STORAGE_FAILED"
    | "EXPORT_ARRANGEMENT_NOT_FOUND"
    | "EXPORT_UNKNOWN_ERROR"
    | null;
  createdAt: string;
  updatedAt: string;
}) {
  return {
    id: doc.exportId,
    arrangementId: doc.arrangementId,
    status: doc.status,
    format: doc.format,
    artifactKey: doc.artifactKey,
    errorCode: doc.errorCode,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt
  };
}

function generateExportId(): string {
  const entropy = Math.random().toString(36).slice(2, 10);
  return `export-${Date.now()}-${entropy}`;
}

export const requestLatestExport = mutation({
  args: {
    arrangementId: v.string(),
    correlationId: v.string(),
    ownerUserId: v.string()
  },
  returns: v.object({
    job: exportJobValidator,
    shouldEnqueue: v.boolean()
  }),
  handler: async (ctx, args) => {
    let existing = await ctx.db
      .query("exports")
      .withIndex("by_arrangement_id", (q) => q.eq("arrangementId", args.arrangementId))
      .unique();

    if (existing?.ownerUserId && existing.ownerUserId !== args.ownerUserId) {
      throw new Error("Export state for this arrangement belongs to another user");
    }

    if (existing && !existing.ownerUserId) {
      await ctx.db.patch(existing._id, {
        ownerUserId: args.ownerUserId
      });
      existing = await ctx.db.get(existing._id);
    }

    if (existing) {
      const reusable =
        existing.status === "queued" ||
        existing.status === "processing" ||
        (existing.status === "completed" && existing.artifactKey !== null);

      if (reusable) {
        return {
          job: toExportJob(existing),
          shouldEnqueue: false
        };
      }
    }

    const now = new Date().toISOString();
    const payload = {
      ownerUserId: existing?.ownerUserId ?? args.ownerUserId,
      exportId: existing?.exportId ?? generateExportId(),
      arrangementId: args.arrangementId,
      status: "queued" as const,
      format: "pdf" as const,
      artifactKey: null,
      errorCode: null,
      correlationId: args.correlationId,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now
    };

    if (!existing) {
      await ctx.db.insert("exports", payload);
    } else {
      await ctx.db.patch(existing._id, payload);
    }

    return {
      job: toExportJob(payload),
      shouldEnqueue: true
    };
  }
});

export const getLatestExportByArrangement = query({
  args: {
    arrangementId: v.string(),
    ownerUserId: v.string()
  },
  returns: v.union(exportJobValidator, v.null()),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("exports")
      .withIndex("by_arrangement_id", (q) => q.eq("arrangementId", args.arrangementId))
      .unique();

    if (!existing) {
      return null;
    }

    if (existing.ownerUserId && existing.ownerUserId !== args.ownerUserId) {
      return null;
    }

    if (!existing.ownerUserId) {
      await ctx.db.patch(existing._id, {
        ownerUserId: args.ownerUserId
      });
      const claimed = await ctx.db.get(existing._id);
      return claimed ? toExportJob(claimed) : null;
    }

    return toExportJob(existing);
  }
});

export const markExportProcessing = mutation({
  args: {
    exportId: v.string()
  },
  returns: v.union(exportJobValidator, v.null()),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("exports")
      .withIndex("by_export_id", (q) => q.eq("exportId", args.exportId))
      .unique();

    if (!existing) {
      return null;
    }

    await ctx.db.patch(existing._id, {
      status: "processing",
      errorCode: null,
      updatedAt: new Date().toISOString()
    });

    const updated = await ctx.db.get(existing._id);
    return updated ? toExportJob(updated) : null;
  }
});

export const markExportCompleted = mutation({
  args: {
    exportId: v.string(),
    artifactKey: v.string()
  },
  returns: v.union(exportJobValidator, v.null()),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("exports")
      .withIndex("by_export_id", (q) => q.eq("exportId", args.exportId))
      .unique();

    if (!existing) {
      return null;
    }

    await ctx.db.patch(existing._id, {
      status: "completed",
      artifactKey: args.artifactKey,
      errorCode: null,
      updatedAt: new Date().toISOString()
    });

    const updated = await ctx.db.get(existing._id);
    return updated ? toExportJob(updated) : null;
  }
});

export const markExportFailed = mutation({
  args: {
    exportId: v.string(),
    errorCode: exportErrorCode
  },
  returns: v.union(exportJobValidator, v.null()),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("exports")
      .withIndex("by_export_id", (q) => q.eq("exportId", args.exportId))
      .unique();

    if (!existing) {
      return null;
    }

    await ctx.db.patch(existing._id, {
      status: "failed",
      artifactKey: null,
      errorCode: args.errorCode,
      updatedAt: new Date().toISOString()
    });

    const updated = await ctx.db.get(existing._id);
    return updated ? toExportJob(updated) : null;
  }
});
