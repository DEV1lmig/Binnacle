"use client";

import { useRouter } from "next/navigation";
import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentUser } from "@/app/context/CurrentUserContext";
import { GameCard } from "@/app/components/GameCard";
import { AdSpace } from "@/app/components/AdSpace";
import {
  FeedReviewList,
  type FeedReviewEntry,
} from "./components/FeedReviewList";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/app/components/ui/avatar";
import {
  TrendingUp,
  Users,
  Compass,
  PenLine,
  ChevronRight,
  ChevronLeft,
  Gamepad2,
  Clock,
  Star,
  BarChart3,
} from "lucide-react";
import { Skeleton } from "@/app/components/ui/skeleton";
import { FeedPageSkeleton } from "@/app/components/PageSkeleton";
import { Tabs, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import {
  C,
  FONT_HEADING,
  FONT_MONO,
  FONT_BODY,
  FONT_IMPORT_URL,
} from "@/app/lib/design-system";
import {
  CornerMarkers,
  GrainOverlay,
  HudBadge,
  HudDivider,
} from "@/app/lib/design-primitives";

type ActivityTab = "community" | "friends";

const PLACEHOLDER_GAMES = [
  { title: "Elden Ring", gradient: "linear-gradient(135deg, #4A3D2A 0%, #2A2118 50%, #6B5A3D 100%)" },
  { title: "Celeste", gradient: "linear-gradient(135deg, #3D2A4A 0%, #1E1428 50%, #6B4A7D 100%)" },
  { title: "Hollow Knight", gradient: "linear-gradient(135deg, #1A2A3D 0%, #0F1A28 50%, #2A4A6B 100%)" },
  { title: "Hades", gradient: "linear-gradient(135deg, #5A2A2A 0%, #3D1818 50%, #7D3A3A 100%)" },
  { title: "Disco Elysium", gradient: "linear-gradient(135deg, #2A3D2A 0%, #182818 50%, #3A5A3D 100%)" },
  { title: "Baldur's Gate 3", gradient: "linear-gradient(135deg, #3D3A2A 0%, #282518 50%, #5A5530 100%)" },
  { title: "The Witcher 3", gradient: "linear-gradient(135deg, #2A2A3D 0%, #18182A 50%, #3D3D5A 100%)" },
  { title: "Persona 5", gradient: "linear-gradient(135deg, #5A1A2A 0%, #3D0F18 50%, #7D2A3D 100%)" },
];

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

    // Mark as ready so CSS can apply opacity: 0
    setReady(true);

    // If already in viewport, reveal immediately
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      // Small delay so the transition actually plays
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

  return { ref, className: ready ? `feed-reveal ${visible ? "visible" : ""}` : "" };
}

// ---------------------------------------------------------------------------
// Horizontal carousel controls
// ---------------------------------------------------------------------------
function useCarousel() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener("scroll", checkScroll, { passive: true });
    const ro = new ResizeObserver(checkScroll);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      ro.disconnect();
    };
  }, [checkScroll]);

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({
      left: dir === "left" ? -320 : 320,
      behavior: "smooth",
    });
  };

  return { scrollRef, canScrollLeft, canScrollRight, scroll };
}

