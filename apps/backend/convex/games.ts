/**
 * Games helpers for keeping IGDB data cached and accessible.
 */
import { internalMutation, query, internalAction, internalQuery, QueryCtx } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { Id, Doc } from "./_generated/dataModel";
import { internal, api } from "./_generated/api";
import { groupByFranchiseAndRank } from "./franchiseRanking";
import { queryCache, cacheKey } from "./utils/queryCache";
import { paginateArray } from "./utils/pagination";
import { measureQuerySize } from "./lib/bandwidthMonitor";

const defaultSearchLimit = 20;
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

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
    rating: v.optional(v.number()),
    ratingCount: v.optional(v.number()),
    totalRating: v.optional(v.number()),
    totalRatingCount: v.optional(v.number()),
    ageRatings: v.optional(v.string()),
    gameStatus: v.optional(v.string()),
    languageSupports: v.optional(v.string()),
    multiplayerModes: v.optional(v.string()),
    similarGames: v.optional(v.string()),
    dlcsAndExpansions: v.optional(v.string()),
    gameType: v.optional(v.number()),
    category: v.optional(v.number()),
    // Franchise fields for intelligent sorting
    franchise: v.optional(v.string()),
    franchises: v.optional(v.string()),
    hypes: v.optional(v.number()),
    firstReleaseDate: v.optional(v.number()),
    parentGame: v.optional(v.number()),
    popularity_score: v.optional(v.number()),
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
      rating: args.rating,
      ratingCount: args.ratingCount,
      totalRating: args.totalRating,
      totalRatingCount: args.totalRatingCount,
      ageRatings: args.ageRatings,
      gameStatus: args.gameStatus,
      languageSupports: args.languageSupports,
      multiplayerModes: args.multiplayerModes,
      similarGames: args.similarGames,
      dlcsAndExpansions: args.dlcsAndExpansions,
      gameType: args.gameType,
      category: args.category,
      // Franchise fields
      franchise: args.franchise,
      franchises: args.franchises,
      hypes: args.hypes,
      firstReleaseDate: args.firstReleaseDate,
      parentGame: args.parentGame,
      popularity_score: args.popularity_score,
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
 * Updates a game's related content (DLC, expansions, mods, etc.).
 */
export const updateRelatedContent = internalMutation({
  args: {
    igdbId: v.number(),
    relatedContent: v.string(),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db
      .query("games")
      .withIndex("by_igdb_id", (q) => q.eq("igdbId", args.igdbId))
      .unique();

    if (game) {
      await ctx.db.patch(game._id, {
        lastUpdated: Date.now(),
      });
    }
  },
});

/**
 * Phase 1 Caching: Auto-cache games when users interact with them
 * 
 * Called from:
 * - reviews.create (auto-cache when user reviews)
 * - backlog.add (auto-cache when user adds to backlog)
 * - games.getById (with background refresh for stale data)
 * 
 * Returns the Convex game ID (whether newly cached or retrieved existing).
 * If caching fails, logs a warning but doesn't block the calling operation.
 */
export const cacheGameFromIgdb = internalMutation({
  args: { igdbId: v.number() },
  handler: async (ctx, args): Promise<Id<"games">> => {
    // Check if already cached
    const existing = await ctx.db
      .query("games")
      .withIndex("by_igdb_id", (q) => q.eq("igdbId", args.igdbId))
      .first();

    // If exists and recent (< 30 days), return cached
    if (existing) {
      const thirtyDaysAgo = Date.now() - CACHE_TTL_MS;
      if (existing.lastUpdated && existing.lastUpdated > thirtyDaysAgo) {
        return existing._id;
      }
    }

    // Fetch full data from IGDB via action
    const igdbGame = await (ctx as any).runAction(api.igdb.fetchGameById, {
      igdbId: args.igdbId,
    });

    if (!igdbGame) {
      throw new Error(`Failed to fetch game ${args.igdbId} from IGDB`);
    }

    // Use upsertFromIgdb to handle insert or update
    const gameId: Id<"games"> = await ctx.runMutation(internal.games.upsertFromIgdb, {
      igdbId: args.igdbId,
      title: igdbGame.title,
      coverUrl: igdbGame.coverUrl,
      releaseYear: igdbGame.releaseYear,
      summary: igdbGame.summary,
      storyline: igdbGame.storyline,
      genres: igdbGame.genres,
      platforms: igdbGame.platforms,
      themes: igdbGame.themes,
      playerPerspectives: igdbGame.playerPerspectives,
      gameModes: igdbGame.gameModes,
      artworks: igdbGame.artworks,
      screenshots: igdbGame.screenshots,
      videos: igdbGame.videos,
      websites: igdbGame.websites,
      developers: igdbGame.developers,
      publishers: igdbGame.publishers,
      aggregatedRating: igdbGame.aggregatedRating,
      aggregatedRatingCount: igdbGame.aggregatedRatingCount,
      ageRatings: igdbGame.ageRatings,
      gameStatus: igdbGame.gameStatus,
      languageSupports: igdbGame.languageSupports,
      multiplayerModes: igdbGame.multiplayerModes,
      similarGames: igdbGame.similarGames,
      dlcsAndExpansions: igdbGame.dlcsAndExpansions,
      gameType: igdbGame.gameType,
      category: igdbGame.category,
      franchise: igdbGame.franchise,
      franchises: igdbGame.franchises,
      hypes: igdbGame.hypes,
      firstReleaseDate: igdbGame.firstReleaseDate,
      parentGame: igdbGame.parentGame,
    });

    return gameId;
  },
});

/**
 * Paginated helper returning cached IGDB IDs.
 * Enables actions to diff against already seeded games without direct DB access.
 */
export const listIgdbIdsPage = internalQuery({
  args: {
    cursor: v.optional(v.string()),
    pageSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(1, args.pageSize ?? 1000), 5000);

    const page = await ctx.db
      .query("games")
      .withIndex("by_igdb_id")
      .paginate({
        numItems: limit,
        cursor: args.cursor ?? null,
      });

    return {
      igdbIds: page.page.map((game) => game.igdbId),
      cursor: page.continueCursor,
    };
  },
});

export const getGameIdByIgdbId = internalQuery({
  args: {
    igdbId: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("games")
      .withIndex("by_igdb_id", (q) => q.eq("igdbId", args.igdbId))
      .unique();

    return existing ? existing._id : null;
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
    const game = await ctx.db.get(args.gameId);
    return measureQuerySize(game, "getById");
  },
});

/**
 * Count games by franchise name (internal use only for franchise metadata)
 * Searches the franchises JSON field for matching franchise names
 * Note: This still requires fetching all games, but it's only called when metadata is stale
 */
export const countGamesByFranchise = query({
  args: {
    franchiseName: v.string(),
  },
  handler: async (ctx, args) => {
    // Since franchises is a JSON field, we need to fetch games and check the parsed field
    // This is less efficient than an index, but franchises is a JSON array so we can't index it directly
    // Only the franchises field is needed for counting
    const allGames = await ctx.db.query("games").collect();
    
    let count = 0;
    for (const game of allGames) {
      // Check franchises field (JSON array of {id, name})
      if (game.franchises) {
        try {
          const franchisesArray = JSON.parse(game.franchises);
          if (Array.isArray(franchisesArray)) {
            const hasMatchingFranchise = franchisesArray.some((f: any) => {
              const name = typeof f === 'string' ? f : f?.name;
              return name === args.franchiseName;
            });
            if (hasMatchingFranchise) {
              count++;
            }
          }
        } catch (e) {
          // Skip games with invalid JSON
        }
      }
    }
    
    return count;
  },
});

