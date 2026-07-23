/**
 * Article mutations and queries — long-form content (crítica / opinión / análisis).
 *
 * Mirrors the reviews.ts/likes.ts/comments.ts pattern: dedicated tables instead
 * of a generic targetType, so existing review flows stay untouched.
 */
import { mutation, query, MutationCtx, QueryCtx } from "./_generated/server";
import { v, ConvexError, Infer } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";
import { canViewProfileInternal } from "./privacy";
import { getBlockedUserIdSets, isEitherBlockedInternal } from "./blocking";
import { requireCurrentUser, getCurrentUser } from "./lib/auth";

const defaultListLimit = 20;
const maxTitleLength = 200;
const maxExcerptLength = 280;
const maxTagCount = 10;
const maxTagLength = 30;
const maxContentLength = 400_000; // ~400KB serialized Tiptap JSON, well under Convex's 1MB doc cap
const maxGamesPerArticle = 10;
const autoExcerptChars = 200;

const articleTypeValidator = v.union(
  v.literal("review"),
  v.literal("opinion"),
  v.literal("analysis")
);

const articleStatusValidator = v.union(v.literal("draft"), v.literal("published"));

const gameSummaryValidator = v.object({
  _id: v.id("games"),
  title: v.string(),
  coverUrl: v.optional(v.string()),
  releaseYear: v.optional(v.number()),
});

const detailedArticleValidator = v.object({
  _id: v.id("articles"),
  _creationTime: v.number(),
  userId: v.id("users"),
  title: v.string(),
  content: v.string(),
  excerpt: v.optional(v.string()),
  type: v.optional(articleTypeValidator),
  tags: v.optional(v.array(v.string())),
  containsSpoilers: v.boolean(),
  coverUrl: v.optional(v.string()),
  status: articleStatusValidator,
  publishedAt: v.optional(v.number()),
  updatedAt: v.number(),
  author: v.object({
    _id: v.id("users"),
    name: v.string(),
    username: v.string(),
    avatarUrl: v.optional(v.string()),
  }),
  games: v.array(gameSummaryValidator),
  likeCount: v.number(),
  viewerHasLiked: v.boolean(),
  commentCount: v.number(),
});

type DetailedArticle = Infer<typeof detailedArticleValidator>;

type AuthCtx = MutationCtx | QueryCtx;

/**
 * Creates a new article as a draft for the authenticated user.
 */
export const create = mutation({
  args: {
    title: v.string(),
    content: v.string(),
    excerpt: v.optional(v.string()),
    type: v.optional(articleTypeValidator),
    tags: v.optional(v.array(v.string())),
    containsSpoilers: v.optional(v.boolean()),
    coverUrl: v.optional(v.string()),
    gameIds: v.optional(v.array(v.id("games"))),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);

    const title = validateTitle(args.title);
    validateContent(args.content);
    validateCoverUrl(args.coverUrl);
    const tags = validateTags(args.tags);
    const gameIds = await validateGameIds(ctx, args.gameIds);
    const excerpt = resolveExcerpt(args.excerpt, args.content);

    const now = Date.now();

    const articleId = await ctx.db.insert("articles", {
      userId: user._id,
      title,
      content: args.content,
      excerpt,
      type: args.type,
      tags,
      containsSpoilers: args.containsSpoilers ?? false,
      coverUrl: args.coverUrl?.trim() || undefined,
      status: "draft",
      updatedAt: now,
    });

    await syncArticleGames(ctx, articleId, gameIds);

    return articleId;
  },
});

/**
 * Updates an article owned by the authenticated user.
 */
