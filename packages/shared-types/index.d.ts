export type Id<TableName extends string> = string & {
  readonly __tableName: TableName;
};

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

// ---------------------------------------------------------------------------
// Review share card (OG image / social sharing)
// ---------------------------------------------------------------------------

export type ShareCardFormat = "story" | "square" | "wide";

export type ShareCardAccent = "gold" | "cyan" | "accent" | "green" | "amber";

export type ShareCardOptions = {
  format: ShareCardFormat;
  accent: ShareCardAccent;
  showText: boolean;
  showPoster: boolean;
};

export const SHARE_CARD_FORMATS: ShareCardFormat[];
export const SHARE_CARD_ACCENTS: ShareCardAccent[];

export const DEFAULT_SHARE_OPTIONS: ShareCardOptions;

export const SHARE_CARD_DIMENSIONS: Record<
  ShareCardFormat,
  { width: number; height: number }
>;

export const SHARE_ACCENT_COLORS: Record<ShareCardAccent, string>;

export function ratingToFiveStar(ratingOutOf10: number | undefined | null): number;

export function normalizeRatingToTen(ratingOutOf100: number | undefined | null): number;

export function buildShareImagePath(
  reviewId: string,
  options?: Partial<ShareCardOptions>
): string;

export function getShareImageDimensions(format: ShareCardFormat): {
  width: number;
  height: number;
};

export function getShareCardAccentColor(accent: ShareCardAccent): string;

export function parseShareOptions(
  searchParams: { get(name: string): string | null } | URLSearchParams
): ShareCardOptions;