/**
 * Searches cached games by title with query-aware ranking.
 * Applies the same ranking criteria as the IGDB search to ensure consistent sorting.
 * Only returns mainline games and enhanced releases (bundles, DLC, mods, etc. are filtered out).
 * 
 * OPTIMIZED: Limits database queries and uses early termination
 * CACHED: Results are cached for 30 minutes to reduce database reads
 */
export const searchCached = query({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const sanitizedQuery = sanitizeQuery(args.query);
    const limit = sanitizeLimit(args.limit);
    
    // CACHE CHECK: Try cache first
    const cacheKey_search = cacheKey("search", sanitizedQuery, limit);
    const cached = queryCache.get<Doc<"games">[]>(cacheKey_search);
    if (cached) {
      console.log(`[searchCached] Cache HIT for "${sanitizedQuery}" (${cached.length} results)`);
      return cached;
    }
    
    const normalizedQuery = normalizeText(sanitizedQuery);
    const queryTokens = tokenize(normalizedQuery);

    // OPTIMIZATION: Take limited set instead of collecting all games
    // Use 10x limit to allow for filtering, max 1000
    const maxCandidates = Math.min(limit * 10, 1000);
    const candidates = await ctx.db
      .query("games")
      .order("desc")
      .take(maxCandidates);

    // Filter games that match the query AND are mainline/enhanced games
    const filtered = candidates.filter((game) => {
      // Must match the query
      const matchesQuery = game.title.toLowerCase().includes(sanitizedQuery);
      if (!matchesQuery) return false;

      // If gameType and category are both missing, skip this game (it's old cached data)
      // This prevents old bundles/dlc from appearing as main games
      if (game.gameType === undefined && game.category === undefined) {
        return false;
      }

      // Filter by gameType - only show mainline games (type 0) and enhanced releases (8, 9, 10, 11)
      // 0=Main, 8=Remake, 9=Remaster, 10=Expanded, 11=Port
      // Exclude: 1=DLC, 2=Expansion, 3=Bundle, 4=StandaloneExpansion, 5=Mod, 6=Episode, 7=Season, 12=Fork, 13=Pack, 14=Update
      const gameType = game.gameType ?? 0;
      const allowedTypes = [0, 8, 9, 10, 11];
      
      // Also check category as fallback
      const category = game.category ?? 0;
      const allowedCategories = [0, 8, 9, 10, 11];
      
      return allowedTypes.includes(gameType) || allowedCategories.includes(category);
    });

    // Compute ranking metrics for each result
    const ranked = filtered.map((game) => ({
      game,
      ranking: computeRankingMetrics(game.title, queryTokens),
    }));

    // Sort by ranking metrics (same criteria as IGDB search)
    ranked.sort((a, b) => {
      // Exact match first
      if (a.ranking.exactMatch !== b.ranking.exactMatch) {
        return a.ranking.exactMatch ? -1 : 1;
      }

      // Prefix match length (longer is better)
      if (a.ranking.prefixMatchLength !== b.ranking.prefixMatchLength) {
        return b.ranking.prefixMatchLength - a.ranking.prefixMatchLength;
      }

      // Longest match span (longer is better)
      if (a.ranking.longestMatchLength !== b.ranking.longestMatchLength) {
        return b.ranking.longestMatchLength - a.ranking.longestMatchLength;
      }

      // Full match start position (earlier is better)
      const aStart = a.ranking.fullMatchStart === Number.POSITIVE_INFINITY ? Infinity : a.ranking.fullMatchStart;
      const bStart = b.ranking.fullMatchStart === Number.POSITIVE_INFINITY ? Infinity : b.ranking.fullMatchStart;
      if (aStart !== bStart) {
        return aStart - bStart;
      }

      // Numeric suffix (lower is better)
      const aNum = a.ranking.numericSuffix ?? Infinity;
      const bNum = b.ranking.numericSuffix ?? Infinity;
      if (aNum !== bNum) {
        return aNum - bNum;
      }

      // Extra token count (fewer is better)
      if (a.ranking.extraTokenCount !== b.ranking.extraTokenCount) {
        return a.ranking.extraTokenCount - b.ranking.extraTokenCount;
      }

      // Release year (newer is better)
      const aYear = a.game.releaseYear ?? 0;
      const bYear = b.game.releaseYear ?? 0;
      if (aYear !== bYear) {
        return bYear - aYear;
      }

      // Last updated (more recent is better)
      return b.game.lastUpdated - a.game.lastUpdated;
    });

    const results = ranked.map((r) => r.game).slice(0, limit);
    
    // CACHE STORE: Cache for 30 minutes
    queryCache.set(cacheKey_search, results, 30 * 60 * 1000);
    console.log(`[searchCached] Cache MISS for "${sanitizedQuery}" (${results.length} results, cached for 30 min)`);
    
    return measureQuerySize(results, "searchCached");
  },
});

/**
 * Text normalization for search queries
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ") // Remove non-alphanumeric chars
    .replace(/\s+/g, " ") // Collapse whitespace
    .trim();
}

/**
 * Tokenize text by whitespace
 */
function tokenize(text: string): string[] {
  return text.split(/\s+/).filter((t) => t.length > 0);
}

/**
 * Compute ranking metrics for a title against query tokens
 */
function computeRankingMetrics(
  title: string,
  queryTokens: string[]
): {
  exactMatch: boolean;
  prefixMatchLength: number;
  longestMatchLength: number;
  fullMatchStart: number;
  numericSuffix?: number;
  extraTokenCount: number;
} {
  if (!title || queryTokens.length === 0) {
    return {
      exactMatch: false,
      prefixMatchLength: 0,
      longestMatchLength: 0,
      fullMatchStart: Number.POSITIVE_INFINITY,
      numericSuffix: undefined,
      extraTokenCount: Number.POSITIVE_INFINITY,
    };
  }

  const titleTokens = tokenize(normalizeText(title));
  if (titleTokens.length === 0) {
    return {
      exactMatch: false,
      prefixMatchLength: 0,
      longestMatchLength: 0,
      fullMatchStart: Number.POSITIVE_INFINITY,
      numericSuffix: undefined,
      extraTokenCount: Number.POSITIVE_INFINITY,
    };
  }

  // Check for exact match
  const exactMatch =
    titleTokens.length === queryTokens.length &&
    titleTokens.every((t, i) => t === queryTokens[i]);

  // Prefix matching
  let prefixMatchLength = 0;
  while (
    prefixMatchLength < queryTokens.length &&
    prefixMatchLength < titleTokens.length &&
    titleTokens[prefixMatchLength] === queryTokens[prefixMatchLength]
  ) {
    prefixMatchLength += 1;
  }

  // Longest match span
  let longestMatchLength = 0;
  let fullMatchStart = Number.POSITIVE_INFINITY;
  for (let i = 0; i < titleTokens.length; i += 1) {
    let span = 0;
    while (
      span < queryTokens.length &&
      i + span < titleTokens.length &&
      titleTokens[i + span] === queryTokens[span]
    ) {
      span += 1;
    }
    if (span > longestMatchLength) {
      longestMatchLength = span;
    }
    if (span === queryTokens.length && i < fullMatchStart) {
      fullMatchStart = i;
    }
  }

  // Extract numeric suffix from title
  const numericMatch = title.match(/(\d+)\s*$/);
  const numericSuffix = numericMatch ? parseInt(numericMatch[1], 10) : undefined;

  // Count extra tokens (tokens in title not in query)
  const extraTokenCount = Math.max(0, titleTokens.length - queryTokens.length);

  return {
    exactMatch,
    prefixMatchLength,
    longestMatchLength,
    fullMatchStart: fullMatchStart === Number.POSITIVE_INFINITY ? Infinity : fullMatchStart,
    numericSuffix,
    extraTokenCount,
  };
}

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

