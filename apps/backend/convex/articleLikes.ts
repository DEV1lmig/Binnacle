/**
 * Article like helpers for toggling and listing user reactions.
 */
import { mutation, query, MutationCtx, QueryCtx } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { Doc } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { canViewArticle } from "./articles";
import { getBlockedUserIdSets, isEitherBlockedInternal } from "./blocking";

const defaultListLimit = 100;

type AuthCtx = MutationCtx | QueryCtx;

/**
 * Toggles the current user's like on an article.
 */
export const toggle = mutation({
  args: {
    articleId: v.id("articles"),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);

    const article = await ctx.db.get(args.articleId);
    if (!article) {
      throw new ConvexError("Article not found");
    }

    const author = await ctx.db.get(article.userId);
    if (!author) {
      throw new ConvexError("Article author not found");
    }

    const blocked = await isEitherBlockedInternal(ctx, user._id, author._id);
    if (blocked) {
      throw new ConvexError("You can't like this article");
    }

    const allowed = await canViewArticle(ctx, user, article);
    if (!allowed) {
      throw new ConvexError("You can't like this article");
    }

    const existing = await ctx.db
      .query("articleLikes")
      .withIndex("by_user_and_article", (q) =>
        q.eq("userId", user._id).eq("articleId", args.articleId)
      )
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
      return { liked: false };
    }

    const likeId = await ctx.db.insert("articleLikes", {
      userId: user._id,
      articleId: args.articleId,
    });

    if (author._id !== user._id) {
      await ctx.runMutation(internal.notifications.create, {
        userId: author._id,
        type: "like",
        actorId: user._id,
        targetType: "article",
        targetId: article._id,
      });
    }

    return { liked: true, likeId };
  },
});

/**
 * Lists likes for an article so clients can show aggregate reactions.
 */
export const listForArticle = query({
  args: {
    articleId: v.id("articles"),
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

    const article = await ctx.db.get(args.articleId);
    if (!article) {
      return [];
    }

    const allowed = await canViewArticle(ctx, viewer, article);
    if (!allowed) {
      return [];
    }

    const limit = sanitizeLimit(args.limit);

    const likes = await ctx.db
      .query("articleLikes")
      .withIndex("by_article_id", (q) => q.eq("articleId", args.articleId))
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
