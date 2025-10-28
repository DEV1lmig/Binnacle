"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

interface FavoriteToggleProps {
  gameId: Id<"games">;
  className?: string;
}

/**
 * FavoriteToggle — allows users to add/remove a game from favorites.
 * Maintains state persistence across page reloads via Convex queries.
 */
export function FavoriteToggle({ gameId, className = "" }: FavoriteToggleProps) {
  const [isLoading, setIsLoading] = useState(false);

  // Query to check if user has favorited this game
  const favoriteGameIds = useQuery(api.favorites.listFavoriteGameIdsForCurrentUser, {});
  const isFavorited = favoriteGameIds?.includes(gameId) ?? false;

  // Mutations
  const addFavorite = useMutation(api.favorites.add);
  const removeFavorite = useMutation(api.favorites.removeByGameId);

  const handleToggle = async () => {
    setIsLoading(true);
    try {
      if (isFavorited) {
        // Remove from favorites
        await removeFavorite({ gameId });
      } else {
        // Add to favorites
        await addFavorite({ gameId });
      }
    } catch (error) {
      console.error("Failed to update favorite:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={isLoading}
      className={`inline-flex items-center justify-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition hover:bg-stone-800/60 disabled:cursor-not-allowed ${className}`}
      title={isFavorited ? "Remove from favorites" : "Add to favorites"}
    >
      {isFavorited ? (
        <svg
          className="h-5 w-5 fill-red-500 text-red-500"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
          />
        </svg>
      ) : (
        <svg
          className="h-5 w-5 text-stone-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
          />
        </svg>
      )}
      <span>{isFavorited ? "Favorited" : "Favorite"}</span>
    </button>
  );
}