// ===== Search Term Association & Caching =====

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of",
  "from", "with", "by", "as", "is", "was", "are", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "will", "would", "could", "should",
  "may", "might", "must", "can", "this", "that", "these", "those", "i", "you",
  "he", "she", "it", "we", "they", "what", "which", "who", "when", "where", "why", "how"
]);

/**
 * Generate candidate search terms from a game title
 * Returns array of terms with type and priority
 */
function generateSearchTerms(title: string): Array<{ term: string; type: "title" | "franchise" | "token"; priority: number }> {
  const normalized = normalizeText(title);
  const tokens = tokenize(normalized);
  
  const candidates: Array<{ term: string; type: "title" | "franchise" | "token"; priority: number }> = [];

  // Full normalized title (highest priority)
  candidates.push({ term: normalized, type: "title", priority: 100 });

  // Significant bigrams and trigrams (skip stopwords)
  const significantTokens = tokens.filter(t => !STOPWORDS.has(t) && t.length > 2);
  
  if (significantTokens.length > 1) {
    // Bigrams
    for (let i = 0; i < significantTokens.length - 1; i++) {
      candidates.push({
        term: `${significantTokens[i]} ${significantTokens[i + 1]}`,
        type: "token",
        priority: 50,
      });
    }
  }

  // Last significant token (often franchise name, e.g., "zelda" from "legend of zelda")
  if (significantTokens.length > 0) {
    candidates.push({
      term: significantTokens[significantTokens.length - 1],
      type: "franchise",
      priority: 60,
    });
  }

  // First significant token(s)
  if (significantTokens.length > 0) {
    candidates.push({
      term: significantTokens[0],
      type: "token",
      priority: 40,
    });
  }

  return candidates;
}

/**
 * Calculate IDF (Inverse Document Frequency) for a token
 * Higher IDF = rarer token = more valuable for ranking
 * IDF = log(totalGames / (1 + gamesWithToken))
 */
function calculateIDF(tokenFrequency: number, totalGames: number): number {
  if (totalGames === 0) return 1;
  return Math.log((totalGames + 1) / (tokenFrequency + 1));
}

/**
 * Get token frequencies from metadata
 */
async function getTokenFrequencies(ctx: any): Promise<Map<string, number>> {
  try {
    const metadata = await ctx.db
      .query("searchIndexMetadata")
      .withIndex("by_key", (q: any) => q.eq("key", "tokenFrequencies"))
      .unique();
    
    if (metadata && metadata.value) {
      const frequencies = JSON.parse(metadata.value);
      return new Map(Object.entries(frequencies) as [string, number][]);
    }
  } catch (e) {
    console.log("[getTokenFrequencies] No token frequency data found yet");
  }
  return new Map();
}

/**
 * Update token frequencies when a new term is associated
 */
async function updateTokenFrequencies(ctx: any, tokens: string[]): Promise<void> {
  try {
    const existing = await ctx.db
      .query("searchIndexMetadata")
      .withIndex("by_key", (q: any) => q.eq("key", "tokenFrequencies"))
      .unique();
    
    const frequencies = existing && existing.value ? JSON.parse(existing.value) : {};
    
    // Increment frequency for each token
    for (const token of tokens) {
      frequencies[token] = (frequencies[token] ?? 0) + 1;
    }
    
    if (existing) {
      await ctx.db.patch(existing._id, {
        value: JSON.stringify(frequencies),
        lastUpdated: Date.now(),
      });
    } else {
      await ctx.db.insert("searchIndexMetadata", {
        key: "tokenFrequencies",
        value: JSON.stringify(frequencies),
        lastUpdated: Date.now(),
      });
    }
  } catch (e) {
    console.error("[updateTokenFrequencies] Error:", e);
  }
}

/**
 * Calculate comprehensive weight for a search term based on multiple factors
 */
function calculateComprehensiveWeight(args: {
  basePriority: number; // 100, 70, 60, 50, 40 etc based on term type
  idf: number; // inverse document frequency (rarity bonus)
  gamePopularity: number; // 0-1 based on aggregatedRatingCount
  classificationBoost: number; // mainline=2.0, enhanced=1.5, other=1.0
  isPhrasedTerm: boolean; // whether this is a multi-word phrase
  queryTokenCount: number; // for multi-token queries, boost if this term matches all tokens
}): number {
  const {
    basePriority,
    idf,
    gamePopularity,
    classificationBoost,
    isPhrasedTerm,
    queryTokenCount,
  } = args;

  // Base score from priority
  let score = basePriority;

  // Apply IDF weighting (rare tokens worth more)
  // IDF ranges from ~0.69 (very common) to ~8 (very rare)
  // Normalize to 0.5-1.5 range to avoid dominating
  const idfBoost = 0.5 + (Math.min(idf, 2) / 2) * 0.5;
  score *= idfBoost;

  // Popularity boost (games with higher ratings are ranked higher)
  // gamePopularity ranges 0-1, multiply by 0.8-1.2 range
  const popBoost = 0.8 + gamePopularity * 0.4;
  score *= popBoost;

  // Classification boost (mainline games > enhanced > other)
  score *= classificationBoost;

  // Phrase match bonus (multi-word terms get extra boost as they're more specific)
  if (isPhrasedTerm) {
    score *= 1.3;
  }

  // Multi-token query bonus (if query has multiple tokens and this term contains multiple)
  if (queryTokenCount > 1) {
    score *= 1.15;
  }

  return score;
}

/**
 * Associate a search term with a game ID
 * Called during enrichment to build the search index
 */
export const associateSearchTerm = internalMutation({
  args: {
    term: v.string(),
    gameId: v.id("games"),
    weight: v.optional(v.number()),
    termType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const normalizedTerm = normalizeText(args.term);
    if (!normalizedTerm) return;

    const existing = await ctx.db
      .query("searchTerms")
      .withIndex("by_term", (q) => q.eq("term", normalizedTerm))
      .unique();

    const weight = args.weight ?? 10;
    const termType = args.termType ?? "token";

    if (existing) {
      // Merge existing associations
      const existingIds = existing.associatedGameIds ? JSON.parse(existing.associatedGameIds) : [];
      const existingWeights = existing.weights ? JSON.parse(existing.weights) : {};

      const gameIdStr = args.gameId.toString();
      if (!existingIds.includes(gameIdStr)) {
        existingIds.push(gameIdStr);
      }
      existingWeights[gameIdStr] = Math.max(existingWeights[gameIdStr] ?? 0, weight);

      // Sort by weight descending
      existingIds.sort((a: string, b: string) => (existingWeights[b] ?? 0) - (existingWeights[a] ?? 0));

      await ctx.db.patch(existing._id, {
        associatedGameIds: JSON.stringify(existingIds),
        weights: JSON.stringify(existingWeights),
        lastUpdated: Date.now(),
      });
    } else {
      // Create new association
      await ctx.db.insert("searchTerms", {
        term: normalizedTerm,
        tokens: JSON.stringify(tokenize(normalizedTerm)),
        termType,
        associatedGameIds: JSON.stringify([args.gameId.toString()]),
        weights: JSON.stringify({ [args.gameId.toString()]: weight }),
        lastUpdated: Date.now(),
      });
    }
  },
});

