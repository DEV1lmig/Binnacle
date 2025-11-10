/**
 * Actions for interacting with the IGDB API.
 */
import { action, ActionCtx } from "./_generated/server";
import { v } from "convex/values";
import { internal, api } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { measureQuerySize } from "./lib/bandwidthMonitor";

const minimumTokenTtlMs = 60_000;
const defaultLimit = 10;

// IGDB enforces a hard cap of 500 records per request. Use pagination to go beyond that.
const IGDB_MAX_PAGE_SIZE = 500;
const DEFAULT_SEED_LIMIT = 5000;
const MAX_SEED_LIMIT = 5000;

/**
 * Searches IGDB for games and caches the results in the Convex database.
 * 
 * Strategy for Relevant Franchise Searches:
 * 1. Search using IGDB's text search (sorted by IGDB relevance)
 * 2. Filter to MAIN GAMES only (category = 0) to exclude DLC/expansions/remakes
 * 3. Sort by popularity (aggregated_rating_count) for true relevance
 * 
 * Example: "Zelda" query returns main Legend of Zelda games, not CD-i variants or minor spinoffs
 * 
 * Supported filters:
 * - platforms: Filter by platform IDs (e.g., PC=6, PS5=167, Switch=130)
 * - genres: Filter by genre IDs (e.g., RPG=12, Shooter=5, Adventure=31)
 * - minRating: Minimum aggregated rating (0-100)
 * - releaseYearMin/Max: Filter by release year range
 */
export const searchGames = action({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
    platforms: v.optional(v.array(v.number())),
    genres: v.optional(v.array(v.number())),
    minRating: v.optional(v.number()),
    releaseYearMin: v.optional(v.number()),
    releaseYearMax: v.optional(v.number()),
    enrichFranchiseData: v.optional(v.boolean()), // Signal to fetch franchise fields
    includeDLC: v.optional(v.boolean()), // Include DLC/expansions in results
  },
  handler: async (ctx, args) => {
    const trimmedQuery = args.query.trim();
    if (!trimmedQuery) {
      throw new Error("Query is required to search IGDB");
    }

    const limit = args.limit ?? defaultLimit;
    if (limit <= 0) {
      throw new Error("Limit must be a positive number");
    }

    const includeDLC = args.includeDLC ?? false;

    // Cap the limit so that limit * 3 doesn't exceed IGDB max (500)
    const cappedLimit = Math.min(limit, 150); // 150 * 3 = 450 < 500
    const igdbFetchLimit = cappedLimit * 3;

    const { accessToken } = await getValidIgdbToken(ctx);
    const response = await fetch("https://api.igdb.com/v4/games", {
      method: "POST",
      headers: {
        "Client-ID": getClientId(),
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "text/plain",
      },
      body: buildQuery(trimmedQuery, igdbFetchLimit, { // Use capped limit
        platforms: args.platforms,
        genres: args.genres,
        minRating: args.minRating,
        releaseYearMin: args.releaseYearMin,
        releaseYearMax: args.releaseYearMax,
      }),
    });

    if (!response.ok) {
      const details = await safeReadError(response);
      throw new Error(`IGDB request failed: ${response.status} ${details}`);
    }

    const rawGames = (await response.json()) as IgdbGame[];
    
    console.log(`[searchGames] Raw IGDB results: ${rawGames.length} games returned`);
    if (rawGames.length > 0) {
      console.log(`[searchGames] First game: "${rawGames[0].name}" category=${rawGames[0].category} gameType=${rawGames[0].game_type}`);
    }
    
    // Filter games based on includeDLC setting
    // DLC/Expansion categories: 1 (DLC), 2 (Expansion), 4 (Standalone Expansion), 5 (Mod), 6 (Episode)
    // If includeDLC = false, exclude these categories
    let filteredGames = rawGames;
    if (!includeDLC && rawGames.length > 0) {
      const excludeCategories = [1, 2, 4, 5, 6];
      filteredGames = rawGames.filter(game => 
        !game.category || !excludeCategories.includes(game.category)
      );
      console.log(`[searchGames] After filtering DLC: ${filteredGames.length} games`);
    }
    
    // If we filtered too many out, fall back to all results (prefer more games over strict filtering)
    if (filteredGames.length === 0 && rawGames.length > 0) {
      console.log(`[searchGames] No main games found after filtering, using all results`);
      filteredGames = rawGames;
    }
    
    // Sort by popularity (aggregated_rating_count) descending for true relevance
    // Games with more ratings are more well-known and relevant
    const sortedGames = filteredGames.sort((a, b) => {
      const aCount = a.aggregated_rating_count ?? 0;
      const bCount = b.aggregated_rating_count ?? 0;
      return bCount - aCount;
    });
    
    // Take only the requested limit after sorting
    const relevantGames = sortedGames.slice(0, cappedLimit);
    
    const normalizedGames = normalizeGames(relevantGames);

    const hydratedGames: CachedGame[] = [];

    for (const game of normalizedGames) {
      const convexId = await ctx.runMutation(internal.games.upsertFromIgdb, {
        igdbId: game.igdbId,
        title: game.title,
        coverUrl: game.coverUrl,
        releaseYear: game.releaseYear,
        summary: game.summary,
        storyline: game.storyline,
        genres: game.genres,
        platforms: game.platforms,
        themes: game.themes,
        playerPerspectives: game.playerPerspectives,
        gameModes: game.gameModes,
        artworks: game.artworks,
        screenshots: game.screenshots,
        videos: game.videos,
        websites: game.websites,
        developers: game.developers,
        publishers: game.publishers,
        aggregatedRating: game.aggregatedRating,
        aggregatedRatingCount: game.aggregatedRatingCount,
        hypes: game.hypes,
        franchise: game.franchise,
        franchises: game.franchises,
        ageRatings: game.ageRatings,
        gameStatus: game.gameStatus,
        languageSupports: game.languageSupports,
        multiplayerModes: game.multiplayerModes,
        similarGames: game.similarGames,
        dlcsAndExpansions: game.dlcsAndExpansions,
        category: game.category,
        gameType: game.gameType,
      });

      hydratedGames.push({ ...game, convexId });
    }

    return hydratedGames;
  },
});

/**
 * Phase 1 Caching Helper: Fetch a single game by IGDB ID for auto-caching
 * 
 * Called from games.cacheGameFromIgdb during:
 * - Review creation
 * - Backlog addition
 * - Game detail page load (if not cached)
 * 
 * Returns normalized game data ready for upsertFromIgdb
 */
export const fetchGameById = action({
  args: { igdbId: v.number() },
  handler: async (ctx, args) => {
    const { accessToken } = await getValidIgdbToken(ctx);
    const clientId = getClientId();

    // Fetch full game details from IGDB
    const response = await fetch("https://api.igdb.com/v4/games", {
      method: "POST",
      headers: {
        "Client-ID": clientId,
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "text/plain",
      },
      body: `fields id,name,first_release_date,cover.image_id,category,game_type,parent_game,version_parent,
        summary,storyline,
        genres.id,genres.name,
        platforms.id,platforms.name,
        themes.id,themes.name,
        player_perspectives.id,player_perspectives.name,
        game_modes.id,game_modes.name,
        artworks.id,artworks.url,
        screenshots.id,screenshots.url,
        videos.id,videos.video_id,videos.name,
        websites.id,websites.category,websites.url,
        involved_companies.id,involved_companies.company.id,involved_companies.company.name,involved_companies.developer,involved_companies.publisher,
        aggregated_rating,aggregated_rating_count,
        age_ratings.id,age_ratings.rating,age_ratings.organization.id,age_ratings.organization.name,
        game_status.id,game_status.name,
        language_supports.id,language_supports.language.id,language_supports.language.name,
        multiplayer_modes.id,multiplayer_modes.campaigncoop,multiplayer_modes.dropin,multiplayer_modes.lancoop,multiplayer_modes.offlinecoop,multiplayer_modes.offlinecoopmax,multiplayer_modes.onlinecoop,multiplayer_modes.onlinecoopmax,multiplayer_modes.onlinemultiplayer,multiplayer_modes.onlinemultiplayer_max,multiplayer_modes.onlinemultiplayer_min,multiplayer_modes.platform,multiplayer_modes.splitscreen,multiplayer_modes.splitscreenonline,
        similar_games.id,similar_games.name,
        hypes,
        franchise.id,franchise.name,
        franchises.id,franchises.name,
        dlcs.id,dlcs.name,dlcs.first_release_date,
        expansions.id,expansions.name,expansions.first_release_date;
where id = ${args.igdbId};`,
    });

    if (!response.ok) {
      const errorText = await safeReadError(response);
      throw new Error(`IGDB error (${response.status}): ${errorText}`);
    }

    const rawGames = (await response.json()) as IgdbGame[];
    if (rawGames.length === 0) {
      throw new Error(`Game with IGDB ID ${args.igdbId} not found`);
    }

    const [normalizedGame] = normalizeGames(rawGames);
    
    // Fetch related DLCs and expansions
    let dlcsAndExpansionsJson: string | undefined;
    try {
      const dlcResponse = await fetch("https://api.igdb.com/v4/games", {
        method: "POST",
        headers: {
          "Client-ID": clientId,
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "text/plain",
        },
        body: `fields id,name,first_release_date;
where parent_game = ${args.igdbId} & (game_status = (7, 8));
limit 500;`,
      });

      if (dlcResponse.ok) {
        const dlcs = (await dlcResponse.json()) as Array<{ id: number; name: string; first_release_date?: number }>;
        const dlcList = dlcs.map((dlc) => ({
          id: dlc.id,
          title: dlc.name,
          releaseDate: dlc.first_release_date
            ? new Date(dlc.first_release_date * 1000).getUTCFullYear()
            : undefined,
        }));
        dlcsAndExpansionsJson = dlcList.length > 0 ? JSON.stringify(dlcList) : undefined;
      }
    } catch (error) {
      console.warn(`[fetchGameById] Failed to fetch DLCs for game ${args.igdbId}:`, error);
    }

    // Return normalized data (ready for upsertFromIgdb)
    return {
      ...normalizedGame,
      dlcsAndExpansions: dlcsAndExpansionsJson,
    };
  },
});

