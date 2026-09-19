/**
 * Incremental, resumable IGDB catalogue sync (see docs/IGDB-SYNC-PLAN.md).
 *
 * Every invocation of runPage handles ONE page of at most 100 games and then
 * schedules the next one, so no single function ever works through the whole
 * catalogue. The job row in syncJobs is the lock, the heartbeat and the cursor.
 *
 * Manual runs (dashboard or CLI):
 *   npx convex run catalogSync:start '{"jobType":"recent_releases","manual":true,"dryRun":true,"maxPages":1}'
 *   npx convex run catalogSync:start '{"jobType":"backfill","manual":true,"minRatingCount":20}'
 */
import { internalAction, internalMutation, ActionCtx } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { calculatePopScore, fetchPopularityPrimitives, getClientId, getValidIgdbToken } from "./igdb";
import { jobTypeValidator } from "./syncJobs";
import {
  IGDB_BASIC_FIELDS,
  IgdbBasicGame,
  JobType,
  SyncGame,
  advanceWatermark,
  backoffDelayMs,
  clampPageSize,
  classifyStatus,
  normalizeBasicGame,
  sanitizeError,
} from "./lib/igdbSync";

const MAX_ATTEMPTS = 4;
// One page does at most two IGDB requests, so a 1s gap keeps us under 4 req/s.
const PAGE_GAP_MS = 1000;
const RECENT_LOOKBACK_MONTHS = 18;
const INITIAL_LOOKBACK_SECONDS = 7 * 24 * 60 * 60;
// Measured 2026-09-19: without this IGDB matches ~2,600 games/day, with it ~240,
// which fits the 300/day budget. Same bar as the old trending seed; anything
// below it still reaches the catalogue on demand through search.
const RECENT_RELEVANCE_FILTER = "(hypes >= 3 | total_rating_count >= 5)";
const RECONCILE_STALE_MS = 30 * 24 * 60 * 60 * 1000;
const POPULARITY_MIN_DELTA = 0.5;

const DEFAULT_MAX_PAGES: Record<JobType, number> = {
  recent_releases: 3,
  popular: 1,
  reconcile: 20,
  backfill: 1,
  events: 5,
};
const MAX_PAGES_CAP = 50;

/**
 * CATALOG_SYNC_ENABLED=true turns on cron, HTTP and webhook driven runs.
 * Manual runs ignore it so a dry run can be tried before enabling anything.
 */
export function isSyncEnabled(): boolean {
  return process.env.CATALOG_SYNC_ENABLED === "true";
}

/**
 * Takes the lock and schedules the first page. Cheap no-op when the sync is
 * disabled or the job is already running.
 */
export const start = internalMutation({
  args: {
    jobType: jobTypeValidator,
    manual: v.optional(v.boolean()),
    dryRun: v.optional(v.boolean()),
    maxPages: v.optional(v.number()),
    pageSize: v.optional(v.number()),
    resetCursor: v.optional(v.boolean()),
    minRatingCount: v.optional(v.number()), // backfill only
  },
  handler: async (ctx, args): Promise<{ status: "started" | "busy" | "disabled"; runId?: string }> => {
    if (!args.manual && !isSyncEnabled()) {
      return { status: "disabled" };
    }
    if (args.jobType === "backfill" && !args.manual) {
      throw new Error("backfill only runs manually");
    }

    const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const lock: { acquired: boolean; cursor?: string } = await ctx.runMutation(internal.syncJobs.acquire, {
      jobType: args.jobType,
      runId,
      dryRun: args.dryRun,
      resetCursor: args.resetCursor,
    });
    if (!lock.acquired) {
      return { status: "busy" };
    }

    const maxPages = Math.min(
      Math.max(1, Math.floor(args.maxPages ?? DEFAULT_MAX_PAGES[args.jobType])),
      MAX_PAGES_CAP
    );
    await ctx.scheduler.runAfter(0, internal.catalogSync.runPage, {
      jobType: args.jobType,
      runId,
      cursor: lock.cursor,
      pagesLeft: maxPages,
      pageSize: clampPageSize(args.pageSize),
      dryRun: args.dryRun ?? false,
      minRatingCount: args.minRatingCount,
    });
    return { status: "started", runId };
  },
});

type PageResult = {
  fetched: number;
  changed: number;
  skipped: number;
  failed: number;
  failedIds: number[];
  nextCursor: string | undefined;
  done: boolean;
};

type PageArgs = {
  cursor?: string;
  pageSize: number;
  dryRun: boolean;
  minRatingCount?: number;
};

