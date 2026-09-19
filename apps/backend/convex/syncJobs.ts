/**
 * State for the incremental catalogue sync: one lock/cursor row per job type,
 * the webhook event queue, and the bounded target lists the jobs work on.
 */
import { internalMutation, internalQuery, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { requireAdmin } from "./lib/auth";
import {
  JOB_TYPES,
  SYNC_MAX_PAGE_SIZE,
  isOverdue,
  mergeFailedIds,
  sanitizeError,
} from "./lib/igdbSync";

// A running job that stops sending heartbeats for this long can be taken over.
export const LOCK_TTL_MS = 10 * 60 * 1000;
const MAX_EVENT_ATTEMPTS = 5;
const EVENT_DRAIN_DELAY_MS = 30_000;
const RECENT_WINDOW_SECONDS = 18 * 30 * 24 * 60 * 60;
const RECENT_CANDIDATES = 400;

export const jobTypeValidator = v.union(
  v.literal("recent_releases"),
  v.literal("popular"),
  v.literal("reconcile"),
  v.literal("backfill"),
  v.literal("events"),
);

/**
 * Takes the logical lock for a job type. Returns the cursor to continue from,
 * or acquired=false while another run is still alive.
 */
export const acquire = internalMutation({
  args: {
    jobType: jobTypeValidator,
    runId: v.string(),
    dryRun: v.optional(v.boolean()),
    resetCursor: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const job = await ctx.db
      .query("syncJobs")
      .withIndex("by_job_type", (q) => q.eq("jobType", args.jobType))
      .first();

    const counters = {
      pages: 0,
      recordsFetched: 0,
      recordsChanged: 0,
      recordsSkipped: 0,
      recordsFailed: 0,
    };

    if (!job) {
      await ctx.db.insert("syncJobs", {
        jobType: args.jobType,
        status: "running",
        runId: args.runId,
        dryRun: args.dryRun,
        startedAt: now,
        heartbeatAt: now,
        attempt: 1,
        ...counters,
      });
      return { acquired: true as const, cursor: undefined as string | undefined };
    }

    const lockAlive = job.status === "running" && now - (job.heartbeatAt ?? 0) < LOCK_TTL_MS;
    if (lockAlive) {
      return { acquired: false as const, cursor: job.cursor };
    }

    const cursor = args.resetCursor ? undefined : job.cursor;
    await ctx.db.patch(job._id, {
      status: "running",
      runId: args.runId,
      dryRun: args.dryRun,
      cursor,
      startedAt: now,
      finishedAt: undefined,
      heartbeatAt: now,
      failedIds: undefined,
      lastError: undefined,
      // A run that follows a failure or an expired lock counts as a retry
      attempt: job.status === "completed" || job.status === "idle" ? 1 : job.attempt + 1,
      ...counters,
    });
    return { acquired: true as const, cursor };
  },
});

/**
 * Confirms a page: heartbeat, counters and the new cursor in one write.
 * Returns ok=false when the lock now belongs to another run.
 */
export const recordPage = internalMutation({
  args: {
    jobType: jobTypeValidator,
    runId: v.string(),
    cursor: v.optional(v.string()),
    fetched: v.number(),
    changed: v.number(),
    skipped: v.number(),
    failed: v.number(),
    failedIds: v.optional(v.array(v.number())),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db
      .query("syncJobs")
      .withIndex("by_job_type", (q) => q.eq("jobType", args.jobType))
      .first();
    if (!job || job.runId !== args.runId || job.status !== "running") {
      return { ok: false, pages: job?.pages ?? 0 };
    }

    const pages = job.pages + 1;
    await ctx.db.patch(job._id, {
      // Dry runs must be repeatable, so they never move the cursor
      cursor: job.dryRun ? job.cursor : args.cursor,
      heartbeatAt: Date.now(),
      pages,
      recordsFetched: job.recordsFetched + args.fetched,
      recordsChanged: job.recordsChanged + args.changed,
      recordsSkipped: job.recordsSkipped + args.skipped,
      recordsFailed: job.recordsFailed + args.failed,
      failedIds: mergeFailedIds(job.failedIds ?? [], args.failedIds ?? []),
    });
    return { ok: true, pages };
  },
});

/**
 * Releases the lock with the final status of the run.
 */
export const finish = internalMutation({
  args: {
    jobType: jobTypeValidator,
    runId: v.string(),
    error: v.optional(v.string()),
    cursor: v.optional(v.string()),
    setCursor: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db
      .query("syncJobs")
      .withIndex("by_job_type", (q) => q.eq("jobType", args.jobType))
      .first();
    if (!job || job.runId !== args.runId) return;

    const now = Date.now();
    const failed = args.error !== undefined;
    await ctx.db.patch(job._id, {
      status: failed ? "failed" : "completed",
      finishedAt: now,
      heartbeatAt: now,
      lastError: failed ? sanitizeError(args.error) : undefined,
      ...(failed || job.dryRun ? {} : { lastCompletedAt: now }),
      ...(args.setCursor && !job.dryRun ? { cursor: args.cursor } : {}),
    });
  },
});

/**
 * Admin view: latest result of every job, plus the ones that missed two periods.
 */
export const getStatus = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const now = Date.now();
    const jobs = await ctx.db.query("syncJobs").collect();
    const pendingEvents = await ctx.db.query("syncEvents").withIndex("by_received_at").take(1000);

    return {
      pendingEvents: pendingEvents.length,
      jobs: jobs.map((job) => ({
        jobType: job.jobType,
        status: job.status,
        dryRun: job.dryRun ?? false,
        cursor: job.cursor,
        startedAt: job.startedAt,
        finishedAt: job.finishedAt,
        heartbeatAt: job.heartbeatAt,
        lastCompletedAt: job.lastCompletedAt,
        durationMs: job.startedAt && job.finishedAt ? job.finishedAt - job.startedAt : undefined,
        pages: job.pages,
        recordsFetched: job.recordsFetched,
        recordsChanged: job.recordsChanged,
        recordsSkipped: job.recordsSkipped,
        recordsFailed: job.recordsFailed,
        failedIds: job.failedIds ?? [],
        lastError: job.lastError,
        attempt: job.attempt,
        overdue: isOverdue(job.jobType, job.lastCompletedAt, now),
        stuck: job.status === "running" && now - (job.heartbeatAt ?? 0) >= LOCK_TTL_MS,
      })),
    };
  },
});