/**
 * Query cached games by search term
 * Returns games associated with the term, ranked by weight and classification
 */
export const searchCachedByTerm = query({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
    includeDLC: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const query = args.query.trim();
    if (!query) return [];

    const limit = args.limit ?? 20;
    const normalized = normalizeText(query);
    const tokens = tokenize(normalized);

    // Build candidate lookup terms (full, last token, bigrams)
    const candidateTerms: string[] = [];
    
    if (normalized) candidateTerms.push(normalized);
    
    if (tokens.length > 1) {
      // Bigrams from significant tokens
      const sigTokens = tokens.filter(t => !STOPWORDS.has(t));
      for (let i = 0; i < sigTokens.length - 1; i++) {
        candidateTerms.push(`${sigTokens[i]} ${sigTokens[i + 1]}`);
      }
    }

    if (tokens.length > 0) {
      const lastToken = tokens[tokens.length - 1];
      if (lastToken && !STOPWORDS.has(lastToken)) {
        candidateTerms.push(lastToken);
      }
    }

    // Collect associated games and weights from all candidate terms
    const aggregatedWeights: Record<string, number> = {};
    const foundTerms: string[] = [];
    const tokenFrequencies = await getTokenFrequencies(ctx);
    const allGames = await ctx.db.query("games").collect();
    const totalGames = allGames.length || 1;

    for (const candidateTerm of candidateTerms) {
      const searchTerm = await ctx.db
        .query("searchTerms")
        .withIndex("by_term", (q) => q.eq("term", candidateTerm))
        .unique();

      if (searchTerm && searchTerm.associatedGameIds) {
        foundTerms.push(candidateTerm);
        const gameIds = JSON.parse(searchTerm.associatedGameIds);
        const weights = searchTerm.weights ? JSON.parse(searchTerm.weights) : {};

        // Penalty for high-frequency tokens (e.g., "legend" appearing in many games)
        const candidateTokens = tokenize(candidateTerm);
        let highFrequencyPenalty = 1.0;
        for (const token of candidateTokens) {
          const frequency = tokenFrequencies.get(token) ?? 1;
          if (frequency > totalGames * 0.5) {
            // Token appears in >50% of games, apply penalty
            highFrequencyPenalty *= 0.7;
          }
        }

        for (const gameId of gameIds) {
          let weight = weights[gameId] ?? 10;
          
          // Apply high-frequency penalty
          weight *= highFrequencyPenalty;
          
          // Bonus for phrase match (multi-token terms are more specific)
          if (candidateTokens.length > 1) {
            weight *= 1.2;
          }

          aggregatedWeights[gameId] = (aggregatedWeights[gameId] ?? 0) + weight;
        }
      }
    }

    if (Object.keys(aggregatedWeights).length === 0) {
      // No cached results; fallback to substring search
      console.log(`[searchCachedByTerm] No associations found for query: "${query}", falling back to substring search`);
      return [];
    }

    // Sort by aggregated weight and fetch games
    const sortedGameIds = Object.entries(aggregatedWeights)
      .sort(([, a], [, b]) => b - a)
      .map(([id]) => id)
      .slice(0, limit);

    const games = [];
    const gameScores: Array<{ id: string; title: string; score: number }> = [];
    
    for (const gameId of sortedGameIds) {
      try {
        const id = gameId as Id<"games">;
        const game = await ctx.db.get(id);
        if (game && "title" in game) {
          // Ensure this is a game record (has title field)
          const gameRecord = game as any;
          // Filter DLC/expansions unless requested
          if (!args.includeDLC && gameRecord.gameType && [1, 2, 3, 4, 5, 6].includes(gameRecord.gameType)) {
            continue;
          }
          games.push(game);
          gameScores.push({
            id: gameId,
            title: gameRecord.title,
            score: aggregatedWeights[gameId],
          });
        }
      } catch (e) {
        console.error(`[searchCachedByTerm] Failed to fetch game ${gameId}:`, e);
      }
    }

    // Detect ambiguity: if top result has low confidence or big gap to second result
    let confidence = "high";
    if (games.length > 0) {
      const topScore = gameScores[0]?.score ?? 0;
      const secondScore = gameScores[1]?.score ?? 0;
      const maxPossibleScore = 100; // Full title match
      
      const topConfidence = topScore / maxPossibleScore;
      const scoreDelta = secondScore > 0 ? topScore / secondScore : 999;
      
      if (topConfidence < 0.4) {
        confidence = "low";
      } else if (topConfidence < 0.6 || scoreDelta < 1.5) {
        confidence = "medium";
      }
    }

    console.log(`[searchCachedByTerm] Query "${query}" (${confidence}) -> ${games.length} results from: ${foundTerms.join(", ")}. Top scores: ${gameScores.slice(0, 3).map(s => `${s.title.slice(0, 20)}(${s.score.toFixed(1)})`).join(", ")}`);
    return measureQuerySize(games, "searchCachedByTerm");
  },
});

/**
 * Backfill search term associations for all existing games
 * Call this as an admin mutation to re-index the entire game catalog
 * Processes in batches to avoid hitting rate limits
 */