export const runPage = internalAction({
  args: {
    jobType: jobTypeValidator,
    runId: v.string(),
    cursor: v.optional(v.string()),
    pagesLeft: v.number(),
    pageSize: v.number(),
    dryRun: v.boolean(),
    minRatingCount: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<void> => {
    const { jobType, runId } = args;
    try {
      const page = await PAGE_HANDLERS[jobType](ctx, args);

      const recorded: { ok: boolean } = await ctx.runMutation(internal.syncJobs.recordPage, {
        jobType,
        runId,
        cursor: page.nextCursor,
        fetched: page.fetched,
        changed: page.changed,
        skipped: page.skipped,
        failed: page.failed,
        failedIds: page.failedIds,
      });
      if (!recorded.ok) {
        console.warn(`[catalogSync] ${jobType} run ${runId} lost its lock, stopping`);
        return;
      }

      console.log(
        `[catalogSync] ${jobType}${args.dryRun ? " (dry run)" : ""} page: fetched=${page.fetched} ` +
          `changed=${page.changed} skipped=${page.skipped} failed=${page.failed}`
      );

      // A dry run never moves the cursor, so a second page would repeat the first
      const pagesLeft = args.pagesLeft - 1;
      if (page.done || pagesLeft <= 0 || args.dryRun) {
        await ctx.runMutation(internal.syncJobs.finish, { jobType, runId });
        return;
      }

      await ctx.scheduler.runAfter(PAGE_GAP_MS, internal.catalogSync.runPage, {
        ...args,
        cursor: page.nextCursor,
        pagesLeft,
      });
    } catch (error) {
      console.error(`[catalogSync] ${jobType} failed:`, sanitizeError(error));
      // The confirmed cursor stays in place, the next run resumes from it
      await ctx.runMutation(internal.syncJobs.finish, { jobType, runId, error: sanitizeError(error) });
    }
  },
});

// ---------------------------------------------------------------------------
// IGDB access
// ---------------------------------------------------------------------------

class IgdbRequestError extends Error {
  constructor(public status: number, details: string) {
    super(`IGDB ${status}: ${details.slice(0, 200)}`);
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * POSTs an Apicalypse query. Retries 429/5xx with backoff, refreshes the token
 * once on 401, and fails fast on validation errors.
 */
async function igdbRequest<T>(ctx: ActionCtx, endpoint: string, body: string): Promise<T[]> {
  const clientId = getClientId();
  let { accessToken } = await getValidIgdbToken(ctx);
  let refreshed = false;

  for (let attempt = 0; ; attempt++) {
    let response: Response;
    try {
      response = await fetch(`https://api.igdb.com/v4/${endpoint}`, {
        method: "POST",
        headers: {
          "Client-ID": clientId,
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "text/plain",
        },
        body,
      });
    } catch (error) {
      if (attempt + 1 >= MAX_ATTEMPTS) throw error;
      await sleep(backoffDelayMs(attempt));
      continue;
    }

    if (response.ok) {
      const payload = await response.json();
      if (!Array.isArray(payload)) {
        throw new IgdbRequestError(response.status, "unexpected payload shape");
      }
      return payload as T[];
    }

    const details = await response.text().catch(() => "");
    const kind = classifyStatus(response.status);
    if (kind === "auth" && !refreshed) {
      refreshed = true;
      ({ accessToken } = await getValidIgdbToken(ctx, { forceRefresh: true }));
      continue;
    }
    if (kind === "retryable" && attempt + 1 < MAX_ATTEMPTS) {
      await sleep(backoffDelayMs(attempt));
      continue;
    }
    throw new IgdbRequestError(response.status, details);
  }
}

async function fetchGamesByIds(ctx: ActionCtx, igdbIds: number[]): Promise<IgdbBasicGame[]> {
  if (igdbIds.length === 0) return [];
  return await igdbRequest<IgdbBasicGame>(
    ctx,
    "games",
    `fields ${IGDB_BASIC_FIELDS}; where id = (${igdbIds.join(",")}); limit ${igdbIds.length};`
  );
}

/**
 * Normalizes a raw page and writes it with a single mutation.
 */
async function writeGames(
  ctx: ActionCtx,
  rawGames: IgdbBasicGame[],
  dryRun: boolean
): Promise<Pick<PageResult, "fetched" | "changed" | "skipped" | "failed" | "failedIds">> {
  const games: SyncGame[] = [];
  const failedIds: number[] = [];
  let failed = 0;

  for (const raw of rawGames) {
    const game = normalizeBasicGame(raw);
    if (game) {
      games.push(game);
    } else {
      failed++;
      if (typeof raw?.id === "number") failedIds.push(raw.id);
    }
  }

  let changed = 0;
  let skipped = 0;
  if (games.length > 0) {
    const result: { inserted: number; updated: number; skipped: number; failedIds: number[] } =
      await ctx.runMutation(internal.games.upsertBatchFromIgdb, { games, dryRun });
    changed = result.inserted + result.updated;
    skipped = result.skipped;
    failed += result.failedIds.length;
    failedIds.push(...result.failedIds);
  }

  return { fetched: rawGames.length, changed, skipped, failed, failedIds };
}

// ---------------------------------------------------------------------------
// Jobs: one page each
// ---------------------------------------------------------------------------

/**
 * Games updated since the watermark that released within the last 18 months
 * (or are still upcoming), oldest update first.
 */
async function recentReleasesPage(ctx: ActionCtx, args: PageArgs): Promise<PageResult> {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const parsed = args.cursor ? (JSON.parse(args.cursor) as { since?: number }) : {};
  const since = parsed.since ?? nowSeconds - INITIAL_LOOKBACK_SECONDS;

  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - RECENT_LOOKBACK_MONTHS);
  const releasedAfter = Math.floor(cutoff.getTime() / 1000);

  const rawGames = await igdbRequest<IgdbBasicGame>(
    ctx,
    "games",
    `fields ${IGDB_BASIC_FIELDS};
where updated_at >= ${since} & first_release_date >= ${releasedAfter} & cover != null & version_parent = null & ${RECENT_RELEVANCE_FILTER};
sort updated_at asc;
limit ${args.pageSize};`
  );

  const written = await writeGames(ctx, rawGames, args.dryRun);
  const nextSince = advanceWatermark(
    since,
    rawGames.map((game) => game.updated_at ?? since),
    args.pageSize
  );
  return {
    ...written,
    nextCursor: JSON.stringify({ since: nextSince }),
    done: rawGames.length < args.pageSize,
  };
}

/**
 * Re-checks cached games whose last sync is older than 30 days, walking the
 * catalogue by IGDB id. Games IGDB no longer returns are flagged, not deleted.
 */
async function reconcilePage(ctx: ActionCtx, args: PageArgs): Promise<PageResult> {
  const parsed = args.cursor ? (JSON.parse(args.cursor) as { afterIgdbId?: number }) : {};
  const page: { staleIgdbIds: number[]; lastIgdbId: number; done: boolean } = await ctx.runQuery(
    internal.syncJobs.listReconcilePage,
    {
      afterIgdbId: parsed.afterIgdbId ?? 0,
      pageSize: args.pageSize,
      staleBefore: Date.now() - RECONCILE_STALE_MS,
    }
  );

  const rawGames = await fetchGamesByIds(ctx, page.staleIgdbIds);
  const written = await writeGames(ctx, rawGames, args.dryRun);

  const returned = new Set(rawGames.map((game) => game.id));
  const missing = page.staleIgdbIds.filter((igdbId) => !returned.has(igdbId));
  if (missing.length > 0 && !args.dryRun) {
    await ctx.runMutation(internal.games.markMissingInIgdb, { igdbIds: missing });
  }

  return {
    ...written,
    // Start over from the first game once the walk reaches the end
    nextCursor: JSON.stringify({ afterIgdbId: page.done ? 0 : page.lastIgdbId }),
    done: page.done,
  };
}

/**
 * Refreshes PopScore only for games people can currently see or own.
 */
async function popularPage(ctx: ActionCtx, args: PageArgs): Promise<PageResult> {
  const targets: Array<{ gameId: Id<"games">; igdbId: number; score?: number }> = await ctx.runQuery(
    internal.syncJobs.listPopularityTargets,
    { limit: args.pageSize * 3 }
  );
  if (targets.length === 0) {
    return { fetched: 0, changed: 0, skipped: 0, failed: 0, failedIds: [], nextCursor: undefined, done: true };
  }

  const { accessToken } = await getValidIgdbToken(ctx);
  const primitives = await fetchPopularityPrimitives(
    targets.map((target) => target.igdbId),
    accessToken,
    getClientId()
  );

  const updates = targets
    .map((target) => ({ gameId: target.gameId, previous: target.score, score: calculatePopScore(primitives[target.igdbId]) }))
    .filter((update) => Math.abs(update.score - (update.previous ?? 0)) >= POPULARITY_MIN_DELTA)
    .map(({ gameId, score }) => ({ gameId, score }));

  if (!args.dryRun) {
    for (let i = 0; i < updates.length; i += args.pageSize) {
      await ctx.runMutation(internal.syncJobs.patchPopularity, { updates: updates.slice(i, i + args.pageSize) });
    }
  }

  return {
    fetched: targets.length,
    changed: updates.length,
    skipped: targets.length - updates.length,
    failed: 0,
    failedIds: [],
    nextCursor: undefined,
    done: true,
  };
}

/**
 * Manual catalogue growth: well-rated games in ascending id order.
 */
async function backfillPage(ctx: ActionCtx, args: PageArgs): Promise<PageResult> {
  const parsed = args.cursor ? (JSON.parse(args.cursor) as { afterIgdbId?: number; minRatingCount?: number }) : {};
  const afterIgdbId = parsed.afterIgdbId ?? 0;
  const minRatingCount = Math.max(1, Math.floor(args.minRatingCount ?? parsed.minRatingCount ?? 20));

  const rawGames = await igdbRequest<IgdbBasicGame>(
    ctx,
    "games",
    `fields ${IGDB_BASIC_FIELDS};
where id > ${afterIgdbId} & total_rating_count >= ${minRatingCount} & version_parent = null;
sort id asc;
limit ${args.pageSize};`
  );

  const written = await writeGames(ctx, rawGames, args.dryRun);
  const lastId = rawGames.reduce((max, game) => Math.max(max, game.id), afterIgdbId);
  return {
    ...written,
    nextCursor: JSON.stringify({ afterIgdbId: lastId, minRatingCount }),
    done: rawGames.length < args.pageSize,
  };
}

/**
 * Applies queued webhook events. Anything that fails stays queued for a retry.
 */
async function eventsPage(ctx: ActionCtx, args: PageArgs): Promise<PageResult> {
  const events: Array<{ _id: Id<"syncEvents">; igdbId: number; event: "create" | "update" | "delete" }> =
    await ctx.runQuery(internal.syncJobs.listPendingEvents, { limit: args.pageSize });
  if (events.length === 0) {
    return { fetched: 0, changed: 0, skipped: 0, failed: 0, failedIds: [], nextCursor: undefined, done: true };
  }

  const deletions = events.filter((event) => event.event === "delete");
  const upserts = events.filter((event) => event.event !== "delete");

  const rawGames = await fetchGamesByIds(ctx, upserts.map((event) => event.igdbId));
  const written = await writeGames(ctx, rawGames, args.dryRun);

  const failedIds = new Set(written.failedIds);
  const returned = new Set(rawGames.map((game) => game.id));
  const retry = upserts.filter((event) => !returned.has(event.igdbId) || failedIds.has(event.igdbId));
  const retryIds = new Set(retry.map((event) => event._id));

  if (!args.dryRun) {
    if (deletions.length > 0) {
      await ctx.runMutation(internal.games.markMissingInIgdb, { igdbIds: deletions.map((event) => event.igdbId) });
    }
    await ctx.runMutation(internal.syncJobs.settleEvents, {
      done: events.filter((event) => !retryIds.has(event._id)).map((event) => event._id),
      retry: retry.map((event) => event._id),
    });
  }

  const notReturned = retry.filter((event) => !returned.has(event.igdbId));
  return {
    fetched: events.length,
    changed: written.changed + deletions.length,
    skipped: written.skipped,
    failed: written.failed + notReturned.length,
    failedIds: [...written.failedIds, ...notReturned.map((event) => event.igdbId)],
    nextCursor: undefined,
    done: events.length < args.pageSize,
  };
}

const PAGE_HANDLERS: Record<JobType, (ctx: ActionCtx, args: PageArgs) => Promise<PageResult>> = {
  recent_releases: recentReleasesPage,
  popular: popularPage,
  reconcile: reconcilePage,
  backfill: backfillPage,
  events: eventsPage,
};

// ---------------------------------------------------------------------------
// IGDB webhook registration
// ---------------------------------------------------------------------------

/**
 * Registers the create/update/delete webhooks for games against this
 * deployment. Run once per deployment after setting IGDB_WEBHOOK_SECRET:
 *   npx convex run catalogSync:registerIgdbWebhooks
 */
export const registerIgdbWebhooks = internalAction({
  args: {},
  handler: async (ctx): Promise<Array<{ method: string; status: number }>> => {
    const secret = process.env.IGDB_WEBHOOK_SECRET;
    const siteUrl = process.env.CONVEX_SITE_URL;
    if (!secret || !siteUrl) {
      throw new Error("IGDB_WEBHOOK_SECRET and CONVEX_SITE_URL must be set");
    }

    const { accessToken } = await getValidIgdbToken(ctx);
    const results: Array<{ method: string; status: number }> = [];
    for (const method of ["create", "update", "delete"]) {
      const response = await fetch("https://api.igdb.com/v4/games/webhooks/", {
        method: "POST",
        headers: {
          "Client-ID": getClientId(),
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ url: `${siteUrl}/igdb/webhook/${method}`, method, secret }),
      });
      results.push({ method, status: response.status });
    }
    return results;
  },
});