export const update = mutation({
  args: {
    articleId: v.id("articles"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    excerpt: v.optional(v.string()),
    type: v.optional(articleTypeValidator),
    tags: v.optional(v.array(v.string())),
    containsSpoilers: v.optional(v.boolean()),
    coverUrl: v.optional(v.string()),
    gameIds: v.optional(v.array(v.id("games"))),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const article = await ctx.db.get(args.articleId);

    if (!article) {
      throw new ConvexError("Article not found");
    }

    if (article.userId !== user._id) {
      throw new ConvexError("You can only edit your own articles");
    }

    const updates: Partial<Doc<"articles">> = { updatedAt: Date.now() };

    if (args.title !== undefined) {
      updates.title = validateTitle(args.title);
    }

    if (args.content !== undefined) {
      validateContent(args.content);
      updates.content = args.content;
    }

    if (args.type !== undefined) {
      updates.type = args.type;
    }

    if (args.tags !== undefined) {
      updates.tags = validateTags(args.tags);
    }

    if (args.containsSpoilers !== undefined) {
      updates.containsSpoilers = args.containsSpoilers;
    }

    if (args.coverUrl !== undefined) {
      validateCoverUrl(args.coverUrl);
      updates.coverUrl = args.coverUrl.trim() || undefined;
    }

    if (args.excerpt !== undefined || args.content !== undefined) {
      updates.excerpt = resolveExcerpt(
        args.excerpt,
        args.content ?? article.content
      );
    }

    await ctx.db.patch(article._id, updates);

    if (args.gameIds !== undefined) {
      const gameIds = await validateGameIds(ctx, args.gameIds);
      await syncArticleGames(ctx, article._id, gameIds);
    }

    return article._id;
  },
});

/**
 * Publishes a draft article. Sets publishedAt only the first time it's published,
 * so re-publishing after an edit doesn't reset the article's feed position.
 */
export const publish = mutation({
  args: { articleId: v.id("articles") },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const article = await ctx.db.get(args.articleId);

    if (!article) {
      throw new ConvexError("Article not found");
    }

    if (article.userId !== user._id) {
      throw new ConvexError("You can only publish your own articles");
    }

    if (!article.title.trim()) {
      throw new ConvexError("Add a title before publishing");
    }

    if (!hasContent(article.content)) {
      throw new ConvexError("Add some content before publishing");
    }

    await ctx.db.patch(article._id, {
      status: "published",
      publishedAt: article.publishedAt ?? Date.now(),
      updatedAt: Date.now(),
    });

    return article._id;
  },
});

/**
 * Reverts a published article back to draft.
 */
export const unpublish = mutation({
  args: { articleId: v.id("articles") },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const article = await ctx.db.get(args.articleId);

    if (!article) {
      throw new ConvexError("Article not found");
    }

    if (article.userId !== user._id) {
      throw new ConvexError("You can only unpublish your own articles");
    }

    await ctx.db.patch(article._id, { status: "draft", updatedAt: Date.now() });
    return article._id;
  },
});

/**
 * Deletes an article owned by the authenticated user, cascading likes/comments/game links.
 */
export const remove = mutation({
  args: { articleId: v.id("articles") },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const article = await ctx.db.get(args.articleId);

    if (!article) {
      throw new ConvexError("Article not found");
    }

    if (article.userId !== user._id) {
      throw new ConvexError("You can only delete your own articles");
    }

    await cascadeDeleteArticle(ctx, article._id);

    return article._id;
  },
});

/**
 * Retrieves a single article by ID with author, games, and social counts.
 */
export const getById = query({
  args: { articleId: v.id("articles") },
  returns: v.union(v.null(), detailedArticleValidator),
  handler: async (ctx, args) => {
    const article = await ctx.db.get(args.articleId);
    if (!article) {
      return null;
    }

    const viewer = await getCurrentUser(ctx);
    const allowed = await canViewArticle(ctx, viewer, article);
    if (!allowed) {
      return null;
    }

    return await hydrateArticle(ctx, article, viewer?._id ?? null);
  },
});

/**
 * Lists published articles authored by a specific user, newest first.
 */
export const listByUser = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  returns: v.array(detailedArticleValidator),
  handler: async (ctx, args) => {
    const viewer = await getCurrentUser(ctx);
    const limit = sanitizeLimit(args.limit);

    const author = await ctx.db.get(args.userId);
    if (!author) {
      return [];
    }

    const isSelf = viewer?._id === author._id;
    if (!isSelf) {
      const allowedProfile = await canViewProfileInternal(ctx, viewer, author);
      if (!allowedProfile) {
        return [];
      }

      if (viewer) {
        const blocked = await isEitherBlockedInternal(ctx, viewer._id, author._id);
        if (blocked) {
          return [];
        }
      }
    }

    const articles = await ctx.db
      .query("articles")
      .withIndex("by_user_and_status", (q) =>
        q.eq("userId", args.userId).eq("status", "published")
      )
      .collect();

    articles.sort((a, b) => (b.publishedAt ?? b.updatedAt) - (a.publishedAt ?? a.updatedAt));

    const responses: DetailedArticle[] = [];
    for (const article of articles.slice(0, limit)) {
      const enriched = await hydrateArticle(ctx, article, viewer?._id ?? null);
      if (enriched) {
        responses.push(enriched);
      }
    }

    return responses;
  },
});