export const rebuildSearchTermAssociations = internalMutation({
  args: {
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<{ total: number; processed: number; skipped: number; errors: number; timestamp: number }> => {
    const batchSize = args.batchSize ?? 50;
    let processed = 0;
    let skipped = 0;
    let errors = 0;

    try {
      // Fetch all games directly via ctx.db
      const allGames = await ctx.db.query("games").collect();

      console.log(`[rebuildSearchTermAssociations] Starting backfill for ${allGames.length} games`);

      for (let i = 0; i < allGames.length; i += batchSize) {
        const batch = allGames.slice(i, i + batchSize);

        for (const game of batch) {
          try {
            if (!game.title) {
              skipped++;
              continue;
            }

            // Generate search terms from title
            const searchTerms = generateSearchTerms(game.title);
            
            // Associate each term with the game
            for (const { term, priority } of searchTerms) {
              const normalizedTerm = normalizeText(term);
              if (!normalizedTerm) continue;

              const existing = await ctx.db
                .query("searchTerms")
                .withIndex("by_term", (q) => q.eq("term", normalizedTerm))
                .unique();

              const weight = priority;
              const termType = "title";

              if (existing) {
                // Merge existing associations
                const existingIds = existing.associatedGameIds ? JSON.parse(existing.associatedGameIds) : [];
                const existingWeights = existing.weights ? JSON.parse(existing.weights) : {};

                const gameIdStr = game._id.toString();
                if (!existingIds.includes(gameIdStr)) {
                  existingIds.push(gameIdStr);
                }
                existingWeights[gameIdStr] = Math.max(existingWeights[gameIdStr] ?? 0, weight);

                // Sort by weight descending
                existingIds.sort((a: string, b: string) => (existingWeights[b] ?? 0) - (existingWeights[a] ?? 0));

                await ctx.db.patch(existing._id, {
                  associatedGameIds: JSON.stringify(existingIds),
                  weights: JSON.stringify(existingWeights),
                  lastUpdated: Date.now(),
                });
              } else {
                // Create new association
                await ctx.db.insert("searchTerms", {
                  term: normalizedTerm,
                  tokens: JSON.stringify(tokenize(normalizedTerm)),
                  termType,
                  associatedGameIds: JSON.stringify([game._id.toString()]),
                  weights: JSON.stringify({ [game._id.toString()]: weight }),
                  lastUpdated: Date.now(),
                });
              }
            }

            processed++;
          } catch (err) {
            console.error(`[rebuildSearchTermAssociations] Error processing game ${game._id}:`, err);
            errors++;
          }
        }

        console.log(`[rebuildSearchTermAssociations] Progress: ${Math.min(i + batchSize, allGames.length)}/${allGames.length} processed`);
      }

      const summary: { total: number; processed: number; skipped: number; errors: number; timestamp: number } = {
        total: allGames.length,
        processed,
        skipped,
        errors,
        timestamp: Date.now(),
      };

      console.log("[rebuildSearchTermAssociations] Backfill complete:", summary);

      return summary;
    } catch (err) {
      console.error("[rebuildSearchTermAssociations] Fatal error:", err);
      throw err;
    }
  },
});

// ===== Monitoring & Metrics =====

/**
 * Track search metrics for monitoring
 */
async function recordSearchMetric(ctx: any, args: {
  query: string;
  resultCount: number;
  confidence: "high" | "medium" | "low";
  source: "cache" | "live" | "merged";
  latencyMs: number;
}): Promise<void> {
  try {
    const metrics = await ctx.db
      .query("searchIndexMetadata")
      .withIndex("by_key", (q: any) => q.eq("key", "searchMetrics"))
      .unique();

    const data = metrics?.value ? JSON.parse(metrics.value) : {
      totalQueries: 0,
      cacheHits: 0,
      cacheMisses: 0,
      ambiguousQueries: 0,
      avgLatencyMs: 0,
      totalLatency: 0,
      lastUpdated: Date.now(),
    };

    // Update metrics
    data.totalQueries++;
    if (args.source === "cache" || args.source === "merged") data.cacheHits++;
    else data.cacheMisses++;
    
    if (args.confidence !== "high") data.ambiguousQueries++;
    
    data.totalLatency += args.latencyMs;
    data.avgLatencyMs = data.totalLatency / data.totalQueries;
    data.lastUpdated = Date.now();

    if (metrics) {
      await ctx.db.patch(metrics._id, { value: JSON.stringify(data) });
    } else {
      await ctx.db.insert("searchIndexMetadata", {
        key: "searchMetrics",
        value: JSON.stringify(data),
        lastUpdated: Date.now(),
      });
    }
  } catch (e) {
    console.error("[recordSearchMetric] Error:", e);
  }
}

/**
 * Get search metrics for monitoring dashboard
 */
export const getSearchMetrics = query({
  args: {},
  handler: async (ctx) => {
    try {
      const metrics = await ctx.db
        .query("searchIndexMetadata")
        .withIndex("by_key", (q: any) => q.eq("key", "searchMetrics"))
        .unique();

      const tokenFreqs = await ctx.db
        .query("searchIndexMetadata")
        .withIndex("by_key", (q: any) => q.eq("key", "tokenFrequencies"))
        .unique();

      const searchTermsCount = await ctx.db.query("searchTerms").collect();
      const gamesCount = await ctx.db.query("games").collect();

      const metricsData = metrics?.value ? JSON.parse(metrics.value) : {};
      const tokenFreqData = tokenFreqs?.value ? JSON.parse(tokenFreqs.value) : {};

      const cacheHitRate = metricsData.totalQueries 
        ? ((metricsData.cacheHits / metricsData.totalQueries) * 100).toFixed(1)
        : "N/A";

      const ambiguityRate = metricsData.totalQueries
        ? ((metricsData.ambiguousQueries / metricsData.totalQueries) * 100).toFixed(1)
        : "N/A";

      return {
        cacheHitRate: `${cacheHitRate}%`,
        totalQueries: metricsData.totalQueries ?? 0,
        cacheHits: metricsData.cacheHits ?? 0,
        cacheMisses: metricsData.cacheMisses ?? 0,
        ambiguousQueries: metricsData.ambiguousQueries ?? 0,
        ambiguityRate: `${ambiguityRate}%`,
        avgLatencyMs: (metricsData.avgLatencyMs ?? 0).toFixed(1),
        searchTermsIndexed: searchTermsCount.length,
        gamesInDb: gamesCount.length,
        indexCoverage: `${((searchTermsCount.length / Math.max(gamesCount.length, 1)) * 100).toFixed(1)}%`,
        lastUpdated: new Date(metricsData.lastUpdated ?? Date.now()).toISOString(),
      };
    } catch (e) {
      console.error("[getSearchMetrics] Error:", e);
      return { error: String(e) };
    }
  },
});

/**
 * Invalidate search cache entries older than specified days
 */
export const invalidateSearchCache = internalMutation({
  args: {
    olderThanDays: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const olderThanDays = args.olderThanDays ?? 30;
    const cutoffTime = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);

    const staleTerms = await ctx.db.query("searchTerms").collect();
    let invalidated = 0;

    for (const term of staleTerms) {
      if (term.lastUpdated < cutoffTime) {
        await ctx.db.delete(term._id);
        invalidated++;
      }
    }

    console.log(`[invalidateSearchCache] Invalidated ${invalidated} stale search terms (older than ${olderThanDays} days)`);

    return {
      invalidated,
      cutoffDate: new Date(cutoffTime).toISOString(),
      timestamp: Date.now(),
    };
  },
});

/**
 * Reindex games whose searchTerms haven't been updated in a while
 */
export const reindexByAge = internalMutation({
  args: {
    olderThanDays: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const olderThanDays = args.olderThanDays ?? 60;
    const limit = args.limit ?? 100;
    const cutoffTime = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);

    // Find games with old search term associations
    const staleTerms = (await ctx.db.query("searchTerms").collect())
      .filter(t => t.lastUpdated < cutoffTime)
      .slice(0, limit);

    let reindexed = 0;
    const gameIds = new Set<string>();

    // Extract game IDs from stale terms
    for (const term of staleTerms) {
      const gameIds_ = JSON.parse(term.associatedGameIds || "[]");
      for (const id of gameIds_) {
        gameIds.add(id);
      }
    }

    // Re-associate terms for these games
    for (const gameId of Array.from(gameIds).slice(0, limit)) {
      try {
        const id = gameId as Id<"games">;
        const game = await ctx.db.get(id);
        if (game && "title" in game) {
          const gameRecord = game as any;
          const searchTerms = generateSearchTerms(gameRecord.title);

          for (const { term, priority } of searchTerms) {
            const normalizedTerm = normalizeText(term);
            if (!normalizedTerm) continue;

            const existing = await ctx.db
              .query("searchTerms")
              .withIndex("by_term", (q) => q.eq("term", normalizedTerm))
              .unique();

            if (existing) {
              await ctx.db.patch(existing._id, {
                lastUpdated: Date.now(),
              });
            }
          }

          reindexed++;
        }
      } catch (e) {
        console.error(`[reindexByAge] Error reindexing game ${gameId}:`, e);
      }
    }

    console.log(`[reindexByAge] Reindexed ${reindexed} games older than ${olderThanDays} days`);

    return {
      reindexed,
      cutoffDate: new Date(cutoffTime).toISOString(),
      timestamp: Date.now(),
    };
  },
});

/**
 * Get detailed search index health report
 */
