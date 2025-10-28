/**
 * Review mutations and queries for managing user game logs.
 */
import { mutation, query, MutationCtx, QueryCtx } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { Doc } from "./_generated/dataModel";

const minRating = 1;
const maxRating = 10;
const defaultListLimit = 20;

type AuthCtx = MutationCtx | QueryCtx;

/**
 * Creates a new review for the authenticated user.
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
 * Lists reviews for a given game, newest first.
 */
export const listForGame = query({
  args: {
    gameId: v.id("games"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = sanitizeLimit(args.limit);

    return await ctx.db
      .query("reviews")
      .withIndex("by_game_id", (q) => q.eq("gameId", args.gameId))
      .order("desc")
      .take(limit);
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
  handler: async (ctx, args) => {
    const limit = sanitizeLimit(args.limit);

    return await ctx.db
      .query("reviews")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(limit);
  },
});

/**
 * Ensures the caller is authenticated and returns their user profile.
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
