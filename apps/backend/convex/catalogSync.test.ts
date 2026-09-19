import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";

const modules = (import.meta as unknown as { glob: (pattern: string) => Record<string, () => Promise<unknown>> }).glob(
  "./**/*.ts"
);

type FakeResponse = { status: number; body: unknown };

/** Queues IGDB responses; records the Apicalypse bodies that were sent. */
function mockIgdb(responses: FakeResponse[]) {
  const bodies: string[] = [];
  const fetchMock = vi.fn(async (url: string, init?: { body?: unknown }) => {
    if (String(url).includes("id.twitch.tv")) {
      return new Response(JSON.stringify({ access_token: "fresh-token", expires_in: 3600 }), { status: 200 });
    }
    bodies.push(String(init?.body ?? ""));
    const next = responses.shift() ?? { status: 200, body: [] };
    return new Response(JSON.stringify(next.body), { status: next.status });
  });
  vi.stubGlobal("fetch", fetchMock);
  return { bodies, fetchMock };
}

const NOW = new Date("2026-01-01T00:00:00Z").getTime();
const T0 = NOW / 1000 - 100; // an update inside the initial lookback window
const zelda = { id: 7346, name: "Breath of the Wild", first_release_date: 1488499200, updated_at: T0, checksum: "v1" };
const hades = { id: 113112, name: "Hades", updated_at: T0 + 1, checksum: "h1" };

function setup() {
  const t = convexTest(schema, modules);
  return t;
}

async function seedToken(t: ReturnType<typeof setup>) {
  await t.run(async (ctx) => {
    await ctx.db.insert("apiTokens", { provider: "igdb", accessToken: "cached-token", expiresAt: Date.now() + 3_600_000 });
  });
}

/** Runs scheduled pages while also ticking the backoff sleeps inside them. */
async function drain(t: ReturnType<typeof setup>) {
  let finished = false;
  const pending = t.finishAllScheduledFunctions(vi.runAllTimers).finally(() => (finished = true));
  while (!finished) {
    await vi.advanceTimersByTimeAsync(1000);
  }
  await pending;
}

async function runJob(t: ReturnType<typeof setup>, args: Record<string, unknown>) {
  const result = await t.mutation(internal.catalogSync.start, { manual: true, ...args } as never);
  await drain(t);
  return result;
}

const getJob = (t: ReturnType<typeof setup>, jobType: string) =>
  t.run((ctx) => ctx.db.query("syncJobs").filter((q) => q.eq(q.field("jobType"), jobType)).first());

const allGames = (t: ReturnType<typeof setup>) => t.run((ctx) => ctx.db.query("games").collect());

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  vi.stubEnv("IGDB_CLIENT_ID", "client");
  vi.stubEnv("IGDB_CLIENT_SECRET", "secret");
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("upsertBatchFromIgdb", () => {
  const game = { igdbId: 1, title: "Game", igdbChecksum: "a", igdbUpdatedAt: 10 };

  test("inserts, skips an unchanged replay and updates a changed game", async () => {
    const t = setup();

    expect(await t.mutation(internal.games.upsertBatchFromIgdb, { games: [game] })).toMatchObject({ inserted: 1 });
    const [first] = await allGames(t);

    // Same batch again: no duplicate, no write
    expect(await t.mutation(internal.games.upsertBatchFromIgdb, { games: [game, game] })).toEqual({
      inserted: 0,
      updated: 0,
      skipped: 2,
      failedIds: [],
    });
    const [replayed] = await allGames(t);
    expect(replayed).toEqual(first);

    expect(
      await t.mutation(internal.games.upsertBatchFromIgdb, {
        games: [{ ...game, title: "Game: Definitive", igdbChecksum: "b" }],
      })
    ).toMatchObject({ updated: 1, skipped: 0 });
    const games = await allGames(t);
    expect(games).toHaveLength(1);
    expect(games[0]._id).toBe(first._id);
    expect(games[0]).toMatchObject({ title: "Game: Definitive", igdbChecksum: "b", syncStatus: "fresh" });
  });

  test("keeps enriched fields a basic sync does not carry", async () => {
    const t = setup();
    await t.run((ctx) => ctx.db.insert("games", { igdbId: 1, title: "Old", lastUpdated: 1, storyline: "Long story" }));
    await t.mutation(internal.games.upsertBatchFromIgdb, { games: [game] });
    expect((await allGames(t))[0]).toMatchObject({ title: "Game", storyline: "Long story" });
  });

  test("dry run counts without writing", async () => {
    const t = setup();
    expect(await t.mutation(internal.games.upsertBatchFromIgdb, { games: [game], dryRun: true })).toMatchObject({
      inserted: 1,
    });
    expect(await allGames(t)).toHaveLength(0);
  });

  test("rejects batches over 100 games", async () => {
    const t = setup();
    const games = Array.from({ length: 101 }, (_, i) => ({ igdbId: i + 1, title: `G${i}` }));
    await expect(t.mutation(internal.games.upsertBatchFromIgdb, { games })).rejects.toThrow();
  });
});