// ---------------------------------------------------------------------------
// Stat pill
// ---------------------------------------------------------------------------
function StatPill({
  label,
  value,
  icon: Icon,
  color = C.gold,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  color?: string;
}) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3"
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 2,
        position: "relative",
      }}
    >
      <div
        className="flex items-center justify-center"
        style={{
          width: 32,
          height: 32,
          borderRadius: 2,
          background: `${color}15`,
          border: `1px solid ${color}30`,
        }}
      >
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <div>
        <p
          style={{
            fontFamily: FONT_MONO,
            fontSize: 18,
            fontWeight: 300,
            color: C.text,
            lineHeight: 1,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {value}
        </p>
        <p
          style={{
            fontFamily: FONT_MONO,
            fontSize: 10,
            color: C.textDim,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            marginTop: 2,
          }}
        >
          {label}
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section header
// ---------------------------------------------------------------------------
function SectionHeader({
  title,
  badge,
  action,
  onAction,
}: {
  title: string;
  badge?: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-3">
        {badge && <HudBadge color={C.cyan}>{badge}</HudBadge>}
        <h2
          style={{
            fontFamily: FONT_HEADING,
            fontWeight: 200,
            fontSize: 24,
            color: C.text,
            letterSpacing: "-0.01em",
            margin: 0,
          }}
        >
          {title}
        </h2>
      </div>
      {action && onAction && (
        <button
          onClick={onAction}
          className="flex items-center gap-1 group"
          style={{
            fontFamily: FONT_MONO,
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            color: C.gold,
            background: "none",
            border: `1px solid ${C.border}`,
            borderRadius: 2,
            padding: "6px 14px",
            cursor: "pointer",
            transition: "border-color 0.2s, color 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = C.gold;
            e.currentTarget.style.color = C.cyan;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = C.border;
            e.currentTarget.style.color = C.gold;
          }}
        >
          {action}
          <ChevronRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sidebar person card
// ---------------------------------------------------------------------------
function PersonCard({
  user,
  onClick,
}: {
  user: { _id: string; name: string; username: string; avatarUrl?: string };
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left flex items-center gap-3 px-3 py-3 transition-all"
      style={{
        background: "transparent",
        border: "1px solid transparent",
        borderRadius: 2,
        cursor: "pointer",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = C.bgAlt;
        e.currentTarget.style.borderColor = C.border;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.borderColor = "transparent";
      }}
    >
      <Avatar className="w-9 h-9 flex-shrink-0">
        <AvatarImage src={user.avatarUrl} alt={user.name} />
        <AvatarFallback
          style={{
            background: `linear-gradient(135deg, ${C.accent}, ${C.gold})`,
            color: "#fff",
            fontFamily: FONT_MONO,
            fontSize: 12,
          }}
        >
          {user.name.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p
          className="truncate"
          style={{
            fontFamily: FONT_BODY,
            fontSize: 13,
            fontWeight: 500,
            color: C.text,
            margin: 0,
            lineHeight: 1.3,
          }}
        >
          {user.name}
        </p>
        <p
          className="truncate"
          style={{
            fontFamily: FONT_MONO,
            fontSize: 11,
            color: C.textDim,
            margin: 0,
          }}
        >
          @{user.username}
        </p>
      </div>
      <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" style={{ color: C.textDim }} />
    </button>
  );
}

// ===========================================================================
// FEED PAGE
// ===========================================================================

export default function FeedPage() {
  const router = useRouter();
  const { currentUser, isLoading: isUserLoading } = useCurrentUser();
  const [activityTab, setActivityTab] = useState<ActivityTab>("community");

  const feedTimeline = useQuery(
    api.feed.timeline,
    currentUser ? { limit: 30 } : "skip"
  );
  const discoverPeople = useQuery(api.users.search, {
    query: "",
    limit: 50,
  });

  const communityEntries = (feedTimeline?.community ??
    []) as FeedReviewEntry[];
  const friendEntries = (feedTimeline?.friends ?? []) as FeedReviewEntry[];
  const activityEntries =
    activityTab === "friends" ? friendEntries : communityEntries;
  const peopleToDisplay = (discoverPeople || [])
    .filter((user) => !currentUser || user._id !== currentUser._id)
    .slice(0, 6);

  const popularGames = communityEntries
    .slice(0, 8)
    .map((entry) => entry.game)
    .filter(
      (game, index, self) =>
        self.findIndex((g) => g._id === game._id) === index
    );

  const heroReveal = useReveal();
  const trendingReveal = useReveal();
  const activityReveal = useReveal();
  const recommendReveal = useReveal();
  const carousel = useCarousel();

  if (isUserLoading || !currentUser) {
    return <FeedPageSkeleton />;
  }

  const isLoading = feedTimeline === undefined;

  // Stats
  const totalReviews = communityEntries.length;
  const avgRating =
    totalReviews > 0
      ? (
          communityEntries.reduce(
            (total, entry) => total + entry.review.rating,
            0
          ) / totalReviews
        ).toFixed(1)
      : "0.0";
  const totalHours = communityEntries
    .reduce((sum, entry) => sum + (entry.review.playtimeHours || 0), 0)
    .toFixed(0);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <div
      className="min-h-screen pb-20 md:pb-0 relative"
      style={{ backgroundColor: C.bg }}
    >
      {/* Font import */}
      <style>{`@import url('${FONT_IMPORT_URL}');
.feed-reveal { opacity: 0; transform: translateY(16px); transition: opacity 0.5s ease-out, transform 0.5s ease-out; }
.feed-reveal.visible { opacity: 1; transform: translateY(0); }
.feed-carousel::-webkit-scrollbar { display: none; }
.feed-carousel { -ms-overflow-style: none; scrollbar-width: none; }
@media (prefers-reduced-motion: reduce) {
  .feed-reveal { opacity: 1; transform: none; transition: none; }
}`}</style>

      {/* Grain overlay */}
      <GrainOverlay id="feed-grain" />

      {/* Ambient background */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: 0,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "10%",
            left: "15%",
            width: 600,
            height: 600,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${C.gold}08, transparent 70%)`,
            filter: "blur(60px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "20%",
            right: "10%",
            width: 500,
            height: 500,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${C.accent}06, transparent 70%)`,
            filter: "blur(60px)",
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* ─── Hero / Greeting Bar ─── */}
        <div
          ref={heroReveal.ref}
          className={heroReveal.className}
        >
          <div
            style={{
              borderBottom: `1px solid ${C.border}`,
              background: `linear-gradient(180deg, ${C.bgAlt}, ${C.bg})`,
            }}
          >
            <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-6 md:py-8">
              {/* Top row: greeting + action */}
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12 md:h-14 md:w-14" style={{ border: `2px solid ${C.border}` }}>
                    <AvatarImage
                      src={currentUser.avatarUrl}
                      alt={currentUser.name}
                    />
                    <AvatarFallback
                      style={{
                        background: `linear-gradient(135deg, ${C.accent}, ${C.gold})`,
                        color: "#fff",
                        fontFamily: FONT_HEADING,
                        fontSize: 20,
                        fontWeight: 200,
                      }}
                    >
                      {currentUser.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p
                      style={{
                        fontFamily: FONT_MONO,
                        fontSize: 11,
                        color: C.textDim,
                        textTransform: "uppercase",
                        letterSpacing: "0.12em",
                        marginBottom: 4,
                      }}
                    >
                      {greeting}, archivist
                    </p>
                    <h1
                      style={{
                        fontFamily: FONT_HEADING,
                        fontWeight: 200,
                        fontSize: "clamp(24px, 3vw, 36px)",
                        color: C.text,
                        letterSpacing: "-0.02em",
                        margin: 0,
                        lineHeight: 1.1,
                      }}
                    >
                      {currentUser.name}
                    </h1>
                  </div>
                </div>

                <button
                  onClick={() => router.push("/review/new")}
                  className="hidden md:flex items-center gap-2"
                  style={{
                    fontFamily: FONT_MONO,
                    fontSize: 12,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: C.bg,
                    background: C.gold,
                    border: "none",
                    borderRadius: 2,
                    padding: "10px 20px",
                    cursor: "pointer",
                    boxShadow: `0 0 24px ${C.bloom}`,
                    transition: "box-shadow 0.2s, transform 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = `0 0 36px ${C.bloom}, 0 0 60px ${C.bloom}`;
                    e.currentTarget.style.transform = "translateY(-1px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = `0 0 24px ${C.bloom}`;
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  <PenLine className="w-3.5 h-3.5" />
                  Write Review
                </button>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatPill
                  label="Reviews"
                  value={totalReviews}
                  icon={PenLine}
                  color={C.gold}
                />
                <StatPill
                  label="Avg Rating"
                  value={avgRating}
                  icon={Star}
                  color={C.amber}
                />
                <StatPill
                  label="Hours Played"
                  value={totalHours}
                  icon={Clock}
                  color={C.cyan}
                />
                <StatPill
                  label="Games"
                  value={popularGames.length}
                  icon={Gamepad2}
                  color={C.green}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ─── Main Content Area ─── */}
        <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-6 md:py-8">
          {/* ─── Trending Carousel ─── */}
          <div
            ref={trendingReveal.ref}
            className={`${trendingReveal.className} mb-8 md:mb-10`}
          >
            <SectionHeader
              title="Trending on Binnacle"
              badge="Trending"
              action="Explore"
              onAction={() => router.push("/discover")}
            />

            <div className="relative">
              {/* Scroll buttons */}
              {carousel.canScrollLeft && (
                <button
                  onClick={() => carousel.scroll("left")}
                  className="absolute left-0 top-1/2 -translate-y-1/2 z-10 hidden md:flex items-center justify-center"
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 2,
                    background: `${C.surface}ee`,
                    border: `1px solid ${C.border}`,
                    color: C.text,
                    cursor: "pointer",
                    backdropFilter: "blur(8px)",
                    marginLeft: -4,
                  }}
                  aria-label="Scroll left"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}
              {carousel.canScrollRight && (
                <button
                  onClick={() => carousel.scroll("right")}
                  className="absolute right-0 top-1/2 -translate-y-1/2 z-10 hidden md:flex items-center justify-center"
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 2,
                    background: `${C.surface}ee`,
                    border: `1px solid ${C.border}`,
                    color: C.text,
                    cursor: "pointer",
                    backdropFilter: "blur(8px)",
                    marginRight: -4,
                  }}
                  aria-label="Scroll right"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}

              {/* Edge fades */}
              {carousel.canScrollLeft && (
                <div
                  className="absolute left-0 top-0 bottom-0 z-[5] w-12 pointer-events-none hidden md:block"
                  style={{
                    background: `linear-gradient(to right, ${C.bg}, transparent)`,
                  }}
                />
              )}
              {carousel.canScrollRight && (
                <div
                  className="absolute right-0 top-0 bottom-0 z-[5] w-12 pointer-events-none hidden md:block"
                  style={{
                    background: `linear-gradient(to left, ${C.bg}, transparent)`,
                  }}
                />
              )}

              <div
                ref={carousel.scrollRef}
                className="feed-carousel flex gap-3 overflow-x-auto pb-2"
              >
                {isLoading
                  ? [...Array(6)].map((_, i) => (
                      <div
                        key={i}
                        className="flex-shrink-0"
                        style={{ width: 160 }}
                      >
                        <Skeleton
                          className="w-full"
                          style={{
                            height: 240,
                            backgroundColor: C.surface,
                            borderRadius: 2,
                          }}
                        />
                      </div>
                    ))
                  : popularGames.length > 0
                    ? popularGames.map((game) => (
                        <div
                          key={game._id}
                          className="flex-shrink-0"
                          style={{ width: 160 }}
                        >
                          <GameCard
                            game={{
                              id: game._id,
                              title: game.title,
                              cover: game.coverUrl,
                              coverUrl: game.coverUrl,
                              rating: game.aggregatedRating,
                            }}
                            variant="compact"
                            onClick={() => router.push(`/game/${game._id}`)}
                          />
                        </div>
                      ))
                    : PLACEHOLDER_GAMES.map((pg) => (
                        <div
                          key={pg.title}
                          className="flex-shrink-0"
                          style={{ width: 160 }}
                        >
                          <button
                            onClick={() => router.push("/discover")}
                            className="w-full group"
                            style={{
                              borderRadius: 2,
                              border: `1px solid ${C.border}`,
                              background: C.surface,
                              cursor: "pointer",
                              transition: "border-color 0.2s, box-shadow 0.2s",
                              overflow: "hidden",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor = C.gold;
                              e.currentTarget.style.boxShadow = `0 0 16px ${C.bloom}`;
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor = C.border;
                              e.currentTarget.style.boxShadow = "none";
                            }}
                          >
                            <div
                              className="aspect-[2/3] relative flex items-center justify-center"
                              style={{ background: pg.gradient }}
                            >
                              <Gamepad2
                                className="w-8 h-8 opacity-20 group-hover:opacity-30 transition-opacity"
                                style={{ color: C.text }}
                              />
                            </div>
                            <div className="p-3 min-h-[72px] flex flex-col justify-between">
                              <p
                                className="line-clamp-2"
                                style={{
                                  fontFamily: FONT_BODY,
                                  fontSize: 13,
                                  fontWeight: 500,
                                  color: C.text,
                                }}
                              >
                                {pg.title}
                              </p>
                              <p
                                style={{
                                  fontFamily: FONT_MONO,
                                  fontSize: 10,
                                  color: C.textDim,
                                  textTransform: "uppercase",
                                  letterSpacing: "0.08em",
                                  marginTop: 4,
                                }}
                              >
                                Discover
                              </p>
                            </div>
                          </button>
                        </div>
                      ))}
              </div>
            </div>
          </div>

          {/* ─── Two-column layout ─── */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8">
            {/* ─── Main column ─── */}
            <div className="space-y-8 md:space-y-10 min-w-0">
              {/* Activity Feed */}
              <div
                ref={activityReveal.ref}
                className={activityReveal.className}
              >
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <HudBadge color={C.gold}>Activity</HudBadge>
                    <h2
                      style={{
                        fontFamily: FONT_HEADING,
                        fontWeight: 200,
                        fontSize: 24,
                        color: C.text,
                        letterSpacing: "-0.01em",
                        margin: 0,
                      }}
                    >
                      Recent Reviews
                    </h2>
                  </div>

                  <Tabs
                    value={activityTab}
                    onValueChange={(value) =>
                      setActivityTab(value as ActivityTab)
                    }
                  >
                    <TabsList
                      style={{
                        backgroundColor: C.surface,
                        border: `1px solid ${C.border}`,
                        borderRadius: 2,
                        padding: 2,
                      }}
                    >
                      <TabsTrigger
                        value="friends"
                        style={{
                          fontFamily: FONT_MONO,
                          fontSize: 11,
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                          color:
                            activityTab === "friends" ? C.bg : C.textMuted,
                          backgroundColor:
                            activityTab === "friends" ? C.gold : "transparent",
                          borderRadius: 2,
                          transition:
                            "color 0.2s, background-color 0.2s",
                          padding: "5px 14px",
                        }}
                      >
                        For You
                      </TabsTrigger>
                      <TabsTrigger
                        value="community"
                        style={{
                          fontFamily: FONT_MONO,
                          fontSize: 11,
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                          color:
                            activityTab === "community" ? C.bg : C.textMuted,
                          backgroundColor:
                            activityTab === "community"
                              ? C.gold
                              : "transparent",
                          borderRadius: 2,
                          transition:
                            "color 0.2s, background-color 0.2s",
                          padding: "5px 14px",
                        }}
                      >
                        Community
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>

                <FeedReviewList
                  entries={activityEntries}
                  isLoading={isLoading}
                  emptyMessage={
                    activityTab === "friends"
                      ? "No updates from friends yet. Follow people to see their activity here!"
                      : "No community activity yet. Be the first to review a game!"
                  }
                />
              </div>

              {/* Recommendations */}
              <div
                ref={recommendReveal.ref}
                className={recommendReveal.className}
              >
                <SectionHeader
                  title="Based on Your History"
                  badge="For You"
                  action="Backlog"
                  onAction={() => router.push("/backlog")}
                />
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                  {isLoading ? (
                    <>
                      {[...Array(5)].map((_, i) => (
                        <Skeleton
                          key={i}
                          style={{
                            height: 200,
                            backgroundColor: C.surface,
                            borderRadius: 2,
                          }}
                        />
                      ))}
                    </>
                  ) : (
                    feedTimeline?.friends
                      .slice(0, 5)
                      .map((entry) => entry.game)
                      .filter(
                        (game, index, self) =>
                          self.findIndex((g) => g._id === game._id) === index
                      )
                      .map((game) => (
                        <GameCard
                          key={game._id}
                          game={{
                            id: game._id,
                            title: game.title,
                            cover: game.coverUrl,
                            coverUrl: game.coverUrl,
                            rating: game.aggregatedRating,
                          }}
                          variant="compact"
                          onClick={() => router.push(`/game/${game._id}`)}
                        />
                      ))
                  )}
                </div>
              </div>

              {/* Bottom banner ad */}
              <div className="flex justify-center">
                <AdSpace
                  variant="banner"
                  className="w-full max-w-[728px]"
                />
              </div>
            </div>

            {/* ─── Sidebar ─── */}
            <aside className="hidden lg:block space-y-5">
              <div className="sticky top-4 space-y-5">
                {/* Quick Actions */}
                <div
                  style={{
                    background: C.surface,
                    border: `1px solid ${C.border}`,
                    borderRadius: 2,
                    padding: 20,
                    position: "relative",
                  }}
                >
                  <CornerMarkers />
                  <p
                    style={{
                      fontFamily: FONT_MONO,
                      fontSize: 10,
                      color: C.textDim,
                      textTransform: "uppercase",
                      letterSpacing: "0.12em",
                      marginBottom: 12,
                    }}
                  >
                    Quick Actions
                  </p>
                  <div className="space-y-2">
                    {[
                      {
                        label: "Write a Review",
                        icon: PenLine,
                        href: "/review/new",
                        color: C.gold,
                      },
                      {
                        label: "Discover Games",
                        icon: Compass,
                        href: "/discover",
                        color: C.cyan,
                      },
                      {
                        label: "Your Backlog",
                        icon: Gamepad2,
                        href: "/backlog",
                        color: C.green,
                      },
                    ].map((item) => (
                      <button
                        key={item.href}
                        onClick={() => router.push(item.href)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-all"
                        style={{
                          background: "transparent",
                          border: `1px solid transparent`,
                          borderRadius: 2,
                          cursor: "pointer",
                          fontFamily: FONT_MONO,
                          fontSize: 12,
                          letterSpacing: "0.04em",
                          color: C.text,
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = C.bgAlt;
                          e.currentTarget.style.borderColor = C.border;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "transparent";
                          e.currentTarget.style.borderColor = "transparent";
                        }}
                      >
                        <item.icon
                          className="w-4 h-4"
                          style={{ color: item.color }}
                        />
                        {item.label}
                        <ChevronRight
                          className="w-3 h-3 ml-auto"
                          style={{ color: C.textDim }}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Discover People */}
                <div
                  style={{
                    background: C.surface,
                    border: `1px solid ${C.border}`,
                    borderRadius: 2,
                    padding: 20,
                    position: "relative",
                  }}
                >
                  <CornerMarkers />
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Users
                        className="w-4 h-4"
                        style={{ color: C.accent }}
                      />
                      <p
                        style={{
                          fontFamily: FONT_MONO,
                          fontSize: 10,
                          color: C.textDim,
                          textTransform: "uppercase",
                          letterSpacing: "0.12em",
                          margin: 0,
                        }}
                      >
                        People
                      </p>
                    </div>
                    <button
                      onClick={() => router.push("/discover/people")}
                      style={{
                        fontFamily: FONT_MONO,
                        fontSize: 10,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        color: C.gold,
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      View All
                    </button>
                  </div>

                  <div className="space-y-0.5">
                    {isLoading || discoverPeople === undefined ? (
                      [...Array(4)].map((_, i) => (
                        <div key={i} className="flex items-center gap-3 py-2">
                          <Skeleton
                            className="w-9 h-9 rounded-full"
                            style={{ backgroundColor: C.bgAlt }}
                          />
                          <div className="flex-1">
                            <Skeleton
                              className="h-3 w-20 mb-1.5"
                              style={{ backgroundColor: C.bgAlt }}
                            />
                            <Skeleton
                              className="h-2.5 w-14"
                              style={{ backgroundColor: C.bgAlt }}
                            />
                          </div>
                        </div>
                      ))
                    ) : peopleToDisplay.length === 0 ? (
                      <p
                        className="text-center py-6"
                        style={{
                          color: C.textDim,
                          fontFamily: FONT_BODY,
                          fontSize: 13,
                        }}
                      >
                        No users to discover yet
                      </p>
                    ) : (
                      peopleToDisplay.map((user) => (
                        <PersonCard
                          key={user._id}
                          user={user}
                          onClick={() =>
                            router.push(`/profile/${user.username}`)
                          }
                        />
                      ))
                    )}
                  </div>
                </div>

                {/* Your Stats */}
                <div
                  style={{
                    background: C.surface,
                    border: `1px solid ${C.border}`,
                    borderRadius: 2,
                    padding: 20,
                    position: "relative",
                  }}
                >
                  <CornerMarkers />
                  <div className="flex items-center gap-2 mb-4">
                    <BarChart3
                      className="w-4 h-4"
                      style={{ color: C.cyan }}
                    />
                    <p
                      style={{
                        fontFamily: FONT_MONO,
                        fontSize: 10,
                        color: C.textDim,
                        textTransform: "uppercase",
                        letterSpacing: "0.12em",
                        margin: 0,
                      }}
                    >
                      Your Stats
                    </p>
                  </div>

                  <div className="space-y-0">
                    {[
                      {
                        label: "Total Reviews",
                        value: totalReviews,
                        color: C.gold,
                      },
                      {
                        label: "Average Rating",
                        value: avgRating,
                        color: C.amber,
                      },
                      {
                        label: "Hours Played",
                        value: `${totalHours}h`,
                        color: C.cyan,
                      },
                    ].map((stat, i) => (
                      <div key={stat.label}>
                        <div className="flex items-center justify-between py-3">
                          <span
                            style={{
                              fontFamily: FONT_MONO,
                              fontSize: 11,
                              color: C.textMuted,
                              letterSpacing: "0.04em",
                            }}
                          >
                            {stat.label}
                          </span>
                          <span
                            style={{
                              fontFamily: FONT_MONO,
                              fontSize: 18,
                              fontWeight: 300,
                              color: stat.color,
                              fontVariantNumeric: "tabular-nums",
                            }}
                          >
                            {stat.value}
                          </span>
                        </div>
                        {i < 2 && <HudDivider />}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Ad */}
                <AdSpace variant="sidebar" />
              </div>
            </aside>
          </div>

          {/* ─── Mobile-only stats + sidebar content ─── */}
          <div className="lg:hidden mt-8 space-y-6">
            {/* Mobile quick actions row */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {[
                {
                  label: "Review",
                  icon: PenLine,
                  href: "/review/new",
                  color: C.gold,
                },
                {
                  label: "Discover",
                  icon: Compass,
                  href: "/discover",
                  color: C.cyan,
                },
                {
                  label: "Backlog",
                  icon: Gamepad2,
                  href: "/backlog",
                  color: C.green,
                },
                {
                  label: "People",
                  icon: Users,
                  href: "/discover/people",
                  color: C.accent,
                },
              ].map((item) => (
                <button
                  key={item.href}
                  onClick={() => router.push(item.href)}
                  className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5"
                  style={{
                    background: C.surface,
                    border: `1px solid ${C.border}`,
                    borderRadius: 2,
                    cursor: "pointer",
                    fontFamily: FONT_MONO,
                    fontSize: 11,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: C.text,
                  }}
                >
                  <item.icon
                    className="w-3.5 h-3.5"
                    style={{ color: item.color }}
                  />
                  {item.label}
                </button>
              ))}
            </div>

            {/* Mobile ad */}
            <AdSpace variant="inline" />
          </div>
        </div>
      </div>
    </div>
  );
}