/**
 * Lists the authenticated user's own drafts, newest first.
 */
export const listDrafts = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(detailedArticleValidator),
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const limit = sanitizeLimit(args.limit);

    const drafts = await ctx.db
      .query("articles")
      .withIndex("by_user_and_status", (q) =>
        q.eq("userId", user._id).eq("status", "draft")
      )
      .order("desc")
      .take(limit);

    const responses: DetailedArticle[] = [];
    for (const article of drafts) {
      const enriched = await hydrateArticle(ctx, article, user._id);
      if (enriched) {
        responses.push(enriched);
      }
    }

    return responses;
  },
});

/**
 * Public discover feed of published articles, optionally filtered by type.
 */
export const listPublished = query({
  args: {
    type: v.optional(articleTypeValidator),
    limit: v.optional(v.number()),
  },
  returns: v.array(detailedArticleValidator),
  handler: async (ctx, args) => {
    const viewer = await getCurrentUser(ctx);
    const limit = sanitizeLimit(args.limit);

    const candidateCap = Math.min(limit * 5, 300);
    const candidates = await ctx.db
      .query("articles")
      .withIndex("by_status_and_published_at", (q) => q.eq("status", "published"))
      .order("desc")
      .take(candidateCap);

    const blockedSets = viewer ? await getBlockedUserIdSets(ctx, viewer._id) : null;

    const responses: DetailedArticle[] = [];
    for (const article of candidates) {
      if (args.type && article.type !== args.type) {
        continue;
      }

      if (blockedSets && (blockedSets.blocked.has(article.userId) || blockedSets.blockedBy.has(article.userId))) {
        continue;
      }

      const author = await ctx.db.get(article.userId);
      if (!author) {
        continue;
      }

      if (author._id !== viewer?._id) {
        const allowedProfile = await canViewProfileInternal(ctx, viewer, author);
        if (!allowedProfile) {
          continue;
        }
      }

      const enriched = await hydrateArticle(ctx, article, viewer?._id ?? null);
      if (enriched) {
        responses.push(enriched);
      }

      if (responses.length >= limit) {
        break;
      }
    }

    return responses;
  },
});

/**
 * Lists published articles that reference a specific game.
 */
export const listPublishedByGame = query({
  args: {
    gameId: v.id("games"),
    limit: v.optional(v.number()),
  },
  returns: v.array(detailedArticleValidator),
  handler: async (ctx, args) => {
    const viewer = await getCurrentUser(ctx);
    const limit = sanitizeLimit(args.limit);

    const links = await ctx.db
      .query("articleGames")
      .withIndex("by_game_id", (q) => q.eq("gameId", args.gameId))
      .collect();

    const blockedSets = viewer ? await getBlockedUserIdSets(ctx, viewer._id) : null;

    const candidates: Doc<"articles">[] = [];
    for (const link of links) {
      const article = await ctx.db.get(link.articleId);
      if (article && article.status === "published") {
        candidates.push(article);
      }
    }

    candidates.sort((a, b) => (b.publishedAt ?? b.updatedAt) - (a.publishedAt ?? a.updatedAt));

    const responses: DetailedArticle[] = [];
    for (const article of candidates) {
      if (blockedSets && (blockedSets.blocked.has(article.userId) || blockedSets.blockedBy.has(article.userId))) {
        continue;
      }

      const author = await ctx.db.get(article.userId);
      if (!author) {
        continue;
      }

      if (author._id !== viewer?._id) {
        const allowedProfile = await canViewProfileInternal(ctx, viewer, author);
        if (!allowedProfile) {
          continue;
        }
      }

      const enriched = await hydrateArticle(ctx, article, viewer?._id ?? null);
      if (enriched) {
        responses.push(enriched);
      }

      if (responses.length >= limit) {
        break;
      }
    }

    return responses;
  },
});

/**
 * Determines whether a viewer can see a given article: drafts are author-only,
 * published articles follow the author's profile visibility + blocking.
 */