describe("recent_releases job", () => {
  test("writes a page, records counters and stores the watermark", async () => {
    const t = setup();
    await seedToken(t);
    const { bodies } = mockIgdb([{ status: 200, body: [zelda, hades, { id: 9 }] }]);

    expect(await runJob(t, { jobType: "recent_releases" })).toMatchObject({ status: "started" });

    expect((await allGames(t)).map((g) => g.igdbId).sort((a, b) => a - b)).toEqual([7346, 113112]);
    expect(bodies[0]).toContain("sort updated_at asc");
    expect(bodies[0]).not.toMatch(/artworks|screenshots|videos|websites/);

    const job = await getJob(t, "recent_releases");
    expect(job).toMatchObject({
      status: "completed",
      pages: 1,
      recordsFetched: 3,
      recordsChanged: 2,
      recordsSkipped: 0,
      recordsFailed: 1,
      failedIds: [9],
    });
    expect(JSON.parse(job!.cursor!)).toEqual({ since: T0 + 1 });
  });

  test("a rerun resumes from the cursor and skips unchanged games", async () => {
    const t = setup();
    await seedToken(t);
    mockIgdb([{ status: 200, body: [zelda, hades] }]);
    await runJob(t, { jobType: "recent_releases" });

    const { bodies } = mockIgdb([{ status: 200, body: [hades] }]);
    await runJob(t, { jobType: "recent_releases" });

    expect(bodies[0]).toContain(`updated_at >= ${T0 + 1}`);
    expect(await getJob(t, "recent_releases")).toMatchObject({ recordsChanged: 0, recordsSkipped: 1 });
    expect(await allGames(t)).toHaveLength(2);
  });

  test("pages until the budget runs out", async () => {
    const t = setup();
    await seedToken(t);
    const page = (from: number) =>
      Array.from({ length: 2 }, (_, i) => ({ id: from + i, name: `G${from + i}`, updated_at: T0 + from + i, checksum: `c${from + i}` }));
    const { bodies } = mockIgdb([
      { status: 200, body: page(10) },
      { status: 200, body: page(12) },
      { status: 200, body: page(14) },
    ]);

    await runJob(t, { jobType: "recent_releases", pageSize: 2, maxPages: 2 });

    expect(bodies).toHaveLength(2);
    expect(await getJob(t, "recent_releases")).toMatchObject({ status: "completed", pages: 2, recordsChanged: 4 });
  });

  test("dry run writes nothing and leaves the cursor alone", async () => {
    const t = setup();
    await seedToken(t);
    mockIgdb([{ status: 200, body: [zelda] }]);
    await runJob(t, { jobType: "recent_releases", dryRun: true });

    expect(await allGames(t)).toHaveLength(0);
    const job = await getJob(t, "recent_releases");
    expect(job).toMatchObject({ status: "completed", dryRun: true, recordsChanged: 1 });
    expect(job!.cursor).toBeUndefined();
    expect(job!.lastCompletedAt).toBeUndefined();
  });

  test("retries a 429 and then succeeds", async () => {
    const t = setup();
    await seedToken(t);
    const { bodies } = mockIgdb([
      { status: 429, body: { message: "Too Many Requests" } },
      { status: 200, body: [zelda] },
    ]);
    await runJob(t, { jobType: "recent_releases" });

    expect(bodies).toHaveLength(2);
    expect(await getJob(t, "recent_releases")).toMatchObject({ status: "completed", recordsChanged: 1 });
  });

  test("refreshes an expired token once", async () => {
    const t = setup();
    await seedToken(t);
    const { fetchMock } = mockIgdb([
      { status: 401, body: { message: "expired" } },
      { status: 200, body: [zelda] },
    ]);
    await runJob(t, { jobType: "recent_releases" });

    const authHeaders = fetchMock.mock.calls
      .filter(([url]) => String(url).includes("api.igdb.com"))
      .map(([, init]) => (init as { headers: Record<string, string> }).headers.Authorization);
    expect(authHeaders).toEqual(["Bearer cached-token", "Bearer fresh-token"]);
    expect(await getJob(t, "recent_releases")).toMatchObject({ status: "completed" });
  });

  test("does not retry validation errors and keeps the confirmed cursor", async () => {
    const t = setup();
    await seedToken(t);
    mockIgdb([{ status: 200, body: [zelda] }]);
    await runJob(t, { jobType: "recent_releases" });

    const { bodies } = mockIgdb([{ status: 400, body: [{ title: "Syntax Error" }] }]);
    await runJob(t, { jobType: "recent_releases" });

    expect(bodies).toHaveLength(1);
    const job = await getJob(t, "recent_releases");
    expect(job).toMatchObject({ status: "failed" });
    expect(job!.lastError).toContain("IGDB 400");
    expect(JSON.parse(job!.cursor!)).toEqual({ since: T0 });
  });
});