/**
 * Optimized search pipeline: Database first, IGDB fallback with caching.
 * 
 * Strategy:
 * 1. First tries searchOptimized query (fast, from cache)
 * 2. If insufficient results, calls searchGames (IGDB API with filtering)
 * 3. Caches IGDB results automatically
 * 4. Prevents race conditions with in-flight markers
 * 5. Returns pagination cursors for infinite scroll
 * 
 * Usage:
 * ```
 * const results = await action(api.igdb.searchOptimizedWithFallback, {
 *   query: "zelda",
 *   limit: 20,
 *   offset: 0
 * });
 * ```
 */
export const searchOptimizedWithFallback = action({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
    includeDLC: v.optional(v.boolean()),
    minCachedResults: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<{
    results: any[];
    total: number;
    source: "cache" | "live" | "merged";
    cursor: number | null;
    hasMore: boolean;
    confidence: "high" | "medium" | "low";
    latencyMs: number;
    wasFallbackNeeded: boolean;
    debug: { cacheResults: number; liveResults: number; error?: string };
    error?: string;
  }> => {
    const query = args.query.trim();
    const limit = Math.min(args.limit ?? 20, 100);
    const offset = args.offset ?? 0;
    const minCachedResults = args.minCachedResults ?? 5;
    const includeDLC = args.includeDLC ?? false;

    const startTime = Date.now();
    console.log(`[searchOptimizedWithFallback] Query: "${query}" offset=${offset} limit=${limit}`);

    // STEP 1: Try database first (query)
    const cachedResults: any = await ctx.runQuery(api.games.searchOptimized, {
      query,
      limit, // Request exact limit, not 3x
      offset: 0,
      includeDLC,
      minCachedResults,
    });

    console.log(`[searchOptimizedWithFallback] Cache: ${cachedResults.results.length} results, source=${cachedResults.source}`);

    // STEP 2: Determine if we need IGDB fallback using intelligent franchise-aware logic
    let shouldFetchFromIgdb = false;
    
    console.log(`[searchOptimizedWithFallback] Checking thresholds: ${cachedResults.results.length} < ${minCachedResults}? ${cachedResults.results.length < minCachedResults}`);
    
    if (cachedResults.results.length === 0) {
      // No cached results at all - definitely fetch from IGDB
      shouldFetchFromIgdb = true;
      console.log(`[searchOptimizedWithFallback] No cached results - will fetch from IGDB`);
    } else if (cachedResults.results.length < minCachedResults) {
      console.log(`[searchOptimizedWithFallback] Below threshold (${cachedResults.results.length} < ${minCachedResults}), checking franchise...`);
      // Few results - analyze franchise completeness using actual franchise data from cached games
      try {
        // Try to extract franchise name from ANY cached game (no extra DB queries needed!)
        let franchiseName: string | null = null;
        
        for (const result of cachedResults.results) {
          // Check franchises field directly from search results (no DB query!)
          if (result.franchises) {
            try {
              const franchisesArray = JSON.parse(result.franchises);
              if (Array.isArray(franchisesArray) && franchisesArray.length > 0) {
                // Get the first franchise from the array
                const firstFranchise = franchisesArray[0];
                franchiseName = typeof firstFranchise === 'string' 
                  ? firstFranchise 
                  : firstFranchise?.name;
                
                if (franchiseName) {
                  console.log(`[searchOptimizedWithFallback] Found franchise from search results: "${franchiseName}"`);
                  break; // Found franchise, stop searching
                }
              }
            } catch (e) {
              console.warn(`[searchOptimizedWithFallback] Failed to parse franchises field`);
            }
          }
        }
        
        if (franchiseName) {
          console.log(`[searchOptimizedWithFallback] Analyzing franchise: "${franchiseName}"`);
          
          // Count how many games we have for this franchise in our database
          const franchiseGamesInDb = await ctx.runQuery(api.games.countGamesByFranchise, {
            franchiseName,
          });
          
          console.log(`[searchOptimizedWithFallback] Franchise "${franchiseName}": ${franchiseGamesInDb} games in DB, ${cachedResults.results.length} in search results`);
          
          // Check if we have metadata cached for this franchise
            const franchiseMetadata = await ctx.runQuery(internal.franchiseMetadata.getFranchiseMetadata, {
              franchiseName,
            });

            // Use cached metadata only if it's valid (not stale AND has valid data)
            if (franchiseMetadata && !franchiseMetadata.isStale && franchiseMetadata.totalGamesOnIgdb > 0) {
              // We have recent metadata - use it to make decision
              const cachePercentage = (franchiseGamesInDb / franchiseMetadata.totalGamesOnIgdb) * 100;
              
              console.log(`[searchOptimizedWithFallback] Franchise metadata (cached): ${franchiseGamesInDb} cached / ${franchiseMetadata.totalGamesOnIgdb} total (${cachePercentage.toFixed(1)}%)`);
              
              // Fetch from IGDB if:
              // - We have less than 80% of the franchise cached
              // - OR if the franchise has more than 5 games and we have less than 5 cached
              if (
                cachePercentage < 80 || 
                (franchiseMetadata.totalGamesOnIgdb > 5 && franchiseGamesInDb < 5)
              ) {
                shouldFetchFromIgdb = true;
                console.log(`[searchOptimizedWithFallback] Franchise incomplete - will fetch from IGDB`);
              } else {
                console.log(`[searchOptimizedWithFallback] Franchise mostly cached (${cachePercentage.toFixed(1)}%) - using cache only`);
              }
            } else {
              // No metadata, stale, or invalid (totalGamesOnIgdb = 0) - fetch count from IGDB
              console.log(`[searchOptimizedWithFallback] Metadata ${!franchiseMetadata ? 'missing' : franchiseMetadata.isStale ? 'stale' : 'invalid (0 games)'} - querying IGDB...`);
              const { accessToken } = await getValidIgdbToken(ctx);
              const sanitizedFranchise = franchiseName.replace(/"/g, "\\\"");
              
              // Query IGDB for total games in this franchise
              // Since franchises is an array field, we need to use the search approach
              // Search for games and filter by franchise name
              const countResponse = await fetch("https://api.igdb.com/v4/games/count", {
                method: "POST",
                headers: {
                  "Client-ID": getClientId(),
                  Authorization: `Bearer ${accessToken}`,
                  "Content-Type": "text/plain",
                },
                // Use search with franchise filter instead of direct where clause
                body: `search "${sanitizedFranchise}"; where category = 0;`,
              });
              
              if (countResponse.ok) {
                const totalCount = await countResponse.json();
                
                // If search returned 0, it means the franchise name might not match or there's an issue
                // In this case, just fetch from IGDB to be safe
                if (totalCount.count === 0) {
                  console.log(`[searchOptimizedWithFallback] IGDB count returned 0 - will fetch from IGDB to find more games`);
                  shouldFetchFromIgdb = true;
                } else {
                  const cachePercentage = (franchiseGamesInDb / (totalCount.count || 1)) * 100;
                  
                  console.log(`[searchOptimizedWithFallback] Franchise analysis (IGDB): ${franchiseGamesInDb} cached / ${totalCount.count} total (${cachePercentage.toFixed(1)}%)`);
                  
                  // Store metadata for next time
                  await ctx.runMutation(internal.franchiseMetadata.updateFranchiseMetadata, {
                    franchiseName,
                    totalGamesOnIgdb: totalCount.count || 0,
                    cachedGamesCount: franchiseGamesInDb,
                  });
                  
                  // Fetch from IGDB if we have less than 80% of the franchise cached
                  // OR if the franchise has more than 5 games and we have less than 5 cached
                  if (cachePercentage < 80 || (totalCount.count > 5 && franchiseGamesInDb < 5)) {
                    shouldFetchFromIgdb = true;
                    console.log(`[searchOptimizedWithFallback] Franchise incomplete - will fetch from IGDB`);
                  } else {
                    console.log(`[searchOptimizedWithFallback] Franchise mostly cached (${cachePercentage.toFixed(1)}%) - using cache only`);
                  }
                }
              }
            }
        } else {
          // No franchise data - fall back to simple threshold
          console.log(`[searchOptimizedWithFallback] No franchise data found, using simple threshold`);
          shouldFetchFromIgdb = cachedResults.results.length < minCachedResults;
        }
      } catch (error) {
        console.error(`[searchOptimizedWithFallback] Franchise analysis failed:`, error);
        // Fallback to simple threshold if metadata check fails
        shouldFetchFromIgdb = cachedResults.results.length < minCachedResults;
      }
    }

    // STEP 3: Fetch from IGDB if needed
    if (shouldFetchFromIgdb && cachedResults.source !== "live") {
      console.log(`[searchOptimizedWithFallback] Insufficient cache, fetching from IGDB...`);

      // Check for in-flight searches to prevent duplicate API calls (race condition fix)
      const isInFlight: boolean = await ctx.runQuery(api.games.isSearchInFlight, { query });
      if (isInFlight) {
        console.log(`[searchOptimizedWithFallback] Search already in-flight, returning cache only`);
        // Return cached results even if insufficient, to avoid duplicate API calls
        return {
          ...cachedResults,
          source: "cache" as const,
          wasFallbackNeeded: false,
        };
      }

      try {
        // Mark as in-flight
        await ctx.runMutation(internal.games.markSearchInFlight, { query });

        // Fetch from IGDB (searchGames already multiplies limit * 3 internally)
        const liveResults: any[] = await ctx.runAction(api.igdb.searchGames, {
          query,
          limit, // Don't multiply by 3 here - searchGames handles it internally
          includeDLC, // Pass includeDLC setting to searchGames
        });

        console.log(`[searchOptimizedWithFallback] IGDB: ${liveResults.length} results fetched`);

        // Cache the results (happens in searchGames automatically via upsertFromIgdb)
        // Now merge with existing cached results
        const mergedResults: any[] = [...cachedResults.results];
        const existingIds = new Set(mergedResults.map((r: any) => r.igdbId));

        for (const game of liveResults) {
          if (!existingIds.has(game.igdbId)) {
            mergedResults.push({
              convexId: game.convexId,
              igdbId: game.igdbId,
              title: game.title,
              coverUrl: game.coverUrl,
              releaseYear: game.releaseYear,
              aggregatedRating: game.aggregatedRating,
              aggregatedRatingCount: game.aggregatedRatingCount,
              category: game.category,
              gameType: game.gameType,
            });
            existingIds.add(game.igdbId);
          }
        }

        // Apply pagination
        const paginatedResults = mergedResults.slice(offset, offset + limit);
        const hasMore = mergedResults.length > offset + limit;

        const latencyMs = Date.now() - startTime;
        console.log(`[searchOptimizedWithFallback] Merged ${mergedResults.length}, returning ${paginatedResults.length}, latency=${latencyMs}ms`);

        return {
          results: paginatedResults,
          total: mergedResults.length,
          source: "merged" as const,
          cursor: hasMore ? offset + limit : null,
          hasMore,
          confidence: "high" as const,
          latencyMs,
          wasFallbackNeeded: true,
          debug: {
            cacheResults: cachedResults.results.length,
            liveResults: liveResults.length,
          },
        };
      } catch (error) {
        console.error("[searchOptimizedWithFallback] IGDB fallback failed:", error);
        // Return cache even if fallback fails
        return {
          ...cachedResults,
          source: "cache" as const,
          wasFallbackNeeded: false,
          error: String(error),
        };
      } finally {
        // Always clear in-flight marker
        await ctx.runMutation(internal.games.clearSearchInFlight, { query });
      }
    }

    // STEP 3: Apply pagination to cached results
    const paginatedResults = cachedResults.results.slice(offset, Math.min(offset + limit, cachedResults.results.length));
    const hasMore = cachedResults.results.length > offset + limit;

    const latencyMs = Date.now() - startTime;
    console.log(`[searchOptimizedWithFallback] Returning ${paginatedResults.length} cached results, latency=${latencyMs}ms`);

    return {
      results: paginatedResults,
      total: cachedResults.results.length,
      source: "cache" as const,
      cursor: hasMore ? offset + limit : null,
      hasMore,
      confidence: cachedResults.confidence,
      latencyMs,
      wasFallbackNeeded: false,
      debug: cachedResults.debug,
    };
  },
});

