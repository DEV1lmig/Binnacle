"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
import { GameCard } from "@/app/components/GameCard";
import { Skeleton } from "@/app/components/ui/skeleton";
import {
  Gamepad2,
  Trophy,
  Users,
  Star,
  CalendarClock,
  ChevronRight,
  BookOpen,
  Pause,
  XCircle,
  Play,
  CheckCircle2,
} from "lucide-react";
import {
  C,
  FONT_HEADING,
  FONT_MONO,
  FONT_BODY,
  FONT_IMPORT_URL,
  STATUS_COLORS,
} from "@/app/lib/design-system";
import {
  CornerMarkers,
  GrainOverlay,
  HudBadge,
  HudDivider,
} from "@/app/lib/design-primitives";
import type { Id } from "@/convex/_generated/dataModel";
import type { ReactNode } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface ProfileDashboardData {
  user: {
    _id: Id<"users">;
    _creationTime: number;
    name: string;
    username: string;
    bio?: string;
    avatarUrl?: string;
  };
  followerCount: number;
  followingCount: number;
  viewerFollows: boolean;
  viewerIsSelf: boolean;
  reviewStats: {
    reviewCount: number;
    averageRating?: number;
    totalPlaytimeHours: number;
    topPlatforms: Array<{ name: string; count: number }>;
  };
  backlogStats: {
    total: number;
    want_to_play: number;
    playing: number;
    completed: number;
    dropped: number;
    on_hold: number;
  };
  topGames: Array<{
    rank: number;
    note?: string;
    game: {
      _id: Id<"games">;
      title: string;
      coverUrl?: string;
      releaseYear?: number;
      aggregatedRating?: number;
    };
  }>;
  recentReviews: Array<{
    _id: Id<"reviews">;
    _creationTime: number;
    rating: number;
    text?: string;
    playtimeHours?: number;
    platform?: string;
    game: {
      _id: Id<"games">;
      title: string;
      coverUrl?: string;
      releaseYear?: number;
    };
  }>;
}

interface ProfileDashboardContentProps {
  data: ProfileDashboardData;
  headerAction?: ReactNode;
  socialActions?: ReactNode;
  errorBanner?: ReactNode;
}

// ---------------------------------------------------------------------------
// Scroll-reveal hook
// ---------------------------------------------------------------------------
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) {
      setVisible(true);
      setReady(true);
      return;
    }
    setReady(true);
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      requestAnimationFrame(() => setVisible(true));
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.08 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return {
    ref,
    className: ready ? `profile-reveal ${visible ? "visible" : ""}` : "",
  };
}

