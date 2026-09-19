/**
 * HTTP entry points of the catalogue sync: the protected trigger for external
 * schedulers and the public IGDB webhook receiver.
 */
import { HttpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { safeEqual } from "./lib/igdbSync";

const TRIGGERABLE_JOBS = ["recent_releases", "popular", "reconcile", "events"] as const;
type TriggerableJob = (typeof TRIGGERABLE_JOBS)[number];
const MAX_TRIGGER_PAGES = 5;

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * POST /sync/trigger  { "jobType": "recent_releases", "maxPages": 3 }
 * Authorization: Bearer <SYNC_TRIGGER_SECRET>
 */
const triggerSync = httpAction(async (ctx, request) => {
  const secret = process.env.SYNC_TRIGGER_SECRET;
  const provided = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!secret || !safeEqual(provided, secret)) {
    return json({ error: "unauthorized" }, 401);
  }

  let payload: { jobType?: unknown; maxPages?: unknown };
  try {
    payload = await request.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const jobType = payload.jobType;
  if (typeof jobType !== "string" || !TRIGGERABLE_JOBS.includes(jobType as TriggerableJob)) {
    return json({ error: "invalid_job_type" }, 400);
  }
  const maxPages = payload.maxPages;
  if (
    maxPages !== undefined &&
    (typeof maxPages !== "number" || !Number.isInteger(maxPages) || maxPages < 1 || maxPages > MAX_TRIGGER_PAGES)
  ) {
    return json({ error: "invalid_max_pages" }, 400);
  }

  const result = await ctx.runMutation(internal.catalogSync.start, {
    jobType: jobType as TriggerableJob,
    maxPages,
  });
  return json(result, result.status === "started" ? 202 : 200);
});

/**
 * IGDB calls this with the secret given at registration in X-Secret.
 * We only queue the id and answer; the fetch happens later in batches.
 */
function igdbWebhook(event: "create" | "update" | "delete") {
  return httpAction(async (ctx, request) => {
    const secret = process.env.IGDB_WEBHOOK_SECRET;
    if (!secret || !safeEqual(request.headers.get("X-Secret") ?? "", secret)) {
      return new Response(null, { status: 401 });
    }

    let igdbId: unknown;
    try {
      igdbId = ((await request.json()) as { id?: unknown }).id;
    } catch {
      return new Response(null, { status: 400 });
    }
    if (typeof igdbId !== "number" || !Number.isInteger(igdbId) || igdbId <= 0) {
      return new Response(null, { status: 400 });
    }

    await ctx.runMutation(internal.syncJobs.enqueueEvent, { igdbId, event });
    return new Response(null, { status: 200 });
  });
}

export function registerSyncRoutes(http: HttpRouter) {
  http.route({ path: "/sync/trigger", method: "POST", handler: triggerSync });
  for (const event of ["create", "update", "delete"] as const) {
    http.route({ path: `/igdb/webhook/${event}`, method: "POST", handler: igdbWebhook(event) });
  }
}
