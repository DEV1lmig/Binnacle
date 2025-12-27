/**
 * Mutations and queries for managing comments on reviews.
 */
import { mutation, query, MutationCtx, QueryCtx } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { canViewReviewsInternal } from "./privacy";
import { getBlockedUserIdSets, isEitherBlockedInternal } from "./blocking";

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
  returns: v.object({
    commentId: v.id("comments"),
    warning: v.optional(
      v.object({
        code: v.literal("mentions_truncated"),
        message: v.string(),
      })
    ),
  }),
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

    const author = await ctx.db.get(review.userId);
    if (!author) {
      throw new ConvexError("Review author not found");
    }

    const blocked = await isEitherBlockedInternal(ctx, user._id, author._id);
    if (blocked) {
      throw new ConvexError("You can't comment on this review");
    }

    const allowed = await canViewReviewsInternal(ctx, user, author);
    if (!allowed) {
      throw new ConvexError("You can't comment on this review");
    }

    const commentId = await ctx.db.insert("comments", {
      userId: user._id,
      reviewId: args.reviewId,
      text: trimmedText,
      createdAt: Date.now(),
    });

    if (author._id !== user._id) {
      await ctx.runMutation(internal.notifications.create, {
        userId: author._id,
        type: "comment",
        actorId: user._id,
        targetType: "review",
        targetId: review._id,
      });
    }

    const { usernames: mentionedUsernames, truncated: mentionsTruncated } =
      extractMentionUsernamesWithMeta(trimmedText);
    if (mentionedUsernames.length > 0) {
      for (const username of mentionedUsernames) {
        const mentioned = await ctx.db
          .query("users")
          .withIndex("by_username", (q) => q.eq("username", username))
          .unique();

        if (!mentioned) continue;
        if (mentioned._id === user._id) continue;
        // Avoid duplicating the existing comment notification when the review author is mentioned.
        if (mentioned._id === author._id) continue;

        const blockedWithActor = await isEitherBlockedInternal(
          ctx,
          user._id,
          mentioned._id
        );
        if (blockedWithActor) continue;

        const blockedWithAuthor = await isEitherBlockedInternal(
          ctx,
          mentioned._id,
          author._id
        );
        if (blockedWithAuthor) continue;

        const canView = await canViewReviewsInternal(ctx, mentioned, author);
        if (!canView) continue;

        await ctx.runMutation(internal.notifications.create, {
          userId: mentioned._id,
          type: "mention",
          actorId: user._id,
          targetType: "review",
          targetId: review._id,
        });
      }
    }

    const warning = mentionsTruncated
      ? ({
          code: "mentions_truncated" as const,
          message: `Only the first ${maxMentionUsernames} unique mentions will notify. Extra mentions were ignored.`,
        } as const)
      : undefined;

    return warning ? { commentId, warning } : { commentId };
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

    const comments = await ctx.db
      .query("comments")
      .withIndex("by_review_id", (q) => q.eq("reviewId", args.reviewId))
      .order("asc")
      .take(limit);

    const blockedSets = viewer ? await getBlockedUserIdSets(ctx, viewer._id) : null;
    const isBlockedUser = (userId: Id<"users">) =>
      blockedSets ? blockedSets.blocked.has(userId) || blockedSets.blockedBy.has(userId) : false;

    const enriched = await Promise.all(
      comments.map(async (comment) => {
        if (viewer && isBlockedUser(comment.userId)) {
          return null;
        }

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
    const identity = await ctx.auth.getUserIdentity();
    const viewer = identity ? await findByClerkId(ctx, identity.subject) : null;

    const review = await ctx.db.get(args.reviewId);
    if (!review) {
      return 0;
    }

    const author = await ctx.db.get(review.userId);
    if (!author) {
      return 0;
    }

    if (viewer) {
      const blocked = await isEitherBlockedInternal(ctx, viewer._id, author._id);
      if (blocked) {
        return 0;
      }
    }

    const allowed = await canViewReviewsInternal(ctx, viewer, author);
    if (!allowed) {
      return 0;
    }

    const blockedSets = viewer ? await getBlockedUserIdSets(ctx, viewer._id) : null;
    const isBlockedUser = (userId: Id<"users">) =>
      blockedSets ? blockedSets.blocked.has(userId) || blockedSets.blockedBy.has(userId) : false;

    let count = 0;
    const iterator = ctx.db
      .query("comments")
      .withIndex("by_review_id", (q) => q.eq("reviewId", args.reviewId));

    for await (const comment of iterator) {
      if (viewer && isBlockedUser(comment.userId)) {
        continue;
      }

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

const maxMentionUsernames = 10;

function extractMentionUsernamesWithMeta(text: string) {
  if (!text.includes("@")) return { usernames: [], truncated: false };

  const results = new Set<string>();
  let truncated = false;
  const regex = /(?:^|[^a-zA-Z0-9_])@([a-zA-Z0-9_]{3,32})/g;

  for (const match of text.matchAll(regex)) {
    const username = match[1]?.toLowerCase();
    if (!username) continue;
    if (!/^[a-z0-9_]+$/.test(username)) continue;

    if (!results.has(username) && results.size >= maxMentionUsernames) {
      truncated = true;
      break;
    }

    results.add(username);
  }

  return { usernames: Array.from(results), truncated };
}