/**
 * Fetches related content (DLC, expansions, mods, episodes, etc.) for a game.
 * 
 * Strategy:
 * 1. Search IGDB using the game title to find all related games
 * 2. Filter results to find DLC, expansions, mods, and other related content
 * 3. Return categorized results for display on game detail page
 * 4. Optionally cache results in database for persistence
 */
export const fetchRelatedContent = action({
  args: {
    gameTitle: v.string(),
    igdbId: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { accessToken } = await getValidIgdbToken(ctx);
    const categoryKeyByType: Record<number, string> = {
      1: "dlc",
      2: "expansion",
      3: "bundle",
      4: "standalone_expansion",
      5: "mod",
      6: "episode",
      7: "season",
      8: "remake",
      9: "remaster",
      10: "expanded_game",
      11: "port",
      12: "fork",
      13: "pack",
      14: "update",
    };

    type RelatedItem = {
      id: number;
      title: string;
      releaseDate?: number;
      category: string;
    };

    const seenIds = new Set<number>();
    const relatedItems: RelatedItem[] = [];

    const addItem = (item: {
      id: number;
      name: string;
      first_release_date?: number;
      category?: number;
      game_type?: number;
    }) => {
      if (!item?.id || !item.name) {
        return;
      }

      const typeValue = item.game_type ?? item.category;
      if (typeValue === undefined || typeValue === 0) {
        return;
      }

      if (seenIds.has(item.id)) {
        return;
      }

      seenIds.add(item.id);
      relatedItems.push({
        id: item.id,
        title: item.name,
        releaseDate: item.first_release_date
          ? new Date(item.first_release_date * 1000).getUTCFullYear()
          : undefined,
        category: categoryKeyByType[typeValue] ?? "related",
      });
    };

    const fetchDetailsForIds = async (ids: number[]) => {
      if (!ids || ids.length === 0) {
        return;
      }

      const uniqueIds = Array.from(new Set(ids.filter((id) => typeof id === "number" && id > 0)));
      if (uniqueIds.length === 0) {
        return;
      }

      const chunks: number[][] = [];
      for (let i = 0; i < uniqueIds.length; i += 500) {
        chunks.push(uniqueIds.slice(i, i + 500));
      }

      // Fetch each chunk sequentially to stay within IGDB request limits
      for (const chunk of chunks) {
        const response = await fetch("https://api.igdb.com/v4/games", {
          method: "POST",
          headers: {
            "Client-ID": getClientId(),
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "text/plain",
          },
          body: `fields id,name,first_release_date,category,game_type,parent_game,version_parent;
where id = (${chunk.join(",")});
limit ${chunk.length};`,
        });

        if (!response.ok) {
          const details = await safeReadError(response);
          throw new Error(`IGDB request failed: ${response.status} ${details}`);
        }

        const chunkResults = (await response.json()) as Array<{
          id: number;
          name: string;
          first_release_date?: number;
          category?: number;
          game_type?: number;
        }>;

        chunkResults.forEach(addItem);
      }
    };

    const referencedIds = new Set<number>();

    if (args.igdbId) {
      // Fetch direct relationship fields from the base game
      const detailsResponse = await fetch("https://api.igdb.com/v4/games", {
        method: "POST",
        headers: {
          "Client-ID": getClientId(),
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "text/plain",
        },
        body: `fields id,dlcs,expansions,standalone_expansions,expanded_games,remasters,remakes,ports,bundles,forks,parent_game,version_parent;
where id = ${args.igdbId};
limit 1;`,
      });

      if (detailsResponse.ok) {
        const [baseGame] = (await detailsResponse.json()) as Array<{
          dlcs?: number[];
          expansions?: number[];
          standalone_expansions?: number[];
          expanded_games?: number[];
          remasters?: number[];
          remakes?: number[];
          ports?: number[];
          bundles?: number[];
          forks?: number[];
          parent_game?: number;
          version_parent?: number;
        }>;

        if (baseGame) {
          const relationArrays = [
            baseGame.dlcs,
            baseGame.expansions,
            baseGame.standalone_expansions,
            baseGame.expanded_games,
            baseGame.remasters,
            baseGame.remakes,
            baseGame.ports,
            baseGame.bundles,
            baseGame.forks,
          ];

          relationArrays.forEach((list) => {
            if (Array.isArray(list)) {
              list.forEach((id) => referencedIds.add(id));
            }
          });

          // Some DLCs or expansions might reference the base game via parent/versions only
          if (baseGame.parent_game) {
            referencedIds.add(baseGame.parent_game);
          }
          if (baseGame.version_parent) {
            referencedIds.add(baseGame.version_parent);
          }
        }
      }

      // Fetch games that explicitly reference this game as their parent or version parent
      const inverseResponse = await fetch("https://api.igdb.com/v4/games", {
        method: "POST",
        headers: {
          "Client-ID": getClientId(),
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "text/plain",
        },
        body: `fields id,name,first_release_date,category,game_type,parent_game,version_parent;
where parent_game = ${args.igdbId} | version_parent = ${args.igdbId};
limit 500;`,
      });

      if (inverseResponse.ok) {
        const inverseResults = (await inverseResponse.json()) as Array<{
          id: number;
          name: string;
          first_release_date?: number;
          category?: number;
          game_type?: number;
        }>;

        inverseResults.forEach(addItem);
      }
    }

    if (referencedIds.size > 0) {
      await fetchDetailsForIds(Array.from(referencedIds));
    }

    // Fallback to title search if we still don't have results
    if (relatedItems.length === 0) {
      const baseTitleMatch = args.gameTitle.match(/^([^(–\n]+)/);
      const baseTitle = baseTitleMatch ? baseTitleMatch[1].trim() : args.gameTitle;
      const sanitizedQuery = baseTitle.replace(/"/g, "\\\"");

      const response = await fetch("https://api.igdb.com/v4/games", {
        method: "POST",
        headers: {
          "Client-ID": getClientId(),
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "text/plain",
        },
        body: `search "${sanitizedQuery}";
fields id,name,first_release_date,category,game_type;
limit 500;`,
      });

      if (!response.ok) {
        const details = await safeReadError(response);
        throw new Error(`IGDB request failed: ${response.status} ${details}`);
      }

      const fallbackResults = (await response.json()) as Array<{
        id: number;
        name: string;
        first_release_date?: number;
        category?: number;
        game_type?: number;
      }>;

      fallbackResults.forEach(addItem);
    }

    // Sort by release date (newest first) then alphabetically
    relatedItems.sort((a, b) => {
      const dateDiff = (b.releaseDate ?? 0) - (a.releaseDate ?? 0);
      if (dateDiff !== 0) {
        return dateDiff;
      }
      return a.title.localeCompare(b.title);
    });

    if (args.igdbId && relatedItems.length > 0) {
      try {
        await ctx.runMutation(internal.games.updateRelatedContent, {
          igdbId: args.igdbId,
          relatedContent: JSON.stringify(relatedItems),
        });
      } catch (error) {
        console.error("[fetchRelatedContent] Failed to cache related content", error);
      }
    }

    return relatedItems;
  },
});

/**
 * Fetches DLCs and expansions for a game and stores them in the database.
 */
export const fetchDlcsForGame = action({
  args: {
    igdbId: v.number(),
  },
  handler: async (ctx, args) => {
    const { accessToken } = await getValidIgdbToken(ctx);
    
    // Query IGDB for DLCs and expansions that are part of this parent game
    const response = await fetch("https://api.igdb.com/v4/games", {
      method: "POST",
      headers: {
        "Client-ID": getClientId(),
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "text/plain",
      },
      body: `fields id,name,first_release_date;
where parent_game = ${args.igdbId} & (game_status = (7, 8));
limit 500;`,
    });

    if (!response.ok) {
      const details = await safeReadError(response);
      throw new Error(`IGDB request failed: ${response.status} ${details}`);
    }

    const dlcs = (await response.json()) as Array<{ id: number; name: string; first_release_date?: number }>;
    
    // Format DLCs for storage
    const dlcList = dlcs.map((dlc) => ({
      id: dlc.id,
      title: dlc.name,
      releaseDate: dlc.first_release_date
        ? new Date(dlc.first_release_date * 1000).getUTCFullYear()
        : undefined,
    }));

    return dlcList;
  },
});

/**
 * Fetches a valid IGDB access token, refreshing it if needed.
 */
async function getValidIgdbToken(ctx: ActionCtx): Promise<{ accessToken: string }> {
  const cachedToken = await ctx.runQuery(internal.igdbTokens.getIgdbToken, {});
  const now = Date.now();

  if (
    cachedToken &&
    cachedToken.accessToken &&
    cachedToken.expiresAt - now > minimumTokenTtlMs
  ) {
    return { accessToken: cachedToken.accessToken };
  }

  const freshToken = await requestNewToken();
  await ctx.runMutation(internal.igdbTokens.saveIgdbToken, {
    accessToken: freshToken.accessToken,
    expiresAt: freshToken.expiresAt,
  });

  return { accessToken: freshToken.accessToken };
}

/**
 * Requests a new IGDB access token from Twitch.
 */
async function requestNewToken() {
  const response = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: getClientId(),
      client_secret: getClientSecret(),
      grant_type: "client_credentials",
    }),
  });

  if (!response.ok) {
    const details = await safeReadError(response);
    throw new Error(`Failed to fetch IGDB token: ${response.status} ${details}`);
  }

  const payload = (await response.json()) as TokenResponse;
  const expiresAt = Date.now() + payload.expires_in * 1000;

  return { accessToken: payload.access_token, expiresAt };
}

