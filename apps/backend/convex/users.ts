import { v } from "convex/values";
import { internalMutation, mutation, query, QueryCtx, MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * Upserts a user record based on incoming Clerk webhook payloads.
 */
export const store = internalMutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    username: v.string(),
    name: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existingUser = await findByClerkId(ctx, args.clerkId);

    const baseProfile = {
      username: args.username,
      name: args.name ?? args.username,
      avatarUrl: args.avatarUrl,
    } as const;

    if (existingUser) {
      await ctx.db.patch(existingUser._id, baseProfile);
      return existingUser._id;
    }

    return await ctx.db.insert("users", {
      clerkId: args.clerkId,
      ...baseProfile,
    });
  },
});

/**
 * Ensures the currently authenticated Clerk user exists in Convex after direct sign-in/up.
 */
export const syncCurrent = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const existingUser = await findByClerkId(ctx, identity.subject);

    const profile = {
      username: identity.nickname ?? identity.name ?? identity.email ?? "player",
      name: identity.name ?? identity.nickname ?? identity.email ?? "player",
      avatarUrl: identity.pictureUrl ?? undefined,
    } as const;

    if (existingUser) {
      await ctx.db.patch(existingUser._id, profile);
      return existingUser._id;
    }

    return await ctx.db.insert("users", {
      clerkId: identity.subject,
      ...profile,
    });
  },
});

/**
 * Returns the authenticated user's profile or null if unauthenticated.
 */
export const current = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    return await findByClerkId(ctx, identity.subject);
  },
});

/**
 * Retrieves a user profile by Convex identifier.
 */
export const getById = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

/**
 * Retrieves a user profile by username.
 */
export const getByUsername = query({
  args: {
    username: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .unique();
  },
});

/**
 * Searches for users by name or username.
 */
export const search = query({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const searchQuery = args.query.toLowerCase();
    const limit = args.limit ?? 20;

    if (!searchQuery) {
      // Return discover results if no query
      const allUsers = await ctx.db
        .query("users")
        .order("desc")
        .take(limit);
      return allUsers;
    }

    // OPTIMIZATION: Take a reasonable maximum instead of collecting all users
    // Take 10x limit to account for filtering, max 500
    const maxCandidates = Math.min(limit * 10, 500);
    const allUsers = await ctx.db
      .query("users")
      .order("desc")
      .take(maxCandidates);
    
    const results = allUsers
      .filter(
        (user) =>
          user.name.toLowerCase().includes(searchQuery) ||
          user.username.toLowerCase().includes(searchQuery)
      )
      .slice(0, limit);

    return results;
  },
});

/**
 * Discovers users for the authenticated user to follow.
 */
export const discover = query({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id("users"),
      name: v.string(),
      username: v.string(),
      avatarUrl: v.optional(v.string()),
      reviewCount: v.number(),
      followerCount: v.number(),
      viewerFollows: v.boolean(),
    })
  ),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const viewer = identity ? await findByClerkId(ctx, identity.subject) : null;
    const limit = args.limit && args.limit > 0 ? Math.min(args.limit, 50) : 20;

    // Get all users
    const allUsers = await ctx.db
      .query("users")
      .order("desc")
      .take(100);

    // Filter out the viewer
    const candidates = allUsers.filter((u) => !viewer || u._id !== viewer._id);

    // Get viewer's following list
    const viewerFollowing = viewer
      ? await ctx.db
          .query("followers")
          .withIndex("by_follower_id", (q) => q.eq("followerId", viewer._id))
          .collect()
      : [];

    const followingIds = new Set(viewerFollowing.map((f) => f.followingId));

    // Enrich each candidate with stats
    const enriched = await Promise.all(
      candidates.map(async (user) => {
        const [reviewCount, followerCount] = await Promise.all([
          countReviewsForUser(ctx, user._id),
          countFollowers(ctx, user._id),
        ]);

        return {
          _id: user._id,
          name: user.name,
          username: user.username,
          avatarUrl: user.avatarUrl ?? undefined,
          reviewCount,
          followerCount,
          viewerFollows: followingIds.has(user._id),
        };
      })
    );

    // Sort by review count and follower count
    enriched.sort((a, b) => {
      const scoreA = a.reviewCount * 2 + a.followerCount;
      const scoreB = b.reviewCount * 2 + b.followerCount;
      return scoreB - scoreA;
    });

    return enriched.slice(0, limit);
  },
});

/**
 * Builds a detailed profile payload for a username, including social stats.
 */
