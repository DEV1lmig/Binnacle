"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/app/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";

type ReportStatus = "pending" | "reviewed" | "resolved" | "dismissed";

type ReportRow = {
  _id: Id<"reports">;
  _creationTime: number;
  targetType: string;
  targetId: string;
  reason: string;
  description?: string;
  status: string;
  createdAt: number;
  resolvedAt?: number;
  moderatorNote?: string;
  reporter: null | {
    _id: Id<"users">;
    name: string;
    username: string;
    avatarUrl?: string;
  };
  moderator: null | {
    _id: Id<"users">;
    name: string;
    username: string;
    avatarUrl?: string;
  };
  target: null | (
    | {
        type: "user";
        userId: Id<"users">;
      }
    | {
        type: "review";
        reviewId: Id<"reviews">;
        gameId: Id<"games">;
        userId: Id<"users">;
        textPreview?: string;
      }
    | {
        type: "comment";
        commentId: Id<"comments">;
        reviewId: Id<"reviews">;
        userId: Id<"users">;
        textPreview?: string;
      }
  );
  targetUser: null | {
    _id: Id<"users">;
    name: string;
    username: string;
    avatarUrl?: string;
    moderationStatus?: {
      warnings: number;
      isMuted: boolean;
      mutedUntil?: number;
      isBanned: boolean;
      bannedAt?: number;
      banReason?: string;
    };
  };
};

