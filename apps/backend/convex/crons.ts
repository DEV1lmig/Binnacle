/**
 * Periodic triggers for the catalogue sync. Each one only starts a bounded,
 * paged job; with CATALOG_SYNC_ENABLED unset they are cheap no-ops.
 */
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.daily(
  "sync recent releases",
  { hourUTC: 6, minuteUTC: 0 },
  internal.catalogSync.start,
  { jobType: "recent_releases" }
);

crons.interval("sync popularity", { hours: 12 }, internal.catalogSync.start, { jobType: "popular" });

crons.weekly(
  "reconcile stale games",
  { dayOfWeek: "monday", hourUTC: 7, minuteUTC: 0 },
  internal.catalogSync.start,
  { jobType: "reconcile" }
);

crons.interval("drain igdb webhook events", { hours: 1 }, internal.catalogSync.start, { jobType: "events" });

crons.daily("check sync health", { hourUTC: 9, minuteUTC: 0 }, internal.syncJobs.checkHealth, {});

export default crons;