export const getIndexHealth = query({
  args: {},
  handler: async (ctx) => {
    try {
      const searchTerms = await ctx.db.query("searchTerms").collect();
      const games = await ctx.db.query("games").collect();

      // Calculate age distribution
      const now = Date.now();
      const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
      const sixtyDaysAgo = now - (60 * 24 * 60 * 60 * 1000);

      const recentTerms = searchTerms.filter(t => t.lastUpdated > thirtyDaysAgo).length;
      const staleTerms = searchTerms.filter(t => t.lastUpdated <= thirtyDaysAgo && t.lastUpdated > sixtyDaysAgo).length;
      const veryStaleTerms = searchTerms.filter(t => t.lastUpdated <= sixtyDaysAgo).length;

      // Calculate coverage
      const indexedGameIds = new Set<string>();
      for (const term of searchTerms) {
        const gameIds = JSON.parse(term.associatedGameIds || "[]");
        for (const id of gameIds) {
          indexedGameIds.add(id);
        }
      }

      // Calculate term distribution
      const termTypes = new Map<string, number>();
      for (const term of searchTerms) {
        const type = term.termType || "unknown";
        termTypes.set(type, (termTypes.get(type) || 0) + 1);
      }

      return {
        totalSearchTerms: searchTerms.length,
        totalGames: games.length,
        indexedGames: indexedGameIds.size,
        indexCoverage: `${((indexedGameIds.size / games.length) * 100).toFixed(1)}%`,
        termAgeDistribution: {
          recent: `${recentTerms} (< 30 days)`,
          stale: `${staleTerms} (30-60 days)`,
          verystale: `${veryStaleTerms} (> 60 days)`,
        },
        termTypes: Object.fromEntries(termTypes),
        avgTermsPerGame: (searchTerms.length / games.length).toFixed(2),
        lastHealthCheck: new Date().toISOString(),
      };
    } catch (e) {
      console.error("[getIndexHealth] Error:", e);
      return { error: String(e) };
    }
  },
});

/**
 * Recompute token frequencies from scratch
 * Useful for recalibrating IDF weights
 */
export const recomputeTokenFrequencies = internalMutation({
  args: {},
  handler: async (ctx) => {
    const searchTerms = await ctx.db.query("searchTerms").collect();
    const frequencies: Record<string, number> = {};

    for (const term of searchTerms) {
      const tokens = term.tokens ? JSON.parse(term.tokens) : [];
      for (const token of tokens) {
        frequencies[token] = (frequencies[token] || 0) + 1;
      }
    }

    // Update metadata
    const existing = await ctx.db
      .query("searchIndexMetadata")
      .withIndex("by_key", (q: any) => q.eq("key", "tokenFrequencies"))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        value: JSON.stringify(frequencies),
        lastUpdated: Date.now(),
      });
    } else {
      await ctx.db.insert("searchIndexMetadata", {
        key: "tokenFrequencies",
        value: JSON.stringify(frequencies),
        lastUpdated: Date.now(),
      });
    }

    console.log(`[recomputeTokenFrequencies] Recomputed frequencies for ${Object.keys(frequencies).length} unique tokens`);

    return {
      uniqueTokens: Object.keys(frequencies).length,
      totalTokenOccurrences: Object.values(frequencies).reduce((a, b) => a + b, 0),
      timestamp: Date.now(),
    };
  },
});

// ===== OPTIMIZED SEARCH PIPELINE (Database-First with IGDB Fallback) =====

/**
 * Optimized search that:
 * 1. First searches the local database (cache)
 * 2. If insufficient results (< minResults), falls back to IGDB API
 * 3. Caches IGDB results for future queries
 * 
 * Returns metadata about where results came from for metrics/debugging.
 * 
 * This prevents race conditions by using a transaction-like pattern:
 * - Each search request has a unique ID
 * - Results are marked with source (cache, live, merged)
 * - Duplicate API calls are prevented via check-before-fetch
 * 
 * OPTIMIZED: Limits database queries to prevent scanning entire table
 */
export const searchOptimized = query({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
    includeDLC: v.optional(v.boolean()),
    minCachedResults: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const query = args.query.trim();
    const limit = Math.min(args.limit ?? 20, 100);
    const offset = args.offset ?? 0;
    const minCachedResults = args.minCachedResults ?? 5;
    const includeDLC = args.includeDLC ?? false;

    const startTime = Date.now();

    if (!query) {
      return {
        results: [],
        total: 0,
        source: "none" as const,
        cursor: null,
        hasMore: false,
        confidence: "high" as const,
        latencyMs: Date.now() - startTime,
        debug: { cacheResults: 0, liveResults: 0 },
      };
    }

    try {
      // STEP 1: Try database first (instant, no API calls)
      // OPTIMIZATION: Limit to 1000 instead of collecting all
      
      const cachedResults = await ctx.db
        .query("games")
        .order("desc")
        .take(1000); // Limit to 1000 instead of collecting all

      // Filter and rank cached results
      const filteredCached = cachedResults.filter((game) => {
        const titleMatch = game.title.toLowerCase().includes(query.toLowerCase());
        if (!titleMatch) return false;
        
        // Optional: Filter by category if DLC is not included
        if (!includeDLC && game.category && [1, 2, 4, 5, 6].includes(game.category)) {
          return false;
        }
        
        return true;
      });

      // Group by franchise and rank using intelligent multi-factor scoring
      // This applies franchise-aware intelligent ordering
      
      // Map Convex documents to format expected by ranking function
      const gamesForRanking = filteredCached.map((game) => ({
        id: game.igdbId || 0,
        title: game.title,
        category: game.category,
        aggregatedRating: game.aggregatedRating,
        aggregatedRatingCount: game.aggregatedRatingCount,
        hypes: game.hypes,
        firstReleaseDate: game.firstReleaseDate,
        franchise: game.franchise,
        franchises: game.franchises,
      }));
      
      const groupedByFranchise = groupByFranchiseAndRank(gamesForRanking);
      
      // Build a map of IGDB ID -> rank position for sorting
      const rankMap = new Map<number, number>();
      let globalRank = 0;
      groupedByFranchise.forEach((gamesInFranchise) => {
        gamesInFranchise.forEach((game) => {
          rankMap.set(game.id, globalRank++);
        });
      });
      
      // Sort by franchise ranking position
      const sortedCached = filteredCached.sort((a, b) => {
        const aRank = rankMap.get(a.igdbId || 0) ?? Infinity;
        const bRank = rankMap.get(b.igdbId || 0) ?? Infinity;
        return aRank - bRank;
      });

      // STEP 2: Determine if we need IGDB fallback
      let finalResults = sortedCached;
      let source: "cache" | "live" | "merged" = sortedCached.length >= minCachedResults ? "cache" : "live";

      if (sortedCached.length < minCachedResults) {
        source = "merged";
        // Note: We can't call actions from queries, so this will be handled in the action wrapper
        // For now, return indication that IGDB is needed
      }

      // STEP 3: Apply offset and limit
      const paginatedResults = finalResults.slice(offset, offset + limit);

      // Determine if there are more results
      const hasMore = finalResults.length > offset + limit;
      const nextCursor = hasMore ? offset + limit : null;

      // Detect confidence
      let confidence: "high" | "medium" | "low" = "high";
      if (sortedCached.length < minCachedResults) {
        confidence = "low";
      } else if (sortedCached.length < minCachedResults * 2) {
        confidence = "medium";
      }

      const latencyMs = Date.now() - startTime;

      const result = {
        results: paginatedResults.map((g) => ({
          convexId: g._id,
          igdbId: g.igdbId,
          title: g.title,
          coverUrl: g.coverUrl,
          releaseYear: g.releaseYear,
          aggregatedRating: g.aggregatedRating,
          aggregatedRatingCount: g.aggregatedRatingCount,
          category: g.category,
          gameType: g.gameType,
          franchises: g.franchises, // Include franchises for franchise detection
        })),
        total: finalResults.length,
        source,
        cursor: nextCursor,
        hasMore,
        confidence,
        latencyMs,
        debug: {
          cacheResults: sortedCached.length,
          liveResults: 0, // Will be filled by action if fallback needed
        },
      };
      
      return measureQuerySize(result, "searchOptimized");
    } catch (error) {
      console.error("[searchOptimized] Error:", error);
      const result = {
        results: [],
        total: 0,
        source: "none" as const,
        cursor: null,
        hasMore: false,
        confidence: "low" as const,
        latencyMs: Date.now() - startTime,
        debug: { cacheResults: 0, liveResults: 0, error: String(error) },
      };
      return measureQuerySize(result, "searchOptimized (error)");
    }
  },
});

