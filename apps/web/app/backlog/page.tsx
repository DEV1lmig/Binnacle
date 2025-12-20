"use client";

import { useRouter } from "next/navigation";
import { useState, useMemo } from "react";
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
  Clipboard,
  BookmarkPlus,
  Gamepad2,
  CheckCircle2,
  PauseCircle,
  XCircle,
  LayoutGrid,
  List,
} from "lucide-react";
import { Skeleton } from "@/app/components/ui/skeleton";
import { BacklogPageSkeleton } from "@/app/components/PageSkeleton";

type GameStatus = "all" | "want_to_play" | "playing" | "completed" | "on_hold" | "dropped";
type ViewMode = "grid" | "list";

export default function BacklogPage() {
  const router = useRouter();
  const { currentUser, isLoading: isUserLoading } = useCurrentUser();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<GameStatus>("all");
  const [sortBy, setSortBy] = useState("recent");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  // Fetch backlog items
  const backlogItems = useQuery(
    api.backlog.listForUser,
    currentUser ? { userId: currentUser._id } : "skip"
  );

  // Filter and sort games - MUST be before any conditional returns
  const filteredAndSortedGames = useMemo(() => {
    if (!backlogItems) return [];

    let items = [...backlogItems];

    // Filter by status
    if (activeFilter !== "all") {
      items = items.filter((item) => item.status === activeFilter);
    }

    // Filter by search query
    if (searchQuery) {
      items = items.filter((item) =>
        (item.game?.title || "").toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sort
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

  // Calculate status counts - MUST be before any conditional returns
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

  // Show skeleton while user data or backlog is loading
  // This MUST come after all hooks
  if (isUserLoading || !currentUser || backlogItems === undefined) {
    return <BacklogPageSkeleton />;
  }

  const statusConfig = [
    {
      id: "all" as const,
      label: "All",
      count: statusCounts.total,
      color: "bg-[var(--bkl-color-text-secondary)]",
      icon: null,
    },
    {
      id: "want_to_play" as const,
      label: "Want to Play",
      count: statusCounts.want_to_play,
      color: "bg-[var(--bkl-color-status-backlog)]",
      icon: BookmarkPlus,
    },
    {
      id: "playing" as const,
      label: "Playing",
      count: statusCounts.playing,
      color: "bg-[var(--bkl-color-status-playing)]",
      icon: Gamepad2,
    },
    {
      id: "completed" as const,
      label: "Completed",
      count: statusCounts.completed,
      color: "bg-[var(--bkl-color-status-completed)]",
      icon: CheckCircle2,
    },
    {
      id: "on_hold" as const,
      label: "On Hold",
      count: statusCounts.on_hold,
      color: "bg-[var(--bkl-color-status-onhold)]",
      icon: PauseCircle,
    },
    {
      id: "dropped" as const,
      label: "Dropped",
      count: statusCounts.dropped,
      color: "bg-[var(--bkl-color-status-dropped)]",
      icon: XCircle,
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--bkl-color-bg-primary)] pb-20 md:pb-8">

      <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1
              className="text-[var(--bkl-color-text-primary)] mb-2"
              style={{ fontSize: "var(--bkl-font-size-3xl)", fontWeight: "var(--bkl-font-weight-bold)" }}
            >
              Your Backlog
            </h1>
            <p
              className="text-[var(--bkl-color-text-secondary)]"
              style={{ fontSize: "var(--bkl-font-size-sm)" }}
            >
              {statusCounts.total} games tracked
            </p>
          </div>

          {/* View Mode Toggle */}
          <div className="hidden md:flex items-center gap-2 bg-[var(--bkl-color-bg-secondary)] border border-[var(--bkl-color-border)] rounded-[var(--bkl-radius-md)] p-1">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-[var(--bkl-radius-sm)] transition-colors ${
                viewMode === "grid"
                  ? "bg-[var(--bkl-color-accent-primary)] text-[var(--bkl-color-bg-primary)]"
                  : "text-[var(--bkl-color-text-secondary)] hover:text-[var(--bkl-color-text-primary)]"
              }`}
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded-[var(--bkl-radius-sm)] transition-colors ${
                viewMode === "list"
                  ? "bg-[var(--bkl-color-accent-primary)] text-[var(--bkl-color-bg-primary)]"
                  : "text-[var(--bkl-color-text-secondary)] hover:text-[var(--bkl-color-text-primary)]"
              }`}
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4 mb-6">
          {statusConfig.map((status) => (
            <button
              key={status.id}
              onClick={() => setActiveFilter(status.id)}
              className={`bg-[var(--bkl-color-bg-secondary)] border-2 rounded-[var(--bkl-radius-lg)] p-4 text-left transition-all hover:border-[var(--bkl-color-accent-primary)] ${
                activeFilter === status.id
                  ? "border-[var(--bkl-color-accent-primary)] shadow-[var(--bkl-shadow-glow)]"
                  : "border-[var(--bkl-color-border)]"
              }`}
            >
              <div
                className="text-[var(--bkl-color-text-primary)] mb-2"
                style={{ fontSize: "var(--bkl-font-size-2xl)", fontWeight: "var(--bkl-font-weight-bold)" }}
              >
                {status.count}
              </div>
              <div
                className="text-[var(--bkl-color-text-secondary)]"
                style={{ fontSize: "var(--bkl-font-size-xs)" }}
              >
                {status.label}
              </div>
            </button>
          ))}
        </div>

        {/* Filters and Search */}
        <div
          className="bg-[var(--bkl-color-bg-secondary)] border border-[var(--bkl-color-border)] rounded-[var(--bkl-radius-lg)] p-4 mb-6 shadow-[var(--bkl-shadow-md)]"
        >
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                type="text"
                placeholder="Search your games..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[var(--bkl-color-bg-tertiary)] border-[var(--bkl-color-border)] text-[var(--bkl-color-text-primary)] placeholder:text-[var(--bkl-color-text-disabled)] px-4 py-2 rounded-[var(--bkl-radius-md)]"
                style={{ fontSize: "var(--bkl-font-size-sm)" }}
              />
            </div>
            <div className="flex gap-2">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[180px] bg-[var(--bkl-color-bg-tertiary)] border-[var(--bkl-color-border)] text-[var(--bkl-color-text-primary)]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Recently Added</SelectItem>
                  <SelectItem value="name">Name (A-Z)</SelectItem>
                  <SelectItem value="rating">Rating</SelectItem>
                  <SelectItem value="playtime">Play Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Filter Tags */}
          <div className="flex flex-wrap gap-2 mt-4">
            <button
              onClick={() => setActiveFilter("all")}
              className={`flex items-center gap-2 px-4 py-2 rounded-[var(--bkl-radius-full)] transition-colors ${
                activeFilter === "all"
                  ? "bg-[var(--bkl-color-accent-primary)] text-[var(--bkl-color-bg-primary)]"
                  : "bg-[var(--bkl-color-bg-tertiary)] text-[var(--bkl-color-text-secondary)] hover:bg-[var(--bkl-color-border)]"
              }`}
              style={{ fontSize: "var(--bkl-font-size-sm)", fontWeight: "var(--bkl-font-weight-medium)" }}
            >
              <Clipboard className="w-4 h-4" />
              All
            </button>
            {statusConfig.slice(1).map((status) => {
              const Icon = status.icon;
              return (
                <button
                  key={status.id}
                  onClick={() => setActiveFilter(status.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-[var(--bkl-radius-full)] transition-colors ${
                    activeFilter === status.id
                      ? `${status.color} text-white`
                      : "bg-[var(--bkl-color-bg-tertiary)] text-[var(--bkl-color-text-secondary)] hover:bg-[var(--bkl-color-border)]"
                  }`}
                  style={{ fontSize: "var(--bkl-font-size-sm)", fontWeight: "var(--bkl-font-weight-medium)" }}
                >
                  {Icon && <Icon className="w-4 h-4" />}
                  {status.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Games Grid/List */}
        {filteredAndSortedGames.length > 0 ? (
          viewMode === "grid" ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
              {filteredAndSortedGames.map((item) => (
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
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAndSortedGames.map((item) => (
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
                    variant="default"
                    onClick={() => item.game && router.push(`/game/${item.game._id}`)}
                  />
                ) : null
              ))}
            </div>
          )
        ) : (
          <div
            className="bg-[var(--bkl-color-bg-secondary)] border border-[var(--bkl-color-border)] rounded-[var(--bkl-radius-lg)] shadow-[var(--bkl-shadow-md)] p-8"
          >
            <div className="text-center">
              <Clipboard className="w-16 h-16 text-[var(--bkl-color-text-disabled)] mx-auto mb-4" />
              <h3
                className="text-[var(--bkl-color-text-primary)] mb-2"
                style={{ fontSize: "var(--bkl-font-size-xl)", fontWeight: "var(--bkl-font-weight-semibold)" }}
              >
                No games found
              </h3>
              <p
                className="text-[var(--bkl-color-text-secondary)]"
                style={{ fontSize: "var(--bkl-font-size-sm)" }}
              >
                Try adjusting your filters or add new games to your backlog.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
