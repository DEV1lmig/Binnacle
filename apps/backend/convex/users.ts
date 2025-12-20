import { v, ConvexError } from "convex/values";
import { internalMutation, mutation, query, QueryCtx, MutationCtx } from "./_generated/server";
import { Id, Doc } from "./_generated/dataModel";
import {
  canViewBacklogInternal,
  canViewProfileInternal,
  canViewReviewsInternal,
  normalizePrivacySettings,
} from "./privacy";

/**
 * Upserts a user record based on incoming Clerk webhook payloads.
 * Updates Clerk-managed fields (username, name, avatarUrl, bio) from Clerk metadata.
 */
export const store = internalMutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    username: v.string(),
    name: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    bio: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existingUser = await findByClerkId(ctx, args.clerkId);

    const clerkManagedFields = {
      username: args.username,
      name: args.name ?? args.username,
      avatarUrl: args.avatarUrl,
      bio: args.bio,
    } as const;

    if (existingUser) {
      // Update Clerk-managed fields from webhook
      await ctx.db.patch(existingUser._id, clerkManagedFields);
      return existingUser._id;
    }

    // Create new user with Clerk data
    return await ctx.db.insert("users", {
      clerkId: args.clerkId,
      ...clerkManagedFields,
    });
  },
});

/**
 * Ensures the currently authenticated Clerk user exists in Convex after direct sign-in/up.
 * Only creates the user if they don't exist - does NOT overwrite existing user data.
 */
export const syncCurrent = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const existingUser = await findByClerkId(ctx, identity.subject);

    // If user already exists, don't overwrite their data - just return their ID
    if (existingUser) {
      return existingUser._id;
    }

    // Only create new user with Clerk data if they don't exist yet
    const profile = {
      username: identity.nickname ?? identity.name ?? identity.email ?? "player",
      name: identity.name ?? identity.nickname ?? identity.email ?? "player",
      avatarUrl: identity.pictureUrl ?? undefined,
    } as const;

    return await ctx.db.insert("users", {
      clerkId: identity.subject,
      ...profile,
    });
  },
});

const MIN_USERNAME_LENGTH = 3;
const MAX_USERNAME_LENGTH = 32;
const MAX_NAME_LENGTH = 80;
const MAX_BIO_LENGTH = 500;
const MAX_TOP_GAME_NOTE_LENGTH = 140;
const MAX_TOP_GAMES = 5;

export const updateProfile = mutation({
  args: {
    name: v.optional(v.string()),
    bio: v.optional(v.string()),
  },
  returns: v.object({
    _id: v.id("users"),
    name: v.string(),
    username: v.string(),
    bio: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    topGames: v.optional(
      v.array(
        v.object({
          gameId: v.id("games"),
          rank: v.number(),
          note: v.optional(v.string()),
        })
      )
    ),
  }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Authentication required");
    }

    const user = await findByClerkId(ctx, identity.subject);
    if (!user) {
      throw new ConvexError("User record not found");
    }

    const updates: Partial<Doc<"users">> = {};

    if (args.name !== undefined) {
      updates.name = sanitizeDisplayName(args.name);
    }

    if (args.bio !== undefined) {
      updates.bio = sanitizeBio(args.bio);
    }

    if (Object.keys(updates).length === 0) {
      return {
        _id: user._id,
        name: user.name,
        username: user.username,
        bio: user.bio ?? undefined,
        avatarUrl: user.avatarUrl ?? undefined,
        topGames: user.topGames ?? undefined,
      } as const;
    }

    await ctx.db.patch(user._id, updates);

    const updated = await ctx.db.get(user._id);
    if (!updated) {
      throw new ConvexError("Failed to load updated profile");
    }

    return {
      _id: updated._id,
      name: updated.name,
      username: updated.username,
      bio: updated.bio ?? undefined,
      avatarUrl: updated.avatarUrl ?? undefined,
      topGames: updated.topGames ?? undefined,
    } as const;
  },
});

