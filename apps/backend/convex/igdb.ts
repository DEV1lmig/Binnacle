/**
 * Actions for interacting with the IGDB API.
 */
import { action, ActionCtx } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

const minimumTokenTtlMs = 60_000;
const defaultLimit = 10;

/**
 * Searches IGDB for games and caches the results in the Convex database.
 */
export const searchGames = action({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
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

    const { accessToken } = await getValidIgdbToken(ctx);
    const response = await fetch("https://api.igdb.com/v4/games", {
      method: "POST",
      headers: {
        "Client-ID": getClientId(),
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "text/plain",
      },
      body: buildQuery(trimmedQuery, limit),
    });

    if (!response.ok) {
      const details = await safeReadError(response);
      throw new Error(`IGDB request failed: ${response.status} ${details}`);
    }

    const rawGames = (await response.json()) as IgdbGame[];
    const normalizedGames = normalizeGames(rawGames);

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
        ageRatings: game.ageRatings,
        gameStatus: game.gameStatus,
        languageSupports: game.languageSupports,
        multiplayerModes: game.multiplayerModes,
        similarGames: game.similarGames,
      });

      hydratedGames.push({ ...game, convexId });
    }

    return hydratedGames;
  },
});

/**
 * Fetches a valid IGDB access token, refreshing it if needed.
 */
async function getValidIgdbToken(ctx: ActionCtx) {
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
 */
function buildQuery(query: string, limit: number) {
  const sanitizedQuery = query.replace(/"/g, "\\\"");
  return `search "${sanitizedQuery}"; 
fields id,name,first_release_date,cover.image_id,
summary,storyline,genres.name,platforms.name,themes.name,
player_perspectives.name,game_modes.name,artworks.url,screenshots.url,
videos.video_id,websites.category,websites.url,
involved_companies.company.name,involved_companies.developer,involved_companies.publisher,
aggregated_rating,aggregated_rating_count,age_ratings.rating,age_ratings.organization.*,
game_status.*,language_supports.language.name,
multiplayer_modes.*,similar_games.name;
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
    const artworks = game.artworks?.map((art) => {
      const filename = art.url.split("/").pop() || "";
      // Don't add .jpg if filename already has an extension
      const urlWithExtension = filename.includes(".") ? filename : `${filename}.jpg`;
      return `https://images.igdb.com/igdb/image/upload/t_screenshot_big/${urlWithExtension}`;
    });
    const screenshots = game.screenshots?.map((screenshot) => {
      const filename = screenshot.url.split("/").pop() || "";
      // Don't add .jpg if filename already has an extension
      const urlWithExtension = filename.includes(".") ? filename : `${filename}.jpg`;
      return `https://images.igdb.com/igdb/image/upload/t_screenshot_big/${urlWithExtension}`;
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
      ageRatings: game.age_ratings ? JSON.stringify(game.age_ratings) : undefined,
      gameStatus,
      languageSupports: game.language_supports ? JSON.stringify(game.language_supports) : undefined,
      multiplayerModes: game.multiplayer_modes ? JSON.stringify(game.multiplayer_modes) : undefined,
      similarGames: game.similar_games ? JSON.stringify(game.similar_games) : undefined,
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
  ageRatings?: string;
  gameStatus?: string;
  languageSupports?: string;
  multiplayerModes?: string;
  similarGames?: string;
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
    });

    return { ...normalizedGame, convexId };
  },
});