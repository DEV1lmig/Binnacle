/**
 * Social graph helpers for managing follow relationships between users.
 */
import { mutation, query, MutationCtx, QueryCtx } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { getBlockedUserIdSets, isEitherBlockedInternal } from "./blocking";

const defaultListLimit = 50;

type AuthCtx = MutationCtx | QueryCtx;

/**
 * Creates a follow relationship from the authenticated user to the target user.
 */
export const follow = mutation({
  args: {
    targetUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);

    if (user._id === args.targetUserId) {
      throw new ConvexError("You cannot follow yourself");
    }

    const blocked = await isEitherBlockedInternal(ctx, user._id, args.targetUserId);
    if (blocked) {
      throw new ConvexError("You can't follow this user");
    }

    const existing = await ctx.db
      .query("followers")
      .withIndex("by_follower_and_following", (q) =>
        q.eq("followerId", user._id).eq("followingId", args.targetUserId)
      )
      .unique();

    if (existing) {
      return existing._id;
    }

    const followId = await ctx.db.insert("followers", {
      followerId: user._id,
      followingId: args.targetUserId,
    });

    await ctx.runMutation(internal.notifications.create, {
      userId: args.targetUserId,
      type: "follow",
      actorId: user._id,
    });

    return followId;
  },
});

/**
 * Removes a follow relationship if it exists.
 */
export const unfollow = mutation({
  args: {
    targetUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);

    const existing = await ctx.db
      .query("followers")
      .withIndex("by_follower_and_following", (q) =>
        q.eq("followerId", user._id).eq("followingId", args.targetUserId)
      )
      .unique();

    if (!existing) {
      return null;
    }

    await ctx.db.delete(existing._id);
    return existing._id;
  },
});

/**
 * Lists the users that the specified user is following.
 */
export const listFollowing = query({
  args: {
    userId: v.optional(v.id("users")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const viewer = identity
      ? await ctx.db
          .query("users")
          .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
          .unique()
      : null;

    const userId = args.userId ?? viewer?._id;
    if (!userId) {
      throw new ConvexError("Authentication required");
    }

    const limit = sanitizeLimit(args.limit);

    const blockedSets = viewer ? await getBlockedUserIdSets(ctx, viewer._id) : null;
    const isBlockedUser = (otherUserId: Id<"users">) =>
      blockedSets
        ? blockedSets.blocked.has(otherUserId) || blockedSets.blockedBy.has(otherUserId)
        : false;

    const rows = await ctx.db
      .query("followers")
      .withIndex("by_follower_id", (q) => q.eq("followerId", userId))
      .take(limit);

    if (!viewer) {
      return rows;
    }

    return rows.filter((row) => !isBlockedUser(row.followingId));
  },
});

/**
 * Lists the users that follow the specified user.
 */
export const listFollowers = query({
  args: {
    userId: v.optional(v.id("users")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const viewer = identity
      ? await ctx.db
          .query("users")
          .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
          .unique()
      : null;

    const userId = args.userId ?? viewer?._id;
    if (!userId) {
      throw new ConvexError("Authentication required");
    }

    const limit = sanitizeLimit(args.limit);

    const blockedSets = viewer ? await getBlockedUserIdSets(ctx, viewer._id) : null;
    const isBlockedUser = (otherUserId: Id<"users">) =>
      blockedSets
        ? blockedSets.blocked.has(otherUserId) || blockedSets.blockedBy.has(otherUserId)
        : false;

    const rows = await ctx.db
      .query("followers")
      .withIndex("by_following_id", (q) => q.eq("followingId", userId))
      .take(limit);

    if (!viewer) {
      return rows;
    }

    return rows.filter((row) => !isBlockedUser(row.followerId));
  },
});

/**
 * Fetches the authenticated user's profile or throws if unavailable.
 */
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

/**
 * Normalizes list limits for follower queries.
 */
function sanitizeLimit(rawLimit: number | undefined) {
  if (rawLimit === undefined) {
    return defaultListLimit;
  }

  if (rawLimit <= 0) {
    throw new ConvexError("Limit must be a positive number");
  }

  return Math.min(rawLimit, 200);
}