export default function ModerationDashboardPage() {
  const router = useRouter();

  const stats = useQuery(api.reports.getStats);
  const pending = useQuery(api.reports.list, { status: "pending", limit: 50 });
  const recentActions = useQuery(api.moderation.getModerationLog, { limit: 20 });

  const updateStatus = useMutation(api.reports.updateStatus);
  const warnUser = useMutation(api.moderation.warnUser);
  const muteUser = useMutation(api.moderation.muteUser);
  const unmuteUser = useMutation(api.moderation.unmuteUser);
  const banUser = useMutation(api.moderation.banUser);
  const unbanUser = useMutation(api.moderation.unbanUser);
  const deleteContent = useMutation(api.moderation.deleteContent);

  const [activeReport, setActiveReport] = useState<ReportRow | null>(null);
  const [note, setNote] = useState("");
  const [mutePreset, setMutePreset] = useState<"3600000" | "86400000" | "604800000">("86400000");
  const [customMuteMs, setCustomMuteMs] = useState<string>("");
  const [isUpdating, setIsUpdating] = useState(false);

  const pendingCount = useMemo(() => {
    if (!pending) return 0;
    return pending.length;
  }, [pending]);

  const handleUpdate = async (reportId: Id<"reports">, status: ReportStatus, moderatorNote?: string) => {
    setIsUpdating(true);
    try {
      await updateStatus({
        reportId,
        status,
        note: moderatorNote?.trim() ? moderatorNote.trim() : undefined,
      });
      setActiveReport(null);
      setNote("");
    } catch (error) {
      console.error("Failed to update report", error);
      toast.error(error instanceof Error ? error.message : "Failed to update report");
    } finally {
      setIsUpdating(false);
    }
  };

  const noteForAction = (raw: string) => raw.trim() || "No note provided";

  const muteDurationMs = () => {
    if (customMuteMs.trim()) {
      const parsed = Number(customMuteMs);
      if (Number.isFinite(parsed) && parsed > 0) return parsed;
      return null;
    }
    return Number(mutePreset);
  };

  const handleWarn = async () => {
    if (!activeReport?.targetUser) return;
    if (!window.confirm(`Warn @${activeReport.targetUser.username}?`)) return;
    setIsUpdating(true);
    try {
      await warnUser({ userId: activeReport.targetUser._id, reason: noteForAction(note) });
      toast.success("User warned");
    } catch (error) {
      console.error("Failed to warn user", error);
      toast.error(error instanceof Error ? error.message : "Failed to warn user");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleMute = async () => {
    if (!activeReport?.targetUser) return;
    const duration = muteDurationMs();
    if (!duration) {
      toast.error("Enter a valid mute duration in ms");
      return;
    }
    if (!window.confirm(`Mute @${activeReport.targetUser.username}?`)) return;
    setIsUpdating(true);
    try {
      await muteUser({
        userId: activeReport.targetUser._id,
        duration,
        reason: noteForAction(note),
      });
      toast.success("User muted");
    } catch (error) {
      console.error("Failed to mute user", error);
      toast.error(error instanceof Error ? error.message : "Failed to mute user");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUnmute = async () => {
    if (!activeReport?.targetUser) return;
    if (!window.confirm(`Unmute @${activeReport.targetUser.username}?`)) return;
    setIsUpdating(true);
    try {
      await unmuteUser({ userId: activeReport.targetUser._id });
      toast.success("User unmuted");
    } catch (error) {
      console.error("Failed to unmute user", error);
      toast.error(error instanceof Error ? error.message : "Failed to unmute user");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleBan = async () => {
    if (!activeReport?.targetUser) return;
    if (!window.confirm(`Ban @${activeReport.targetUser.username}?`)) return;
    setIsUpdating(true);
    try {
      await banUser({ userId: activeReport.targetUser._id, reason: noteForAction(note) });
      toast.success("User banned");
    } catch (error) {
      console.error("Failed to ban user", error);
      toast.error(error instanceof Error ? error.message : "Failed to ban user");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUnban = async () => {
    if (!activeReport?.targetUser) return;
    if (!window.confirm(`Unban @${activeReport.targetUser.username}?`)) return;
    setIsUpdating(true);
    try {
      await unbanUser({ userId: activeReport.targetUser._id });
      toast.success("User unbanned");
    } catch (error) {
      console.error("Failed to unban user", error);
      toast.error(error instanceof Error ? error.message : "Failed to unban user");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!activeReport) return;
    if (activeReport.targetType !== "review" && activeReport.targetType !== "comment") return;

    const label = activeReport.targetType === "review" ? "review" : "comment";
    if (!window.confirm(`Delete this ${label}?`)) return;

    setIsUpdating(true);
    try {
      await deleteContent({
        contentType: activeReport.targetType as any,
        contentId: activeReport.targetId,
        reason: noteForAction(note),
      });
      toast.success(`${label} deleted`);
      await updateStatus({ reportId: activeReport._id, status: "resolved", note: note.trim() ? note.trim() : undefined });
      toast.success("Report resolved");
      setActiveReport(null);
      setNote("");
    } catch (error) {
      console.error("Failed to delete content", error);
      toast.error(error instanceof Error ? error.message : "Failed to delete content");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bkl-color-bg-primary)] p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="mb-2 -ml-2 text-[var(--bkl-color-text-secondary)] hover:text-[var(--bkl-color-text-primary)]"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <h1 className="text-2xl font-bold text-[var(--bkl-color-text-primary)]">Moderation</h1>
            <p className="text-[var(--bkl-color-text-secondary)]">Review and resolve user reports</p>
          </div>

          <Badge variant="outline" className="border-[var(--bkl-color-border)] text-[var(--bkl-color-text-secondary)]">
            Pending: {stats ? stats.pending : pendingCount}
          </Badge>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-[var(--bkl-color-bg-secondary)] border-[var(--bkl-color-border)]">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-[var(--bkl-color-text-primary)]">{stats?.pending ?? "—"}</div>
              <p className="text-sm text-[var(--bkl-color-text-secondary)]">Pending</p>
            </CardContent>
          </Card>
          <Card className="bg-[var(--bkl-color-bg-secondary)] border-[var(--bkl-color-border)]">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-[var(--bkl-color-text-primary)]">{stats?.reviewed ?? "—"}</div>
              <p className="text-sm text-[var(--bkl-color-text-secondary)]">Reviewed</p>
            </CardContent>
          </Card>
          <Card className="bg-[var(--bkl-color-bg-secondary)] border-[var(--bkl-color-border)]">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-[var(--bkl-color-text-primary)]">{stats?.resolved ?? "—"}</div>
              <p className="text-sm text-[var(--bkl-color-text-secondary)]">Resolved</p>
            </CardContent>
          </Card>
          <Card className="bg-[var(--bkl-color-bg-secondary)] border-[var(--bkl-color-border)]">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-[var(--bkl-color-text-primary)]">{stats?.dismissed ?? "—"}</div>
              <p className="text-sm text-[var(--bkl-color-text-secondary)]">Dismissed</p>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-[var(--bkl-color-bg-secondary)] border-[var(--bkl-color-border)]">
          <CardHeader>
            <CardTitle className="text-[var(--bkl-color-text-primary)]">Pending reports</CardTitle>
            <CardDescription>Newest first</CardDescription>
          </CardHeader>
          <CardContent>
            {pending === undefined ? (
              <p className="text-[var(--bkl-color-text-secondary)]">Loading…</p>
            ) : pending.length === 0 ? (
              <p className="text-[var(--bkl-color-text-secondary)]">No pending reports.</p>
            ) : (
              <div className="space-y-2">
                {pending.map((r) => (
                  <div
                    key={r._id}
                    className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-3 rounded-lg bg-[var(--bkl-color-bg-tertiary)] border border-[var(--bkl-color-border)]"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-[var(--bkl-color-text-primary)] font-medium truncate">
                        {r.targetUser ? `@${r.targetUser.username}` : r.targetType}: {r.targetId}
                      </p>
                      <p className="text-xs text-[var(--bkl-color-text-secondary)]">
                        Reason: {r.reason}
                        {r.reporter ? ` • by @${r.reporter.username}` : ""}
                      </p>
                      {r.target?.type === "review" && r.target.textPreview ? (
                        <p className="text-xs text-[var(--bkl-color-text-secondary)] mt-1 line-clamp-2">
                          {r.target.textPreview}
                        </p>
                      ) : null}
                      {r.target?.type === "comment" && r.target.textPreview ? (
                        <p className="text-xs text-[var(--bkl-color-text-secondary)] mt-1 line-clamp-2">
                          {r.target.textPreview}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        className="h-8"
                        onClick={() => {
                          setActiveReport(r as unknown as ReportRow);
                          setNote(r.moderatorNote ?? "");
                        }}
                      >
                        View
                      </Button>
                      <Button
                        variant="outline"
                        className="h-8"
                        disabled={isUpdating}
                        onClick={() => handleUpdate(r._id as Id<"reports">, "reviewed")}
                      >
                        Mark reviewed
                      </Button>
                      <Button
                        className="h-8 bg-[var(--bkl-color-accent-primary)] hover:bg-[var(--bkl-color-accent-hover)] text-[var(--bkl-color-bg-primary)]"
                        disabled={isUpdating}
                        onClick={() => handleUpdate(r._id as Id<"reports">, "resolved")}
                      >
                        Resolve
                      </Button>
                      <Button
                        variant="outline"
                        className="h-8"
                        disabled={isUpdating}
                        onClick={() => handleUpdate(r._id as Id<"reports">, "dismissed")}
                      >
                        Dismiss
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-[var(--bkl-color-bg-secondary)] border-[var(--bkl-color-border)]">
          <CardHeader>
            <CardTitle className="text-[var(--bkl-color-text-primary)]">Recent actions</CardTitle>
            <CardDescription>Moderation log</CardDescription>
          </CardHeader>
          <CardContent>
            {recentActions === undefined ? (
              <p className="text-[var(--bkl-color-text-secondary)]">Loading…</p>
            ) : recentActions.length === 0 ? (
              <p className="text-[var(--bkl-color-text-secondary)]">No actions recorded yet.</p>
            ) : (
              <div className="space-y-2">
                {recentActions.map((entry) => (
                  <div
                    key={entry._id}
                    className="flex items-center justify-between gap-3 p-3 rounded-lg bg-[var(--bkl-color-bg-tertiary)] border border-[var(--bkl-color-border)]"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-[var(--bkl-color-text-primary)] font-medium truncate">
                        {entry.action}
                      </p>
                      <p className="text-xs text-[var(--bkl-color-text-secondary)] truncate">
                        {entry.targetType ? `${entry.targetType}: ${entry.targetId}` : "—"}
                      </p>
                    </div>
                    <p className="text-xs text-[var(--bkl-color-text-secondary)]">
                      {new Date(entry.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog
          open={Boolean(activeReport)}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) {
              setActiveReport(null);
              setNote("");
            }
          }}
        >
          <DialogContent className="bg-[var(--bkl-color-bg-secondary)] border-[var(--bkl-color-border)] text-[var(--bkl-color-text-primary)]">
            <DialogHeader>
              <DialogTitle className="text-[var(--bkl-color-text-primary)]">Report details</DialogTitle>
              <DialogDescription className="text-[var(--bkl-color-text-secondary)]">
                Review the report and take action.
              </DialogDescription>
            </DialogHeader>

            {activeReport ? (
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-[var(--bkl-color-text-secondary)]">Target</p>
                  <p className="text-[var(--bkl-color-text-primary)]">
                    {activeReport.targetType}: {activeReport.targetId}
                  </p>
                </div>

                {activeReport.targetUser ? (
                  <div>
                    <p className="text-[var(--bkl-color-text-secondary)]">Reported user</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[var(--bkl-color-text-primary)] font-medium">@{activeReport.targetUser.username}</p>
                      {activeReport.targetUser.moderationStatus ? (
                        <>
                          <Badge
                            variant="outline"
                            className="border-[var(--bkl-color-border)] text-[var(--bkl-color-text-secondary)]"
                          >
                            Warnings: {activeReport.targetUser.moderationStatus.warnings}
                          </Badge>
                          {activeReport.targetUser.moderationStatus.isMuted ? (
                            <Badge
                              variant="outline"
                              className="border-[var(--bkl-color-border)] text-[var(--bkl-color-text-secondary)]"
                            >
                              Muted
                            </Badge>
                          ) : null}
                          {activeReport.targetUser.moderationStatus.isBanned ? (
                            <Badge
                              variant="outline"
                              className="border-[var(--bkl-color-border)] text-[var(--bkl-color-text-secondary)]"
                            >
                              Banned
                            </Badge>
                          ) : null}
                        </>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                <div>
                  <p className="text-[var(--bkl-color-text-secondary)]">Reason</p>
                  <p className="text-[var(--bkl-color-text-primary)]">{activeReport.reason}</p>
                </div>

                {activeReport.description ? (
                  <div>
                    <p className="text-[var(--bkl-color-text-secondary)]">Description</p>
                    <p className="text-[var(--bkl-color-text-primary)] whitespace-pre-wrap">
                      {activeReport.description}
                    </p>
                  </div>
                ) : null}

                <div>
                  <p className="text-[var(--bkl-color-text-secondary)]">Moderator note (optional)</p>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full bg-[var(--bkl-color-bg-tertiary)] border border-[var(--bkl-color-border)] rounded-[var(--bkl-radius-md)] p-3 text-[var(--bkl-color-text-primary)]"
                    rows={3}
                  />
                </div>

                {activeReport.targetUser ? (
                  <div className="space-y-2">
                    <p className="text-[var(--bkl-color-text-secondary)]">User actions</p>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" disabled={isUpdating} onClick={handleWarn}>
                        Warn
                      </Button>

                      {activeReport.targetUser.moderationStatus?.isMuted ? (
                        <Button variant="outline" disabled={isUpdating} onClick={handleUnmute}>
                          Unmute
                        </Button>
                      ) : (
                        <Button variant="outline" disabled={isUpdating} onClick={handleMute}>
                          Mute
                        </Button>
                      )}

                      {activeReport.targetUser.moderationStatus?.isBanned ? (
                        <Button variant="outline" disabled={isUpdating} onClick={handleUnban}>
                          Unban
                        </Button>
                      ) : (
                        <Button variant="outline" disabled={isUpdating} onClick={handleBan}>
                          Ban
                        </Button>
                      )}
                    </div>

                    {!activeReport.targetUser.moderationStatus?.isMuted ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div>
                          <p className="text-[var(--bkl-color-text-secondary)] text-xs mb-1">Mute preset</p>
                          <Select value={mutePreset} onValueChange={(v) => setMutePreset(v as any)}>
                            <SelectTrigger className="bg-[var(--bkl-color-bg-tertiary)] border-[var(--bkl-color-border)]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-[var(--bkl-color-bg-secondary)] border-[var(--bkl-color-border)]">
                              <SelectItem value="3600000">1 hour</SelectItem>
                              <SelectItem value="86400000">24 hours</SelectItem>
                              <SelectItem value="604800000">7 days</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <p className="text-[var(--bkl-color-text-secondary)] text-xs mb-1">Or custom ms</p>
                          <Input
                            value={customMuteMs}
                            onChange={(e) => setCustomMuteMs(e.target.value)}
                            placeholder="e.g. 600000"
                            className="bg-[var(--bkl-color-bg-tertiary)] border-[var(--bkl-color-border)]"
                          />
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {activeReport.targetType === "review" || activeReport.targetType === "comment" ? (
                  <div className="space-y-2">
                    <p className="text-[var(--bkl-color-text-secondary)]">Content actions</p>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" disabled={isUpdating} onClick={handleDelete}>
                        Delete {activeReport.targetType}
                      </Button>
                    </div>
                    <p className="text-xs text-[var(--bkl-color-text-secondary)]">
                      Deleting content will also resolve this report.
                    </p>
                  </div>
                ) : null}
              </div>
            ) : null}

            <DialogFooter>
              <Button variant="outline" onClick={() => setActiveReport(null)} disabled={isUpdating}>
                Close
              </Button>
              {activeReport ? (
                <>
                  <Button
                    variant="outline"
                    disabled={isUpdating}
                    onClick={() => handleUpdate(activeReport._id, "reviewed", note)}
                  >
                    Mark reviewed
                  </Button>
                  <Button
                    className="bg-[var(--bkl-color-accent-primary)] hover:bg-[var(--bkl-color-accent-hover)] text-[var(--bkl-color-bg-primary)]"
                    disabled={isUpdating}
                    onClick={() => handleUpdate(activeReport._id, "resolved", note)}
                  >
                    Resolve
                  </Button>
                  <Button
                    variant="outline"
                    disabled={isUpdating}
                    onClick={() => handleUpdate(activeReport._id, "dismissed", note)}
                  >
                    Dismiss
                  </Button>
                </>
              ) : null}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
