/**
 * Mutations and queries for managing comments on reviews.
 */
import { mutation, query, MutationCtx, QueryCtx } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";

const defaultListLimit = 50;

type AuthCtx = MutationCtx | QueryCtx;

/**
 * Creates a new comment on a review.
 */
export const create = mutation({
  args: {
    reviewId: v.id("reviews"),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);

    const trimmedText = args.text.trim();
    if (trimmedText.length === 0) {
      throw new ConvexError("Comment text cannot be empty");
    }

    if (trimmedText.length > 1000) {
      throw new ConvexError("Comment text cannot exceed 1000 characters");
    }

    // Verify the review exists
    const review = await ctx.db.get(args.reviewId);
    if (!review) {
      throw new ConvexError("Review not found");
    }

    return await ctx.db.insert("comments", {
      userId: user._id,
      reviewId: args.reviewId,
      text: trimmedText,
      createdAt: Date.now(),
    });
  },
});

/**
 * Deletes a comment if the user is the author.
 */
export const remove = mutation({
  args: {
    commentId: v.id("comments"),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const comment = await ctx.db.get(args.commentId);

    if (!comment) {
      throw new ConvexError("Comment not found");
    }

    if (comment.userId !== user._id) {
      throw new ConvexError("You can only delete your own comments");
    }

    await ctx.db.delete(args.commentId);
    return args.commentId;
  },
});

/**
 * Updates a comment if the user is the author.
 */
export const update = mutation({
  args: {
    commentId: v.id("comments"),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const comment = await ctx.db.get(args.commentId);

    if (!comment) {
      throw new ConvexError("Comment not found");
    }

    if (comment.userId !== user._id) {
      throw new ConvexError("You can only edit your own comments");
    }

    const trimmedText = args.text.trim();
    if (trimmedText.length === 0) {
      throw new ConvexError("Comment text cannot be empty");
    }

    if (trimmedText.length > 1000) {
      throw new ConvexError("Comment text cannot exceed 1000 characters");
    }

    await ctx.db.patch(args.commentId, {
      text: trimmedText,
    });

    return args.commentId;
  },
});

/**
 * Lists all comments for a specific review, with author details.
 */
export const listForReview = query({
  args: {
    reviewId: v.id("reviews"),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id("comments"),
      _creationTime: v.number(),
      text: v.string(),
      createdAt: v.number(),
      author: v.object({
        _id: v.id("users"),
        name: v.string(),
        username: v.string(),
        avatarUrl: v.optional(v.string()),
      }),
      isAuthor: v.boolean(),
    })
  ),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const viewer = identity ? await findByClerkId(ctx, identity.subject) : null;
    const limit = sanitizeLimit(args.limit);

    const comments = await ctx.db
      .query("comments")
      .withIndex("by_review_id", (q) => q.eq("reviewId", args.reviewId))
      .order("asc")
      .take(limit);

    const enriched = await Promise.all(
      comments.map(async (comment) => {
        const author = await ctx.db.get(comment.userId);
        if (!author) {
          return null;
        }

        return {
          _id: comment._id,
          _creationTime: comment._creationTime,
          text: comment.text,
          createdAt: comment.createdAt,
          author: {
            _id: author._id,
            name: author.name,
            username: author.username,
            avatarUrl: author.avatarUrl ?? undefined,
          },
          isAuthor: viewer ? comment.userId === viewer._id : false,
        };
      })
    );

    return enriched.filter((c): c is NonNullable<typeof c> => c !== null);
  },
});

/**
 * Counts comments for a specific review.
 */
export const countForReview = query({
  args: {
    reviewId: v.id("reviews"),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    let count = 0;
    const iterator = ctx.db
      .query("comments")
      .withIndex("by_review_id", (q) => q.eq("reviewId", args.reviewId));

    for await (const _ of iterator) {
      count += 1;
    }

    return count;
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
 * Finds a user document using a Clerk subject identifier.
 */
async function findByClerkId(ctx: QueryCtx | MutationCtx, clerkId: string) {
  return await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
    .unique();
}

/**
 * Normalizes list limits for comment queries.
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