export const setTopGames = mutation({
  args: {
    entries: v.array(
      v.object({
        gameId: v.id("games"),
        note: v.optional(v.string()),
      })
    ),
  },
  returns: v.array(
    v.object({
      gameId: v.id("games"),
      rank: v.number(),
      note: v.optional(v.string()),
    })
  ),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Authentication required");
    }

    const user = await findByClerkId(ctx, identity.subject);
    if (!user) {
      throw new ConvexError("User record not found");
    }

    if (args.entries.length > MAX_TOP_GAMES) {
      throw new ConvexError(`You can only pin up to ${MAX_TOP_GAMES} games`);
    }

    const seen = new Set<Id<"games">>();
    const normalized = args.entries.map((entry, index) => {
      const gameId = entry.gameId;
      if (seen.has(gameId)) {
        throw new ConvexError("Duplicate games are not allowed");
      }
      seen.add(gameId);

      return {
        gameId: entry.gameId,
        rank: index + 1,
        note: sanitizeTopGameNote(entry.note),
      } as const;
    });

    await Promise.all(
      normalized.map(async (entry) => {
        const game = await ctx.db.get(entry.gameId);
        if (!game) {
          throw new ConvexError("Pinned game not found in library");
        }
      })
    );

    // Ensure ranks are sequential regardless of incoming indices
    const ranked = normalized.map((entry, index) => ({
      gameId: entry.gameId,
      rank: index + 1,
      note: entry.note,
    }));

    await ctx.db.patch(user._id, {
      topGames: ranked,
    });

    return ranked;
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
    const searchQuery = args.query.trim().toLowerCase();
    const limit = Math.min(args.limit ?? 20, 50);

    // OPTIMIZED: For empty query, just return users sorted by creation time
    // No expensive stats computation - just basic user data for display
    if (!searchQuery) {
      const users = await ctx.db
        .query("users")
        .order("desc")
        .take(limit);
      return users;
    }

    // For search queries, use search index if available or filter
    // OPTIMIZATION: Limit candidates to prevent full table scan
    const maxCandidates = Math.min(limit * 5, 200);
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
          .take(1000) // Limit to prevent timeout (most users won't follow > 1000 people)
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

    const canViewProfile = await canViewProfileInternal(ctx, viewer, user);
    if (!canViewProfile) {
      return null;
    }

    const privacy = normalizePrivacySettings(user);
    const canViewReviews = await canViewReviewsInternal(ctx, viewer, user);

    const [followerCount, followingCount, stats] = await Promise.all([
      countFollowers(ctx, user._id),
      countFollowing(ctx, user._id),
      privacy.showStats && canViewReviews
        ? computeReviewStats(ctx, user._id)
        : Promise.resolve({
            reviewCount: 0,
            averageRating: undefined,
            totalPlaytimeHours: 0,
            topPlatforms: [] as Array<{ name: string; count: number }>,
          }),
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

export const dashboard = query({
  args: {
    userId: v.optional(v.id("users")),
    username: v.optional(v.string()),
    recentLimit: v.optional(v.number()),
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
      viewerFollows: v.boolean(),
      viewerIsSelf: v.boolean(),
      reviewStats: v.object({
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
      backlogStats: v.object({
        total: v.number(),
        want_to_play: v.number(),
        playing: v.number(),
        completed: v.number(),
        dropped: v.number(),
        on_hold: v.number(),
      }),
      topGames: v.array(
        v.object({
          rank: v.number(),
          note: v.optional(v.string()),
          game: v.object({
            _id: v.id("games"),
            title: v.string(),
            coverUrl: v.optional(v.string()),
            releaseYear: v.optional(v.number()),
            aggregatedRating: v.optional(v.number()),
          }),
        })
      ),
      recentReviews: v.array(
        v.object({
          _id: v.id("reviews"),
          _creationTime: v.number(),
          rating: v.number(),
          text: v.optional(v.string()),
          playtimeHours: v.optional(v.number()),
          platform: v.optional(v.string()),
          game: v.object({
            _id: v.id("games"),
            title: v.string(),
            coverUrl: v.optional(v.string()),
            releaseYear: v.optional(v.number()),
          }),
        })
      ),
    })
  ),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const viewer = identity ? await findByClerkId(ctx, identity.subject) : null;
    const targetUser = await resolveTargetUser(ctx, identity?.subject ?? null, args.userId, args.username);
    if (!targetUser) {
      return null;
    }

    const viewerIsSelf = viewer ? viewer._id === targetUser._id : false;

    const canViewProfile = await canViewProfileInternal(ctx, viewer, targetUser);
    if (!canViewProfile) {
      return null;
    }

    const privacy = normalizePrivacySettings(targetUser);
    const canViewReviews = await canViewReviewsInternal(ctx, viewer, targetUser);
    const canViewBacklog = await canViewBacklogInternal(ctx, viewer, targetUser);

    const recentLimit = sanitizeRecentLimit(args.recentLimit);

    const emptyReviewStats = {
      reviewCount: 0,
      averageRating: undefined,
      totalPlaytimeHours: 0,
      topPlatforms: [] as Array<{ name: string; count: number }>,
    };

    const emptyBacklogStats = {
      total: 0,
      want_to_play: 0,
      playing: 0,
      completed: 0,
      dropped: 0,
      on_hold: 0,
    };

    const [followerCount, followingCount, reviewStats, backlogStats, topGames, recentReviews] = await Promise.all([
      countFollowers(ctx, targetUser._id),
      countFollowing(ctx, targetUser._id),
      privacy.showStats && canViewReviews ? computeReviewStats(ctx, targetUser._id) : Promise.resolve(emptyReviewStats),
      privacy.showStats && canViewBacklog ? computeBacklogStats(ctx, targetUser._id) : Promise.resolve(emptyBacklogStats),
      hydrateTopGames(ctx, targetUser.topGames ?? []),
      canViewReviews ? fetchRecentReviews(ctx, targetUser._id, recentLimit) : Promise.resolve([]),
    ]);

    const viewerFollows = !viewer || viewerIsSelf
      ? false
      : await isFollowing(ctx, viewer._id, targetUser._id);

    return {
      user: {
        _id: targetUser._id,
        _creationTime: targetUser._creationTime,
        name: targetUser.name,
        username: targetUser.username,
        bio: targetUser.bio ?? undefined,
        avatarUrl: targetUser.avatarUrl ?? undefined,
      },
      followerCount,
      followingCount,
      viewerFollows,
      viewerIsSelf,
      reviewStats,
      backlogStats,
      topGames,
      recentReviews,
    } as const;
  },
});

type DashboardBacklogStats = {
  total: number;
  want_to_play: number;
  playing: number;
  completed: number;
  dropped: number;
  on_hold: number;
};

type DashboardTopGameEntry = {
  gameId: Id<"games">;
  rank: number;
  note?: string;
};

async function resolveTargetUser(
  ctx: QueryCtx,
  identitySubject: string | null,
  userId?: Id<"users"> | null,
  username?: string | null
) {
  if (userId) {
    const user = await ctx.db.get(userId);
    if (user) {
      return user;
    }
  }

  if (username) {
    const trimmed = username.trim().toLowerCase();
    if (trimmed.length > 0) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_username", (q) => q.eq("username", trimmed))
        .unique();
      if (user) {
        return user;
      }
    }
  }

  if (identitySubject) {
    return await findByClerkId(ctx, identitySubject);
  }

  return null;
}

function sanitizeRecentLimit(limit: number | undefined) {
  if (!limit || !Number.isFinite(limit) || limit <= 0) {
    return 5;
  }
  return Math.min(Math.floor(limit), 10);
}

async function computeBacklogStats(ctx: QueryCtx, userId: Id<"users">): Promise<DashboardBacklogStats> {
  const stats: DashboardBacklogStats = {
    total: 0,
    want_to_play: 0,
    playing: 0,
    completed: 0,
    dropped: 0,
    on_hold: 0,
  };

  const iterator = ctx.db
    .query("backlogItems")
    .withIndex("by_user_id", (q) => q.eq("userId", userId));

  for await (const item of iterator) {
    stats.total += 1;
    if (item.status in stats) {
      const key = item.status as keyof DashboardBacklogStats;
      stats[key] += 1;
    }
  }

  return stats;
}

async function hydrateTopGames(
  ctx: QueryCtx,
  entries: ReadonlyArray<DashboardTopGameEntry>
) {
  if (entries.length === 0) {
    return [] as Array<{
      rank: number;
      note?: string;
      game: {
        _id: Id<"games">;
        title: string;
        coverUrl?: string;
        releaseYear?: number;
        aggregatedRating?: number;
      };
    }>;
  }

  const sorted = [...entries]
    .sort((a, b) => a.rank - b.rank)
    .slice(0, MAX_TOP_GAMES);

  const result: Array<{
    rank: number;
    note?: string;
    game: {
      _id: Id<"games">;
      title: string;
      coverUrl?: string;
      releaseYear?: number;
      aggregatedRating?: number;
    };
  }> = [];

  for (const entry of sorted) {
    const game = await ctx.db.get(entry.gameId);
    if (!game) {
      continue;
    }

    result.push({
      rank: entry.rank,
      note: entry.note ?? undefined,
      game: {
        _id: game._id,
        title: game.title,
        coverUrl: game.coverUrl ?? undefined,
        releaseYear: game.releaseYear ?? undefined,
        aggregatedRating: game.aggregatedRating ?? undefined,
      },
    });
  }

  return result;
}

async function fetchRecentReviews(ctx: QueryCtx, userId: Id<"users">, limit: number) {
  const recent = await ctx.db
    .query("reviews")
    .withIndex("by_user_id", (q) => q.eq("userId", userId))
    .order("desc")
    .take(limit);

  const result: Array<{
    _id: Id<"reviews">;
    _creationTime: number;
    rating: number;
    text?: string;
    playtimeHours?: number;
    platform?: string;
    game: {
      _id: Id<"games">;
      title: string;
      coverUrl?: string;
      releaseYear?: number;
    };
  }> = [];

  for (const review of recent) {
    const game = await ctx.db.get(review.gameId);
    if (!game) {
      continue;
    }

    result.push({
      _id: review._id,
      _creationTime: review._creationTime,
      rating: review.rating,
      text: review.text ?? undefined,
      playtimeHours: review.playtimeHours ?? undefined,
      platform: review.platform ?? undefined,
      game: {
        _id: game._id,
        title: game.title,
        coverUrl: game.coverUrl ?? undefined,
        releaseYear: game.releaseYear ?? undefined,
      },
    });
  }

  return result;
}

function sanitizeUsername(raw: string) {
  const candidate = raw.trim().toLowerCase();

  if (candidate.length < MIN_USERNAME_LENGTH) {
    throw new ConvexError(`Username must be at least ${MIN_USERNAME_LENGTH} characters long`);
  }

  if (candidate.length > MAX_USERNAME_LENGTH) {
    throw new ConvexError(`Username cannot exceed ${MAX_USERNAME_LENGTH} characters`);
  }

  if (!/^[a-z0-9_]+$/.test(candidate)) {
    throw new ConvexError("Username may only include letters, numbers, or underscores");
  }

  return candidate;
}

function sanitizeDisplayName(raw: string) {
  const candidate = raw.trim();

  if (candidate.length === 0) {
    throw new ConvexError("Name cannot be empty");
  }

  if (candidate.length > MAX_NAME_LENGTH) {
    throw new ConvexError(`Name cannot exceed ${MAX_NAME_LENGTH} characters`);
  }

  return candidate;
}

function sanitizeBio(raw: string | undefined) {
  if (raw === undefined) {
    return undefined;
  }

  const candidate = raw.trim();

  if (candidate.length === 0) {
    return undefined;
  }

  if (candidate.length > MAX_BIO_LENGTH) {
    throw new ConvexError(`Bio cannot exceed ${MAX_BIO_LENGTH} characters`);
  }

  return candidate;
}

function sanitizeTopGameNote(raw: string | undefined) {
  if (raw === undefined) {
    return undefined;
  }

  const candidate = raw.trim();

  if (candidate.length === 0) {
    return undefined;
  }

  if (candidate.length > MAX_TOP_GAME_NOTE_LENGTH) {
    throw new ConvexError(`Notes cannot exceed ${MAX_TOP_GAME_NOTE_LENGTH} characters`);
  }

  return candidate;
}

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
  };
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