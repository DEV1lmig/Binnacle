/**
 * Review mutations and queries for managing user game logs.
 */
import { mutation, query, MutationCtx, QueryCtx } from "./_generated/server";
import { v, ConvexError, Infer } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { canViewReviewsInternal } from "./privacy";

const minRating = 1;
const maxRating = 10;
const defaultListLimit = 20;

const detailedReviewValidator = v.object({
  _id: v.id("reviews"),
  _creationTime: v.number(),
  userId: v.id("users"),
  gameId: v.id("games"),
  rating: v.number(),
  platform: v.optional(v.string()),
  text: v.optional(v.string()),
  playtimeHours: v.optional(v.number()),
  author: v.object({
    _id: v.id("users"),
    name: v.string(),
    username: v.string(),
    avatarUrl: v.optional(v.string()),
  }),
  game: v.object({
    _id: v.id("games"),
    title: v.string(),
    coverUrl: v.optional(v.string()),
    releaseYear: v.optional(v.number()),
  }),
  likeCount: v.number(),
  viewerHasLiked: v.boolean(),
  commentCount: v.number(),
});

type DetailedReview = Infer<typeof detailedReviewValidator>;

type AuthCtx = MutationCtx | QueryCtx;

/**
 * Creates a new review for the authenticated user.
 * 
 * Phase 1 Caching: Auto-caches the full IGDB data for the game being reviewed.
 * This ensures future searches for this game hit the cache instead of making
 * another IGDB API call.
 */
export const create = mutation({
  args: {
    gameId: v.id("games"),
    rating: v.number(),
    platform: v.optional(v.string()),
    text: v.optional(v.string()),
    playtimeHours: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    validateRating(args.rating);
    validatePlaytime(args.playtimeHours);

    // Get the game to extract igdbId
    const game = await ctx.db.get(args.gameId);
    if (!game) {
      throw new ConvexError("Game not found");
    }

    // Phase 1 Caching: Auto-cache full IGDB data (non-blocking)
    if (game.igdbId) {
      try {
        await ctx.runMutation(internal.games.cacheGameFromIgdb, {
          igdbId: game.igdbId,
        });
      } catch (error) {
        // Log but don't block review creation if caching fails
        console.warn(`[reviews.create] Failed to cache game ${game.igdbId}:`, error);
      }
    }

    const reviewId = await ctx.db.insert("reviews", {
      userId: user._id,
      gameId: args.gameId,
      rating: args.rating,
      platform: args.platform,
      text: args.text,
      playtimeHours: args.playtimeHours,
    });

    return reviewId;
  },
});

/**
 * Updates an existing review belonging to the authenticated user.
 */
export const update = mutation({
  args: {
    reviewId: v.id("reviews"),
    rating: v.optional(v.number()),
    platform: v.optional(v.string()),
    text: v.optional(v.string()),
    playtimeHours: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const existingReview = await ctx.db.get(args.reviewId);

    if (!existingReview) {
      throw new ConvexError("Review not found");
    }

    if (existingReview.userId !== user._id) {
      throw new ConvexError("You can only edit your own reviews");
    }

    if (args.rating !== undefined) {
      validateRating(args.rating);
    }

    if (args.playtimeHours !== undefined) {
      validatePlaytime(args.playtimeHours);
    }

    const updates: Partial<Doc<"reviews">> = {};
    if (args.rating !== undefined) {
      updates.rating = args.rating;
    }
    if (args.platform !== undefined) {
      updates.platform = args.platform;
    }
    if (args.text !== undefined) {
      updates.text = args.text;
    }
    if (args.playtimeHours !== undefined) {
      updates.playtimeHours = args.playtimeHours;
    }

    if (Object.keys(updates).length === 0) {
      return existingReview._id;
    }

    await ctx.db.patch(existingReview._id, updates);
    return existingReview._id;
  },
});

/**
 * Deletes a review owned by the authenticated user.
 */
export const remove = mutation({
  args: {
    reviewId: v.id("reviews"),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const existingReview = await ctx.db.get(args.reviewId);

    if (!existingReview) {
      throw new ConvexError("Review not found");
    }

    if (existingReview.userId !== user._id) {
      throw new ConvexError("You can only delete your own reviews");
    }

    await ctx.db.delete(existingReview._id);
    return existingReview._id;
  },
});

/**
 * Retrieves a single review by ID with author and game information.
 */
export const get = query({
  args: {
    reviewId: v.id("reviews"),
  },
  returns: v.union(v.null(), detailedReviewValidator),
  handler: async (ctx, args) => {
    const review = await ctx.db.get(args.reviewId);
    if (!review) {
      return null;
    }

    const viewer = await maybeGetViewer(ctx);

    const author = await ctx.db.get(review.userId);
    if (!author) {
      return null;
    }

    const allowed = await canViewReviewsInternal(ctx, viewer, author);
    if (!allowed) {
      return null;
    }

    return await hydrateReview(ctx, review, viewer?._id ?? null);
  },
});