export async function canViewArticle(
  ctx: QueryCtx | MutationCtx,
  viewer: Doc<"users"> | null,
  article: Doc<"articles">
): Promise<boolean> {
  if (viewer && viewer._id === article.userId) {
    return true;
  }

  if (article.status !== "published") {
    return false;
  }

  const author = await ctx.db.get(article.userId);
  if (!author) {
    return false;
  }

  if (viewer) {
    const blocked = await isEitherBlockedInternal(ctx, viewer._id, author._id);
    if (blocked) {
      return false;
    }
  }

  return await canViewProfileInternal(ctx, viewer, author);
}

/**
 * Hydrates an article document with author, linked games, and social counts.
 */
export async function hydrateArticle(
  ctx: QueryCtx,
  article: Doc<"articles">,
  viewerId: Id<"users"> | null
): Promise<DetailedArticle | null> {
  const author = await ctx.db.get(article.userId);
  if (!author) {
    return null;
  }

  const [games, likeState, commentCount] = await Promise.all([
    hydrateArticleGames(ctx, article._id),
    aggregateLikeState(ctx, viewerId, article._id),
    countArticleComments(ctx, article._id),
  ]);

  return {
    _id: article._id,
    _creationTime: article._creationTime,
    userId: article.userId,
    title: article.title,
    content: article.content,
    excerpt: article.excerpt ?? undefined,
    type: (article.type as DetailedArticle["type"]) ?? undefined,
    tags: article.tags ?? undefined,
    containsSpoilers: article.containsSpoilers,
    coverUrl: article.coverUrl ?? resolveFallbackCover(games),
    status: article.status as "draft" | "published",
    publishedAt: article.publishedAt ?? undefined,
    updatedAt: article.updatedAt,
    author: {
      _id: author._id,
      name: author.name,
      username: author.username,
      avatarUrl: author.avatarUrl ?? undefined,
    },
    games,
    likeCount: likeState.likeCount,
    viewerHasLiked: likeState.viewerHasLiked,
    commentCount,
  };
}

function resolveFallbackCover(games: Array<{ coverUrl?: string }>): string | undefined {
  return games.find((game) => game.coverUrl)?.coverUrl;
}

async function hydrateArticleGames(ctx: QueryCtx, articleId: Id<"articles">) {
  const links = await ctx.db
    .query("articleGames")
    .withIndex("by_article_id", (q) => q.eq("articleId", articleId))
    .collect();

  const games: Array<{
    _id: Id<"games">;
    title: string;
    coverUrl?: string;
    releaseYear?: number;
  }> = [];

  for (const link of links) {
    const game = await ctx.db.get(link.gameId);
    if (game) {
      games.push({
        _id: game._id,
        title: game.title,
        coverUrl: game.coverUrl ?? undefined,
        releaseYear: game.releaseYear ?? undefined,
      });
    }
  }

  return games;
}

async function syncArticleGames(
  ctx: MutationCtx,
  articleId: Id<"articles">,
  gameIds: Id<"games">[]
) {
  const existingLinks = await ctx.db
    .query("articleGames")
    .withIndex("by_article_id", (q) => q.eq("articleId", articleId))
    .collect();

  const nextIds = new Set(gameIds.map(String));
  const existingIds = new Set(existingLinks.map((link) => String(link.gameId)));

  await Promise.all(
    existingLinks
      .filter((link) => !nextIds.has(String(link.gameId)))
      .map((link) => ctx.db.delete(link._id))
  );

  await Promise.all(
    gameIds
      .filter((gameId) => !existingIds.has(String(gameId)))
      .map((gameId) => ctx.db.insert("articleGames", { articleId, gameId }))
  );
}

async function cascadeDeleteArticle(ctx: MutationCtx, articleId: Id<"articles">) {
  for await (const like of ctx.db
    .query("articleLikes")
    .withIndex("by_article_id", (q) => q.eq("articleId", articleId))) {
    await ctx.db.delete(like._id);
  }

  for await (const comment of ctx.db
    .query("articleComments")
    .withIndex("by_article_id", (q) => q.eq("articleId", articleId))) {
    await ctx.db.delete(comment._id);
  }

  for await (const link of ctx.db
    .query("articleGames")
    .withIndex("by_article_id", (q) => q.eq("articleId", articleId))) {
    await ctx.db.delete(link._id);
  }

  await ctx.db.delete(articleId);
}

