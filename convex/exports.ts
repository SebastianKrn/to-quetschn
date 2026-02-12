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
    ownerUserId: v.string(),
    force: v.optional(v.boolean())
  },
  returns: v.object({
    job: exportJobValidator,
    shouldEnqueue: v.boolean()
  }),
  handler: async (ctx, args) => {
    const force = args.force ?? false;
    let latest = await ctx.db
      .query("exports")
      .withIndex("by_arrangement_id", (q) => q.eq("arrangementId", args.arrangementId))
      .unique();

    if (latest?.ownerUserId && latest.ownerUserId !== args.ownerUserId) {
      throw new Error("Export state for this arrangement belongs to another user");
    }

    if (latest && !latest.ownerUserId) {
      await ctx.db.patch(latest._id, {
        ownerUserId: args.ownerUserId
      });
      latest = await ctx.db.get(latest._id);
    }

    if (latest && !force) {
      const reusable =
        latest.status === "queued" ||
        latest.status === "processing" ||
        (latest.status === "completed" && latest.artifactKey !== null);

      if (reusable) {
        return {
          job: toExportJob(latest),
          shouldEnqueue: false
        };
      }
    }

    const now = new Date().toISOString();
    const exportId = generateExportId();
    const payload = {
      ownerUserId: latest?.ownerUserId ?? args.ownerUserId,
      exportId,
      arrangementId: args.arrangementId,
      status: "queued" as const,
      format: "pdf" as const,
      artifactKey: null,
      errorCode: null,
      correlationId: args.correlationId,
      createdAt: now,
      updatedAt: now
    };

    if (!latest) {
      await ctx.db.insert("exports", payload);
    } else {
      await ctx.db.patch(latest._id, payload);
    }

    await ctx.db.insert("exportHistory", payload);

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
    const latest = await ctx.db
      .query("exports")
      .withIndex("by_arrangement_id", (q) => q.eq("arrangementId", args.arrangementId))
      .unique();

    if (!latest) {
      return null;
    }

    if (latest.ownerUserId && latest.ownerUserId !== args.ownerUserId) {
      return null;
    }

    return toExportJob(latest);
  }
});

export const listExportsByArrangement = query({
  args: {
    arrangementId: v.string(),
    ownerUserId: v.string(),
    limit: v.optional(v.number())
  },
  returns: v.array(exportJobValidator),
  handler: async (ctx, args) => {
    const limit = Math.max(1, Math.min(args.limit ?? 20, 50));

    const history = await ctx.db
      .query("exportHistory")
      .withIndex("by_arrangement_id", (q) => q.eq("arrangementId", args.arrangementId))
      .order("desc")
      .take(limit);

    return history
      .filter((entry) => !entry.ownerUserId || entry.ownerUserId === args.ownerUserId)
      .map((entry) => toExportJob(entry));
  }
});

async function patchLatestByExportId(
  ctx: any,
  input: {
    exportId: string;
    patch: {
      status: "processing" | "completed" | "failed";
      artifactKey?: string | null;
      errorCode?:
        | "EXPORT_RENDER_FAILED"
        | "EXPORT_STORAGE_FAILED"
        | "EXPORT_ARRANGEMENT_NOT_FOUND"
        | "EXPORT_UNKNOWN_ERROR"
        | null;
      updatedAt: string;
    };
  }
): Promise<ReturnType<typeof toExportJob> | null> {
  const latest = await ctx.db
    .query("exports")
    .withIndex("by_export_id", (q) => q.eq("exportId", input.exportId))
    .unique();

  const history = await ctx.db
    .query("exportHistory")
    .withIndex("by_export_id", (q) => q.eq("exportId", input.exportId))
    .unique();

  if (!latest && !history) {
    return null;
  }

  let updatedLatest = null;
  let updatedHistory = null;

  if (latest) {
    await ctx.db.patch(latest._id, input.patch);
    updatedLatest = await ctx.db.get(latest._id);
  }

  if (history) {
    await ctx.db.patch(history._id, input.patch);
    updatedHistory = await ctx.db.get(history._id);
  }

  if (updatedLatest) {
    return toExportJob(updatedLatest);
  }

  return updatedHistory ? toExportJob(updatedHistory) : null;
}

export const markExportProcessing = mutation({
  args: {
    exportId: v.string()
  },
  returns: v.union(exportJobValidator, v.null()),
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    return patchLatestByExportId(ctx, {
      exportId: args.exportId,
      patch: {
        status: "processing",
        errorCode: null,
        updatedAt: now
      }
    });
  }
});

export const markExportCompleted = mutation({
  args: {
    exportId: v.string(),
    artifactKey: v.string()
  },
  returns: v.union(exportJobValidator, v.null()),
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    return patchLatestByExportId(ctx, {
      exportId: args.exportId,
      patch: {
        status: "completed",
        artifactKey: args.artifactKey,
        errorCode: null,
        updatedAt: now
      }
    });
  }
});

export const markExportFailed = mutation({
  args: {
    exportId: v.string(),
    errorCode: exportErrorCode
  },
  returns: v.union(exportJobValidator, v.null()),
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    return patchLatestByExportId(ctx, {
      exportId: args.exportId,
      patch: {
        status: "failed",
        artifactKey: null,
        errorCode: args.errorCode,
        updatedAt: now
      }
    });
  }
});