/**
 * Builds the IGDB query string for the search request with enriched fields.
 * 
 * IMPORTANT: IGDB API Constraint & Solution
 * The 'search' keyword automatically sorts results by IGDB relevance and CANNOT be combined
 * with a 'sort' clause. Any attempt to add sorting will result in a 406 error.
 * See: https://api-docs.igdb.com/#search
 * 
 * Solution Implemented:
 * - Fetch 3x the requested limit from IGDB (to account for filtering)
 * - Filter main games only (category = 0) server-side in searchGames handler
 * - Sort by aggregated_rating_count (popularity) in searchGames handler
 * - Return top N results to user
 * 
 * Quality Ranking Strategy:
 * - Main games (category = 0): Core titles like "Breath of the Wild"
 * - Excluded: DLC (1), Expansions (2), Bundles (3), Standalone Expansions (4), Mods (5), Episodes (6)
 * - Popularity: Games with more community ratings rank higher (indicates mainstream relevance)
 * 
 * Example: "Zelda" query
 * - IGDB search: Returns ~50 Zelda-related results (all categories mixed)
 * - Filter: Keep only category=0 → ~15 main Zelda games
 * - Sort: By aggregated_rating_count → "Breath of the Wild" (most rated) appears first
 * - Result: User gets most relevant Zelda game, not obscure CD-i variant
 */
function buildQuery(
  query: string, 
  limit: number,
  filters: {
    platforms?: number[];
    genres?: number[];
    minRating?: number;
    releaseYearMin?: number;
    releaseYearMax?: number;
  }
) {
  const sanitizedQuery = query.replace(/"/g, "\\\"");
  
  // Build where clause with all filters
  const whereConditions: string[] = [];
  
  // NOTE: Do not add hard-coded quality filters here; IGDB metadata is inconsistent across games.
  // Only user-selected filters should be applied server-side. Quality ranking happens after fetching results.
  
  // Platform filter (OR - game must be on at least one of the selected platforms)
  if (filters.platforms && filters.platforms.length > 0) {
    whereConditions.push(`platforms = (${filters.platforms.join(",")})`);
  }
  
  // Genre filter (OR - game must have at least one of the selected genres)
  if (filters.genres && filters.genres.length > 0) {
    whereConditions.push(`genres = (${filters.genres.join(",")})`);
  }
  
  // Rating filter
  if (filters.minRating !== undefined) {
    whereConditions.push(`aggregated_rating >= ${filters.minRating}`);
  }
  
  // Release year range filter
  if (filters.releaseYearMin !== undefined) {
    const minTimestamp = new Date(`${filters.releaseYearMin}-01-01`).getTime() / 1000;
    whereConditions.push(`first_release_date >= ${minTimestamp}`);
  }
  if (filters.releaseYearMax !== undefined) {
    const maxTimestamp = new Date(`${filters.releaseYearMax}-12-31`).getTime() / 1000;
    whereConditions.push(`first_release_date <= ${maxTimestamp}`);
  }
  
  const whereClause = whereConditions.length > 0 
    ? `where ${whereConditions.join(" & ")};` 
    : "";
  
  // NO sort clause when using 'search' keyword
  // Results are automatically sorted by relevance by IGDB
  
  return `search "${sanitizedQuery}"; 
fields id,name,first_release_date,cover.image_id,category,game_type,version_parent,parent_game,
collections,remakes,remasters,expanded_games,ports,dlcs,expansions,standalone_expansions,
summary,storyline,genres.name,platforms.name,themes.name,
player_perspectives.name,game_modes.name,artworks.url,screenshots.url,
videos.video_id,websites.category,websites.url,
involved_companies.company.name,involved_companies.developer,involved_companies.publisher,
aggregated_rating,aggregated_rating_count,hypes,
franchise.name,franchises.name,
age_ratings.rating,age_ratings.organization.*,
game_status.*,language_supports.language.name,
multiplayer_modes.*,similar_games.name;
${whereClause}
limit ${limit};`;
}

/**
 * Normalizes the IGDB API response so the frontend can consume it easily.
 */
