/**
 * Games helpers for keeping IGDB data cached and accessible.
 */
import { internalMutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";

const defaultSearchLimit = 20;

/**
 * Inserts or updates a game record using fresh IGDB data.
 */
export const upsertFromIgdb = internalMutation({
  args: {
    igdbId: v.number(),
    title: v.string(),
    coverUrl: v.optional(v.string()),
    releaseYear: v.optional(v.number()),
    summary: v.optional(v.string()),
    storyline: v.optional(v.string()),
    genres: v.optional(v.string()),
    platforms: v.optional(v.string()),
    themes: v.optional(v.string()),
    playerPerspectives: v.optional(v.string()),
    gameModes: v.optional(v.string()),
    artworks: v.optional(v.string()),
    screenshots: v.optional(v.string()),
    videos: v.optional(v.string()),
    websites: v.optional(v.string()),
    developers: v.optional(v.string()),
    publishers: v.optional(v.string()),
    aggregatedRating: v.optional(v.number()),
    aggregatedRatingCount: v.optional(v.number()),
    ageRatings: v.optional(v.string()),
    gameStatus: v.optional(v.string()),
    languageSupports: v.optional(v.string()),
    multiplayerModes: v.optional(v.string()),
    similarGames: v.optional(v.string()),
    dlcsAndExpansions: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existingGame = await ctx.db
      .query("games")
      .withIndex("by_igdb_id", (q) => q.eq("igdbId", args.igdbId))
      .unique();

    const gamePayload = {
      title: args.title,
      coverUrl: args.coverUrl,
      releaseYear: args.releaseYear,
      summary: args.summary,
      storyline: args.storyline,
      genres: args.genres,
      platforms: args.platforms,
      themes: args.themes,
      playerPerspectives: args.playerPerspectives,
      gameModes: args.gameModes,
      artworks: args.artworks,
      screenshots: args.screenshots,
      videos: args.videos,
      websites: args.websites,
      developers: args.developers,
      publishers: args.publishers,
      aggregatedRating: args.aggregatedRating,
      aggregatedRatingCount: args.aggregatedRatingCount,
      ageRatings: args.ageRatings,
      gameStatus: args.gameStatus,
      languageSupports: args.languageSupports,
      multiplayerModes: args.multiplayerModes,
      similarGames: args.similarGames,
      dlcsAndExpansions: args.dlcsAndExpansions,
      lastUpdated: Date.now(),
    };

    if (existingGame) {
      await ctx.db.patch(existingGame._id, gamePayload);
      return existingGame._id;
    }

    return await ctx.db.insert("games", {
      igdbId: args.igdbId,
      ...gamePayload,
    });
  },
});

/**
 * Returns a cached game by its Convex identifier.
 */
export const getById = query({
  args: {
    gameId: v.id("games"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.gameId);
  },
});

/**
 * Searches cached games by title so the client can avoid redundant IGDB calls.
 */
export const searchCached = query({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const sanitizedQuery = sanitizeQuery(args.query);
    const limit = sanitizeLimit(args.limit);

    const candidates = await ctx.db
      .query("games")
      .order("desc")
      .take(500);

    return candidates
      .filter((game) =>
        game.title.toLowerCase().includes(sanitizedQuery)
      )
      .sort((a, b) => b.lastUpdated - a.lastUpdated)
      .slice(0, limit);
  },
});

/**
 * Sanitizes the incoming search term and ensures it is non-empty.
 */
function sanitizeQuery(rawQuery: string) {
  const normalized = rawQuery.trim().toLowerCase();
  if (!normalized) {
    throw new ConvexError("Query is required to search cached games");
  }
  return normalized;
}

/**
 * Keeps search limits within an acceptable range.
 */
function sanitizeLimit(rawLimit: number | undefined) {
  if (rawLimit === undefined) {
    return defaultSearchLimit;
  }

  if (rawLimit <= 0) {
    throw new ConvexError("Limit must be a positive number");
  }

  return Math.min(rawLimit, 100);
}
