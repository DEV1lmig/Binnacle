/**
 * Review like helpers for toggling and listing user reactions.
 */
import { mutation, query, MutationCtx, QueryCtx } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { Doc } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { canViewReviewsInternal } from "./privacy";
import { getBlockedUserIdSets, isEitherBlockedInternal } from "./blocking";

const defaultListLimit = 100;

type AuthCtx = MutationCtx | QueryCtx;

/**
 * Toggles the current user's like on a review.
 */
export const toggle = mutation({
  args: {
    reviewId: v.id("reviews"),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);

    const review = await ctx.db.get(args.reviewId);
    if (!review) {
      throw new ConvexError("Review not found");
    }

    const author = await ctx.db.get(review.userId);
    if (!author) {
      throw new ConvexError("Review author not found");
    }

    const blocked = await isEitherBlockedInternal(ctx, user._id, author._id);
    if (blocked) {
      throw new ConvexError("You can't like this review");
    }

    const allowed = await canViewReviewsInternal(ctx, user, author);
    if (!allowed) {
      throw new ConvexError("You can't like this review");
    }

    const existing = await ctx.db
      .query("likes")
      .withIndex("by_user_and_review", (q) =>
        q.eq("userId", user._id).eq("reviewId", args.reviewId)
      )
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
      return { liked: false };
    }

    const likeId = await ctx.db.insert("likes", {
      userId: user._id,
      reviewId: args.reviewId,
    });

    if (author._id !== user._id) {
      await ctx.runMutation(internal.notifications.create, {
        userId: author._id,
        type: "like",
        actorId: user._id,
        targetType: "review",
        targetId: review._id,
      });
    }

    return { liked: true, likeId };
  },
});

/**
 * Lists likes for a review so clients can show aggregate reactions.
 */
export const listForReview = query({
  args: {
    reviewId: v.id("reviews"),
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

    const review = await ctx.db.get(args.reviewId);
    if (!review) {
      return [];
    }

    const author = await ctx.db.get(review.userId);
    if (!author) {
      return [];
    }

    if (viewer) {
      const blocked = await isEitherBlockedInternal(ctx, viewer._id, author._id);
      if (blocked) {
        return [];
      }
    }

    const allowed = await canViewReviewsInternal(ctx, viewer, author);
    if (!allowed) {
      return [];
    }

    const limit = sanitizeLimit(args.limit);

    const likes = await ctx.db
      .query("likes")
      .withIndex("by_review_id", (q) => q.eq("reviewId", args.reviewId))
      .take(limit);

    if (!viewer) {
      return likes;
    }

    const { blocked, blockedBy } = await getBlockedUserIdSets(ctx, viewer._id);
    return likes.filter(
      (like) => !blocked.has(like.userId) && !blockedBy.has(like.userId)
    );
  },
});

/**
 * Retrieves the authenticated user's profile or throws if one is not present.
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
 * Ensures list limits stay within reasonable bounds.
 */
function sanitizeLimit(rawLimit: number | undefined) {
  if (rawLimit === undefined) {
    return defaultListLimit;
  }

  if (rawLimit <= 0) {
    throw new ConvexError("Limit must be a positive number");
  }

  return Math.min(rawLimit, 500);
}
