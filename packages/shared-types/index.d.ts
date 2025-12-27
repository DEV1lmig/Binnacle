import type { Id } from "@binnacle/convex-generated/dataModel";

export type ReportStatus = "pending" | "reviewed" | "resolved" | "dismissed";
export type ReportTargetType = "user" | "review" | "comment";
export type ReportReason = "spam" | "harassment" | "inappropriate" | "other";

export type ModerationContentType = "review" | "comment";

export type ModerationStatus = {
  warnings: number;
  isMuted: boolean;
  mutedUntil?: number;
  isBanned: boolean;
  bannedAt?: number;
  banReason?: string;
};

export type PublicUserSummary = {
  _id: Id<"users">;
  name: string;
  username: string;
  avatarUrl?: string;
};

export type ReportListTarget =
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
    };

export type ReportListItem = {
  _id: Id<"reports">;
  _creationTime: number;
  reporterId: Id<"users">;
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  description?: string;
  status: ReportStatus;
  moderatorId?: Id<"users">;
  moderatorNote?: string;
  createdAt: number;
  resolvedAt?: number;

  reporter: PublicUserSummary | null;
  moderator: PublicUserSummary | null;

  target: ReportListTarget | null;
  targetUser: (PublicUserSummary & { moderationStatus?: ModerationStatus }) | null;
};