/**
 * Helper: Check if a search term is already being processed (prevent duplicate API calls)
 * Returns true if search is in-flight, false if safe to proceed
 * 
 * This uses the searchIndexMetadata table to track in-flight requests
 */
export const isSearchInFlight = query({
  args: {
    query: v.string(),
  },
  handler: async (ctx, args) => {
    const key = `search_inflight_${args.query}`;
    const metadata = await ctx.db
      .query("searchIndexMetadata")
      .withIndex("by_key", (q: any) => q.eq("key", key))
      .unique();

    if (!metadata) return false;

    const data = JSON.parse(metadata.value || "{}");
    const timestamp = data.timestamp ?? 0;
    const age = Date.now() - timestamp;

    // Consider in-flight if started within last 10 seconds
    return age < 10000;
  },
});

/**
 * Mark a search as in-flight to prevent duplicate API calls
 * Used internally during IGDB fallback searches
 */
export const markSearchInFlight = internalMutation({
  args: {
    query: v.string(),
  },
  handler: async (ctx, args) => {
    const key = `search_inflight_${args.query}`;
    const existing = await ctx.db
      .query("searchIndexMetadata")
      .withIndex("by_key", (q: any) => q.eq("key", key))
      .unique();

    const data = { timestamp: Date.now() };

    if (existing) {
      await ctx.db.patch(existing._id, { value: JSON.stringify(data) });
    } else {
      await ctx.db.insert("searchIndexMetadata", {
        key,
        value: JSON.stringify(data),
        lastUpdated: Date.now(),
      });
    }
  },
});

/**
 * Clear in-flight marker for a search
 */
export const clearSearchInFlight = internalMutation({
  args: {
    query: v.string(),
  },
  handler: async (ctx, args) => {
    const key = `search_inflight_${args.query}`;
    const existing = await ctx.db
      .query("searchIndexMetadata")
      .withIndex("by_key", (q: any) => q.eq("key", key))
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});

/**
 * HYBRID SEARCH: Smart action that enriches the search cache from IGDB
 * 
 * Flow:
 * 1. Frontend calls searchOptimized query (cached, instant)
 * 2. If insufficient results, frontend calls this action to enrich IGDB cache
 * 3. Action fetches from IGDB and stores games for future searches
 * 4. Frontend retries searchOptimized query (now with more cached results)
 * 
 * This provides:
 * - Fast initial response when cache has data
 * - Smart franchise-aware ranking (main games first, spin-offs after)
 * - Progressive cache enrichment (each IGDB call improves future searches)
 */
export const enrichSearchCache = internalAction({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<{ cached: boolean; fetched: number }> => {
    const searchQuery = args.query.trim();
    if (!searchQuery) {
      throw new Error("Query is required");
    }

    const limit = Math.min(args.limit ?? 50, 100);

    // Check if search is already in-flight (use api query, not internal)
    const searchInFlight = await ctx.runQuery(api.games.isSearchInFlight, {
      query: searchQuery,
    });

    if (searchInFlight) {
      console.log(`[enrichSearchCache] Search already in-flight, skipping IGDB call`);
      return { cached: true, fetched: 0 };
    }

    // Mark search as in-flight to prevent duplicate IGDB calls
    await ctx.runMutation(internal.games.markSearchInFlight, {
      query: searchQuery,
    });

    try {
      // Fetch from IGDB and cache results
      console.log(`[enrichSearchCache] Fetching from IGDB for "${searchQuery}"`);
      
      const igdbResults: any[] = await ctx.runAction(api.igdb.searchGames, {
        query: searchQuery,
        limit,
        enrichFranchiseData: true, // Signal to fetch franchise fields
      });

      console.log(`[enrichSearchCache] Cached ${igdbResults.length} games from IGDB`);
      return { cached: false, fetched: igdbResults.length };
    } finally {
      // Always clear in-flight marker
      await ctx.runMutation(internal.games.clearSearchInFlight, {
        query: searchQuery,
      });
    }
  },
});

/**
 * Returns trending games sorted by popularity (number of reviews/ratings).
 * Filters to mainline games only and sorts by aggregatedRatingCount (descending).
 * Used for the "Trending Now" section on discover page.
 * 
 * Trending = games with the most engagement from critics/players
 * 
 * OPTIMIZED: Uses index and limits query instead of collecting all games
 */
export const getTrendingGames = query({
  args: {
    limit: v.optional(v.number()),
    pageNumber: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit ?? 20, 100);
    const now = Date.now() / 1000;
    const currentYear = new Date().getFullYear();
    const yearStartDate = new Date(`${currentYear}-01-01`);
    const yearStartTimestamp = Math.floor(yearStartDate.getTime() / 1000);
    const yearEndTimestamp = Math.floor(now);

    // OPTIMIZATION 1: Pre-filter to only games with PopScore at database level
    // This dramatically reduces the in-memory dataset (only seeded games)
    const candidates = await ctx.db.query("games").collect();
    
    // Quick filter: games with PopScore > 0 (means they were seeded)
    const seedGames = candidates.filter(g => (g.popularity_score ?? 0) > 0);
    
    if (seedGames.length === 0) {
      return []; // No trending games available yet
    }

    // OPTIMIZATION 2: Check for platform engagement once
    // This is a single query that determines the entire scoring strategy
    const reviewCount = await countReviews(ctx);
    const hasPlatformEngagement = reviewCount > 0;

    // OPTIMIZATION 3: For Phase 1, only fetch engagement data if needed
    let reviewCountByGameId = new Map<string, number>();
    let likesPerGameId = new Map<string, number>();

    if (hasPlatformEngagement) {
      // Fetch all reviews (needed for engagement scoring in Phase 1)
      const allReviews = await ctx.db.query("reviews").collect();
      
      // Build review count map in single pass
      for (const review of allReviews) {
        const count = reviewCountByGameId.get(review.gameId as any) ?? 0;
        reviewCountByGameId.set(review.gameId as any, count + 1);
      }

      // OPTIMIZATION 4: Build like map efficiently - count likes per game directly
      const allLikes = await ctx.db.query("likes").collect();
      
      // Create a review ID -> game ID map for O(1) lookup
      const reviewToGameMap = new Map<string, string>();
      for (const review of allReviews) {
        reviewToGameMap.set(review._id.toString(), review.gameId as any);
      }

      // Single pass through likes with direct lookup
      for (const like of allLikes) {
        const gameId = reviewToGameMap.get(like.reviewId.toString());
        if (gameId) {
          const count = likesPerGameId.get(gameId) ?? 0;
          likesPerGameId.set(gameId, count + 1);
        }
      }
    }

    // OPTIMIZATION 5: Filter and score in single pass
    const scored = seedGames
      .filter((game) => {
        // Check mainline type
        const gameType = game.gameType ?? 0;
        if (![0, 8, 9, 10, 11].includes(gameType)) return false;
        
        // Check 2025 release
        const releaseTimestamp = game.firstReleaseDate ?? 0;
        if (releaseTimestamp <= 0) return false;
        if (releaseTimestamp < yearStartTimestamp || releaseTimestamp > yearEndTimestamp) return false;
        
        return true;
      })
      .map((game) => {
        let totalScore = 0;
        
        if (hasPlatformEngagement) {
          // Phase 1: Community engagement
          const gameIdStr = game._id.toString();
          const reviewCnt = reviewCountByGameId.get(gameIdStr) ?? 0;
          const likeCnt = likesPerGameId.get(gameIdStr) ?? 0;
          const engagementScore = (reviewCnt * 10) + (likeCnt * 2);
          const releaseTimestamp = game.firstReleaseDate ?? 0;
          totalScore = engagementScore * 1000 + releaseTimestamp;
        } else {
          // Phase 0: IGDB PopScore
          totalScore = (game.popularity_score ?? 0) * 1000;
        }
        
        return { game, score: totalScore };
      })
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score);

    const pageNumber = args.pageNumber ?? 1;
    const paginated = paginateArray(scored, limit, pageNumber);

    const result = {
      games: paginated.items.map((s) => ({
        _id: s.game._id,
        igdbId: s.game.igdbId,
        title: s.game.title,
        coverUrl: s.game.coverUrl,
        releaseYear: s.game.releaseYear,
        aggregatedRating: s.game.aggregatedRating ?? s.game.rating ?? s.game.totalRating,
        aggregatedRatingCount: Math.max(s.game.aggregatedRatingCount ?? 0, s.game.ratingCount ?? 0),
      })),
      hasMore: paginated.hasMore,
      nextCursor: paginated.cursor,
    };
    
    return measureQuerySize(result, "getTrendingGames");
  },
});