export const listForGame = query({
  args: {
    gameId: v.id("games"),
    limit: v.optional(v.number()),
  },
  returns: v.array(detailedReviewValidator),
  handler: async (ctx, args) => {
    const viewer = await maybeGetViewer(ctx);
    const limit = sanitizeLimit(args.limit);

    const reviews = await ctx.db
      .query("reviews")
      .withIndex("by_game_id", (q) => q.eq("gameId", args.gameId))
      .order("desc")
      .take(limit);

    const responses: DetailedReview[] = [];
    for (const review of reviews) {
      const author = await ctx.db.get(review.userId);
      if (!author) {
        continue;
      }

      const allowed = await canViewReviewsInternal(ctx, viewer, author);
      if (!allowed) {
        continue;
      }

      const enriched = await hydrateReview(ctx, review, viewer?._id ?? null);
      if (enriched) {
        responses.push(enriched);
      }
    }

    return responses;
  },
});

/**
 * Lists reviews authored by a specific user, newest first.
 */
export const listForUser = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  returns: v.array(detailedReviewValidator),
  handler: async (ctx, args) => {
    const viewer = await maybeGetViewer(ctx);
    const limit = sanitizeLimit(args.limit);

    const author = await ctx.db.get(args.userId);
    if (!author) {
      return [];
    }

    const allowed = await canViewReviewsInternal(ctx, viewer, author);
    if (!allowed) {
      return [];
    }

    const reviews = await ctx.db
      .query("reviews")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(limit);

    const responses: DetailedReview[] = [];
    for (const review of reviews) {
      const enriched = await hydrateReview(ctx, review, viewer?._id ?? null);
      if (enriched) {
        responses.push(enriched);
      }
    }

    return responses;
  },
});

/**
 * Ensures the caller is authenticated and returns their user profile.
 */
async function requireCurrentUser(ctx: AuthCtx): Promise<Doc<"users">> {
  const viewer = await maybeGetViewer(ctx as QueryCtx);
  if (!viewer) {
    throw new ConvexError("Authentication required");
  }
  return viewer;
}

/**
 * Validates that a review rating stays within the allowed range.
 */
function validateRating(rating: number) {
  if (rating < minRating || rating > maxRating) {
    throw new ConvexError(`Rating must be between ${minRating} and ${maxRating}`);
  }
}

/**
 * Protects against invalid playtime submissions.
 */
function validatePlaytime(playtimeHours: number | undefined) {
  if (playtimeHours === undefined) {
    return;
  }

  if (playtimeHours < 0) {
    throw new ConvexError("Playtime cannot be negative");
  }
}

/**
 * Normalizes pagination limits for review listings.
 */
function sanitizeLimit(rawLimit: number | undefined) {
  if (rawLimit === undefined) {
    return defaultListLimit;
  }

  if (rawLimit <= 0) {
    throw new ConvexError("Limit must be a positive number");
  }

  return Math.min(rawLimit, 100);
}

async function hydrateReview(
  ctx: QueryCtx,
  review: Doc<"reviews">,
  viewerId: Id<"users"> | null
) : Promise<DetailedReview | null> {
  const [author, game] = await Promise.all([
    ctx.db.get(review.userId),
    ctx.db.get(review.gameId),
  ]);

  if (!author || !game) {
    return null;
  }

  const [likeState, commentCount] = await Promise.all([
    aggregateLikeState(ctx, viewerId, review._id),
    countComments(ctx, review._id),
  ]);

  return {
    _id: review._id,
    _creationTime: review._creationTime,
    userId: review.userId,
    gameId: review.gameId,
    rating: review.rating,
    platform: review.platform ?? undefined,
    text: review.text ?? undefined,
    playtimeHours: review.playtimeHours ?? undefined,
    author: {
      _id: author._id,
      name: author.name,
      username: author.username,
      avatarUrl: author.avatarUrl ?? undefined,
    },
    game: {
      _id: game._id,
      title: game.title,
      coverUrl: game.coverUrl ?? undefined,
      releaseYear: game.releaseYear ?? undefined,
    },
    likeCount: likeState.likeCount,
    viewerHasLiked: likeState.viewerHasLiked,
    commentCount,
  };
}

async function aggregateLikeState(
  ctx: QueryCtx,
  viewerId: Id<"users"> | null,
  reviewId: Id<"reviews">
) {
  let likeCount = 0;
  let viewerHasLiked = false;

  const iterator = ctx.db
    .query("likes")
    .withIndex("by_review_id", (q) => q.eq("reviewId", reviewId));

  for await (const like of iterator) {
    likeCount += 1;
    if (viewerId && like.userId === viewerId) {
      viewerHasLiked = true;
    }
  }

  return { likeCount, viewerHasLiked } as const;
}

async function countComments(ctx: QueryCtx, reviewId: Id<"reviews">) {
  let total = 0;
  const iterator = ctx.db
    .query("comments")
    .withIndex("by_review_id", (q) => q.eq("reviewId", reviewId));

  for await (const _ of iterator) {
    total += 1;
  }

  return total;
}

async function maybeGetViewer(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return null;
  }

  return await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .unique();
}
