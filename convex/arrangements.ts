import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const upsertArrangement = mutation({
  args: {
    arrangement: v.any()
  },
  handler: async (ctx, args) => {
    const arrangementId = String(args.arrangement?.id ?? "");
    if (!arrangementId) {
      throw new Error("arrangement.id is required");
    }

    const existing = await ctx.db
      .query("arrangements")
      .withIndex("by_arrangement_id", (q) => q.eq("arrangementId", arrangementId))
      .unique();

    const payload = {
      arrangementId,
      payload: args.arrangement,
      updatedAt: new Date().toISOString()
    };

    if (!existing) {
      await ctx.db.insert("arrangements", payload);
    } else {
      await ctx.db.patch(existing._id, payload);
    }

    return args.arrangement;
  }
});

export const getArrangement = query({
  args: {
    id: v.string()
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("arrangements")
      .withIndex("by_arrangement_id", (q) => q.eq("arrangementId", args.id))
      .unique();

    return existing?.payload ?? null;
  }
});
