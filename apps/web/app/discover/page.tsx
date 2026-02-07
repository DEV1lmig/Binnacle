"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentUser } from "@/app/context/CurrentUserContext";
import { GameCard, type GameCardGame } from "@/app/components/GameCard";
import { AdSpace } from "@/app/components/AdSpace";
import { Input } from "@/app/components/ui/input";
import { Skeleton } from "@/app/components/ui/skeleton";
import {
  Search,
  TrendingUp,
  Star,
  Calendar,
  Users,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type DiscoverGame = {
  _id?: string | { toString(): string };
  convexId?: string | { toString(): string };
  igdbId?: number;
  title?: string | null;
  cover?: string | null;
  coverUrl?: string | null;
  rating?: number | null;
  aggregatedRating?: number | null;
  releaseYear?: number | null;
  status?: string | null;
};

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

  return { ref, className: ready ? `discover-reveal ${visible ? "visible" : ""}` : "" };
}

// ---------------------------------------------------------------------------
// Horizontal carousel hook
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
    el.scrollBy({ left: dir === "left" ? -400 : 400, behavior: "smooth" });
  };

  return { scrollRef, canScrollLeft, canScrollRight, scroll };
}

// ---------------------------------------------------------------------------
// ID resolution helpers
// ---------------------------------------------------------------------------
const resolveId = (value: DiscoverGame["_id"] | DiscoverGame["convexId"]): string | undefined => {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (typeof value === "object" && "toString" in value) {
    try { return value.toString(); } catch { return undefined; }
  }
  return undefined;
};

const deriveGameKey = (game: DiscoverGame, prefix: string, index: number): string =>
  resolveId(game.convexId) ??
  resolveId(game._id) ??
  (typeof game.igdbId === "number" ? `igdb-${game.igdbId}` : `${prefix}-${index}`);

const resolveGameRouteParam = (game: DiscoverGame, index: number): string =>
  resolveId(game.convexId) ??
  resolveId(game._id) ??
  (typeof game.igdbId === "number" ? `igdb-${game.igdbId}` : `${index}`);

const mapToGameCardGame = (game: DiscoverGame): GameCardGame => {
  const validStatuses = ["backlog", "playing", "completed", "dropped", "onhold"] as const;
  const status = game.status && validStatuses.includes(game.status as typeof validStatuses[number])
    ? (game.status as typeof validStatuses[number])
    : undefined;
  const gameId = resolveId(game.convexId) ?? resolveId(game._id) ?? (typeof game.igdbId === "number" ? `igdb-${game.igdbId}` : "");
  return {
    id: gameId,
    _id: gameId,
    title: game.title ?? "Unknown Title",
    cover: game.cover ?? undefined,
    coverUrl: game.coverUrl ?? undefined,
    rating: game.rating ?? undefined,
    aggregatedRating: game.aggregatedRating ?? undefined,
    releaseYear: game.releaseYear ?? undefined,
    status,
  };
};