describe("locking", () => {
  test("a second start is refused while the job is alive", async () => {
    const t = setup();
    await t.mutation(internal.syncJobs.acquire, { jobType: "reconcile", runId: "first" });
    expect(await t.mutation(internal.catalogSync.start, { jobType: "reconcile", manual: true })).toEqual({
      status: "busy",
    });
  });

  test("a job with an expired heartbeat is taken over, and the old run is fenced out", async () => {
    const t = setup();
    await t.mutation(internal.syncJobs.acquire, { jobType: "reconcile", runId: "dead" });
    vi.advanceTimersByTime(11 * 60 * 1000);

    expect(await t.mutation(internal.syncJobs.acquire, { jobType: "reconcile", runId: "alive" })).toMatchObject({
      acquired: true,
    });
    expect(await getJob(t, "reconcile")).toMatchObject({ runId: "alive", attempt: 2 });

    const stale = await t.mutation(internal.syncJobs.recordPage, {
      jobType: "reconcile",
      runId: "dead",
      fetched: 5,
      changed: 5,
      skipped: 0,
      failed: 0,
    });
    expect(stale.ok).toBe(false);
    expect(await getJob(t, "reconcile")).toMatchObject({ recordsFetched: 0 });
  });

  test("scheduled runs are no-ops until the sync is enabled", async () => {
    const t = setup();
    expect(await t.mutation(internal.catalogSync.start, { jobType: "popular" })).toEqual({ status: "disabled" });
    vi.stubEnv("CATALOG_SYNC_ENABLED", "true");
    expect(await t.mutation(internal.catalogSync.start, { jobType: "popular" })).toMatchObject({ status: "started" });
  });

  test("backfill never runs from a schedule", async () => {
    const t = setup();
    vi.stubEnv("CATALOG_SYNC_ENABLED", "true");
    await expect(t.mutation(internal.catalogSync.start, { jobType: "backfill" })).rejects.toThrow();
  });
});

