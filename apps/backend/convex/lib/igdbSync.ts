/**
 * Pure helpers for the incremental IGDB catalogue sync.
 * No Convex context in here so everything can be unit tested.
 */

export const SYNC_PAGE_SIZE = 100;
export const SYNC_MAX_PAGE_SIZE = 100;
export const MAX_FAILED_IDS = 50;
export const MAX_ERROR_LENGTH = 300;

/**
 * Basic field selection shared by every general sync.
 * Artworks, screenshots, videos, websites, languages, multiplayer modes and
 * similar games are left out on purpose: they are only fetched per game page.
 */
export const IGDB_BASIC_FIELDS = [
  "id",
  "name",
  "cover.image_id",
  "first_release_date",
  "game_type",
  "category", // legacy, kept while existing documents still rely on it
  "parent_game",
  "summary",
  "genres.name",
  "platforms.name",
  "themes.name",
  "involved_companies.company.name",
  "involved_companies.developer",
  "involved_companies.publisher",
  "aggregated_rating",
  "aggregated_rating_count",
  "rating",
  "rating_count",
  "total_rating",
  "total_rating_count",
  "hypes",
  "franchise.name",
  "franchises.name",
  "updated_at",
  "checksum",
].join(",");

export type IgdbBasicGame = {
  id: number;
  name?: string;
  cover?: { image_id?: string };
  first_release_date?: number;
  game_type?: number;
  category?: number;
  parent_game?: number;
  summary?: string;
  genres?: Array<{ id: number; name: string }>;
  platforms?: Array<{ id: number; name: string }>;
  themes?: Array<{ id: number; name: string }>;
  involved_companies?: Array<{
    company?: { id: number; name: string };
    developer?: boolean;
    publisher?: boolean;
  }>;
  aggregated_rating?: number;
  aggregated_rating_count?: number;
  rating?: number;
  rating_count?: number;
  total_rating?: number;
  total_rating_count?: number;
  hypes?: number;
  franchise?: { id: number; name: string };
  franchises?: Array<{ id: number; name: string }>;
  updated_at?: number;
  checksum?: string;
};

export type SyncGame = {
  igdbId: number;
  title: string;
  coverUrl?: string;
  releaseYear?: number;
  firstReleaseDate?: number;
  gameType?: number;
  category?: number;
  parentGame?: number;
  summary?: string;
  genres?: string;
  platforms?: string;
  themes?: string;
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
  igdbUpdatedAt?: number;
  igdbChecksum?: string;
};