async function aggregateLikeState(
  ctx: QueryCtx,
  viewerId: Id<"users"> | null,
  articleId: Id<"articles">
) {
  let likeCount = 0;
  let viewerHasLiked = false;

  const iterator = ctx.db
    .query("articleLikes")
    .withIndex("by_article_id", (q) => q.eq("articleId", articleId));

  for await (const like of iterator) {
    likeCount += 1;
    if (viewerId && like.userId === viewerId) {
      viewerHasLiked = true;
    }
  }

  return { likeCount, viewerHasLiked } as const;
}

async function countArticleComments(ctx: QueryCtx, articleId: Id<"articles">) {
  let total = 0;
  const iterator = ctx.db
    .query("articleComments")
    .withIndex("by_article_id", (q) => q.eq("articleId", articleId));

  for await (const _ of iterator) {
    total += 1;
  }

  return total;
}

function validateTitle(rawTitle: string): string {
  const title = rawTitle.trim();
  if (!title) {
    throw new ConvexError("Title is required");
  }
  if (title.length > maxTitleLength) {
    throw new ConvexError(`Title cannot exceed ${maxTitleLength} characters`);
  }
  return title;
}

function validateContent(content: string) {
  if (content.length > maxContentLength) {
    throw new ConvexError("Article content is too large");
  }
}

function hasContent(content: string): boolean {
  return extractPlainText(content, 1).length > 0;
}

function validateCoverUrl(rawUrl: string | undefined) {
  if (!rawUrl) return;
  const trimmed = rawUrl.trim();
  if (!trimmed) return;

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new ConvexError("Cover URL must be a valid URL");
  }

  if (parsed.protocol !== "https:") {
    throw new ConvexError("Cover URL must use https");
  }
}

function validateTags(rawTags: string[] | undefined): string[] | undefined {
  if (!rawTags) return undefined;

  const normalized = rawTags
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);

  if (normalized.length > maxTagCount) {
    throw new ConvexError(`You can add up to ${maxTagCount} tags`);
  }

  for (const tag of normalized) {
    if (tag.length > maxTagLength) {
      throw new ConvexError(`Tags cannot exceed ${maxTagLength} characters`);
    }
  }

  return Array.from(new Set(normalized));
}

async function validateGameIds(
  ctx: AuthCtx,
  rawGameIds: Id<"games">[] | undefined
): Promise<Id<"games">[]> {
  if (!rawGameIds || rawGameIds.length === 0) {
    return [];
  }

  if (rawGameIds.length > maxGamesPerArticle) {
    throw new ConvexError(`You can link up to ${maxGamesPerArticle} games`);
  }

  const uniqueIds = Array.from(new Set(rawGameIds.map(String))) as Id<"games">[];

  for (const gameId of uniqueIds) {
    const game = await ctx.db.get(gameId);
    if (!game) {
      throw new ConvexError("One of the selected games no longer exists");
    }
  }

  return uniqueIds;
}

function resolveExcerpt(rawExcerpt: string | undefined, content: string): string | undefined {
  const trimmed = rawExcerpt?.trim();
  if (trimmed) {
    return trimmed.slice(0, maxExcerptLength);
  }

  const autoExcerpt = extractPlainText(content, autoExcerptChars);
  return autoExcerpt || undefined;
}

/**
 * Walks a serialized Tiptap/ProseMirror document and extracts up to `maxChars`
 * of plain text, used for auto-generated excerpts and empty-content checks.
 */
export function extractPlainText(serializedContent: string, maxChars: number): string {
  let doc: unknown;
  try {
    doc = JSON.parse(serializedContent);
  } catch {
    return "";
  }

  const parts: string[] = [];
  let collected = 0;

  const walk = (node: unknown) => {
    if (collected >= maxChars) return;
    if (!node || typeof node !== "object") return;

    const record = node as { type?: string; text?: string; content?: unknown[] };

    if (record.type === "text" && typeof record.text === "string") {
      parts.push(record.text);
      collected += record.text.length;
    }

    if (Array.isArray(record.content)) {
      for (const child of record.content) {
        if (collected >= maxChars) break;
        walk(child);
      }
    }
  };

  walk(doc);

  return parts.join(" ").replace(/\s+/g, " ").trim().slice(0, maxChars);
}

function sanitizeLimit(rawLimit: number | undefined) {
  if (rawLimit === undefined) {
    return defaultListLimit;
  }

  if (rawLimit <= 0) {
    throw new ConvexError("Limit must be a positive number");
  }

  return Math.min(rawLimit, 100);
}