describe("reconcile job", () => {
  test("only asks IGDB about stale games and flags the ones that disappeared", async () => {
    const t = setup();
    await seedToken(t);
    const old = Date.now() - 40 * 24 * 60 * 60 * 1000;
    await t.run(async (ctx) => {
      await ctx.db.insert("games", { igdbId: 1, title: "Stale", lastUpdated: old, igdbChecksum: "same" });
      await ctx.db.insert("games", { igdbId: 2, title: "Gone", lastUpdated: old });
      await ctx.db.insert("games", { igdbId: 3, title: "Recent", lastUpdated: Date.now() });
    });
    const { bodies } = mockIgdb([{ status: 200, body: [{ id: 1, name: "Stale", checksum: "same" }] }]);

    await runJob(t, { jobType: "reconcile" });

    expect(bodies).toHaveLength(1);
    expect(bodies[0]).toContain("where id = (1,2)");
    const games = await allGames(t);
    expect(games.find((g) => g.igdbId === 1)).toMatchObject({ lastUpdated: old });
    expect(games.find((g) => g.igdbId === 2)).toMatchObject({ syncStatus: "error", lastSyncError: "not_found_in_igdb" });
    expect(await getJob(t, "reconcile")).toMatchObject({ status: "completed", recordsSkipped: 1, recordsChanged: 0 });
  });
});

describe("webhook events", () => {
  test("coalesces events per game and applies them in one batch", async () => {
    const t = setup();
    await seedToken(t);
    vi.stubEnv("CATALOG_SYNC_ENABLED", "true");
    await t.run((ctx) => ctx.db.insert("games", { igdbId: 50, title: "Doomed", lastUpdated: 1 }));
    const { bodies } = mockIgdb([{ status: 200, body: [zelda] }]);

    await t.mutation(internal.syncJobs.enqueueEvent, { igdbId: 7346, event: "create" });
    await t.mutation(internal.syncJobs.enqueueEvent, { igdbId: 7346, event: "update" });
    await t.mutation(internal.syncJobs.enqueueEvent, { igdbId: 50, event: "delete" });
    await drain(t);

    expect(bodies).toHaveLength(1);
    expect(bodies[0]).toContain("where id = (7346)");
    const games = await allGames(t);
    expect(games.find((g) => g.igdbId === 7346)).toMatchObject({ title: "Breath of the Wild" });
    expect(games.find((g) => g.igdbId === 50)).toMatchObject({ lastSyncError: "not_found_in_igdb" });
    expect(await t.run((ctx) => ctx.db.query("syncEvents").collect())).toHaveLength(0);
  });

  test("an event IGDB cannot resolve yet stays queued for a retry", async () => {
    const t = setup();
    await seedToken(t);
    mockIgdb([{ status: 200, body: [] }]);
    await t.mutation(internal.syncJobs.enqueueEvent, { igdbId: 999, event: "create" });
    await runJob(t, { jobType: "events" });

    const events = await t.run((ctx) => ctx.db.query("syncEvents").collect());
    expect(events).toMatchObject([{ igdbId: 999, attempts: 1 }]);
    expect(await getJob(t, "events")).toMatchObject({ recordsFailed: 1, failedIds: [999] });
  });
});

describe("popular job", () => {
  test("only patches games whose score actually moved", async () => {
    const t = setup();
    await seedToken(t);
    await t.run(async (ctx) => {
      await ctx.db.insert("games", { igdbId: 1, title: "Hot", lastUpdated: 1, popularity_score: 0 });
      await ctx.db.insert("games", { igdbId: 2, title: "Quiet", lastUpdated: 1, popularity_score: 0 });
    });
    mockIgdb([
      { status: 200, body: [{ game_id: 1, popularity_type: { name: "Playing" }, value: 500 }] },
    ]);

    await runJob(t, { jobType: "popular" });

    const games = await allGames(t);
    expect(games.find((g) => g.igdbId === 1)!.popularity_score).toBeGreaterThan(0);
    expect(games.find((g) => g.igdbId === 2)!.popularity_score).toBe(0);
    expect(await getJob(t, "popular")).toMatchObject({ status: "completed", recordsChanged: 1, recordsSkipped: 1 });
  });
});

