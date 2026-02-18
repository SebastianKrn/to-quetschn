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

export const updateArrangementToken = mutation({
  args: {
    arrangementId: v.string(),
    ownerUserId: v.string(),
    tokenId: v.string(),
    row: v.number(),
    button: v.number(),
    direction: v.union(v.literal("push"), v.literal("pull"))
  },
  handler: async (ctx, args) => {
    const existing = await getAuthorizedArrangement(ctx, {
      id: args.arrangementId,
      ownerUserId: args.ownerUserId
    });

    if (!existing) {
      return null;
    }

    const payload = existing.payload as {
      measures?: Array<{
        tokens?: Array<{
          id?: string;
          row?: number;
          button?: number;
          direction?: "push" | "pull";
        }>;
      }>;
    };
    const measures = Array.isArray(payload.measures) ? payload.measures : [];
    let tokenFound = false;

    const updatedPayload = {
      ...payload,
      measures: measures.map((measure) => {
        const tokens = Array.isArray(measure.tokens) ? measure.tokens : [];
        return {
          ...measure,
          tokens: tokens.map((token) => {
            if (token.id !== args.tokenId) {
              return token;
            }

            tokenFound = true;
            return {
              ...token,
              row: args.row,
              button: args.button,
              direction: args.direction
            };
          })
        };
      })
    };

    if (!tokenFound) {
      return null;
    }

    await ctx.db.patch(existing._id, {
      ownerUserId: existing.ownerUserId ?? args.ownerUserId,
      payload: updatedPayload,
      updatedAt: new Date().toISOString()
    });

    const updated = await ctx.db.get(existing._id);
    return updated?.payload ?? null;
  }
});
