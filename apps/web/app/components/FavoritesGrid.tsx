"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id, Doc } from "@/convex/_generated/dataModel";
import Link from "next/link";
import Image from "next/image";

interface FavoritesGridProps {
  userId: Id<"users">;
  className?: string;
}

/**
 * FavoritesGrid — displays a user's favorite games in a responsive grid.
 * Shows game cover, title, and release year for each favorite.
 */
export function FavoritesGrid({ userId, className = "" }: FavoritesGridProps) {
  const favorites = useQuery(api.favorites.listForUser, { userId, limit: 50 });

  if (!favorites) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-white/10 bg-stone-900/60 p-12">
        <p className="text-sm text-stone-400">Loading favorites...</p>
      </div>
    );
  }

  if (favorites.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-white/10 bg-stone-900/60 p-16 text-center">
        <svg className="h-12 w-12 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
        <div className="flex flex-col gap-2">
          <h3 className="text-lg font-semibold text-white">No favorites yet</h3>
          <p className="max-w-md text-sm text-stone-400">
            Start adding your favorite games to bookmark them!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ${className}`}>
      {favorites.map((fav) => (
        <FavoriteCard key={fav._id} favorite={fav} />
      ))}
    </div>
  );
}

/**
 * Individual favorite game card.
 */
function FavoriteCard({ favorite }: { favorite: Doc<"favorites"> }) {
  const game = useQuery(api.games.getById, { gameId: favorite.gameId });

  if (!game) {
    return (
      <div className="animate-pulse rounded-2xl border border-white/10 bg-stone-900/60 p-4">
        <div className="mb-3 aspect-[3/4] rounded-lg bg-stone-800" />
        <div className="h-5 rounded bg-stone-800" />
      </div>
    );
  }

  return (
    <Link href={`/app/game/${game._id}`}>
      <article className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-stone-900/60 p-4 transition hover:border-blue-400/50 hover:shadow-lg hover:shadow-blue-500/20">
        {/* Game Cover */}
        {game.coverUrl ? (
          <div className="relative aspect-[3/4] overflow-hidden rounded-lg">
            <Image
              src={game.coverUrl}
              alt={game.title}
              fill
              sizes="200px"
              className="object-cover transition group-hover:scale-105"
            />
          </div>
        ) : (
          <div className="flex aspect-[3/4] items-center justify-center rounded-lg bg-stone-800">
            <svg className="h-12 w-12 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}

        {/* Game Info */}
        <div className="flex flex-1 flex-col gap-2">
          <h3 className="line-clamp-2 font-semibold text-white">{game.title}</h3>
          <p className="text-xs text-stone-400">
            {game.releaseYear ? (
              <>
                Released <span className="font-medium text-stone-300">{game.releaseYear}</span>
              </>
            ) : (
              "Release date unknown"
            )}
          </p>
        </div>

        {/* Favorited Badge */}
        <div className="flex items-center gap-1.5 text-xs text-stone-400">
          <svg className="h-3.5 w-3.5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
          </svg>
          Favorited {new Date(favorite.createdAt).toLocaleDateString()}
        </div>
      </article>
    </Link>
  );
}