function normalizeGames(rawGames: IgdbGame[]): NormalizedGame[] {
  return rawGames.map((game) => {
    const coverId = game.cover?.image_id;
    const releaseYear = game.first_release_date
      ? new Date(game.first_release_date * 1000).getUTCFullYear()
      : undefined;

    // Extract developers and publishers from involved_companies
    const developers = game.involved_companies
      ?.filter((ic) => ic.developer)
      .map((ic) => ({ id: ic.company.id, name: ic.company.name, role: "Developer" }));
    const publishers = game.involved_companies
      ?.filter((ic) => ic.publisher)
      .map((ic) => ({ id: ic.company.id, name: ic.company.name, role: "Publisher" }));

    // Build image URLs for artworks and screenshots
    // Use t_1080p for maximum quality (1920x1080)
    const artworks = game.artworks?.map((art) => {
      const filename = art.url.split("/").pop() || "";
      // Don't add .jpg if filename already has an extension
      const urlWithExtension = filename.includes(".") ? filename : `${filename}.jpg`;
      return `https://images.igdb.com/igdb/image/upload/t_1080p/${urlWithExtension}`;
    });
    const screenshots = game.screenshots?.map((screenshot) => {
      const filename = screenshot.url.split("/").pop() || "";
      // Don't add .jpg if filename already has an extension
      const urlWithExtension = filename.includes(".") ? filename : `${filename}.jpg`;
      return `https://images.igdb.com/igdb/image/upload/t_1080p/${urlWithExtension}`;
    });

    // Build game status string
    const gameStatus = game.game_status?.name || undefined;

    return {
      igdbId: game.id,
      title: game.name,
      coverUrl: coverId
        ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${coverId}.jpg`
        : undefined,
      releaseYear,
      firstReleaseDate: game.first_release_date,
      category: game.category ?? undefined,
      gameType: game.game_type ?? undefined,
      parentGameId: game.parent_game ?? undefined,
      versionParentId: game.version_parent ?? undefined,
      collections: game.collections ? JSON.stringify(game.collections) : undefined,
      summary: game.summary,
      storyline: game.storyline,
      genres: game.genres ? JSON.stringify(game.genres) : undefined,
      platforms: game.platforms ? JSON.stringify(game.platforms) : undefined,
      themes: game.themes ? JSON.stringify(game.themes) : undefined,
      playerPerspectives: game.player_perspectives ? JSON.stringify(game.player_perspectives) : undefined,
      gameModes: game.game_modes ? JSON.stringify(game.game_modes) : undefined,
      artworks: artworks ? JSON.stringify(artworks) : undefined,
      screenshots: screenshots ? JSON.stringify(screenshots) : undefined,
      videos: game.videos ? JSON.stringify(game.videos) : undefined,
      websites: game.websites ? JSON.stringify(game.websites) : undefined,
      developers: developers && developers.length > 0 ? JSON.stringify(developers) : undefined,
      publishers: publishers && publishers.length > 0 ? JSON.stringify(publishers) : undefined,
      aggregatedRating: game.aggregated_rating,
      aggregatedRatingCount: game.aggregated_rating_count,
      rating: game.rating,
      ratingCount: game.rating_count,
      totalRating: game.total_rating,
      totalRatingCount: game.total_rating_count,
      hypes: game.hypes ?? undefined,
      franchise: game.franchise?.name ?? undefined, // Main franchise name
      franchises: game.franchises && game.franchises.length > 0 ? JSON.stringify(game.franchises) : undefined, // All franchises
      ageRatings: game.age_ratings ? JSON.stringify(game.age_ratings) : undefined,
      gameStatus,
      languageSupports: game.language_supports ? JSON.stringify(game.language_supports) : undefined,
      multiplayerModes: game.multiplayer_modes ? JSON.stringify(game.multiplayer_modes) : undefined,
      similarGames: game.similar_games ? JSON.stringify(game.similar_games) : undefined,
      remakes: game.remakes ? JSON.stringify(game.remakes) : undefined,
      remasters: game.remasters ? JSON.stringify(game.remasters) : undefined,
      expandedGames: game.expanded_games ? JSON.stringify(game.expanded_games) : undefined,
      ports: game.ports ? JSON.stringify(game.ports) : undefined,
      dlcs: game.dlcs ? JSON.stringify(game.dlcs) : undefined,
      standaloneExpansions: game.standalone_expansions
        ? JSON.stringify(game.standalone_expansions)
        : undefined,
      expansions: game.expansions ? JSON.stringify(game.expansions) : undefined,
      dlcsAndExpansions: undefined, // Will be fetched separately with enrichGame action
    };
  });
}

/**
 * Returns the IGDB client identifier from the environment.
 */
function getClientId() {
  const clientId = process.env.IGDB_CLIENT_ID;
  if (!clientId) {
    throw new Error("IGDB_CLIENT_ID env var is not configured");
  }
  return clientId;
}

/**
 * Returns the IGDB client secret from the environment.
 */
function getClientSecret() {
  const clientSecret = process.env.IGDB_CLIENT_SECRET;
  if (!clientSecret) {
    throw new Error("IGDB_CLIENT_SECRET env var is not configured");
  }
  return clientSecret;
}

/**
 * Reads an error body without throwing if it is empty.
 */
async function safeReadError(response: Response) {
  try {
    const text = await response.text();
    return text || "";
  } catch (error) {
    console.error("Failed to read IGDB error body", error);
    return "";
  }
}

type IgdbGame = {
  id: number;
  name: string;
  first_release_date?: number;
  cover?: {
    image_id?: string;
  };
  category?: number | null;
  game_type?: number | null;
  parent_game?: number | null;
  version_parent?: number | null;
  collections?: number[];
  remakes?: number[];
  remasters?: number[];
  expanded_games?: number[];
  ports?: number[];
  dlcs?: number[];
  expansions?: number[];
  standalone_expansions?: number[];
  // Enriched fields
  summary?: string;
  storyline?: string;
  genres?: Array<{ id: number; name: string }>;
  platforms?: Array<{ id: number; name: string }>;
  themes?: Array<{ id: number; name: string }>;
  player_perspectives?: Array<{ id: number; name: string }>;
  game_modes?: Array<{ id: number; name: string }>;
  artworks?: Array<{ id: number; url: string }>;
  screenshots?: Array<{ id: number; url: string }>;
  videos?: Array<{ id: number; video_id: string; name?: string }>;
  websites?: Array<{ id: number; category?: number; url: string }>;
  involved_companies?: Array<{
    id: number;
    company: { id: number; name: string };
    developer: boolean;
    publisher: boolean;
    porting: boolean;
  }>;
  aggregated_rating?: number;
  aggregated_rating_count?: number;
  rating?: number;
  rating_count?: number;
  total_rating?: number;
  total_rating_count?: number;
  age_ratings?: Array<{ id: number; rating?: number; organization?: { id: number; name: string } }>;
  game_status?: { id: number; name?: string };
  language_supports?: Array<{
    id: number;
    language: { id: number; name: string };
    language_support_type?: number;
  }>;
  multiplayer_modes?: Array<{
    id: number;
    campaigncoop: boolean;
    dropin: boolean;
    game: number;
    lancoop: boolean;
    offlinecoop: boolean;
    offlinecoopmax: number;
    onlinecoop: boolean;
    onlinecoopmax: number;
    onlinemultiplayer: boolean;
    onlinemultiplayer_max: number;
    onlinemultiplayer_min: number;
    platform: number;
    splitscreen: boolean;
    splitscreenonline: boolean;
  }>;
  similar_games?: Array<{ id: number; name: string }>;
  hypes?: number;
  franchise?: { id: number; name: string };
  franchises?: Array<{ id: number; name: string }>;
};

type TokenResponse = {
  access_token: string;
  expires_in: number;
};

type NormalizedGame = {
  igdbId: number;
  title: string;
  coverUrl?: string;
  releaseYear?: number;
  firstReleaseDate?: number;
  category?: number;
  gameType?: number;
  parentGameId?: number;
  versionParentId?: number;
  collections?: string;
  summary?: string;
  storyline?: string;
  genres?: string;
  platforms?: string;
  themes?: string;
  playerPerspectives?: string;
  gameModes?: string;
  artworks?: string;
  screenshots?: string;
  videos?: string;
  websites?: string;
  developers?: string;
  publishers?: string;
  aggregatedRating?: number;
  aggregatedRatingCount?: number;
  rating?: number;
  ratingCount?: number;
  totalRating?: number;
  totalRatingCount?: number;
  hypes?: number;
  franchise?: string;
  franchises?: string;
  ageRatings?: string;
  gameStatus?: string;
  languageSupports?: string;
  multiplayerModes?: string;
  similarGames?: string;
  remakes?: string;
  remasters?: string;
  expandedGames?: string;
  ports?: string;
  dlcs?: string;
  standaloneExpansions?: string;
  expansions?: string;
  dlcsAndExpansions?: string;
};

type CachedGame = NormalizedGame & {
  convexId: Id<"games">;
};

/**
 * Enriches a game's data by fetching full details from IGDB and updating it in the database.
 * Useful for upgrading games that were added before the enrichment feature existed.
 */
export const enrichGame = action({
  args: {
    igdbId: v.number(),
  },
  handler: async (ctx: ActionCtx, args: { igdbId: number }): Promise<NormalizedGame & { convexId: Id<"games"> }> => {
    const { accessToken } = await getValidIgdbToken(ctx);
    const clientId = getClientId();

    // Query a single game by ID (no search query needed)
    const enrichQuery = `id,name,first_release_date,cover.image_id,
summary,storyline,genres.name,platforms.name,themes.name,
player_perspectives.name,game_modes.name,artworks.url,screenshots.url,
videos.video_id,websites.category,websites.url,
involved_companies.company.name,involved_companies.developer,involved_companies.publisher,
aggregated_rating,aggregated_rating_count,age_ratings.*,
game_status.*,language_supports.language.name,
multiplayer_modes.*,similar_games.name`;
    
    const body = `fields ${enrichQuery}; where id = ${args.igdbId};`;

    const response = await fetch("https://api.igdb.com/v4/games", {
      method: "POST",
      headers: {
        "Client-ID": clientId,
        Authorization: `Bearer ${accessToken}`,
      },
      body,
    });

    if (!response.ok) {
      const errorText = await safeReadError(response);
      throw new Error(`IGDB error (${response.status}): ${errorText}`);
    }

    const rawGames = (await response.json()) as IgdbGame[];
    if (rawGames.length === 0) {
      throw new Error(`Game with IGDB ID ${args.igdbId} not found`);
    }

    const [normalizedGame] = normalizeGames(rawGames);
    
    // Fetch DLCs and expansions for this game
    let dlcsAndExpansionsJson: string | undefined;
    try {
      const dlcResponse = await fetch("https://api.igdb.com/v4/games", {
        method: "POST",
        headers: {
          "Client-ID": clientId,
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "text/plain",
        },
        body: `fields id,name,first_release_date;
where parent_game = ${args.igdbId} & (game_status = (7, 8));
limit 500;`,
      });

      if (dlcResponse.ok) {
        const dlcs = (await dlcResponse.json()) as Array<{ id: number; name: string; first_release_date?: number }>;
        const dlcList = dlcs.map((dlc) => ({
          id: dlc.id,
          title: dlc.name,
          releaseDate: dlc.first_release_date
            ? new Date(dlc.first_release_date * 1000).getUTCFullYear()
            : undefined,
        }));
        dlcsAndExpansionsJson = dlcList.length > 0 ? JSON.stringify(dlcList) : undefined;
      }
    } catch (error) {
      console.error("Failed to fetch DLCs for game", args.igdbId, error);
    }
    
    // Update the game in the database with enriched data
    const convexId: Id<"games"> = await ctx.runMutation(internal.games.upsertFromIgdb, {
      igdbId: normalizedGame.igdbId,
      title: normalizedGame.title,
      coverUrl: normalizedGame.coverUrl,
      releaseYear: normalizedGame.releaseYear,
      summary: normalizedGame.summary,
      storyline: normalizedGame.storyline,
      genres: normalizedGame.genres,
      platforms: normalizedGame.platforms,
      themes: normalizedGame.themes,
      playerPerspectives: normalizedGame.playerPerspectives,
      gameModes: normalizedGame.gameModes,
      artworks: normalizedGame.artworks,
      screenshots: normalizedGame.screenshots,
      videos: normalizedGame.videos,
      websites: normalizedGame.websites,
      developers: normalizedGame.developers,
      publishers: normalizedGame.publishers,
      aggregatedRating: normalizedGame.aggregatedRating,
      aggregatedRatingCount: normalizedGame.aggregatedRatingCount,
      ageRatings: normalizedGame.ageRatings,
      gameStatus: normalizedGame.gameStatus,
      languageSupports: normalizedGame.languageSupports,
      multiplayerModes: normalizedGame.multiplayerModes,
      similarGames: normalizedGame.similarGames,
      dlcsAndExpansions: dlcsAndExpansionsJson,
      gameType: normalizedGame.gameType,
      category: normalizedGame.category,
    });

    // Associate search terms for cache-first search
    try {
      const searchTerms = generateSearchTermsFromTitle(normalizedGame.title);
      for (const { term, priority } of searchTerms) {
        await ctx.runMutation(internal.games.associateSearchTerm, {
          term,
          gameId: convexId,
          weight: priority,
          termType: "title",
        });
      }
    } catch (error) {
      console.error("[enrichGame] Failed to associate search terms:", error);
    }

    return { ...normalizedGame, convexId, dlcsAndExpansions: dlcsAndExpansionsJson };
  },
});

/**
 * Helper to generate search terms from a game title
 * Exported so igdb.ts can use it during enrichment
 */
function generateSearchTermsFromTitle(title: string): Array<{ term: string; priority: number }> {
  const normalized = title.toLowerCase().replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim();
  const tokens = normalized.split(" ").filter(t => t.length > 0);

  const stopwords = new Set([
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of",
    "from", "with", "by", "as", "is", "was", "are", "be", "been", "being",
  ]);

  const terms: Array<{ term: string; priority: number }> = [];

  // Full title (highest priority)
  terms.push({ term: normalized, priority: 100 });

  // Last significant token (franchise name)
  const significantTokens = tokens.filter(t => !stopwords.has(t) && t.length > 2);
  if (significantTokens.length > 0) {
    terms.push({ term: significantTokens[significantTokens.length - 1], priority: 70 });
  }

  // First significant token
  if (significantTokens.length > 0 && significantTokens[0] !== significantTokens[significantTokens.length - 1]) {
    terms.push({ term: significantTokens[0], priority: 60 });
  }

  // Bigrams of significant tokens
  if (significantTokens.length > 1) {
    for (let i = 0; i < significantTokens.length - 1; i++) {
      terms.push({ term: `${significantTokens[i]} ${significantTokens[i + 1]}`, priority: 50 });
    }
  }

  return terms;
}

/**
 * Helper: Fetch popularity primitives for a batch of games
 * Returns a map of gameId -> { wantToPlay, playing, steam24hr, steamTotal }
 */
async function fetchPopularityPrimitives(
  gameIds: number[],
  accessToken: string,
  clientId: string
): Promise<Record<number, { wantToPlay: number; playing: number; steam24hr: number; steamTotal: number }>> {
  if (gameIds.length === 0) return {};

  interface PopularityPrimitive {
    game_id: number;
    popularity_type?: { name?: string };
    external_popularity_source?: { name?: string };
    value?: number;
  }

  const result: Record<number, { wantToPlay: number; playing: number; steam24hr: number; steamTotal: number }> = {};

  // Initialize all game IDs with zero values so missing primitives default to 0
  for (const gameId of gameIds) {
    result[gameId] = { wantToPlay: 0, playing: 0, steam24hr: 0, steamTotal: 0 };
  }

  const chunkSize = Math.min(IGDB_MAX_PAGE_SIZE, 400);
  for (let i = 0; i < gameIds.length; i += chunkSize) {
    const chunk = gameIds.slice(i, i + chunkSize);
    const popQuery = `fields game_id,popularity_type.name,external_popularity_source.name,value;
where game_id = (${chunk.join(",")});
limit ${Math.min(chunk.length, IGDB_MAX_PAGE_SIZE)};`;

    try {
      const response: Response = await fetch("https://api.igdb.com/v4/popularity_primitives", {
        method: "POST",
        headers: {
          "Client-ID": clientId,
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "text/plain",
        },
        body: popQuery,
      });

      if (!response.ok) {
        console.warn(`[fetchPopularityPrimitives] API error: ${response.status}`);
        continue;
      }

      const primitives = (await response.json()) as PopularityPrimitive[];

      // Map primitives to categories
      for (const prim of primitives) {
        if (!prim.game_id) continue;
        if (!result[prim.game_id]) {
          result[prim.game_id] = { wantToPlay: 0, playing: 0, steam24hr: 0, steamTotal: 0 };
        }

        const typeName = prim.popularity_type?.name || "";
        const sourceName = prim.external_popularity_source?.name || "";
        const value = prim.value ?? 0;

        // Map IGDB types: 2=Want to Play, 3=Playing
        if (typeName.toLowerCase().includes("want") || typeName === "2") {
          result[prim.game_id].wantToPlay = value;
        } else if (typeName.toLowerCase().includes("playing") || typeName === "3") {
          result[prim.game_id].playing = value;
        }
        // Map Steam types: 5=24hr Peak, 8=Total Reviews
        else if (sourceName.toLowerCase().includes("steam")) {
          if (typeName.includes("24") || typeName.toLowerCase().includes("peak")) {
            result[prim.game_id].steam24hr = value;
          } else if (typeName.includes("total") || typeName.includes("reviews")) {
            result[prim.game_id].steamTotal = value;
          }
        }
      }
    } catch (error) {
      console.error("[fetchPopularityPrimitives] Error:", error);
    }
  }

  return result;
}

/**
 * Calculate PopScore from primitives
 * Formula: 0.4*wantToPlay + 0.3*playing + 0.2*steam24hr + 0.1*steamTotal
 * Normalized to 0-100 scale
 */
function calculatePopScore(primitives: { wantToPlay: number; playing: number; steam24hr: number; steamTotal: number }): number {
  // Updated weights for 2025 trending:
  // Steam 24hr Peak (0.4) - real-time players right now
  // Playing (0.35) - active IGDB users
  // Want to Play (0.20) - interest signal
  // Steam Total Reviews (0.05) - historical data
  const rawScore = primitives.steam24hr * 0.4 + primitives.playing * 0.35 + primitives.wantToPlay * 0.2 + primitives.steamTotal * 0.05;
  
  // Normalize to 0-100 scale using log scale for better distribution
  // Most values are in 1-1000 range
  const logScore = Math.log1p(rawScore) / Math.log1p(10000) * 100;
  return Math.min(100, Math.max(0, logScore));
}

async function fetchGamesWithPagination(options: {
  limit: number;
  accessToken: string;
  clientId: string;
  category: string;
  buildQuery: (batchSize: number, offset: number) => string;
}): Promise<IgdbGame[]> {
  const { limit, accessToken, clientId, category, buildQuery } = options;
  const results: IgdbGame[] = [];
  let offset = 0;

  while (results.length < limit) {
    const remaining = limit - results.length;
    const batchSize = Math.min(remaining, IGDB_MAX_PAGE_SIZE);
    const query = buildQuery(batchSize, offset);

    const response: Response = await fetch("https://api.igdb.com/v4/games", {
      method: "POST",
      headers: {
        "Client-ID": clientId,
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "text/plain",
      },
      body: query,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`[${category}] IGDB API error: ${response.status} - ${errorBody}`);
    }

    const batch = (await response.json()) as IgdbGame[];
    if (batch.length === 0) {
      break;
    }

    results.push(...batch);
    if (batch.length < batchSize) {
      break;
    }

    offset += batchSize;
  }

  if (results.length > limit) {
    return results.slice(0, limit);
  }

  return results;
}

/**
 * Seed trending games using weighted PopScore popularity primitives.
 * Weights: Steam 24hr Peak (0.4) + Playing (0.35) + Want to Play (0.2) + Steam Total Reviews (0.05)
 * Focus: Real-time active players (Steam 24hr) and currently playing (IGDB) are weighted highest
 */
export const seedTrendingGames = action({
  args: {
    limit: v.optional(v.number()),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<{ success: boolean; gamesCached?: number; gamesProcessed?: number; dryRun?: boolean; error?: string; timestamp: number }> => {
    const requestedLimit = args.limit ?? DEFAULT_SEED_LIMIT;
    const limit = Math.min(Math.max(1, requestedLimit), MAX_SEED_LIMIT);
    const dryRun = args.dryRun ?? false;

    console.log(`[seedTrendingGames] Starting${dryRun ? " (DRY RUN)" : ""}. Limit: ${limit}${requestedLimit !== limit ? ` (requested ${requestedLimit})` : ""}`);

    const { accessToken }: { accessToken: string } = await getValidIgdbToken(ctx);
    const clientId = getClientId();
    const now = Math.floor(Date.now() / 1000);

    try {
      // Calculate 2025 timestamp window
      const year2025Start = Math.floor(new Date("2025-01-01").getTime() / 1000);
      const year2025End = now; // Until now
      
      // Fetch 2025 games sorted by engagement (most popular first)
      const buildTrendingQuery = (batchSize: number, offset: number) => `fields id,name,first_release_date,cover.image_id,category,game_type,version_parent,parent_game,
  summary,storyline,genres.name,platforms.name,themes.name,
  player_perspectives.name,game_modes.name,artworks.url,screenshots.url,
  videos.video_id,websites.category,websites.url,
  involved_companies.company.name,involved_companies.developer,involved_companies.publisher,
  aggregated_rating,aggregated_rating_count,rating,rating_count,total_rating,total_rating_count,hypes,
  franchise.name,franchises.name,
  age_ratings.rating,age_ratings.organization.*,
  game_status.*,language_supports.language.name,
  multiplayer_modes.*,similar_games.name;
where first_release_date >= ${year2025Start} & first_release_date <= ${year2025End} & (aggregated_rating_count >= 10 | rating_count >= 10);
sort aggregated_rating_count desc;
offset ${offset};
limit ${batchSize};`;

      const games = await fetchGamesWithPagination({
        limit,
        accessToken,
        clientId,
        category: "seedTrendingGames",
        buildQuery: buildTrendingQuery,
      });
      console.log(`[seedTrendingGames] Fetched ${games.length} games from IGDB`);

      if (games.length === 0) {
        return { success: true, gamesCached: 0, timestamp: Date.now() };
      }

      if (!dryRun) {
        const normalized = normalizeGames(games);
        
        // Fetch PopScores for all games in one batch
        const gameIds = games.map(g => g.id);
        console.log(`[seedTrendingGames] Fetching PopScores for ${gameIds.length} games`);
        const popScores = await fetchPopularityPrimitives(gameIds, accessToken, clientId);
        
        let gamesCached = 0;

        for (const game of normalized) {
          // Calculate PopScore for this game
          const igdbGameId = games.find(g => g.id === game.igdbId)?.id ?? 0;
          const prims = popScores[igdbGameId] || {
            wantToPlay: 0,
            playing: 0,
            steam24hr: 0,
            steamTotal: 0,
          };
          const popularityScore = calculatePopScore(prims);

          await ctx.runMutation(internal.games.upsertFromIgdb, {
            igdbId: game.igdbId,
            title: game.title,
            coverUrl: game.coverUrl,
            releaseYear: game.releaseYear,
            firstReleaseDate: game.firstReleaseDate,
            summary: game.summary,
            storyline: game.storyline,
            genres: game.genres,
            platforms: game.platforms,
            themes: game.themes,
            playerPerspectives: game.playerPerspectives,
            gameModes: game.gameModes,
            artworks: game.artworks,
            screenshots: game.screenshots,
            videos: game.videos,
            websites: game.websites,
            developers: game.developers,
            publishers: game.publishers,
            aggregatedRating: game.aggregatedRating,
            aggregatedRatingCount: game.aggregatedRatingCount,
            rating: game.rating,
            ratingCount: game.ratingCount,
            totalRating: game.totalRating,
            totalRatingCount: game.totalRatingCount,
            ageRatings: game.ageRatings,
            gameStatus: game.gameStatus,
            languageSupports: game.languageSupports,
            multiplayerModes: game.multiplayerModes,
            similarGames: game.similarGames,
            dlcsAndExpansions: game.dlcsAndExpansions,
            gameType: game.gameType,
            category: game.category,
            hypes: game.hypes,
            franchise: game.franchise,
            franchises: game.franchises,
            popularity_score: popularityScore,
          });
          gamesCached++;
        }

        const result = { success: true, gamesCached, gamesProcessed: normalized.length, timestamp: Date.now() };
        return measureQuerySize(result, "seedTrendingGames");
      }

      const result = { success: true, gamesCached: games.length, dryRun: true, timestamp: Date.now() };
      return measureQuerySize(result, "seedTrendingGames (dry run)");
    } catch (error) {
      console.error("[seedTrendingGames] Error:", error);
      return { success: false, error: String(error), timestamp: Date.now() };
    }
  },
});

/**
 * Seed new releases (games released in past 12 months).
 */
export const seedNewReleases = action({
  args: {
    limit: v.optional(v.number()),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<{ success: boolean; gamesCached?: number; gamesProcessed?: number; dryRun?: boolean; error?: string; timestamp: number }> => {
    const requestedLimit = args.limit ?? DEFAULT_SEED_LIMIT;
    const limit = Math.min(Math.max(1, requestedLimit), MAX_SEED_LIMIT);
    const dryRun = args.dryRun ?? false;

    console.log(`[seedNewReleases] Starting${dryRun ? " (DRY RUN)" : ""}. Limit: ${limit}${requestedLimit !== limit ? ` (requested ${requestedLimit})` : ""}`);

    const { accessToken }: { accessToken: string } = await getValidIgdbToken(ctx);
    const clientId = getClientId();
    const now = Math.floor(Date.now() / 1000);
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const oneYearAgoTimestamp = Math.floor(oneYearAgo.getTime() / 1000);

    try {
      const buildNewReleasesQuery = (batchSize: number, offset: number) => `fields id,name,first_release_date,cover.image_id,category,game_type,version_parent,parent_game,
  summary,storyline,genres.name,platforms.name,themes.name,
  player_perspectives.name,game_modes.name,artworks.url,screenshots.url,
  videos.video_id,websites.category,websites.url,
  involved_companies.company.name,involved_companies.developer,involved_companies.publisher,
  aggregated_rating,aggregated_rating_count,rating,rating_count,total_rating,total_rating_count,hypes,
  franchise.name,franchises.name,
  age_ratings.rating,age_ratings.organization.*,
  game_status.*,language_supports.language.name,
  multiplayer_modes.*,similar_games.name;
where first_release_date >= ${oneYearAgoTimestamp} & first_release_date <= ${now};
sort first_release_date desc;
offset ${offset};
limit ${batchSize};`;

      const games = await fetchGamesWithPagination({
        limit,
        accessToken,
        clientId,
        category: "seedNewReleases",
        buildQuery: buildNewReleasesQuery,
      });
      console.log(`[seedNewReleases] Fetched ${games.length} games from IGDB`);

      if (games.length === 0) {
        return { success: true, gamesCached: 0, timestamp: Date.now() };
      }

      if (!dryRun) {
        const normalized = normalizeGames(games);
        let gamesCached = 0;

        for (const game of normalized) {
          await ctx.runMutation(internal.games.upsertFromIgdb, {
            igdbId: game.igdbId,
            title: game.title,
            coverUrl: game.coverUrl,
            releaseYear: game.releaseYear,
            firstReleaseDate: game.firstReleaseDate,
            summary: game.summary,
            storyline: game.storyline,
            genres: game.genres,
            platforms: game.platforms,
            themes: game.themes,
            playerPerspectives: game.playerPerspectives,
            gameModes: game.gameModes,
            artworks: game.artworks,
            screenshots: game.screenshots,
            videos: game.videos,
            websites: game.websites,
            developers: game.developers,
            publishers: game.publishers,
            aggregatedRating: game.aggregatedRating,
            aggregatedRatingCount: game.aggregatedRatingCount,
            rating: game.rating,
            ratingCount: game.ratingCount,
            totalRating: game.totalRating,
            totalRatingCount: game.totalRatingCount,
            ageRatings: game.ageRatings,
            gameStatus: game.gameStatus,
            languageSupports: game.languageSupports,
            multiplayerModes: game.multiplayerModes,
            similarGames: game.similarGames,
            dlcsAndExpansions: game.dlcsAndExpansions,
            gameType: game.gameType,
            category: game.category,
            hypes: game.hypes,
            franchise: game.franchise,
            franchises: game.franchises,
            popularity_score: undefined,
          });
          gamesCached++;
        }

        const result = { success: true, gamesCached, gamesProcessed: normalized.length, timestamp: Date.now() };
        return measureQuerySize(result, "seedNewReleases");
      }

      const result = { success: true, gamesCached: games.length, dryRun: true, timestamp: Date.now() };
      return measureQuerySize(result, "seedNewReleases (dry run)");
    } catch (error) {
      console.error("[seedNewReleases] Error:", error);
      return { success: false, error: String(error), timestamp: Date.now() };
    }
  },
});

/**
 * Seed top-rated games (high critic scores with enough reviews).
 */
export const seedTopRatedGames = action({
  args: {
    limit: v.optional(v.number()),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<{ success: boolean; gamesCached?: number; gamesProcessed?: number; dryRun?: boolean; error?: string; timestamp: number }> => {
    const requestedLimit = args.limit ?? DEFAULT_SEED_LIMIT;
    const limit = Math.min(Math.max(1, requestedLimit), MAX_SEED_LIMIT);
    const dryRun = args.dryRun ?? false;

    console.log(`[seedTopRatedGames] Starting${dryRun ? " (DRY RUN)" : ""}. Limit: ${limit}${requestedLimit !== limit ? ` (requested ${requestedLimit})` : ""}`);

    const { accessToken }: { accessToken: string } = await getValidIgdbToken(ctx);
    const clientId = getClientId();
    const now = Math.floor(Date.now() / 1000);

    try {
      const buildTopRatedQuery = (batchSize: number, offset: number) => `fields id,name,first_release_date,cover.image_id,category,game_type,version_parent,parent_game,
  summary,storyline,genres.name,platforms.name,themes.name,
  player_perspectives.name,game_modes.name,artworks.url,screenshots.url,
  videos.video_id,websites.category,websites.url,
  involved_companies.company.name,involved_companies.developer,involved_companies.publisher,
  aggregated_rating,aggregated_rating_count,rating,rating_count,total_rating,total_rating_count,hypes,
  franchise.name,franchises.name,
  age_ratings.rating,age_ratings.organization.*,
  game_status.*,language_supports.language.name,
  multiplayer_modes.*,similar_games.name;
where aggregated_rating >= 75 & aggregated_rating_count >= 5 & first_release_date > 0 & first_release_date <= ${now};
sort aggregated_rating desc;
offset ${offset};
limit ${batchSize};`;

      const games = await fetchGamesWithPagination({
        limit,
        accessToken,
        clientId,
        category: "seedTopRatedGames",
        buildQuery: buildTopRatedQuery,
      });
      console.log(`[seedTopRatedGames] Fetched ${games.length} games from IGDB`);

      if (games.length === 0) {
        return { success: true, gamesCached: 0, timestamp: Date.now() };
      }

      if (!dryRun) {
        const normalized = normalizeGames(games);
        let gamesCached = 0;

        for (const game of normalized) {
          await ctx.runMutation(internal.games.upsertFromIgdb, {
            igdbId: game.igdbId,
            title: game.title,
            coverUrl: game.coverUrl,
            releaseYear: game.releaseYear,
            firstReleaseDate: game.firstReleaseDate,
            summary: game.summary,
            storyline: game.storyline,
            genres: game.genres,
            platforms: game.platforms,
            themes: game.themes,
            playerPerspectives: game.playerPerspectives,
            gameModes: game.gameModes,
            artworks: game.artworks,
            screenshots: game.screenshots,
            videos: game.videos,
            websites: game.websites,
            developers: game.developers,
            publishers: game.publishers,
            aggregatedRating: game.aggregatedRating,
            aggregatedRatingCount: game.aggregatedRatingCount,
            rating: game.rating,
            ratingCount: game.ratingCount,
            totalRating: game.totalRating,
            totalRatingCount: game.totalRatingCount,
            ageRatings: game.ageRatings,
            gameStatus: game.gameStatus,
            languageSupports: game.languageSupports,
            multiplayerModes: game.multiplayerModes,
            similarGames: game.similarGames,
            dlcsAndExpansions: game.dlcsAndExpansions,
            gameType: game.gameType,
            category: game.category,
            hypes: game.hypes,
            franchise: game.franchise,
            franchises: game.franchises,
            popularity_score: undefined,
          });
          gamesCached++;
        }

        const result = { success: true, gamesCached, gamesProcessed: normalized.length, timestamp: Date.now() };
        return measureQuerySize(result, "seedTopRatedGames");
      }

      const result = { success: true, gamesCached: games.length, dryRun: true, timestamp: Date.now() };
      return measureQuerySize(result, "seedTopRatedGames (dry run)");
    } catch (error) {
      console.error("[seedTopRatedGames] Error:", error);
      return { success: false, error: String(error), timestamp: Date.now() };
    }
  },
});

/**
 * Seed previously unseeded games. Category argument is preserved for backwards compatibility
 * but the implementation now ignores category-specific filters.
 */
export const seedGamesByCategory = action({
  args: {
    category: v.union(
      v.literal("trending"),
      v.literal("newReleases"),
      v.literal("topRated")
    ),
    limit: v.optional(v.number()),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<{
    category: "trending" | "newReleases" | "topRated";
    requestedLimit: number | null;
    appliedLimit: number;
    success: boolean;
    gamesCached?: number;
    gamesProcessed?: number;
    dryRun?: boolean;
    error?: string;
    timestamp: number;
    title?: string;
    message?: string;
  }> => {
    if (process.env.ENVIRONMENT === "production" || !process.env.ALLOW_SEEDING) {
      console.error("❌ [seedGamesByCategory] BLOCKED: Seeding is disabled in production or without ALLOW_SEEDING flag");
      throw new Error("Seeding is disabled in production. Enable ALLOW_SEEDING in development.");
    }

    const requestedLimit = args.limit ?? DEFAULT_SEED_LIMIT;
    const appliedLimit = Math.min(Math.max(1, requestedLimit), MAX_SEED_LIMIT);
    const dryRun = args.dryRun ?? false;

    console.log(
      `[seedGamesByCategory] Starting${dryRun ? " (DRY RUN)" : ""} for ${args.category} | limit=${appliedLimit}${requestedLimit !== appliedLimit ? ` (requested ${requestedLimit})` : ""} | ignoring category filters`
    );

    try {
      const seenIgdbIds = new Set<number>();
      let existingChecks = 0;

      const { accessToken }: { accessToken: string } = await getValidIgdbToken(ctx);
      const clientId = getClientId();

      const collected: IgdbGame[] = [];
      const maxIterations = 40; // Prevent runaway pagination (40 * 500 = 20,000 records)
      let iteration = 0;
      let offset = 0;

      const buildUnfilteredQuery = (batchSize: number, currentOffset: number) => `fields id,name,first_release_date,cover.image_id,category,game_type,version_parent,parent_game,
  summary,storyline,genres.name,platforms.name,themes.name,
  player_perspectives.name,game_modes.name,artworks.url,screenshots.url,
  videos.video_id,websites.category,websites.url,
  involved_companies.company.name,involved_companies.developer,involved_companies.publisher,
  aggregated_rating,aggregated_rating_count,rating,rating_count,total_rating,total_rating_count,hypes,
  franchise.name,franchises.name,
  age_ratings.rating,age_ratings.organization.*,
  game_status.*,language_supports.language.name,
  multiplayer_modes.*,similar_games.name;
sort total_rating_count desc;
offset ${currentOffset};
limit ${batchSize};`;

      while (collected.length < appliedLimit && iteration < maxIterations) {
        iteration++;
  const remainingNeeded = appliedLimit - collected.length;
  const batchSize = Math.min(IGDB_MAX_PAGE_SIZE, Math.max(100, remainingNeeded * 3));
        const query = buildUnfilteredQuery(batchSize, offset);

        const response: Response = await fetch("https://api.igdb.com/v4/games", {
          method: "POST",
          headers: {
            "Client-ID": clientId,
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "text/plain",
          },
          body: query,
        });

        if (!response.ok) {
          const errorBody = await safeReadError(response);
          throw new Error(`[seedGamesByCategory] IGDB API error: ${response.status} - ${errorBody}`);
        }

        const batch = (await response.json()) as IgdbGame[];
        if (batch.length === 0) {
          break;
        }

        for (const game of batch) {
          if (seenIgdbIds.has(game.id)) {
            continue;
          }

          seenIgdbIds.add(game.id);
          const alreadyCached = await ctx.runQuery(internal.games.getGameIdByIgdbId, {
            igdbId: game.id,
          });
          existingChecks++;

          if (alreadyCached) {
            continue;
          }

          collected.push(game);

          if (collected.length >= appliedLimit) {
            break;
          }
        }

        if (batch.length < batchSize) {
          break;
        }

        offset += batchSize;
      }

      console.log(
        `[seedGamesByCategory] Prepared ${collected.length} new games (requested ${appliedLimit}) | checked ${existingChecks} existing entries`
      );

      if (collected.length === 0) {
        const result = {
          category: args.category,
          requestedLimit: args.limit ?? null,
          appliedLimit,
          success: true,
          gamesCached: 0,
          gamesProcessed: 0,
          dryRun,
          timestamp: Date.now(),
          message: "No unseeded games were found in the requested range.",
        };

        return measureQuerySize(result, "seedGamesByCategory");
      }

      const normalized = normalizeGames(collected);
      let gamesCached = 0;

      if (!dryRun) {
        for (const game of normalized) {
          await ctx.runMutation(internal.games.upsertFromIgdb, {
            igdbId: game.igdbId,
            title: game.title,
            coverUrl: game.coverUrl,
            releaseYear: game.releaseYear,
            firstReleaseDate: game.firstReleaseDate,
            summary: game.summary,
            storyline: game.storyline,
            genres: game.genres,
            platforms: game.platforms,
            themes: game.themes,
            playerPerspectives: game.playerPerspectives,
            gameModes: game.gameModes,
            artworks: game.artworks,
            screenshots: game.screenshots,
            videos: game.videos,
            websites: game.websites,
            developers: game.developers,
            publishers: game.publishers,
            aggregatedRating: game.aggregatedRating,
            aggregatedRatingCount: game.aggregatedRatingCount,
            rating: game.rating,
            ratingCount: game.ratingCount,
            totalRating: game.totalRating,
            totalRatingCount: game.totalRatingCount,
            ageRatings: game.ageRatings,
            gameStatus: game.gameStatus,
            languageSupports: game.languageSupports,
            multiplayerModes: game.multiplayerModes,
            similarGames: game.similarGames,
            dlcsAndExpansions: game.dlcsAndExpansions,
            gameType: game.gameType,
            category: game.category,
            hypes: game.hypes,
            franchise: game.franchise,
            franchises: game.franchises,
            popularity_score: undefined,
          });
          gamesCached++;
        }
      }

      const result = {
        category: args.category,
        requestedLimit: args.limit ?? null,
        appliedLimit,
        success: true,
        gamesCached: dryRun ? collected.length : gamesCached,
        gamesProcessed: collected.length,
        dryRun,
        timestamp: Date.now(),
        message:
          collected.length < appliedLimit
            ? `Seeded ${collected.length} new games; ${appliedLimit - collected.length} additional games were already cached or unavailable.`
            : undefined,
      };

      return measureQuerySize(result, "seedGamesByCategory");
    } catch (error) {
      console.error("[seedGamesByCategory] Error while seeding unfiltered games:", error);

      const result = {
        category: args.category,
        requestedLimit: args.limit ?? null,
        appliedLimit,
        success: false,
        gamesCached: 0,
        gamesProcessed: 0,
        dryRun,
        error: String(error),
        timestamp: Date.now(),
      };

      return measureQuerySize(result, "seedGamesByCategory (error)");
    }
  },
});

/**
 * Seed a specific game by IGDB ID. Useful for manual backfilling via admin panel.
 */
export const seedGameById = action({
  args: {
    igdbId: v.number(),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    igdbId: number;
    title?: string;
    gamesCached?: number;
    dryRun?: boolean;
    error?: string;
    popularityScore?: number;
    timestamp: number;
    message?: string;
  }> => {
    if (process.env.ENVIRONMENT === "production" || !process.env.ALLOW_SEEDING) {
      console.error("❌ [seedGameById] BLOCKED: Seeding is disabled in production or without ALLOW_SEEDING flag");
      return {
        success: false,
        igdbId: args.igdbId,
        error: "Seeding is disabled. Enable ALLOW_SEEDING in non-production environments.",
        timestamp: Date.now(),
      };
    }

    const igdbId = Math.floor(args.igdbId);
    if (!Number.isFinite(igdbId) || igdbId <= 0) {
      return {
        success: false,
        igdbId,
        error: "Invalid IGDB game ID. Provide a positive integer.",
        timestamp: Date.now(),
      };
    }

    const dryRun = args.dryRun ?? false;

    console.log(`[seedGameById] Starting${dryRun ? " (DRY RUN)" : ""} for IGDB ID ${igdbId}`);

    const { accessToken }: { accessToken: string } = await getValidIgdbToken(ctx);
    const clientId = getClientId();

    const singleGameQuery = `fields id,name,slug,first_release_date,cover.image_id,category,game_type,version_parent,parent_game,
  summary,storyline,genres.name,platforms.name,themes.name,
  player_perspectives.name,game_modes.name,artworks.url,screenshots.url,
  videos.video_id,websites.category,websites.url,
  involved_companies.company.name,involved_companies.developer,involved_companies.publisher,
  aggregated_rating,aggregated_rating_count,rating,rating_count,total_rating,total_rating_count,hypes,
  franchise.name,franchises.name,
  age_ratings.rating,age_ratings.organization.*,
  game_status.*,language_supports.language.name,
  multiplayer_modes.*,similar_games.name;
where id = ${igdbId};
limit 1;`;

    try {
      const response: Response = await fetch("https://api.igdb.com/v4/games", {
        method: "POST",
        headers: {
          "Client-ID": clientId,
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "text/plain",
        },
        body: singleGameQuery,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`[seedGameById] Failed: ${response.status} - ${errorBody}`);
        return measureQuerySize(
          {
            success: false,
            igdbId,
            error: `IGDB API error: ${response.status}`,
            timestamp: Date.now(),
          },
          "seedGameById (error)"
        );
      }

      const games = (await response.json()) as IgdbGame[];
      if (games.length === 0) {
        return measureQuerySize(
          {
            success: false,
            igdbId,
            error: "Game not found on IGDB.",
            timestamp: Date.now(),
          },
          "seedGameById (not found)"
        );
      }

      const normalized = normalizeGames(games);
      const game = normalized[0];

      if (!game) {
        return measureQuerySize(
          {
            success: false,
            igdbId,
            error: "Unable to normalize IGDB game payload.",
            timestamp: Date.now(),
          },
          "seedGameById (normalize error)"
        );
      }

      if (dryRun) {
        const result = {
          success: true,
          igdbId,
          title: game.title,
          dryRun: true,
          message: "Dry run complete. No data cached.",
          timestamp: Date.now(),
        };
        return measureQuerySize(result, "seedGameById (dry run)");
      }

      const popScores = await fetchPopularityPrimitives([igdbId], accessToken, clientId);
      const primitives = popScores[igdbId] ?? {
        wantToPlay: 0,
        playing: 0,
        steam24hr: 0,
        steamTotal: 0,
      };
      const popularityScore = calculatePopScore(primitives);

      await ctx.runMutation(internal.games.upsertFromIgdb, {
        igdbId: game.igdbId,
        title: game.title,
        coverUrl: game.coverUrl,
        releaseYear: game.releaseYear,
        firstReleaseDate: game.firstReleaseDate,
        summary: game.summary,
        storyline: game.storyline,
        genres: game.genres,
        platforms: game.platforms,
        themes: game.themes,
        playerPerspectives: game.playerPerspectives,
        gameModes: game.gameModes,
        artworks: game.artworks,
        screenshots: game.screenshots,
        videos: game.videos,
        websites: game.websites,
        developers: game.developers,
        publishers: game.publishers,
        aggregatedRating: game.aggregatedRating,
        aggregatedRatingCount: game.aggregatedRatingCount,
        rating: game.rating,
        ratingCount: game.ratingCount,
        totalRating: game.totalRating,
        totalRatingCount: game.totalRatingCount,
        ageRatings: game.ageRatings,
        gameStatus: game.gameStatus,
        languageSupports: game.languageSupports,
        multiplayerModes: game.multiplayerModes,
        similarGames: game.similarGames,
        dlcsAndExpansions: game.dlcsAndExpansions,
        gameType: game.gameType,
        category: game.category,
        hypes: game.hypes,
        franchise: game.franchise,
        franchises: game.franchises,
        popularity_score: popularityScore,
      });

      const result = {
        success: true,
        igdbId,
        title: game.title,
        gamesCached: 1,
        popularityScore,
        timestamp: Date.now(),
      };
      return measureQuerySize(result, "seedGameById");
    } catch (error) {
      console.error("[seedGameById] Error:", error);
      return measureQuerySize(
        {
          success: false,
          igdbId,
          error: String(error),
          timestamp: Date.now(),
        },
        "seedGameById (exception)"
      );
    }
  },
});