export function coverUrlFromImageId(imageId: string | undefined): string | undefined {
  return imageId ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${imageId}.jpg` : undefined;
}

export function releaseYearFromTimestamp(seconds: number | undefined): number | undefined {
  return seconds !== undefined ? new Date(seconds * 1000).getUTCFullYear() : undefined;
}

function jsonOrUndefined(value: unknown[] | undefined): string | undefined {
  return value && value.length > 0 ? JSON.stringify(value) : undefined;
}

/**
 * Maps a raw IGDB game to the columns the sync writes.
 * Returns null for payloads that cannot become a game (partial responses).
 */
export function normalizeBasicGame(game: IgdbBasicGame): SyncGame | null {
  if (typeof game?.id !== "number" || !game.name) {
    return null;
  }

  const companies = (game.involved_companies ?? []).filter((ic) => ic.company?.name);
  const developers = companies
    .filter((ic) => ic.developer)
    .map((ic) => ({ id: ic.company!.id, name: ic.company!.name, role: "Developer" }));
  const publishers = companies
    .filter((ic) => ic.publisher)
    .map((ic) => ({ id: ic.company!.id, name: ic.company!.name, role: "Publisher" }));

  const normalized: SyncGame = {
    igdbId: game.id,
    title: game.name,
    coverUrl: coverUrlFromImageId(game.cover?.image_id),
    releaseYear: releaseYearFromTimestamp(game.first_release_date),
    firstReleaseDate: game.first_release_date,
    // game_type replaces the deprecated category; fall back for old payloads
    gameType: game.game_type ?? game.category,
    category: game.category,
    parentGame: game.parent_game,
    summary: game.summary,
    genres: jsonOrUndefined(game.genres),
    platforms: jsonOrUndefined(game.platforms),
    themes: jsonOrUndefined(game.themes),
    developers: jsonOrUndefined(developers),
    publishers: jsonOrUndefined(publishers),
    aggregatedRating: game.aggregated_rating,
    aggregatedRatingCount: game.aggregated_rating_count,
    rating: game.rating,
    ratingCount: game.rating_count,
    totalRating: game.total_rating,
    totalRatingCount: game.total_rating_count,
    hypes: game.hypes,
    franchise: game.franchise?.name,
    franchises: jsonOrUndefined(game.franchises),
    igdbUpdatedAt: game.updated_at,
    igdbChecksum: game.checksum,
  };

  // Drop undefined keys: patching with undefined would erase stored fields,
  // and Convex rejects explicit undefined in action -> mutation arguments.
  for (const key of Object.keys(normalized) as Array<keyof SyncGame>) {
    if (normalized[key] === undefined) {
      delete normalized[key];
    }
  }
  return normalized;
}

/**
 * True when the stored game already reflects the incoming IGDB version.
 * Checksum is authoritative; updated_at is the fallback when either side lacks one.
 */
export function isUnchanged(
  existing: { igdbChecksum?: string; igdbUpdatedAt?: number },
  incoming: { igdbChecksum?: string; igdbUpdatedAt?: number }
): boolean {
  if (existing.igdbChecksum && incoming.igdbChecksum) {
    return existing.igdbChecksum === incoming.igdbChecksum;
  }
  if (existing.igdbUpdatedAt !== undefined && incoming.igdbUpdatedAt !== undefined) {
    return existing.igdbUpdatedAt >= incoming.igdbUpdatedAt;
  }
  return false;
}

export function clampPageSize(requested: number | undefined): number {
  const value = Math.floor(requested ?? SYNC_PAGE_SIZE);
  if (!Number.isFinite(value)) return SYNC_PAGE_SIZE;
  return Math.min(Math.max(1, value), SYNC_MAX_PAGE_SIZE);
}

/**
 * Advances an ascending watermark (updated_at or id) after a page.
 * Pages are fetched with `field >= watermark`, so ties on the boundary are
 * re-read and skipped by checksum instead of being lost. If a full page never
 * moves past the watermark we step over it to guarantee progress.
 */
export function advanceWatermark(current: number, pageValues: number[], pageSize: number): number {
  if (pageValues.length === 0) return current;
  const max = Math.max(...pageValues);
  if (max <= current && pageValues.length >= pageSize) {
    return current + 1;
  }
  return Math.max(current, max);
}

export type ErrorClass = "retryable" | "auth" | "fatal";

/**
 * 429 and 5xx deserve a retry with backoff, 401 a fresh token, and everything
 * else (validation errors) must not be retried.
 */
export function classifyStatus(status: number): ErrorClass {
  if (status === 429 || status >= 500) return "retryable";
  if (status === 401) return "auth";
  return "fatal";
}

export function backoffDelayMs(attempt: number, baseMs = 500, maxMs = 8000): number {
  return Math.min(maxMs, baseMs * 2 ** attempt);
}

/**
 * Shortens an error for storage and strips anything that looks like a credential.
 */
export function sanitizeError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  return raw
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [redacted]")
    .replace(/(access_token|client_secret|secret|token)=[^&\s"]+/gi, "$1=[redacted]")
    .slice(0, MAX_ERROR_LENGTH);
}

export function mergeFailedIds(existing: number[], incoming: number[]): number[] {
  return Array.from(new Set([...existing, ...incoming])).slice(0, MAX_FAILED_IDS);
}

/**
 * Constant-time string comparison for shared secrets.
 */
export function safeEqual(a: string, b: string): boolean {
  const length = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < length; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

export const JOB_TYPES = ["recent_releases", "popular", "reconcile", "backfill", "events"] as const;
export type JobType = (typeof JOB_TYPES)[number];

/** Expected period per scheduled job; used to flag jobs that missed two runs. */
export const JOB_PERIOD_MS: Partial<Record<JobType, number>> = {
  recent_releases: 24 * 60 * 60 * 1000,
  popular: 12 * 60 * 60 * 1000,
  reconcile: 7 * 24 * 60 * 60 * 1000,
};

export function isOverdue(jobType: JobType, lastCompletedAt: number | undefined, now: number): boolean {
  const period = JOB_PERIOD_MS[jobType];
  if (!period || lastCompletedAt === undefined) return false;
  return now - lastCompletedAt > period * 2;
}
