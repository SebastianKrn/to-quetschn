import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

async function getAuthorizedArrangement(
  ctx: any,
  input: {
    id: string;
    ownerUserId?: string;
  }
) {
  const existing = await ctx.db
    .query("arrangements")
    .withIndex("by_arrangement_id", (q) => q.eq("arrangementId", input.id))
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

export const upsertArrangement = mutation({
  args: {
    arrangement: v.any(),
    ownerUserId: v.string()
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

    if (existing?.ownerUserId && existing.ownerUserId !== args.ownerUserId) {
      throw new Error("Arrangement id already belongs to another user");
    }

    const payload = {
      ownerUserId: existing?.ownerUserId ?? args.ownerUserId,
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
    id: v.string(),
    ownerUserId: v.string()
  },
  handler: async (ctx, args) => {
    const existing = await getAuthorizedArrangement(ctx, {
      id: args.id,
      ownerUserId: args.ownerUserId
    });

    return existing?.payload ?? null;
  }
});
