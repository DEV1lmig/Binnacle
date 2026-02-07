"use client";

import { useRouter } from "next/navigation";
import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentUser } from "@/app/context/CurrentUserContext";
import { GameCard } from "@/app/components/GameCard";
import { Input } from "@/app/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import {
  LayoutGrid,
  List,
  Search,
  Clipboard,
} from "lucide-react";
import { BacklogPageSkeleton } from "@/app/components/PageSkeleton";
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

type GameStatus = "all" | "want_to_play" | "playing" | "completed" | "on_hold" | "dropped";
type ViewMode = "grid" | "list";

// ---------------------------------------------------------------------------
// Scroll-reveal hook (same pattern as feed page)
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

  return { ref, className: ready ? `backlog-reveal ${visible ? "visible" : ""}` : "" };
}

// ---------------------------------------------------------------------------
// Status config
// ---------------------------------------------------------------------------
const STATUS_CONFIG: {
  id: GameStatus;
  label: string;
  color: string;
}[] = [
  { id: "all", label: "All Games", color: C.gold },
  { id: "want_to_play", label: "Backlog", color: C.gold },
  { id: "playing", label: "Playing", color: C.green },
  { id: "completed", label: "Completed", color: C.amber },
  { id: "on_hold", label: "On Hold", color: C.amber },
  { id: "dropped", label: "Dropped", color: C.red },
];

