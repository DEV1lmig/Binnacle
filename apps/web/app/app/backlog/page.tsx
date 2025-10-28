"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@binnacle/convex-generated/api";
import { useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { Id } from "@binnacle/convex-generated/dataModel";

type FilterStatus = "all" | "want_to_play" | "playing" | "completed" | "on_hold" | "dropped";
const sortOptions = ["recent", "title", "releaseYear"] as const;
type SortOption = (typeof sortOptions)[number];

interface BacklogItemWithGame {
  _id: Id<"backlogItems">;
  _creationTime: number;
  userId: Id<"users">;
  gameId: Id<"games">;
  status: string;
  platform?: string;
  notes?: string;
  priority?: number;
  startedAt?: number;
  completedAt?: number;
  createdAt: number;
  updatedAt: number;
  game: {
    _id: Id<"games">;
    igdbId: number;
    title: string;
    coverUrl?: string;
    releaseYear?: number;
  } | null;
}

/**
 * Displays the user's game backlog with filtering and sorting options.
 */
export default function BacklogPage() {
  const currentUser = useQuery(api.users.current);
  const backlogItems = useQuery(
    api.backlog.listForUser,
    currentUser ? { userId: currentUser._id, limit: 100 } : "skip"
  ) as BacklogItemWithGame[] | undefined;
  const stats = useQuery(
    api.backlog.getStatsForUser,
    currentUser ? { userId: currentUser._id } : "skip"
  );
  
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [sortBy, setSortBy] = useState<SortOption>("recent");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredItems = useMemo(() => {
    if (!backlogItems) {
      return [] as BacklogItemWithGame[];
    }

    const lowerQuery = searchQuery.trim().toLowerCase();

    // Filter by status
    let filtered = backlogItems;
    if (filterStatus !== "all") {
      filtered = filtered.filter((item) => item.status === filterStatus);
    }

    // Filter by search query
    if (lowerQuery) {
      filtered = filtered.filter((item) => {
        const gameTitle = item.game?.title?.toLowerCase() ?? "";
        const platform = item.platform?.toLowerCase() ?? "";
        const notes = item.notes?.toLowerCase() ?? "";
        return gameTitle.includes(lowerQuery) || platform.includes(lowerQuery) || notes.includes(lowerQuery);
      });
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "title":
          return (a.game?.title ?? "").localeCompare(b.game?.title ?? "");
        case "releaseYear":
          return (b.game?.releaseYear ?? 0) - (a.game?.releaseYear ?? 0);
        case "recent":
        default:
          return b.createdAt - a.createdAt;
      }
    });

    return sorted;
  }, [backlogItems, searchQuery, sortBy, filterStatus]);

  const handleSortChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value as SortOption;
    if (sortOptions.includes(value)) {
      setSortBy(value);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-stone-950 via-stone-950/95 to-stone-900 text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-8">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-white/10 pb-6">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-2xl font-semibold tracking-tight text-white">
              Binnacle
            </Link>
            <nav className="hidden items-center gap-1 sm:flex">
              <Link
                href="/app"
                className="rounded-xl px-4 py-2 text-sm font-medium text-stone-400 transition hover:bg-stone-800/60 hover:text-white"
              >
                Feed
              </Link>
              <Link
                href="/app/backlog"
                className="rounded-xl px-4 py-2 text-sm font-medium text-white transition hover:bg-stone-800/60"
              >
                Backlog
              </Link>
              <Link
                href="/app/discover"
                className="rounded-xl px-4 py-2 text-sm font-medium text-stone-400 transition hover:bg-stone-800/60 hover:text-white"
              >
                Discover
              </Link>
            </nav>
          </div>
          <Link
            href="/app/review/new"
            className="flex items-center gap-2 rounded-xl bg-blue-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-400"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Review
          </Link>
        </header>

        {/* Page Title & Controls */}
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-semibold">Your Backlog</h1>
            <p className="text-sm text-stone-400">
              {backlogItems?.length ?? 0} games tracked
            </p>
          </div>

          {/* Stats Overview */}
          {stats && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
              <div className="flex flex-col gap-1 rounded-xl border border-white/10 bg-stone-900/60 p-4">
                <span className="text-2xl font-bold text-white">{stats.total}</span>
                <span className="text-xs text-stone-400">Total</span>
              </div>
              <div className="flex flex-col gap-1 rounded-xl border border-blue-500/30 bg-blue-500/10 p-4">
                <span className="text-2xl font-bold text-blue-400">{stats.want_to_play}</span>
                <span className="text-xs text-stone-400">Want to Play</span>
              </div>
              <div className="flex flex-col gap-1 rounded-xl border border-green-500/30 bg-green-500/10 p-4">
                <span className="text-2xl font-bold text-green-400">{stats.playing}</span>
                <span className="text-xs text-stone-400">Playing</span>
              </div>
              <div className="flex flex-col gap-1 rounded-xl border border-purple-500/30 bg-purple-500/10 p-4">
                <span className="text-2xl font-bold text-purple-400">{stats.completed}</span>
                <span className="text-xs text-stone-400">Completed</span>
              </div>
              <div className="flex flex-col gap-1 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4">
                <span className="text-2xl font-bold text-yellow-400">{stats.on_hold}</span>
                <span className="text-xs text-stone-400">On Hold</span>
              </div>
              <div className="flex flex-col gap-1 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
                <span className="text-2xl font-bold text-red-400">{stats.dropped}</span>
                <span className="text-xs text-stone-400">Dropped</span>
              </div>
            </div>
          )}

          {/* Filters & Search */}
          <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-stone-900/60 p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              {/* Search */}
              <div className="flex-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search your games..."
                  className="w-full rounded-xl border border-white/15 bg-stone-900/60 px-4 py-2.5 text-sm text-white placeholder:text-stone-500 focus:border-blue-400 focus:outline-none"
                />
              </div>

              {/* Sort */}
              <div className="flex items-center gap-2">
                <label className="text-sm text-stone-400">Sort by:</label>
                <select
                  value={sortBy}
                  onChange={handleSortChange}
                  className="rounded-xl border border-white/15 bg-stone-900/60 px-3 py-2 text-sm text-white focus:border-blue-400 focus:outline-none"
                >
                  <option value="recent">Recently Added</option>
                  <option value="title">Title (A-Z)</option>
                  <option value="releaseYear">Release Year</option>
                </select>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              <button
                onClick={() => setFilterStatus("all")}
                className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition ${
                  filterStatus === "all"
                    ? "bg-blue-500 text-white"
                    : "border border-white/10 bg-stone-800/60 text-stone-300 hover:border-white/20"
                }`}
              >
                <span>📋</span>
                <span>All</span>
              </button>
              <button
                onClick={() => setFilterStatus("want_to_play")}
                className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition ${
                  filterStatus === "want_to_play"
                    ? "bg-blue-500 text-white"
                    : "border border-white/10 bg-stone-800/60 text-stone-300 hover:border-white/20"
                }`}
              >
                <span>📚</span>
                <span>Want to Play</span>
              </button>
              <button
                onClick={() => setFilterStatus("playing")}
                className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition ${
                  filterStatus === "playing"
                    ? "bg-blue-500 text-white"
                    : "border border-white/10 bg-stone-800/60 text-stone-300 hover:border-white/20"
                }`}
              >
                <span>🎮</span>
                <span>Playing</span>
              </button>
              <button
                onClick={() => setFilterStatus("completed")}
                className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition ${
                  filterStatus === "completed"
                    ? "bg-blue-500 text-white"
                    : "border border-white/10 bg-stone-800/60 text-stone-300 hover:border-white/20"
                }`}
              >
                <span>✅</span>
                <span>Completed</span>
              </button>
              <button
                onClick={() => setFilterStatus("on_hold")}
                className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition ${
                  filterStatus === "on_hold"
                    ? "bg-blue-500 text-white"
                    : "border border-white/10 bg-stone-800/60 text-stone-300 hover:border-white/20"
                }`}
              >
                <span>⏸️</span>
                <span>On Hold</span>
              </button>
              <button
                onClick={() => setFilterStatus("dropped")}
                className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition ${
                  filterStatus === "dropped"
                    ? "bg-blue-500 text-white"
                    : "border border-white/10 bg-stone-800/60 text-stone-300 hover:border-white/20"
                }`}
              >
                <span>❌</span>
                <span>Dropped</span>
              </button>
            </div>
          </div>
        </div>

        {/* Games Grid */}
        {!backlogItems ? (
          <div className="flex items-center justify-center rounded-2xl border border-white/10 bg-stone-900/60 p-12">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
          </div>
        ) : backlogItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-white/10 bg-stone-900/60 p-16 text-center">
            <svg className="h-16 w-16 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <div className="flex flex-col gap-2">
              <h3 className="text-xl font-semibold text-white">Your backlog is empty</h3>
              <p className="max-w-md text-sm text-stone-400">
                Start tracking games you want to play by browsing and adding them to your backlog.
              </p>
            </div>
            <Link
              href="/app/discover"
              className="mt-4 flex items-center gap-2 rounded-xl bg-blue-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-400"
            >
              Discover Games
            </Link>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-white/10 bg-stone-900/60 p-16 text-center">
            <svg className="h-12 w-12 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <div className="flex flex-col gap-2">
              <h3 className="text-lg font-semibold text-white">No games found</h3>
              <p className="max-w-md text-sm text-stone-400">
                Try adjusting your filters or search query.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {filteredItems.map((item) => (
              <GameCard key={item._id} item={item} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

/**
 * Individual game card showing cover, title, status, and metadata.
 */
function GameCard({ item }: { item: BacklogItemWithGame }) {
  const removeFromBacklog = useMutation(api.backlog.remove);
  const currentUser = useQuery(api.users.current);
  
  // Check if user has reviewed this game
  const reviews = useQuery(
    api.reviews.listForGame,
    item.game ? { gameId: item.game._id, limit: 100 } : "skip"
  );
  
  const hasReview = reviews?.some((review) => review.userId === currentUser?._id) ?? false;
  const userReview = reviews?.find((review) => review.userId === currentUser?._id);

  const handleRemove = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!confirm("Remove this game from your backlog?")) {
      return;
    }

    try {
      await removeFromBacklog({ backlogId: item._id });
    } catch (error) {
      console.error("Failed to remove from backlog:", error);
      alert("Failed to remove from backlog");
    }
  };

  const STATUS_COLORS: Record<string, string> = {
    want_to_play: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    playing: "bg-green-500/20 text-green-400 border-green-500/30",
    completed: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    on_hold: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    dropped: "bg-red-500/20 text-red-400 border-red-500/30",
  };

  if (!item.game) {
    return null;
  }

  return (
    <div className="group relative flex flex-col gap-3 rounded-2xl border border-white/10 bg-stone-900/60 p-4 transition hover:border-white/20">
      {/* Cover Image */}
      <Link href={`/app/game/${item.game._id}`} className="block">
        <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-stone-800">
          {item.game.coverUrl ? (
            <Image
              src={item.game.coverUrl}
              alt={item.game.title}
              fill
              sizes="(min-width: 1536px) 20vw, (min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              className="object-cover transition group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <svg className="h-12 w-12 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
        </div>
      </Link>

      {/* Game Info */}
      <div className="flex flex-col gap-2">
        <Link href={`/app/game/${item.game._id}`} className="hover:text-blue-400">
          <h3 className="line-clamp-2 text-sm font-semibold text-white">
            {item.game.title}
          </h3>
        </Link>
        
        {item.game.releaseYear && (
          <span className="text-xs text-stone-500">{item.game.releaseYear}</span>
        )}

        {/* Status Badge */}
        <span
          className={`inline-flex items-center rounded-lg border px-2 py-1 text-xs font-medium ${
            STATUS_COLORS[item.status] ?? "bg-stone-800/60 text-stone-400 border-white/10"
          }`}
        >
          {item.status.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
        </span>

        {/* Platform */}
        {item.platform && (
          <span className="text-xs text-stone-400">{item.platform}</span>
        )}

        {/* Notes Preview */}
        {item.notes && (
          <p className="line-clamp-2 text-xs text-stone-500">{item.notes}</p>
        )}

        {/* Review Status */}
        {hasReview && userReview ? (
          <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 px-2 py-1.5">
            <svg className="h-3.5 w-3.5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-green-400">Reviewed</span>
              <span className="text-xs text-green-400/70">{userReview.rating}/10</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-lg border border-stone-700 bg-stone-800/40 px-2 py-1.5">
            <svg className="h-3.5 w-3.5 text-stone-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="text-xs font-medium text-stone-500">No review yet</span>
          </div>
        )}

        {/* Priority Indicator */}
        {item.priority && item.priority > 3 && (
          <div className="flex items-center gap-1">
            <svg className="h-3 w-3 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span className="text-xs text-yellow-500">High Priority</span>
          </div>
        )}
      </div>

      {/* Remove Button */}
      <button
        onClick={handleRemove}
        className="absolute right-2 top-2 rounded-lg bg-stone-900/80 p-1.5 text-stone-400 opacity-0 transition hover:bg-red-500/20 hover:text-red-400 group-hover:opacity-100"
        title="Remove from backlog"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
