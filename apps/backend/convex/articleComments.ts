/**
 * Mutations and queries for managing comments on articles.
 */
import { mutation, query, MutationCtx, QueryCtx } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { canViewArticle } from "./articles";
import { getBlockedUserIdSets, isEitherBlockedInternal } from "./blocking";

const defaultListLimit = 50;

type AuthCtx = MutationCtx | QueryCtx;

/**
 * Creates a new comment on an article.
 */
export const create = mutation({
  args: {
    articleId: v.id("articles"),
    text: v.string(),
  },
  returns: v.object({
    commentId: v.id("articleComments"),
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
      throw new ConvexError("You can't comment on this article");
    }

    const allowed = await canViewArticle(ctx, user, article);
    if (!allowed) {
      throw new ConvexError("You can't comment on this article");
    }

    const commentId = await ctx.db.insert("articleComments", {
      userId: user._id,
      articleId: args.articleId,
      text: trimmedText,
      createdAt: Date.now(),
    });

    if (author._id !== user._id) {
      await ctx.runMutation(internal.notifications.create, {
        userId: author._id,
        type: "comment",
        actorId: user._id,
        targetType: "article",
        targetId: article._id,
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

        const canView = await canViewArticle(ctx, mentioned, article);
        if (!canView) continue;

        await ctx.runMutation(internal.notifications.create, {
          userId: mentioned._id,
          type: "mention",
          actorId: user._id,
          targetType: "article",
          targetId: article._id,
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
    commentId: v.id("articleComments"),
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
    commentId: v.id("articleComments"),
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
 * Lists all comments for a specific article, with author details.
 */
export const listForArticle = query({
  args: {
    articleId: v.id("articles"),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id("articleComments"),
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

    const article = await ctx.db.get(args.articleId);
    if (!article) {
      return [];
    }

    const allowed = await canViewArticle(ctx, viewer, article);
    if (!allowed) {
      return [];
    }

    const comments = await ctx.db
      .query("articleComments")
      .withIndex("by_article_id", (q) => q.eq("articleId", args.articleId))
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
 * Counts comments for a specific article.
 */
export const countForArticle = query({
  args: {
    articleId: v.id("articles"),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const viewer = identity ? await findByClerkId(ctx, identity.subject) : null;

    const article = await ctx.db.get(args.articleId);
    if (!article) {
      return 0;
    }

    const allowed = await canViewArticle(ctx, viewer, article);
    if (!allowed) {
      return 0;
    }

    const blockedSets = viewer ? await getBlockedUserIdSets(ctx, viewer._id) : null;
    const isBlockedUser = (userId: Id<"users">) =>
      blockedSets ? blockedSets.blocked.has(userId) || blockedSets.blockedBy.has(userId) : false;

    let count = 0;
    const iterator = ctx.db
      .query("articleComments")
      .withIndex("by_article_id", (q) => q.eq("articleId", args.articleId));

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
