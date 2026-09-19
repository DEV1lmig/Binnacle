"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";

const JOB_LABELS: Record<string, string> = {
  recent_releases: "Recent releases (daily)",
  popular: "Popularity (every 12h)",
  reconcile: "Reconciliation (weekly)",
  backfill: "Backfill (manual)",
  events: "IGDB webhook events",
};

function formatTime(timestamp?: number) {
  return timestamp ? new Date(timestamp).toLocaleString() : "—";
}

export function CatalogSyncStatus() {
  const status = useQuery(api.syncJobs.getStatus);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Catalogue Sync</CardTitle>
        <CardDescription>
          Latest result of each incremental IGDB sync job. Jobs are started by cron, webhooks or{" "}
          <code>npx convex run catalogSync:start</code>.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {status === undefined ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : status.jobs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sync job has run yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {status.jobs.map((job) => (
              <div key={job.jobType} className="border border-border rounded-lg p-4 space-y-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold">{JOB_LABELS[job.jobType] ?? job.jobType}</h3>
                  <span className={job.status === "failed" || job.stuck || job.overdue ? "text-destructive" : "text-muted-foreground"}>
                    {job.stuck ? "stuck" : job.status}
                    {job.dryRun ? " (dry run)" : ""}
                    {job.overdue ? " · overdue" : ""}
                  </span>
                </div>
                <p className="text-muted-foreground">
                  {job.recordsFetched} fetched · {job.recordsChanged} changed · {job.recordsSkipped} skipped ·{" "}
                  {job.recordsFailed} failed · {job.pages} pages
                  {job.durationMs !== undefined ? ` · ${(job.durationMs / 1000).toFixed(1)}s` : ""}
                </p>
                <p className="text-muted-foreground text-xs">
                  Started {formatTime(job.startedAt)} · Last completed {formatTime(job.lastCompletedAt)} · Attempt{" "}
                  {job.attempt}
                </p>
                {job.lastError && <p className="text-destructive text-xs break-words">{job.lastError}</p>}
                {job.failedIds.length > 0 && (
                  <p className="text-xs text-muted-foreground break-words">Failed IGDB ids: {job.failedIds.join(", ")}</p>
                )}
              </div>
            ))}
          </div>
        )}
        {status !== undefined && status.pendingEvents > 0 && (
          <p className="text-sm text-muted-foreground">{status.pendingEvents} webhook events waiting.</p>
        )}
      </CardContent>
    </Card>
  );
}