/**
 * Daily health check. console.error is what log streams and alerts key on.
 */
export const checkHealth = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const jobs = await ctx.db.query("syncJobs").collect();
    const overdue = jobs.filter((job) => isOverdue(job.jobType, job.lastCompletedAt, now));
    for (const job of overdue) {
      console.error(
        `[catalogSync] ALERT: ${job.jobType} has not completed for two periods ` +
          `(last completed ${job.lastCompletedAt ? new Date(job.lastCompletedAt).toISOString() : "never"}, ` +
          `status ${job.status}, error ${job.lastError ?? "none"})`
      );
    }
    return { overdue: overdue.map((job) => job.jobType), checked: JOB_TYPES.length };
  },
});

// ---------------------------------------------------------------------------
// Webhook event queue
// ---------------------------------------------------------------------------

export const enqueueEvent = internalMutation({
  args: {
    igdbId: v.number(),
    event: v.union(v.literal("create"), v.literal("update"), v.literal("delete")),
  },
  handler: async (ctx, args) => {
    const pending = await ctx.db
      .query("syncEvents")
      .withIndex("by_igdb_id", (q) => q.eq("igdbId", args.igdbId))
      .first();

    if (pending) {
      // Coalesce bursts: the latest event for a game wins
      if (pending.event !== args.event) {
        await ctx.db.patch(pending._id, { event: args.event, attempts: 0 });
      }
      return { queued: false };
    }

    const queueWasEmpty = (await ctx.db.query("syncEvents").first()) === null;
    await ctx.db.insert("syncEvents", {
      igdbId: args.igdbId,
      event: args.event,
      receivedAt: Date.now(),
      attempts: 0,
    });

    // One delayed drain per burst; the hourly cron picks up anything left over
    if (queueWasEmpty) {
      await ctx.scheduler.runAfter(EVENT_DRAIN_DELAY_MS, internal.catalogSync.start, { jobType: "events" });
    }
    return { queued: true };
  },
});

export const listPendingEvents = internalQuery({
  args: { limit: v.number() },
  handler: async (ctx, args) => {
    const events = await ctx.db
      .query("syncEvents")
      .withIndex("by_received_at")
      .take(Math.min(args.limit, SYNC_MAX_PAGE_SIZE));
    return events.map((event) => ({ _id: event._id, igdbId: event.igdbId, event: event.event }));
  },
});

/**
 * Removes applied events; failed ones stay queued until they run out of attempts.
 */
