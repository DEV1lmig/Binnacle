"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@binnacle/convex-generated/api";
import { Id } from "@binnacle/convex-generated/dataModel";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";

interface BacklogGridProps {
  userId: Id<"users">;
}

const STATUS_FILTERS = [
  { value: "all", label: "All", icon: "📋" },
  { value: "want_to_play", label: "Want to Play", icon: "📚" },
  { value: "playing", label: "Playing", icon: "🎮" },
  { value: "completed", label: "Completed", icon: "✅" },
  { value: "on_hold", label: "On Hold", icon: "⏸️" },
  { value: "dropped", label: "Dropped", icon: "❌" },
];

const STATUS_COLORS: Record<string, string> = {
  want_to_play: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  playing: "bg-green-500/20 text-green-400 border-green-500/30",
  completed: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  on_hold: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  dropped: "bg-red-500/20 text-red-400 border-red-500/30",
};

export function BacklogGrid({ userId }: BacklogGridProps) {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const backlogItems = useQuery(api.backlog.listForUser, {
    userId,
    status: statusFilter === "all" ? undefined : statusFilter,
    limit: 100,
  });
  const stats = useQuery(api.backlog.getStatsForUser, { userId });
  const currentUser = useQuery(api.users.current);
  const removeFromBacklog = useMutation(api.backlog.remove);

  const isOwnProfile = currentUser?._id === userId;

  if (!backlogItems) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-white/10 bg-stone-900/60 p-12">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  const handleRemove = async (backlogId: Id<"backlogItems">) => {
    if (!confirm("Remove this game from your backlog?")) {
      return;
    }

    try {
      await removeFromBacklog({ backlogId });
    } catch (error) {
      console.error("Failed to remove from backlog:", error);
      alert("Failed to remove from backlog");
    }
  };

  return (
    <div className="flex flex-col gap-6">
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

      {/* Status Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {STATUS_FILTERS.map((filter) => (
          <button
            key={filter.value}
            onClick={() => setStatusFilter(filter.value)}
            className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition ${
              statusFilter === filter.value
                ? "bg-blue-500 text-white"
                : "border border-white/10 bg-stone-800/60 text-stone-300 hover:border-white/20"
            }`}
          >
            <span>{filter.icon}</span>
            <span>{filter.label}</span>
          </button>
        ))}
      </div>

      {/* Backlog Items Grid */}
      {backlogItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-white/10 bg-stone-900/60 p-16 text-center">
          <svg className="h-12 w-12 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          <div className="flex flex-col gap-2">
            <h3 className="text-lg font-semibold text-white">No games {statusFilter !== "all" ? `with status "${statusFilter.replace("_", " ")}"` : "in backlog"}</h3>
            <p className="max-w-md text-sm text-stone-400">
              {isOwnProfile ? "Start adding games to track what you want to play!" : "This user hasn't added any games to their backlog yet."}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {backlogItems.map((item) => (
            <div
              key={item._id}
              className="group relative flex flex-col gap-3 rounded-xl border border-white/10 bg-stone-900/60 p-4 transition hover:border-white/20"
            >
              {/* Game Cover */}
              {item.game && (
                <Link href={`/app/game/${item.game._id}`} className="block">
                  <div className="relative aspect-[3/4] overflow-hidden rounded-lg">
                    {item.game.coverUrl ? (
                      <Image
                        src={item.game.coverUrl}
                        alt={item.game.title}
                        fill
                        sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                        className="object-cover transition group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-stone-800 text-stone-600">
                        <svg className="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                    )}
                  </div>
                </Link>
              )}

              {/* Game Info */}
              <div className="flex flex-col gap-2">
                <Link href={`/app/game/${item.game?._id}`} className="hover:text-blue-400">
                  <h3 className="line-clamp-2 text-sm font-semibold text-white">
                    {item.game?.title ?? "Unknown Game"}
                  </h3>
                </Link>

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
              </div>

              {/* Remove Button (only for own profile) */}
              {isOwnProfile && (
                <button
                  onClick={() => handleRemove(item._id)}
                  className="absolute right-2 top-2 rounded-lg bg-stone-900/80 p-1.5 text-stone-400 opacity-0 transition hover:bg-red-500/20 hover:text-red-400 group-hover:opacity-100"
                  title="Remove from backlog"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
