/**
 * Mutations and queries for managing user blocks.
 */
import { mutation, query, MutationCtx, QueryCtx } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";

const defaultListLimit = 50;

type AuthCtx = MutationCtx | QueryCtx;

export const block = mutation({
  args: {
    targetUserId: v.id("users"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const blocker = await requireCurrentUser(ctx);

    if (blocker._id === args.targetUserId) {
      throw new ConvexError("You cannot block yourself");
    }

    const existing = await ctx.db
      .query("blockedUsers")
      .withIndex("by_pair", (q) => q.eq("blockerId", blocker._id).eq("blockedId", args.targetUserId))
      .unique();

    if (existing) {
      return existing._id;
    }

    // Clean up relationships and pending requests between the two users.
    const pairKey = makePairKey(blocker._id, args.targetUserId);

    const [friendship, friendRequest] = await Promise.all([
      ctx.db
        .query("friendships")
        .withIndex("by_pair_key", (q) => q.eq("pairKey", pairKey))
        .unique(),
      ctx.db
        .query("friendRequests")
        .withIndex("by_pair_key", (q) => q.eq("pairKey", pairKey))
        .unique(),
    ]);

    const [followAB, followBA] = await Promise.all([
      ctx.db
        .query("followers")
        .withIndex("by_follower_and_following", (q) =>
          q.eq("followerId", blocker._id).eq("followingId", args.targetUserId)
        )
        .unique(),
      ctx.db
        .query("followers")
        .withIndex("by_follower_and_following", (q) =>
          q.eq("followerId", args.targetUserId).eq("followingId", blocker._id)
        )
        .unique(),
    ]);

    await Promise.all([
      friendship ? ctx.db.delete(friendship._id) : Promise.resolve(null),
      friendRequest ? ctx.db.delete(friendRequest._id) : Promise.resolve(null),
      followAB ? ctx.db.delete(followAB._id) : Promise.resolve(null),
      followBA ? ctx.db.delete(followBA._id) : Promise.resolve(null),
    ]);

    return await ctx.db.insert("blockedUsers", {
      blockerId: blocker._id,
      blockedId: args.targetUserId,
      reason: args.reason?.trim() ? args.reason.trim() : undefined,
      createdAt: Date.now(),
    });
  },
});

export const unblock = mutation({
  args: {
    targetUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const blocker = await requireCurrentUser(ctx);

    const existing = await ctx.db
      .query("blockedUsers")
      .withIndex("by_pair", (q) => q.eq("blockerId", blocker._id).eq("blockedId", args.targetUserId))
      .unique();

    if (!existing) {
      return null;
    }

    await ctx.db.delete(existing._id);
    return existing._id;
  },
});

export const listBlocked = query({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      blocked: v.object({
        _id: v.id("users"),
        name: v.string(),
        username: v.string(),
        avatarUrl: v.optional(v.string()),
      }),
      reason: v.optional(v.string()),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const blocker = await requireCurrentUser(ctx);
    const limit = sanitizeLimit(args.limit);

    const blocks = await ctx.db
      .query("blockedUsers")
      .withIndex("by_blocker", (q) => q.eq("blockerId", blocker._id))
      .order("desc")
      .take(limit);

    const enriched = await Promise.all(
      blocks.map(async (block) => {
        const blocked = await ctx.db.get(block.blockedId);
        if (!blocked) {
          return null;
        }

        return {
          blocked: {
            _id: blocked._id,
            name: blocked.name,
            username: blocked.username,
            avatarUrl: blocked.avatarUrl ?? undefined,
          },
          reason: block.reason ?? undefined,
          createdAt: block.createdAt,
        } as const;
      })
    );

    return enriched.filter((entry): entry is NonNullable<typeof entry> => entry !== null);
  },
});

export const isBlocked = query({
  args: {
    targetUserId: v.id("users"),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const viewer = await requireCurrentUser(ctx);
    return await isBlockedInternal(ctx, viewer._id, args.targetUserId);
  },
});

export const isBlockedBy = query({
  args: {
    targetUserId: v.id("users"),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const viewer = await requireCurrentUser(ctx);
    return await isBlockedInternal(ctx, args.targetUserId, viewer._id);
  },
});

export async function isEitherBlockedInternal(
  ctx: QueryCtx | MutationCtx,
  userAId: Id<"users">,
  userBId: Id<"users">
) {
  const [ab, ba] = await Promise.all([
    isBlockedInternal(ctx, userAId, userBId),
    isBlockedInternal(ctx, userBId, userAId),
  ]);

  return ab || ba;
}

export async function getBlockedUserIdSets(
  ctx: QueryCtx,
  viewerId: Id<"users">,
  limit = 500
): Promise<{ blocked: Set<Id<"users">>; blockedBy: Set<Id<"users">> }> {
  const [blockedRows, blockedByRows] = await Promise.all([
    ctx.db
      .query("blockedUsers")
      .withIndex("by_blocker", (q) => q.eq("blockerId", viewerId))
      .take(limit),
    ctx.db
      .query("blockedUsers")
      .withIndex("by_blocked", (q) => q.eq("blockedId", viewerId))
      .take(limit),
  ]);

  return {
    blocked: new Set(blockedRows.map((row) => row.blockedId)),
    blockedBy: new Set(blockedByRows.map((row) => row.blockerId)),
  };
}

async function isBlockedInternal(
  ctx: QueryCtx | MutationCtx,
  blockerId: Id<"users">,
  blockedId: Id<"users">
) {
  const existing = await ctx.db
    .query("blockedUsers")
    .withIndex("by_pair", (q) => q.eq("blockerId", blockerId).eq("blockedId", blockedId))
    .unique();

  return Boolean(existing);
}

async function requireCurrentUser(ctx: AuthCtx): Promise<Doc<"users">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError("Authentication required");
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .unique();

  if (!user) {
    throw new ConvexError("User profile not found");
  }

  return user;
}

function makePairKey(userAId: Id<"users">, userBId: Id<"users">) {
  return [userAId, userBId].map(String).sort().join(":");
}

function sanitizeLimit(rawLimit: number | undefined) {
  if (rawLimit === undefined) {
    return defaultListLimit;
  }

  if (rawLimit <= 0) {
    throw new ConvexError("Limit must be a positive number");
  }

  return Math.min(rawLimit, 200);
}