// ---------------------------------------------------------------------------
// Stat pill
// ---------------------------------------------------------------------------
function StatPill({
  label,
  value,
  color = C.gold,
}: {
  label: string;
  value: number | string;
  color?: string;
}) {
  return (
    <div
      className="relative flex flex-col items-center px-5 py-3"
      style={{
        border: `1px solid ${C.border}`,
        borderRadius: 2,
        background: C.surface,
        minWidth: 80,
      }}
    >
      <CornerMarkers size={5} />
      <span
        style={{
          fontFamily: FONT_HEADING,
          fontSize: 22,
          fontWeight: 300,
          color,
          lineHeight: 1.1,
        }}
      >
        {value}
      </span>
      <span
        style={{
          fontFamily: FONT_MONO,
          fontSize: 9,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: C.textDim,
          marginTop: 4,
        }}
      >
        {label}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Backlog status bar segment
// ---------------------------------------------------------------------------
const BACKLOG_STATUSES = [
  { key: "playing", label: "Playing", icon: Play, color: STATUS_COLORS.playing },
  { key: "completed", label: "Completed", icon: CheckCircle2, color: STATUS_COLORS.completed },
  { key: "want_to_play", label: "Backlog", icon: BookOpen, color: STATUS_COLORS.backlog },
  { key: "on_hold", label: "On Hold", icon: Pause, color: STATUS_COLORS.onhold },
  { key: "dropped", label: "Dropped", icon: XCircle, color: STATUS_COLORS.dropped },
] as const;

// ---------------------------------------------------------------------------
// Rating bar (visual 0-10)
// ---------------------------------------------------------------------------
function RatingBar({ rating }: { rating: number }) {
  const pct = Math.min(100, Math.max(0, (rating / 10) * 100));
  const hue = rating >= 7 ? C.green : rating >= 5 ? C.amber : C.red;
  return (
    <div
      style={{
        width: "100%",
        height: 3,
        backgroundColor: C.border,
        borderRadius: 1,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: `${pct}%`,
          height: "100%",
          backgroundColor: hue,
          transition: "width 0.6s ease",
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function ProfileDashboardContent({
  data,
  headerAction,
  socialActions,
  errorBanner,
}: ProfileDashboardContentProps) {
  const router = useRouter();
  const heroReveal = useReveal();
  const topGamesReveal = useReveal();
  const backlogReveal = useReveal();
  const activityReveal = useReveal();

  const averageRating = data.reviewStats.averageRating
    ? (data.reviewStats.averageRating / 10).toFixed(1)
    : null;

  const memberSince = useMemo(() => {
    const d = new Date(data.user._creationTime);
    return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  }, [data.user._creationTime]);

  const totalBacklog = data.backlogStats.total || 1;

  return (
    <>
      <style>{`
        @import url('${FONT_IMPORT_URL}');
        .profile-reveal {
          opacity: 0;
          transform: translateY(16px);
          transition: opacity 0.5s ease, transform 0.5s ease;
        }
        .profile-reveal.visible {
          opacity: 1;
          transform: translateY(0);
        }
        @media (prefers-reduced-motion: reduce) {
          .profile-reveal { opacity: 1; transform: none; transition: none; }
        }
        .profile-top-game {
          transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .profile-top-game:hover {
          transform: translateY(-3px);
          border-color: ${C.gold} !important;
          box-shadow: 0 0 20px ${C.bloom};
        }
        .profile-review-row {
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .profile-review-row:hover {
          border-color: ${C.gold} !important;
          box-shadow: 0 0 16px ${C.bloom};
        }
      `}</style>

      <div className="min-h-screen pb-20 md:pb-12" style={{ backgroundColor: C.bg }}>
        {/* Ambient background */}
        <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
          <div
            className="absolute"
            style={{
              top: "-20%",
              left: "-10%",
              width: "50%",
              height: "50%",
              background: `radial-gradient(circle, ${C.goldDim}15 0%, transparent 70%)`,
              filter: "blur(60px)",
            }}
          />
          <div
            className="absolute"
            style={{
              bottom: "-20%",
              right: "-10%",
              width: "40%",
              height: "40%",
              background: `radial-gradient(circle, ${C.accentDim}10 0%, transparent 70%)`,
              filter: "blur(60px)",
            }}
          />
        </div>

        <GrainOverlay id="profile-grain" />

        <div className="relative z-10 max-w-6xl mx-auto px-4 md:px-8">
          {/* ================================================================ */}
          {/* HERO SECTION                                                     */}
          {/* ================================================================ */}
          <div
            ref={heroReveal.ref}
            className={heroReveal.className}
            style={{ paddingTop: 32, paddingBottom: 24 }}
          >
            {/* Top row: badge + actions */}
            <div className="flex items-center justify-between mb-6">
              <HudBadge color={C.accent}>Operator Profile</HudBadge>
              {headerAction}
            </div>

            {/* Hero card */}
            <div
              className="relative overflow-hidden"
              style={{
                border: `1px solid ${C.border}`,
                borderRadius: 2,
                background: `linear-gradient(135deg, ${C.surface} 0%, ${C.bgAlt} 100%)`,
              }}
            >
              <CornerMarkers size={14} />

              {/* Decorative scan line */}
              <div
                className="absolute top-0 left-0 right-0 pointer-events-none"
                style={{
                  height: 1,
                  background: `linear-gradient(90deg, transparent, ${C.gold}44, transparent)`,
                }}
              />

              <div className="p-6 md:p-8 lg:p-10">
                <div className="flex flex-col md:flex-row gap-6 md:gap-10 items-start">
                  {/* Avatar + ring */}
                  <div className="relative flex-shrink-0">
                    <div
                      className="relative"
                      style={{
                        width: 96,
                        height: 96,
                        borderRadius: "50%",
                        padding: 3,
                        background: `linear-gradient(135deg, ${C.gold}, ${C.accent})`,
                      }}
                    >
                      <Avatar
                        className="w-full h-full"
                        style={{ border: `3px solid ${C.bg}` }}
                      >
                        {data.user.avatarUrl && (
                          <AvatarImage
                            src={data.user.avatarUrl}
                            alt={data.user.name}
                          />
                        )}
                        <AvatarFallback
                          style={{
                            backgroundColor: C.surface,
                            color: C.gold,
                            fontFamily: FONT_HEADING,
                            fontSize: 32,
                            fontWeight: 200,
                          }}
                        >
                          {data.user.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    {/* Status dot */}
                    <div
                      className="absolute bottom-1 right-1"
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: "50%",
                        backgroundColor: C.green,
                        border: `3px solid ${C.bg}`,
                        boxShadow: `0 0 8px ${C.green}66`,
                      }}
                    />
                  </div>

                  {/* Identity */}
                  <div className="flex-1 min-w-0">
                    <h1
                      style={{
                        fontFamily: FONT_HEADING,
                        fontSize: "clamp(28px, 4vw, 40px)",
                        fontWeight: 200,
                        color: C.text,
                        letterSpacing: "-0.01em",
                        lineHeight: 1.1,
                      }}
                    >
                      {data.user.name}
                    </h1>
                    <div className="flex items-center gap-3 mt-1">
                      <span
                        style={{
                          fontFamily: FONT_MONO,
                          fontSize: 12,
                          color: C.textDim,
                          letterSpacing: "0.06em",
                        }}
                      >
                        @{data.user.username}
                      </span>
                      <span
                        style={{
                          fontFamily: FONT_MONO,
                          fontSize: 10,
                          color: C.textDim,
                          letterSpacing: "0.06em",
                        }}
                      >
                        SINCE {memberSince.toUpperCase()}
                      </span>
                    </div>

                    {data.user.bio && (
                      <p
                        className="mt-4 max-w-xl"
                        style={{
                          fontFamily: FONT_BODY,
                          fontSize: 14,
                          fontWeight: 300,
                          color: C.textMuted,
                          lineHeight: 1.6,
                        }}
                      >
                        {data.user.bio}
                      </p>
                    )}

                    {/* Social actions (follow/friend/block for public profiles) */}
                    {socialActions && (
                      <div className="mt-4">{socialActions}</div>
                    )}

                    {/* Error banners */}
                    {errorBanner}

                    {/* Stat pills row */}
                    <div className="flex flex-wrap gap-3 mt-6">
                      <StatPill label="Followers" value={data.followerCount} color={C.cyan} />
                      <StatPill label="Following" value={data.followingCount} color={C.cyan} />
                      <StatPill label="Reviews" value={data.reviewStats.reviewCount} color={C.gold} />
                      <StatPill label="Backlog" value={data.backlogStats.total} color={C.accent} />
                      <StatPill label="Avg Rating" value={averageRating ?? "\u2014"} color={C.amber} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ================================================================ */}
          {/* TOP GAMES SHOWCASE                                               */}
          {/* ================================================================ */}
          <div ref={topGamesReveal.ref} className={topGamesReveal.className}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <HudBadge color={C.gold}>Hall of Fame</HudBadge>
                <span
                  style={{
                    fontFamily: FONT_HEADING,
                    fontSize: 20,
                    fontWeight: 200,
                    color: C.text,
                  }}
                >
                  Top Games
                </span>
              </div>
            </div>

            {data.topGames.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                {data.topGames.map((entry) => (
                  <button
                    key={entry.game._id}
                    type="button"
                    onClick={() => router.push(`/game/${entry.game._id}`)}
                    className="profile-top-game relative text-left"
                    style={{
                      border: `1px solid ${C.border}`,
                      borderRadius: 2,
                      background: C.surface,
                      padding: 0,
                      overflow: "hidden",
                      cursor: "pointer",
                    }}
                  >
                    <CornerMarkers size={6} />

                    {/* Cover */}
                    <div
                      style={{
                        aspectRatio: "3/4",
                        width: "100%",
                        backgroundColor: C.bgAlt,
                        position: "relative",
                        overflow: "hidden",
                      }}
                    >
                      {entry.game.coverUrl ? (
                        <img
                          src={entry.game.coverUrl}
                          alt={entry.game.title}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      ) : (
                        <div
                          className="flex items-center justify-center"
                          style={{ width: "100%", height: "100%" }}
                        >
                          <Gamepad2
                            style={{ width: 32, height: 32, color: C.textDim }}
                          />
                        </div>
                      )}

                      {/* Rank badge overlay */}
                      <div
                        className="absolute top-2 left-2 flex items-center justify-center"
                        style={{
                          width: 28,
                          height: 28,
                          backgroundColor: C.gold,
                          color: C.bg,
                          fontFamily: FONT_MONO,
                          fontSize: 11,
                          fontWeight: 500,
                          letterSpacing: "0.05em",
                          borderRadius: 2,
                          boxShadow: `0 2px 8px ${C.bloom}`,
                        }}
                      >
                        #{entry.rank}
                      </div>

                      {/* Bottom gradient */}
                      <div
                        className="absolute bottom-0 left-0 right-0"
                        style={{
                          height: "50%",
                          background: `linear-gradient(transparent, ${C.surface})`,
                        }}
                      />
                    </div>

                    {/* Info */}
                    <div className="px-3 pb-3 pt-1">
                      <p
                        className="truncate"
                        style={{
                          fontFamily: FONT_BODY,
                          fontSize: 13,
                          fontWeight: 400,
                          color: C.text,
                        }}
                      >
                        {entry.game.title}
                      </p>
                      {entry.note && (
                        <p
                          className="truncate mt-0.5"
                          style={{
                            fontFamily: FONT_MONO,
                            fontSize: 10,
                            color: C.textDim,
                            letterSpacing: "0.03em",
                            fontStyle: "italic",
                          }}
                        >
                          &ldquo;{entry.note}&rdquo;
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div
                className="relative flex flex-col items-center justify-center py-12"
                style={{
                  border: `1px solid ${C.border}`,
                  borderRadius: 2,
                  background: C.surface,
                }}
              >
                <CornerMarkers />
                <Trophy
                  style={{ width: 36, height: 36, color: C.textDim, marginBottom: 10 }}
                />
                <p
                  style={{
                    fontFamily: FONT_BODY,
                    fontSize: 13,
                    color: C.textMuted,
                  }}
                >
                  No top games selected yet.
                </p>
              </div>
            )}
          </div>

          <HudDivider />

          {/* ================================================================ */}
          {/* BACKLOG + REVIEW HIGHLIGHTS -- 2 col                             */}
          {/* ================================================================ */}
          <div
            ref={backlogReveal.ref}
            className={`grid gap-6 lg:grid-cols-12 mt-8 ${backlogReveal.className}`}
          >
            {/* Backlog breakdown */}
            <div className="lg:col-span-5">
              <div className="flex items-center gap-4 mb-4">
                <HudBadge color={C.cyan}>Inventory</HudBadge>
                <span
                  style={{
                    fontFamily: FONT_HEADING,
                    fontSize: 20,
                    fontWeight: 200,
                    color: C.text,
                  }}
                >
                  Backlog
                </span>
              </div>

              <div
                className="relative p-5"
                style={{
                  border: `1px solid ${C.border}`,
                  borderRadius: 2,
                  background: C.surface,
                }}
              >
                <CornerMarkers size={10} />

                {/* Stacked progress bar */}
                <div
                  className="flex overflow-hidden mb-5"
                  style={{ height: 8, borderRadius: 1, backgroundColor: C.bg }}
                >
                  {BACKLOG_STATUSES.map((s) => {
                    const val =
                      data.backlogStats[
                        s.key as keyof typeof data.backlogStats
                      ] ?? 0;
                    const pct = totalBacklog > 0 ? (val / totalBacklog) * 100 : 0;
                    if (pct === 0) return null;
                    return (
                      <div
                        key={s.key}
                        title={`${s.label}: ${val}`}
                        style={{
                          width: `${pct}%`,
                          height: "100%",
                          backgroundColor: s.color,
                          transition: "width 0.6s ease",
                        }}
                      />
                    );
                  })}
                </div>

                {/* Status rows */}
                <div className="space-y-3">
                  {BACKLOG_STATUSES.map((s) => {
                    const val =
                      data.backlogStats[
                        s.key as keyof typeof data.backlogStats
                      ] ?? 0;
                    const Icon = s.icon;
                    return (
                      <div
                        key={s.key}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              backgroundColor: s.color,
                              boxShadow: `0 0 6px ${s.color}55`,
                            }}
                          />
                          <Icon
                            style={{ width: 14, height: 14, color: C.textDim }}
                          />
                          <span
                            style={{
                              fontFamily: FONT_MONO,
                              fontSize: 11,
                              letterSpacing: "0.08em",
                              textTransform: "uppercase",
                              color: C.textMuted,
                            }}
                          >
                            {s.label}
                          </span>
                        </div>
                        <span
                          style={{
                            fontFamily: FONT_HEADING,
                            fontSize: 18,
                            fontWeight: 300,
                            color: C.text,
                          }}
                        >
                          {val}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Total */}
                <div
                  className="flex items-center justify-between mt-4 pt-4"
                  style={{ borderTop: `1px solid ${C.border}` }}
                >
                  <span
                    style={{
                      fontFamily: FONT_MONO,
                      fontSize: 11,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: C.textDim,
                    }}
                  >
                    Total
                  </span>
                  <span
                    style={{
                      fontFamily: FONT_HEADING,
                      fontSize: 22,
                      fontWeight: 200,
                      color: C.gold,
                    }}
                  >
                    {data.backlogStats.total}
                  </span>
                </div>
              </div>
            </div>

            {/* Review highlights */}
            <div className="lg:col-span-7">
              <div className="flex items-center gap-4 mb-4">
                <HudBadge color={C.amber}>Analytics</HudBadge>
                <span
                  style={{
                    fontFamily: FONT_HEADING,
                    fontSize: 20,
                    fontWeight: 200,
                    color: C.text,
                  }}
                >
                  Review Highlights
                </span>
              </div>

              <div
                className="relative p-5"
                style={{
                  border: `1px solid ${C.border}`,
                  borderRadius: 2,
                  background: C.surface,
                }}
              >
                <CornerMarkers size={10} />

                {/* Big stats row */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="text-center">
                    <span
                      style={{
                        fontFamily: FONT_HEADING,
                        fontSize: 28,
                        fontWeight: 200,
                        color: C.gold,
                        display: "block",
                      }}
                    >
                      {data.reviewStats.reviewCount}
                    </span>
                    <span
                      style={{
                        fontFamily: FONT_MONO,
                        fontSize: 9,
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        color: C.textDim,
                      }}
                    >
                      Reviews
                    </span>
                  </div>
                  <div className="text-center">
                    <span
                      style={{
                        fontFamily: FONT_HEADING,
                        fontSize: 28,
                        fontWeight: 200,
                        color: C.amber,
                        display: "block",
                      }}
                    >
                      {averageRating ?? "\u2014"}
                    </span>
                    <span
                      style={{
                        fontFamily: FONT_MONO,
                        fontSize: 9,
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        color: C.textDim,
                      }}
                    >
                      Avg Rating
                    </span>
                  </div>
                  <div className="text-center">
                    <span
                      style={{
                        fontFamily: FONT_HEADING,
                        fontSize: 28,
                        fontWeight: 200,
                        color: C.cyan,
                        display: "block",
                      }}
                    >
                      {data.reviewStats.totalPlaytimeHours}
                    </span>
                    <span
                      style={{
                        fontFamily: FONT_MONO,
                        fontSize: 9,
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        color: C.textDim,
                      }}
                    >
                      Hours Logged
                    </span>
                  </div>
                </div>

                <HudDivider />

                {/* Platforms */}
                <div className="mt-4">
                  <span
                    style={{
                      fontFamily: FONT_MONO,
                      fontSize: 10,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: C.textDim,
                      display: "block",
                      marginBottom: 8,
                    }}
                  >
                    Top Platforms
                  </span>
                  {data.reviewStats.topPlatforms.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {data.reviewStats.topPlatforms.map((platform) => (
                        <span
                          key={platform.name}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "4px 10px",
                            border: `1px solid ${C.border}`,
                            borderRadius: 2,
                            fontFamily: FONT_MONO,
                            fontSize: 10,
                            letterSpacing: "0.06em",
                            color: C.textMuted,
                          }}
                        >
                          {platform.name}
                          <span
                            style={{
                              color: C.gold,
                              fontWeight: 500,
                            }}
                          >
                            {platform.count}
                          </span>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p
                      style={{
                        fontFamily: FONT_BODY,
                        fontSize: 13,
                        color: C.textDim,
                      }}
                    >
                      No platform data yet.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <HudDivider />

          {/* ================================================================ */}
          {/* RECENT ACTIVITY (Timeline)                                       */}
          {/* ================================================================ */}
          <div
            ref={activityReveal.ref}
            className={`mt-8 mb-8 ${activityReveal.className}`}
          >
            <div className="flex items-center gap-4 mb-5">
              <HudBadge color={C.green}>Mission Log</HudBadge>
              <span
                style={{
                  fontFamily: FONT_HEADING,
                  fontSize: 20,
                  fontWeight: 200,
                  color: C.text,
                }}
              >
                Recent Activity
              </span>
            </div>

            {data.recentReviews.length > 0 ? (
              <div className="space-y-4">
                {data.recentReviews.map((review) => {
                  const createdAt = new Date(review._creationTime);
                  return (
                    <div
                      key={review._id}
                      className="profile-review-row relative flex gap-4 p-4 cursor-pointer"
                      style={{
                        border: `1px solid ${C.border}`,
                        borderRadius: 2,
                        background: C.surface,
                      }}
                      onClick={() => router.push(`/review/${review._id}`)}
                      role="link"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter")
                          router.push(`/review/${review._id}`);
                      }}
                    >
                      <CornerMarkers size={6} />

                      {/* Cover thumbnail */}
                      <div
                        className="flex-shrink-0 overflow-hidden"
                        style={{
                          width: 56,
                          height: 72,
                          borderRadius: 2,
                          backgroundColor: C.bgAlt,
                        }}
                      >
                        {review.game.coverUrl ? (
                          <img
                            src={review.game.coverUrl}
                            alt={review.game.title}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                          />
                        ) : (
                          <div className="flex items-center justify-center w-full h-full">
                            <Gamepad2
                              style={{
                                width: 20,
                                height: 20,
                                color: C.textDim,
                              }}
                            />
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p
                              className="truncate"
                              style={{
                                fontFamily: FONT_BODY,
                                fontSize: 15,
                                fontWeight: 400,
                                color: C.text,
                              }}
                            >
                              {review.game.title}
                            </p>
                            <div
                              className="flex items-center gap-3 mt-1"
                              style={{
                                fontFamily: FONT_MONO,
                                fontSize: 10,
                                color: C.textDim,
                                letterSpacing: "0.06em",
                              }}
                            >
                              <span className="flex items-center gap-1">
                                <Star
                                  style={{
                                    width: 11,
                                    height: 11,
                                    color: C.amber,
                                  }}
                                />
                                {review.rating.toFixed(1)}/10
                              </span>
                              {review.platform && <span>{review.platform}</span>}
                              <span className="flex items-center gap-1">
                                <CalendarClock
                                  style={{ width: 11, height: 11 }}
                                />
                                {createdAt.toLocaleDateString()}
                              </span>
                            </div>
                          </div>

                          <ChevronRight
                            style={{
                              width: 16,
                              height: 16,
                              color: C.textDim,
                              flexShrink: 0,
                              marginTop: 2,
                            }}
                          />
                        </div>

                        {/* Rating bar */}
                        <div className="mt-2">
                          <RatingBar rating={review.rating} />
                        </div>

                        {review.text && (
                          <p
                            className="mt-2 line-clamp-2"
                            style={{
                              fontFamily: FONT_BODY,
                              fontSize: 13,
                              fontWeight: 300,
                              color: C.textMuted,
                              lineHeight: 1.5,
                            }}
                          >
                            {review.text}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div
                className="relative flex flex-col items-center justify-center py-12"
                style={{
                  border: `1px solid ${C.border}`,
                  borderRadius: 2,
                  background: C.surface,
                }}
              >
                <CornerMarkers />
                <BookOpen
                  style={{ width: 36, height: 36, color: C.textDim, marginBottom: 10 }}
                />
                <p
                  style={{
                    fontFamily: FONT_BODY,
                    fontSize: 13,
                    color: C.textMuted,
                  }}
                >
                  No recent reviews yet.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Page-level skeleton
// ---------------------------------------------------------------------------
export function ProfilePageSkeleton() {
  return (
    <div
      className="min-h-screen pb-20 md:pb-12"
      style={{ backgroundColor: C.bg }}
    >
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-8">
        <Skeleton
          className="h-5 w-32 mb-6"
          style={{ backgroundColor: C.surface, borderRadius: 2 }}
        />
        <div
          className="p-8"
          style={{
            border: `1px solid ${C.border}`,
            borderRadius: 2,
            background: C.surface,
          }}
        >
          <div className="flex gap-8 items-start">
            <Skeleton
              className="h-24 w-24 rounded-full flex-shrink-0"
              style={{ backgroundColor: C.bgAlt }}
            />
            <div className="flex-1">
              <Skeleton
                className="h-9 w-48 mb-2"
                style={{ backgroundColor: C.bgAlt }}
              />
              <Skeleton
                className="h-4 w-32 mb-4"
                style={{ backgroundColor: C.bgAlt }}
              />
              <Skeleton
                className="h-4 w-72 mb-6"
                style={{ backgroundColor: C.bgAlt }}
              />
              <div className="flex gap-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton
                    key={i}
                    className="h-16 w-20"
                    style={{ backgroundColor: C.bgAlt, borderRadius: 2 }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-12 mt-8">
          <Skeleton
            className="lg:col-span-5 h-64"
            style={{ backgroundColor: C.surface, borderRadius: 2 }}
          />
          <Skeleton
            className="lg:col-span-7 h-64"
            style={{ backgroundColor: C.surface, borderRadius: 2 }}
          />
        </div>
      </div>
    </div>
  );
}