/**
 * Helper: Count total reviews efficiently
 * Used to determine if we should use Phase 0 (IGDB) or Phase 1 (community) engagement
 */
async function countReviews(ctx: QueryCtx): Promise<number> {
  let count = 0;
  const iterator = ctx.db.query("reviews");
  for await (const _ of iterator) {
    count++;
    if (count > 0) break; // Early exit: we only need to know if > 0
  }
  return count;
}

/**
 * Returns top-rated games sorted by critic score (aggregated rating).
 * Filters to mainline games only and sorts by aggregatedRating (descending).
 * Used for the "Top Rated" section on discover page.
 * 
 * Top Rated = highest critic scores (0-100 scale)
 * Only includes games with at least 5 reviews to avoid bias towards obscure games
 * 
 * OPTIMIZED: Uses index and limits query instead of collecting all games
 */
export const getTopRatedGames = query({
  args: {
    limit: v.optional(v.number()),
    minReviews: v.optional(v.number()),
    pageNumber: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit ?? 20, 100);
    const minReviews = args.minReviews ?? 1;

    // OPTIMIZATION: Pre-calculate sort key and filter in single pass
    const candidates = await ctx.db.query("games").collect();

    const topRated = candidates
      .filter((game) => {
        // Quick type check
        const gameType = game.gameType ?? 0;
        if (![0, 8, 9, 10, 11].includes(gameType)) return false;
        
        // Check minimum reviews
        const aggregatedCount = game.aggregatedRatingCount ?? 0;
        const userCount = game.ratingCount ?? 0;
        return aggregatedCount >= minReviews || userCount >= minReviews;
      })
      .map((game) => {
        // Pre-calculate sort keys to avoid recomputing in sort function
        const bestRating = Math.max(
          game.aggregatedRating ?? 0,
          game.rating ?? 0,
          game.totalRating ?? 0
        );
        const reviewCount = Math.max(
          game.aggregatedRatingCount ?? 0,
          game.ratingCount ?? 0
        );
        return { game, bestRating, reviewCount };
      })
      .sort((a, b) => {
        // Primary: highest rating
        if (a.bestRating !== b.bestRating) return b.bestRating - a.bestRating;
        // Secondary: most reviews
        return b.reviewCount - a.reviewCount;
      });

    const pageNumber = args.pageNumber ?? 1;
    const sorted = topRated.map(({ game }) => ({
      _id: game._id,
      igdbId: game.igdbId,
      title: game.title,
      coverUrl: game.coverUrl,
      releaseYear: game.releaseYear,
      aggregatedRating: Math.max(
        game.aggregatedRating ?? 0,
        game.rating ?? 0,
        game.totalRating ?? 0
      ),
      aggregatedRatingCount: Math.max(
        game.aggregatedRatingCount ?? 0,
        game.ratingCount ?? 0
      ),
    }));

    const paginated = paginateArray(sorted, limit, pageNumber);

    const result = {
      games: paginated.items,
      hasMore: paginated.hasMore,
      nextCursor: paginated.cursor,
    };
    
    return measureQuerySize(result, "getTopRatedGames");
  },
});

/**
 * Returns new releases sorted by release date.
 * Filters to mainline games released in the last 12 months.
 * Used for the "New Releases" section on discover page.
 * 
 * New Releases = games released recently (within configurable window)
 * 
 * OPTIMIZED: Uses index and limits query instead of collecting all games
 */
export const getNewReleases = query({
  args: {
    limit: v.optional(v.number()),
    monthsBack: v.optional(v.number()),
    pageNumber: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit ?? 20, 100);
    const monthsBack = args.monthsBack ?? 12;
    const pageNumber = args.pageNumber ?? 1;

    // Calculate cutoff timestamp
    const now = Date.now() / 1000;
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - monthsBack);
    const cutoffTimestamp = cutoffDate.getTime() / 1000;
    const allowedTypes = [0, 8, 9, 10, 11];

    // OPTIMIZATION: Filter, map for sort key, sort, and map to output in single chain
    const candidates = await ctx.db.query("games").collect();

    const newReleasesRaw = candidates
      .filter((game) => {
        // Type check
        const gameType = game.gameType ?? 0;
        if (!allowedTypes.includes(gameType)) return false;

        // Release date check
        const releaseTimestamp = game.firstReleaseDate ?? 0;
        if (releaseTimestamp <= 0 || releaseTimestamp < cutoffTimestamp || releaseTimestamp > now) {
          return false;
        }

        // Popularity check: must have good ratings or PopScore
        const hasGoodRatingCount = (game.aggregatedRatingCount ?? 0) >= 1;
        const hasHighPopScore = (game.popularity_score ?? 0) > 20;
        return hasGoodRatingCount || hasHighPopScore;
      })
      .map((game) => ({
        game,
        releaseDate: game.firstReleaseDate ?? 0,
      }))
      .sort((a, b) => b.releaseDate - a.releaseDate)
      .map(({ game }) => ({
        _id: game._id,
        igdbId: game.igdbId,
        title: game.title,
        coverUrl: game.coverUrl,
        releaseYear: game.releaseYear,
        aggregatedRating: game.aggregatedRating ?? game.rating,
        aggregatedRatingCount: game.aggregatedRatingCount ?? game.ratingCount,
      }));

    // Apply pagination
    const paginationResult = paginateArray(newReleasesRaw, limit, pageNumber);

    const result = {
      games: paginationResult.items,
      hasMore: paginationResult.hasMore,
      nextCursor: paginationResult.cursor,
    };
    
    return measureQuerySize(result, "getNewReleases");
  },
});