describe("http endpoints", () => {
  const trigger = (t: ReturnType<typeof setup>, body: unknown, token = "trigger-secret") =>
    t.fetch("/sync/trigger", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });

  test("the trigger rejects bad secrets and bad payloads", async () => {
    const t = setup();
    expect((await trigger(t, { jobType: "popular" })).status).toBe(401); // no secret configured

    vi.stubEnv("SYNC_TRIGGER_SECRET", "trigger-secret");
    expect((await trigger(t, { jobType: "popular" }, "wrong")).status).toBe(401);
    expect((await trigger(t, { jobType: "backfill" })).status).toBe(400);
    expect((await trigger(t, { jobType: "popular", maxPages: 500 })).status).toBe(400);
  });

  test("the trigger starts a job once, then reports it busy", async () => {
    const t = setup();
    vi.stubEnv("SYNC_TRIGGER_SECRET", "trigger-secret");
    vi.stubEnv("CATALOG_SYNC_ENABLED", "true");

    const first = await trigger(t, { jobType: "reconcile", maxPages: 1 });
    expect(first.status).toBe(202);
    expect(await first.json()).toMatchObject({ status: "started" });
    expect(await (await trigger(t, { jobType: "reconcile" })).json()).toEqual({ status: "busy" });
  });

  test("the webhook checks X-Secret and queues the game id", async () => {
    const t = setup();
    vi.stubEnv("IGDB_WEBHOOK_SECRET", "hook-secret");
    const post = (secret: string, body: unknown) =>
      t.fetch("/igdb/webhook/update", { method: "POST", headers: { "X-Secret": secret }, body: JSON.stringify(body) });

    expect((await post("nope", { id: 5 })).status).toBe(401);
    expect((await post("hook-secret", { id: "5" })).status).toBe(400);
    expect((await post("hook-secret", { id: 5, name: "Ignored" })).status).toBe(200);
    expect(await t.run((ctx) => ctx.db.query("syncEvents").collect())).toMatchObject([{ igdbId: 5, event: "update" }]);
  });
});

describe("ensureGameMedia", () => {
  test("fetches media once, keeps the other fields, and is fresh afterwards", async () => {
    const t = setup();
    await seedToken(t);
    const gameId = await t.run((ctx) =>
      ctx.db.insert("games", { igdbId: 7346, title: "Breath of the Wild", lastUpdated: 1, franchise: "Zelda" })
    );
    const { bodies } = mockIgdb([
      {
        status: 200,
        body: [
          {
            id: 7346,
            screenshots: [{ id: 1, url: "//images.igdb.com/igdb/image/upload/t_thumb/sc1.jpg" }],
            videos: [{ id: 2, video_id: "abc", name: "Trailer" }],
            websites: [{ id: 3, url: "https://zelda.com", type: 1 }],
          },
        ],
      },
    ]);

    expect(await t.action(api.igdb.ensureGameMedia, { gameId })).toEqual({ status: "fetched" });
    expect(await t.action(api.igdb.ensureGameMedia, { gameId })).toEqual({ status: "fresh" });

    expect(bodies).toHaveLength(1);
    const [game] = await allGames(t);
    expect(game).toMatchObject({ franchise: "Zelda", lastUpdated: 1 });
    expect(JSON.parse(game.screenshots!)).toEqual(["https://images.igdb.com/igdb/image/upload/t_1080p/sc1.jpg"]);
    expect(JSON.parse(game.artworks!)).toEqual([]);
    expect(JSON.parse(game.videos!)).toEqual([{ video_id: "abc", name: "Trailer" }]);
    expect(JSON.parse(game.websites!)).toEqual([{ url: "https://zelda.com", category: 1 }]);
  });
});