export const settleEvents = internalMutation({
  args: {
    done: v.array(v.id("syncEvents")),
    retry: v.array(v.id("syncEvents")),
  },
  handler: async (ctx, args) => {
    for (const id of args.done) {
      if (await ctx.db.get(id)) await ctx.db.delete(id);
    }
    const dropped: number[] = [];
    for (const id of args.retry) {
      const event = await ctx.db.get(id);
      if (!event) continue;
      if (event.attempts + 1 >= MAX_EVENT_ATTEMPTS) {
        dropped.push(event.igdbId);
        await ctx.db.delete(id);
      } else {
        // Move to the back of the queue so one bad event cannot block the rest
        await ctx.db.patch(id, { attempts: event.attempts + 1, receivedAt: Date.now() });
      }
    }
    return { dropped };
  },
});

// ---------------------------------------------------------------------------
// Bounded target lists
// ---------------------------------------------------------------------------

/**
 * Walks the catalogue by IGDB id and returns the games of the page whose last
 * sync is older than staleBefore. Unchanged games are never written, so the
 * walk position lives in the job cursor rather than in lastUpdated.
 */
export const listReconcilePage = internalQuery({
  args: {
    afterIgdbId: v.number(),
    pageSize: v.number(),
    staleBefore: v.number(),
  },
  handler: async (ctx, args) => {
    const pageSize = Math.min(args.pageSize, SYNC_MAX_PAGE_SIZE);
    const games = await ctx.db
      .query("games")
      .withIndex("by_igdb_id", (q) => q.gt("igdbId", args.afterIgdbId))
      .take(pageSize);

    return {
      staleIgdbIds: games
        .filter((game) => game.lastUpdated < args.staleBefore && game.lastSyncError !== "not_found_in_igdb")
        .map((game) => game.igdbId),
      lastIgdbId: games.length > 0 ? games[games.length - 1].igdbId : args.afterIgdbId,
      done: games.length < pageSize,
    };
  },
});

/**
 * Games worth a popularity refresh: what Discover shows plus what people have
 * recently added to their libraries. Never the whole catalogue.
 */
export const listPopularityTargets = internalQuery({
  args: { limit: v.number() },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(1, args.limit), 500);
    const perSource = Math.ceil(limit / 4);
    const targets = new Map<Id<"games">, { gameId: Id<"games">; igdbId: number; score: number | undefined }>();

    const add = (game: { _id: Id<"games">; igdbId: number; popularity_score?: number } | null) => {
      if (game && targets.size < limit && !targets.has(game._id)) {
        targets.set(game._id, { gameId: game._id, igdbId: game.igdbId, score: game.popularity_score });
      }
    };

    // Discover's trending row only considers the last 18 months, so the recent
    // releases people actually engage with go first and get half the slots
    const nowSeconds = Math.floor(Date.now() / 1000);
    const windowStart = nowSeconds - RECENT_WINDOW_SECONDS;
    const released = await ctx.db
      .query("games")
      .withIndex("by_release_date", (q) => q.gte("firstReleaseDate", windowStart).lte("firstReleaseDate", nowSeconds))
      .order("desc")
      .take(RECENT_CANDIDATES);
    const engagement = (game: (typeof released)[number]) => (game.hypes ?? 0) * 5 + (game.totalRatingCount ?? 0);
    released
      .filter((game) => engagement(game) > 0)
      .sort((a, b) => engagement(b) - engagement(a))
      .slice(0, perSource * 2)
      .forEach(add);

    const popular = await ctx.db.query("games").withIndex("by_popularity").order("desc").take(perSource);
    popular.forEach(add);
    // Discover's top rated row; also how well-known games get their first score
    const topRated = await ctx.db.query("games").withIndex("by_rating_descending").order("desc").take(perSource);
    topRated.forEach(add);

    // Libraries: latest backlog entries, reviews and favorites
    const backlog = await ctx.db.query("backlogItems").order("desc").take(perSource);
    const reviews = await ctx.db.query("reviews").order("desc").take(perSource);
    const favorites = await ctx.db.query("favorites").order("desc").take(perSource);
    const libraryIds = new Set([...backlog, ...reviews, ...favorites].map((row) => row.gameId));
    for (const gameId of libraryIds) {
      if (targets.size >= limit) break;
      if (!targets.has(gameId)) add(await ctx.db.get(gameId));
    }

    return Array.from(targets.values());
  },
});

export const patchPopularity = internalMutation({
  args: {
    updates: v.array(v.object({ gameId: v.id("games"), score: v.number() })),
  },
  handler: async (ctx, args) => {
    for (const update of args.updates.slice(0, SYNC_MAX_PAGE_SIZE)) {
      await ctx.db.patch(update.gameId, { popularity_score: update.score });
    }
  },
});