export const profileByUsername = query({
  args: {
    username: v.string(),
  },
  returns: v.union(
    v.null(),
    v.object({
      user: v.object({
        _id: v.id("users"),
        _creationTime: v.number(),
        name: v.string(),
        username: v.string(),
        bio: v.optional(v.string()),
        avatarUrl: v.optional(v.string()),
      }),
      followerCount: v.number(),
      followingCount: v.number(),
      stats: v.object({
        reviewCount: v.number(),
        averageRating: v.optional(v.number()),
        totalPlaytimeHours: v.number(),
        topPlatforms: v.array(
          v.object({
            name: v.string(),
            count: v.number(),
          })
        ),
      }),
      viewerFollows: v.boolean(),
      viewerIsSelf: v.boolean(),
    })
  ),
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .unique();

    if (!user) {
      return null;
    }

    const identity = await ctx.auth.getUserIdentity();
    const viewer = identity ? await findByClerkId(ctx, identity.subject) : null;
    const viewerIsSelf = viewer ? viewer._id === user._id : false;

    const [followerCount, followingCount, stats] = await Promise.all([
      countFollowers(ctx, user._id),
      countFollowing(ctx, user._id),
      computeReviewStats(ctx, user._id),
    ]);

    const viewerFollows = !viewer || viewerIsSelf
      ? false
      : await isFollowing(ctx, viewer._id, user._id);

    return {
      user: {
        _id: user._id,
        _creationTime: user._creationTime,
        name: user.name,
        username: user.username,
        bio: user.bio ?? undefined,
        avatarUrl: user.avatarUrl ?? undefined,
      },
      followerCount,
      followingCount,
      stats,
      viewerFollows,
      viewerIsSelf,
    } as const;
  },
});

/**
 * Finds a user document using a Clerk subject identifier.
 */
async function findByClerkId(ctx: QueryCtx | MutationCtx, clerkId: string) {
  return await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
    .unique();
}

/**
 * Counts the total number of reviews for a user.
 */
async function countReviewsForUser(ctx: QueryCtx, userId: Id<"users">) {
  let total = 0;
  const iterator = ctx.db
    .query("reviews")
    .withIndex("by_user_id", (q) => q.eq("userId", userId));

  for await (const _ of iterator) {
    total += 1;
  }

  return total;
}

/**
 * Counts followers for the provided user.
 */
async function countFollowers(ctx: QueryCtx, userId: Id<"users">) {
  let total = 0;
  const iterator = ctx.db
    .query("followers")
    .withIndex("by_following_id", (q) => q.eq("followingId", userId));

  for await (const _ of iterator) {
    total += 1;
  }

  return total;
}

/**
 * Counts the users followed by the provided user id.
 */
async function countFollowing(ctx: QueryCtx, userId: Id<"users">) {
  let total = 0;
  const iterator = ctx.db
    .query("followers")
    .withIndex("by_follower_id", (q) => q.eq("followerId", userId));

  for await (const _ of iterator) {
    total += 1;
  }

  return total;
}

/**
 * Computes aggregate review statistics for a user profile.
 */
async function computeReviewStats(ctx: QueryCtx, userId: Id<"users">) {
  let reviewCount = 0;
  let ratingSum = 0;
  let playtimeSum = 0;
  const platformCounts = new Map<string, number>();

  const reviewsIterator = ctx.db
    .query("reviews")
    .withIndex("by_user_id", (q) => q.eq("userId", userId));

  for await (const review of reviewsIterator) {
    reviewCount += 1;
    ratingSum += review.rating;

    if (review.playtimeHours) {
      playtimeSum += review.playtimeHours;
    }

    if (review.platform) {
      platformCounts.set(
        review.platform,
        (platformCounts.get(review.platform) ?? 0) + 1
      );
    }
  }

  const averageRating = reviewCount > 0 ? ratingSum / reviewCount : undefined;

  const topPlatforms = Array.from(platformCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name, count]) => ({ name, count }));

  return {
    reviewCount,
    averageRating,
    totalPlaytimeHours: playtimeSum,
    topPlatforms,
  } as const;
}

/**
 * Determines whether one user currently follows another user.
 */
async function isFollowing(
  ctx: QueryCtx,
  followerId: Id<"users">,
  followingId: Id<"users">
) {
  const record = await ctx.db
    .query("followers")
    .withIndex("by_follower_and_following", (q) =>
      q.eq("followerId", followerId).eq("followingId", followingId)
    )
    .unique();

  return record !== null;
}