export default function BacklogPage() {
  const router = useRouter();
  const { currentUser, isLoading: isUserLoading } = useCurrentUser();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<GameStatus>("all");
  const [sortBy, setSortBy] = useState("recent");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  const headerReveal = useReveal();
  const sidebarReveal = useReveal();
  const gridReveal = useReveal();

  const backlogItems = useQuery(
    api.backlog.listForUser,
    currentUser ? { userId: currentUser._id } : "skip"
  );

  const filteredAndSortedGames = useMemo(() => {
    if (!backlogItems) return [];
    let items = [...backlogItems];
    if (activeFilter !== "all") {
      items = items.filter((item) => item.status === activeFilter);
    }
    if (searchQuery) {
      items = items.filter((item) =>
        (item.game?.title || "").toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    switch (sortBy) {
      case "title-asc":
        items.sort((a, b) => (a.game?.title || "").localeCompare(b.game?.title || ""));
        break;
      case "title-desc":
        items.sort((a, b) => (b.game?.title || "").localeCompare(a.game?.title || ""));
        break;
      case "recent":
      default:
        items.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
        break;
    }
    return items;
  }, [backlogItems, activeFilter, searchQuery, sortBy]);

  const statusCounts = useMemo(() => {
    if (!backlogItems) return { total: 0, want_to_play: 0, playing: 0, completed: 0, on_hold: 0, dropped: 0 };
    return {
      total: backlogItems.length,
      want_to_play: backlogItems.filter((i) => i.status === "want_to_play").length,
      playing: backlogItems.filter((i) => i.status === "playing").length,
      completed: backlogItems.filter((i) => i.status === "completed").length,
      on_hold: backlogItems.filter((i) => i.status === "on_hold").length,
      dropped: backlogItems.filter((i) => i.status === "dropped").length,
    };
  }, [backlogItems]);

  if (isUserLoading || !currentUser || backlogItems === undefined) {
    return <BacklogPageSkeleton />;
  }

  const getCount = (id: GameStatus) => {
    if (id === "all") return statusCounts.total;
    return statusCounts[id] ?? 0;
  };

  return (
    <>
      <style>{`
        @import url('${FONT_IMPORT_URL}');
        .backlog-reveal {
          opacity: 0;
          transform: translateY(16px);
          transition: opacity 0.5s ease, transform 0.5s ease;
        }
        .backlog-reveal.visible {
          opacity: 1;
          transform: translateY(0);
        }
        @media (prefers-reduced-motion: reduce) {
          .backlog-reveal { opacity: 1; transform: none; transition: none; }
        }
      `}</style>

      <div className="min-h-screen pb-20 md:pb-8" style={{ backgroundColor: C.bg }}>
        {/* Ambient background */}
        <div
          className="fixed inset-0 pointer-events-none"
          style={{ zIndex: 0 }}
        >
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

        <GrainOverlay id="backlog-grain" />

        <div className="relative z-10 max-w-[1400px] mx-auto px-4 md:px-8">
          {/* Header bar */}
          <div
            ref={headerReveal.ref}
            className={headerReveal.className}
            style={{
              borderBottom: `1px solid ${C.border}`,
              padding: "24px 0 20px",
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <HudBadge color={C.cyan}>Collection</HudBadge>
                <h1
                  className="mt-3"
                  style={{
                    fontFamily: FONT_HEADING,
                    fontSize: "clamp(24px, 4vw, 36px)",
                    fontWeight: 200,
                    color: C.text,
                    letterSpacing: "-0.01em",
                  }}
                >
                  Your Backlog
                </h1>
                <p
                  className="mt-1"
                  style={{
                    fontFamily: FONT_MONO,
                    fontSize: 12,
                    color: C.textMuted,
                    letterSpacing: "0.08em",
                  }}
                >
                  {statusCounts.total} GAMES TRACKED
                </p>
              </div>

              {/* View mode + sort controls */}
              <div className="hidden md:flex items-center gap-3">
                <div
                  className="flex items-center gap-0"
                  style={{
                    border: `1px solid ${C.border}`,
                    borderRadius: 2,
                    overflow: "hidden",
                  }}
                >
                  {(["grid", "list"] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setViewMode(mode)}
                      className="p-2 transition-colors"
                      style={{
                        backgroundColor: viewMode === mode ? C.gold : "transparent",
                        color: viewMode === mode ? C.bg : C.textMuted,
                      }}
                    >
                      {mode === "grid" ? <LayoutGrid className="w-4 h-4" /> : <List className="w-4 h-4" />}
                    </button>
                  ))}
                </div>

                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger
                    className="w-[160px]"
                    style={{
                      backgroundColor: C.surface,
                      border: `1px solid ${C.border}`,
                      borderRadius: 2,
                      color: C.text,
                      fontFamily: FONT_MONO,
                      fontSize: 11,
                      letterSpacing: "0.05em",
                    }}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent
                    style={{
                      backgroundColor: C.surface,
                      border: `1px solid ${C.border}`,
                      borderRadius: 2,
                    }}
                  >
                    <SelectItem value="recent" style={{ fontFamily: FONT_MONO, fontSize: 11, color: C.text }}>
                      Recently Added
                    </SelectItem>
                    <SelectItem value="title-asc" style={{ fontFamily: FONT_MONO, fontSize: 11, color: C.text }}>
                      Title A-Z
                    </SelectItem>
                    <SelectItem value="title-desc" style={{ fontFamily: FONT_MONO, fontSize: 11, color: C.text }}>
                      Title Z-A
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Search bar */}
            <div className="relative max-w-md">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ width: 14, height: 14, color: C.textDim }}
              />
              <Input
                type="text"
                placeholder="Search your games..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                style={{
                  backgroundColor: C.surface,
                  border: `1px solid ${C.border}`,
                  borderRadius: 2,
                  color: C.text,
                  fontFamily: FONT_MONO,
                  fontSize: 12,
                  letterSpacing: "0.03em",
                  height: 36,
                }}
              />
            </div>
          </div>

          {/* 12-column grid: sidebar + game grid (matching Platform Preview) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 py-6">
            {/* Sidebar */}
            <aside
              ref={sidebarReveal.ref}
              className={`lg:col-span-3 ${sidebarReveal.className}`}
            >
              <div
                className="relative lg:sticky lg:top-24"
                style={{
                  border: `1px solid ${C.border}`,
                  borderRadius: 2,
                  background: C.surface,
                  padding: "16px 0",
                }}
              >
                <CornerMarkers />

                {/* Status filters */}
                <div className="space-y-1">
                  {STATUS_CONFIG.map((status) => {
                    const count = getCount(status.id);
                    const isActive = activeFilter === status.id;
                    return (
                      <button
                        key={status.id}
                        onClick={() => setActiveFilter(status.id)}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left transition-colors"
                        style={{
                          fontFamily: FONT_MONO,
                          fontSize: 11,
                          letterSpacing: "0.05em",
                          color: isActive ? C.text : C.textDim,
                          backgroundColor: isActive ? C.goldDim + "22" : "transparent",
                        }}
                        onMouseEnter={(e) => {
                          if (!isActive) e.currentTarget.style.backgroundColor = C.goldDim + "11";
                        }}
                        onMouseLeave={(e) => {
                          if (!isActive) e.currentTarget.style.backgroundColor = "transparent";
                        }}
                      >
                        <span
                          className="inline-block rounded-full flex-shrink-0"
                          style={{
                            width: 6,
                            height: 6,
                            backgroundColor: status.color,
                          }}
                        />
                        <span className="flex-1">{status.label}</span>
                        <span
                          style={{
                            fontSize: 10,
                            color: isActive ? C.textMuted : C.textDim,
                          }}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="mx-4 my-3" style={{ height: 1, backgroundColor: C.border }} />

                {/* Stats summary */}
                <div className="px-4 space-y-2">
                  <div
                    style={{
                      fontFamily: FONT_MONO,
                      fontSize: 10,
                      color: C.textDim,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      marginBottom: 8,
                    }}
                  >
                    Completion
                  </div>
                  <div className="flex items-center justify-between">
                    <span style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.textDim }}>
                      Progress
                    </span>
                    <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: C.text }}>
                      {statusCounts.total > 0
                        ? Math.round((statusCounts.completed / statusCounts.total) * 100)
                        : 0}%
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div
                    style={{
                      height: 3,
                      backgroundColor: C.border,
                      borderRadius: 1,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: statusCounts.total > 0
                          ? `${(statusCounts.completed / statusCounts.total) * 100}%`
                          : "0%",
                        backgroundColor: C.green,
                        transition: "width 0.5s ease",
                      }}
                    />
                  </div>
                </div>

                {/* Mobile sort/view controls (only visible on small screens) */}
                <div className="lg:hidden px-4 mt-4 space-y-3">
                  <div className="mx-0 -mx-4" style={{ height: 1, backgroundColor: C.border }} />
                  <div className="flex items-center gap-2 pt-2">
                    <div
                      className="flex items-center gap-0 flex-shrink-0"
                      style={{
                        border: `1px solid ${C.border}`,
                        borderRadius: 2,
                        overflow: "hidden",
                      }}
                    >
                      {(["grid", "list"] as const).map((mode) => (
                        <button
                          key={mode}
                          onClick={() => setViewMode(mode)}
                          className="p-2 transition-colors"
                          style={{
                            backgroundColor: viewMode === mode ? C.gold : "transparent",
                            color: viewMode === mode ? C.bg : C.textMuted,
                          }}
                        >
                          {mode === "grid" ? <LayoutGrid className="w-4 h-4" /> : <List className="w-4 h-4" />}
                        </button>
                      ))}
                    </div>
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger
                        className="flex-1"
                        style={{
                          backgroundColor: C.bg,
                          border: `1px solid ${C.border}`,
                          borderRadius: 2,
                          color: C.text,
                          fontFamily: FONT_MONO,
                          fontSize: 11,
                        }}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent
                        style={{
                          backgroundColor: C.surface,
                          border: `1px solid ${C.border}`,
                          borderRadius: 2,
                        }}
                      >
                        <SelectItem value="recent" style={{ fontFamily: FONT_MONO, fontSize: 11, color: C.text }}>
                          Recently Added
                        </SelectItem>
                        <SelectItem value="title-asc" style={{ fontFamily: FONT_MONO, fontSize: 11, color: C.text }}>
                          Title A-Z
                        </SelectItem>
                        <SelectItem value="title-desc" style={{ fontFamily: FONT_MONO, fontSize: 11, color: C.text }}>
                          Title Z-A
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </aside>

            {/* Main game grid */}
            <main
              ref={gridReveal.ref}
              className={`lg:col-span-9 ${gridReveal.className}`}
            >
              {filteredAndSortedGames.length > 0 ? (
                viewMode === "grid" ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {filteredAndSortedGames.map((item) =>
                      item.game ? (
                        <GameCard
                          key={item._id}
                          game={{
                            id: item.game._id,
                            title: item.game.title,
                            cover: item.game.coverUrl,
                            coverUrl: item.game.coverUrl,
                            rating: item.game.aggregatedRating,
                            aggregatedRating: item.game.aggregatedRating,
                          }}
                          variant="compact"
                          onClick={() => item.game && router.push(`/game/${item.game._id}`)}
                        />
                      ) : null
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredAndSortedGames.map((item) =>
                      item.game ? (
                        <button
                          key={item._id}
                          onClick={() => item.game && router.push(`/game/${item.game._id}`)}
                          className="w-full flex items-center gap-4 p-3 text-left transition-all"
                          style={{
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
                          <div
                            className="flex-shrink-0 w-12 h-16 overflow-hidden"
                            style={{ borderRadius: 2, border: `1px solid ${C.border}` }}
                          >
                            {item.game.coverUrl ? (
                              <img
                                src={item.game.coverUrl}
                                alt={item.game.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div
                                className="w-full h-full"
                                style={{ background: `linear-gradient(135deg, ${C.surface}, ${C.bg})` }}
                              />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div
                              className="truncate"
                              style={{
                                fontFamily: FONT_BODY,
                                fontSize: 14,
                                fontWeight: 400,
                                color: C.text,
                              }}
                            >
                              {item.game.title}
                            </div>
                            <div
                              className="flex items-center gap-3 mt-1"
                              style={{
                                fontFamily: FONT_MONO,
                                fontSize: 10,
                                letterSpacing: "0.05em",
                              }}
                            >
                              <span
                                className="inline-flex items-center gap-1.5"
                                style={{ color: STATUS_CONFIG.find(s => s.id === item.status)?.color ?? C.textDim }}
                              >
                                <span
                                  className="inline-block w-1.5 h-1.5 rounded-full"
                                  style={{ backgroundColor: STATUS_CONFIG.find(s => s.id === item.status)?.color ?? C.textDim }}
                                />
                                {STATUS_CONFIG.find(s => s.id === item.status)?.label ?? item.status}
                              </span>
                              {item.game.aggregatedRating ? (
                                <span style={{ color: C.textDim }}>
                                  {Math.round(item.game.aggregatedRating)}%
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </button>
                      ) : null
                    )}
                  </div>
                )
              ) : (
                /* Empty state */
                <div
                  className="relative flex flex-col items-center justify-center py-20"
                  style={{
                    border: `1px solid ${C.border}`,
                    borderRadius: 2,
                    background: C.surface,
                  }}
                >
                  <CornerMarkers />
                  <Clipboard
                    style={{ width: 48, height: 48, color: C.textDim, marginBottom: 16 }}
                  />
                  <h3
                    style={{
                      fontFamily: FONT_HEADING,
                      fontSize: 20,
                      fontWeight: 200,
                      color: C.text,
                      marginBottom: 8,
                    }}
                  >
                    No games found
                  </h3>
                  <p
                    style={{
                      fontFamily: FONT_BODY,
                      fontSize: 14,
                      fontWeight: 300,
                      color: C.textMuted,
                    }}
                  >
                    Try adjusting your filters or add new games to your backlog.
                  </p>
                </div>
              )}
            </main>
          </div>
        </div>
      </div>
    </>
  );
}