// ---------------------------------------------------------------------------
// Game carousel section
// ---------------------------------------------------------------------------
function GameCarouselSection({
  badge,
  badgeColor,
  title,
  icon: Icon,
  games,
  isLoading,
  router,
  prefix,
}: {
  badge: string;
  badgeColor: string;
  title: string;
  icon: typeof TrendingUp;
  games: DiscoverGame[];
  isLoading: boolean;
  router: ReturnType<typeof useRouter>;
  prefix: string;
}) {
  const carousel = useCarousel();
  const reveal = useReveal();

  return (
    <section ref={reveal.ref} className={reveal.className}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <HudBadge color={badgeColor}>{badge}</HudBadge>
          <h2
            style={{
              fontFamily: FONT_HEADING,
              fontSize: "clamp(18px, 3vw, 24px)",
              fontWeight: 200,
              color: C.text,
              letterSpacing: "-0.01em",
            }}
          >
            {title}
          </h2>
        </div>
        {!isLoading && games.length > 0 && (
          <div className="hidden sm:flex items-center gap-1">
            <button
              onClick={() => carousel.scroll("left")}
              disabled={!carousel.canScrollLeft}
              className="p-1.5 transition-colors"
              style={{
                border: `1px solid ${C.border}`,
                borderRadius: 2,
                color: carousel.canScrollLeft ? C.text : C.textDim,
                backgroundColor: carousel.canScrollLeft ? C.surface : "transparent",
                opacity: carousel.canScrollLeft ? 1 : 0.4,
              }}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => carousel.scroll("right")}
              disabled={!carousel.canScrollRight}
              className="p-1.5 transition-colors"
              style={{
                border: `1px solid ${C.border}`,
                borderRadius: 2,
                color: carousel.canScrollRight ? C.text : C.textDim,
                backgroundColor: carousel.canScrollRight ? C.surface : "transparent",
                opacity: carousel.canScrollRight ? 1 : 0.4,
              }}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex gap-3 overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <Skeleton
              key={i}
              className="flex-shrink-0"
              style={{
                width: 160,
                height: 240,
                backgroundColor: C.surface,
                borderRadius: 2,
              }}
            />
          ))}
        </div>
      ) : games.length > 0 ? (
        <div
          ref={carousel.scrollRef}
          className="flex gap-3 overflow-x-auto pb-2"
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {games.map((game, index) => (
            <div key={deriveGameKey(game, prefix, index)} className="flex-shrink-0" style={{ width: 160 }}>
              <GameCard
                game={mapToGameCardGame(game)}
                variant="compact"
                onClick={() => router.push(`/game/${resolveGameRouteParam(game, index)}`)}
              />
            </div>
          ))}
        </div>
      ) : (
        <div
          className="relative py-10 text-center"
          style={{
            border: `1px solid ${C.border}`,
            borderRadius: 2,
            background: C.surface,
          }}
        >
          <CornerMarkers />
          <p style={{ fontFamily: FONT_BODY, fontSize: 14, fontWeight: 300, color: C.textMuted }}>
            No games available yet. Check back soon.
          </p>
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function DiscoverPage() {
  const router = useRouter();
  const { currentUser } = useCurrentUser();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<DiscoverGame[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const heroReveal = useReveal();
  const peopleReveal = useReveal();
  const genreReveal = useReveal();
  const peopleCarousel = useCarousel();

  const searchAction = useAction(api.igdb.searchOptimizedWithFallback);

  useEffect(() => {
    const performSearch = async () => {
      if (!searchQuery) {
        setSearchResults([]);
        return;
      }
      setIsSearching(true);
      try {
        const result = await searchAction({
          query: searchQuery,
          limit: 24,
          minCachedResults: 10,
        });
        const normalizedResults = Array.isArray(result?.results)
          ? (result.results as DiscoverGame[])
          : [];
        setSearchResults(normalizedResults);
      } catch (error) {
        console.error("Search failed:", error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };
    const timeoutId = setTimeout(performSearch, 500);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, searchAction]);

  const isActivelySearching = searchQuery.trim().length > 0;

  const discoverPeople = useQuery(
    api.users.search,
    isActivelySearching ? "skip" : { query: "", limit: 8 }
  );
  const trendingGamesData = useQuery(
    api.games.getTrendingGames,
    isActivelySearching ? "skip" : { limit: 12 }
  );
  const topRatedData = useQuery(
    api.games.getTopRatedGames,
    isActivelySearching ? "skip" : { limit: 12 }
  );
  const newReleasesData = useQuery(
    api.games.getNewReleases,
    isActivelySearching ? "skip" : { limit: 12 }
  );

  const users = (discoverPeople || []).filter((user) => !currentUser || user._id !== currentUser._id);

  type PaginatedGames = { games: DiscoverGame[]; hasMore: boolean; nextCursor: string | null };
  const trendingGames = (trendingGamesData ?? { games: [], hasMore: false, nextCursor: null }) as PaginatedGames;
  const topRated = (topRatedData ?? { games: [], hasMore: false, nextCursor: null }) as PaginatedGames;
  const newReleases = (newReleasesData ?? { games: [], hasMore: false, nextCursor: null }) as PaginatedGames;

  const GENRES = ["RPG", "Action", "Adventure", "Strategy", "Racing", "Shooter", "Fighting", "Puzzle", "Platformer", "Simulation", "Indie", "Horror"];

  return (
    <>
      <style>{`
        @import url('${FONT_IMPORT_URL}');
        .discover-reveal {
          opacity: 0;
          transform: translateY(16px);
          transition: opacity 0.5s ease, transform 0.5s ease;
        }
        .discover-reveal.visible {
          opacity: 1;
          transform: translateY(0);
        }
        @media (prefers-reduced-motion: reduce) {
          .discover-reveal { opacity: 1; transform: none; transition: none; }
        }
        .discover-carousel::-webkit-scrollbar { display: none; }
      `}</style>

      <div className="min-h-screen pb-20 md:pb-8" style={{ backgroundColor: C.bg }}>
        {/* Ambient background */}
        <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
          <div
            className="absolute"
            style={{
              top: "-15%",
              left: "20%",
              width: "60%",
              height: "40%",
              background: `radial-gradient(circle, ${C.goldDim}18 0%, transparent 70%)`,
              filter: "blur(80px)",
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

        <GrainOverlay id="discover-grain" />

        <div className="relative z-10 max-w-[1400px] mx-auto px-4 md:px-8">
          {/* Hero search section */}
          <div
            ref={heroReveal.ref}
            className={heroReveal.className}
            style={{ padding: "32px 0 24px", borderBottom: `1px solid ${C.border}` }}
          >
            <HudBadge color={C.cyan}>Discover</HudBadge>
            <h1
              className="mt-3 mb-1"
              style={{
                fontFamily: FONT_HEADING,
                fontSize: "clamp(28px, 5vw, 44px)",
                fontWeight: 200,
                color: C.text,
                letterSpacing: "-0.02em",
              }}
            >
              Explore Games
            </h1>
            <p
              className="mb-6"
              style={{
                fontFamily: FONT_BODY,
                fontSize: 15,
                fontWeight: 300,
                color: C.textMuted,
              }}
            >
              Search the IGDB database or browse curated collections
            </p>

            {/* Search input */}
            <div className="relative max-w-2xl">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ width: 18, height: 18, color: C.textDim }}
              />
              {isSearching && (
                <Loader2
                  className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin"
                  style={{ width: 16, height: 16, color: C.gold }}
                />
              )}
              <Input
                type="text"
                placeholder="Search for any game..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-12"
                style={{
                  backgroundColor: C.surface,
                  border: `1px solid ${C.border}`,
                  borderRadius: 2,
                  color: C.text,
                  fontFamily: FONT_BODY,
                  fontSize: 15,
                  height: 48,
                  boxShadow: `0 0 24px ${C.bloom}`,
                }}
              />
            </div>
          </div>

          {/* Content area */}
          <div className="py-8 space-y-10">
            {isActivelySearching ? (
              /* ===== SEARCH RESULTS ===== */
              <section>
                <div className="flex items-center gap-3 mb-5">
                  <HudBadge color={C.gold}>Results</HudBadge>
                  <h2
                    style={{
                      fontFamily: FONT_HEADING,
                      fontSize: 22,
                      fontWeight: 200,
                      color: C.text,
                    }}
                  >
                    &ldquo;{searchQuery}&rdquo;
                  </h2>
                  {!isSearching && searchResults.length > 0 && (
                    <span
                      style={{
                        fontFamily: FONT_MONO,
                        fontSize: 10,
                        color: C.textMuted,
                        letterSpacing: "0.08em",
                      }}
                    >
                      {searchResults.length} FOUND
                    </span>
                  )}
                </div>

                {searchResults.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                    {searchResults.map((game, index) => (
                      <GameCard
                        key={deriveGameKey(game, "search", index)}
                        game={mapToGameCardGame(game)}
                        variant="compact"
                        onClick={() => router.push(`/game/${resolveGameRouteParam(game, index)}`)}
                      />
                    ))}
                  </div>
                ) : (
                  <div
                    className="relative flex flex-col items-center justify-center py-16"
                    style={{
                      border: `1px solid ${C.border}`,
                      borderRadius: 2,
                      background: C.surface,
                    }}
                  >
                    <CornerMarkers />
                    {isSearching ? (
                      <>
                        <Loader2
                          className="animate-spin mb-3"
                          style={{ width: 32, height: 32, color: C.gold }}
                        />
                        <p style={{ fontFamily: FONT_MONO, fontSize: 12, color: C.textMuted, letterSpacing: "0.08em" }}>
                          SEARCHING IGDB DATABASE...
                        </p>
                      </>
                    ) : (
                      <>
                        <Search style={{ width: 40, height: 40, color: C.textDim, marginBottom: 12 }} />
                        <p style={{ fontFamily: FONT_BODY, fontSize: 14, fontWeight: 300, color: C.textMuted }}>
                          No games found matching &ldquo;{searchQuery}&rdquo;
                        </p>
                        <p style={{ fontFamily: FONT_MONO, fontSize: 11, color: C.textDim, marginTop: 4 }}>
                          Try a different search term
                        </p>
                      </>
                    )}
                  </div>
                )}
              </section>
            ) : (
              /* ===== CURATED BROWSE ===== */
              <>
                {/* Discover People */}
                <section ref={peopleReveal.ref} className={peopleReveal.className}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <HudBadge color={C.accent}>Network</HudBadge>
                      <h2
                        style={{
                          fontFamily: FONT_HEADING,
                          fontSize: "clamp(18px, 3vw, 24px)",
                          fontWeight: 200,
                          color: C.text,
                          letterSpacing: "-0.01em",
                        }}
                      >
                        Discover People
                      </h2>
                    </div>
                    <button
                      onClick={() => router.push("/discover/people")}
                      className="flex items-center gap-1.5 transition-all"
                      style={{
                        fontFamily: FONT_MONO,
                        fontSize: 10,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        color: C.textMuted,
                        padding: "6px 12px",
                        border: `1px solid ${C.border}`,
                        borderRadius: 2,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = C.gold;
                        e.currentTarget.style.color = C.gold;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = C.border;
                        e.currentTarget.style.color = C.textMuted;
                      }}
                    >
                      View All
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>

                  {discoverPeople === undefined ? (
                    <div className="flex gap-3 overflow-hidden">
                      {[...Array(6)].map((_, i) => (
                        <div
                          key={i}
                          className="flex-shrink-0 flex items-center gap-3 p-3"
                          style={{
                            width: 200,
                            border: `1px solid ${C.border}`,
                            borderRadius: 2,
                          }}
                        >
                          <Skeleton className="h-10 w-10 rounded-full" style={{ backgroundColor: C.bgAlt }} />
                          <div>
                            <Skeleton className="h-3 w-20 mb-1" style={{ backgroundColor: C.bgAlt }} />
                            <Skeleton className="h-2.5 w-14" style={{ backgroundColor: C.bgAlt }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : users.length > 0 ? (
                    <div className="relative">
                      <div
                        ref={peopleCarousel.scrollRef}
                        className="flex gap-3 overflow-x-auto pb-2 discover-carousel"
                        style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
                      >
                        {users.map((user) => (
                          <button
                            key={user.username}
                            onClick={() => router.push(`/profile/${user.username}`)}
                            className="relative flex-shrink-0 flex items-center gap-3 p-3 transition-all"
                            style={{
                              width: 200,
                              border: `1px solid ${C.border}`,
                              borderRadius: 2,
                              background: C.surface,
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
                            <CornerMarkers size={6} />
                            <Avatar className="h-10 w-10 flex-shrink-0">
                              <AvatarImage src={user.avatarUrl} alt={user.name} />
                              <AvatarFallback
                                style={{
                                  backgroundColor: C.bgAlt,
                                  color: C.textMuted,
                                  fontFamily: FONT_MONO,
                                  fontSize: 12,
                                }}
                              >
                                {user.name?.charAt(0)?.toUpperCase() ?? "?"}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 text-left">
                              <div
                                className="truncate"
                                style={{
                                  fontFamily: FONT_BODY,
                                  fontSize: 13,
                                  fontWeight: 400,
                                  color: C.text,
                                }}
                              >
                                {user.name}
                              </div>
                              <div
                                className="truncate"
                                style={{
                                  fontFamily: FONT_MONO,
                                  fontSize: 10,
                                  color: C.textDim,
                                  letterSpacing: "0.03em",
                                }}
                              >
                                @{user.username}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div
                      className="relative py-8 text-center"
                      style={{ border: `1px solid ${C.border}`, borderRadius: 2, background: C.surface }}
                    >
                      <CornerMarkers />
                      <p style={{ fontFamily: FONT_BODY, fontSize: 14, fontWeight: 300, color: C.textMuted }}>
                        No users to discover yet.
                      </p>
                    </div>
                  )}
                </section>

                <HudDivider />

                {/* Trending Now */}
                <GameCarouselSection
                  badge="Trending"
                  badgeColor={C.cyan}
                  title="Trending Now"
                  icon={TrendingUp}
                  games={trendingGames.games}
                  isLoading={trendingGamesData === undefined}
                  router={router}
                  prefix="trending"
                />

                {/* Top Rated */}
                <GameCarouselSection
                  badge="Top Rated"
                  badgeColor={C.amber}
                  title="Highest Rated"
                  icon={Star}
                  games={topRated.games}
                  isLoading={topRatedData === undefined}
                  router={router}
                  prefix="top-rated"
                />

                {/* Ad space */}
                <div className="flex justify-center">
                  <AdSpace variant="banner" className="w-full max-w-[728px]" />
                </div>

                {/* New Releases */}
                <GameCarouselSection
                  badge="New"
                  badgeColor={C.green}
                  title="New Releases"
                  icon={Calendar}
                  games={newReleases.games}
                  isLoading={newReleasesData === undefined}
                  router={router}
                  prefix="new-release"
                />

                <HudDivider />

                {/* Browse by Genre */}
                <section ref={genreReveal.ref} className={genreReveal.className}>
                  <div className="flex items-center gap-3 mb-5">
                    <HudBadge color={C.gold}>Genres</HudBadge>
                    <h2
                      style={{
                        fontFamily: FONT_HEADING,
                        fontSize: "clamp(18px, 3vw, 24px)",
                        fontWeight: 200,
                        color: C.text,
                        letterSpacing: "-0.01em",
                      }}
                    >
                      Browse by Genre
                    </h2>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {GENRES.map((genre) => (
                      <button
                        key={genre}
                        className="transition-all"
                        style={{
                          padding: "8px 16px",
                          border: `1px solid ${C.border}`,
                          borderRadius: 2,
                          background: C.surface,
                          fontFamily: FONT_MONO,
                          fontSize: 11,
                          letterSpacing: "0.06em",
                          color: C.textMuted,
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = C.gold;
                          e.currentTarget.style.color = C.text;
                          e.currentTarget.style.boxShadow = `0 0 12px ${C.bloom}`;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = C.border;
                          e.currentTarget.style.color = C.textMuted;
                          e.currentTarget.style.boxShadow = "none";
                        }}
                      >
                        # {genre}
                      </button>
                    ))}
                  </div>
                </section>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
