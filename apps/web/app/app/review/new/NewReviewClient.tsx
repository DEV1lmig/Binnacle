"use client";

import { useMutation, useAction, useQuery } from "convex/react";
import { api } from "@binnacle/convex-generated/api";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Id } from "@binnacle/convex-generated/dataModel";

/**
 * Form for creating a new game review.
 */
export default function NewReviewClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedGameId = searchParams.get("gameId");
  
  const currentUser = useQuery(api.users.current);
  const createReview = useMutation(api.reviews.create);
  const searchGames = useAction(api.igdb.searchGames);
  const preselectedGame = useQuery(
    api.games.getById,
    preselectedGameId ? { gameId: preselectedGameId as Id<"games"> } : "skip"
  );
  
  const [selectedGame, setSelectedGame] = useState<SelectedGame | null>(null);
  const [gameSearch, setGameSearch] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  
  const [rating, setRating] = useState(7);
  const [platform, setPlatform] = useState("");
  const [playtimeHours, setPlaytimeHours] = useState<number | undefined>();
  const [reviewText, setReviewText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (preselectedGame) {
      setSelectedGame({
        convexId: preselectedGame._id,
        title: preselectedGame.title,
        coverUrl: preselectedGame.coverUrl ?? undefined,
        releaseYear: preselectedGame.releaseYear ?? undefined,
      });
      setGameSearch(preselectedGame.title);
    }
  }, [preselectedGame]);

  const handleSearchGames = async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    setShowSearchResults(true);
    
    try {
      const results = (await searchGames({ query: trimmed, limit: 10 })) as SearchResult[];
      setSearchResults(results);
    } catch (error) {
      console.error("Game search failed:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const selectGame = (game: SearchResult) => {
    const convexId = game.convexId ?? game._id;
    if (!convexId) {
      return;
    }

    setSelectedGame({
      convexId,
      title: game.title,
      coverUrl: game.coverUrl,
      releaseYear: game.releaseYear,
    });
    setGameSearch(game.title);
    setShowSearchResults(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedGame || !currentUser) return;

    setIsSubmitting(true);
    
    try {
      await createReview({
        gameId: selectedGame.convexId,
        rating,
        platform: platform || undefined,
        text: reviewText || undefined,
        playtimeHours,
      });

      router.push("/app/backlog");
    } catch (error) {
      console.error("Failed to create review:", error);
      alert("Failed to create review. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-stone-950 via-stone-950/95 to-stone-900 text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-8 px-4 py-8 sm:px-8">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-white/10 pb-6">
          <Link href="/app" className="text-2xl font-semibold tracking-tight text-white">
            Binnacle
          </Link>
          <Link
            href="/app"
            className="rounded-xl border border-white/20 px-4 py-2 text-sm font-medium text-stone-200 transition hover:border-blue-400 hover:text-white"
          >
            Cancel
          </Link>
        </header>

        {/* Form */}
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-semibold">Add a Review</h1>
            <p className="text-sm text-stone-400">
              Share your thoughts on a game you&apos;ve played
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            {/* Game Selection */}
            <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-stone-900/60 p-6">
              <h2 className="text-lg font-semibold">Select Game</h2>
              
              <div className="relative">
                <input
                  type="text"
                  value={gameSearch}
                  onChange={(e) => {
                    setGameSearch(e.target.value);
                    handleSearchGames(e.target.value);
                  }}
                  onFocus={() => setShowSearchResults(true)}
                  placeholder="Search for a game..."
                  className="w-full rounded-xl border border-white/15 bg-stone-900/60 px-4 py-3 text-white placeholder:text-stone-500 focus:border-blue-400 focus:outline-none"
                  required
                />

                {/* Search Results Dropdown */}
                {showSearchResults && searchResults.length > 0 && (
                  <div className="absolute top-full z-10 mt-2 w-full rounded-xl border border-white/10 bg-stone-900 shadow-lg">
                    <div className="max-h-64 overflow-y-auto p-2">
                      {searchResults.map((game) => (
                        <button
                          key={(game.convexId ?? game._id ?? game.igdbId ?? game.title).toString()}
                          type="button"
                          onClick={() => selectGame(game)}
                          className="flex w-full items-center gap-3 rounded-lg p-3 text-left transition hover:bg-stone-800"
                        >
                          {game.coverUrl && (
                            <div className="relative h-12 w-9 overflow-hidden rounded">
                              <Image
                                src={game.coverUrl}
                                alt={game.title}
                                fill
                                sizes="36px"
                                className="object-cover"
                              />
                            </div>
                          )}
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-white">
                              {game.title}
                            </span>
                            {game.releaseYear && (
                              <span className="text-xs text-stone-500">
                                {game.releaseYear}
                              </span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {isSearching && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                  </div>
                )}
              </div>

              {/* Selected Game Preview */}
              {selectedGame && (
                <div className="flex items-center gap-4 rounded-xl border border-white/10 bg-stone-900/80 p-4">
                  {selectedGame.coverUrl && (
                    <div className="relative h-24 w-[72px] overflow-hidden rounded-lg">
                      <Image
                        src={selectedGame.coverUrl}
                        alt={selectedGame.title}
                        fill
                        sizes="72px"
                        className="object-cover"
                      />
                    </div>
                  )}
                  <div className="flex flex-col gap-1">
                    <h3 className="font-semibold text-white">{selectedGame.title}</h3>
                    {selectedGame.releaseYear && (
                      <span className="text-sm text-stone-400">
                        {selectedGame.releaseYear}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Rating */}
            <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-stone-900/60 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Your Rating</h2>
                <span className="text-2xl font-bold text-blue-400">{rating}/10</span>
              </div>
              
              <input
                type="range"
                min="1"
                max="10"
                value={rating}
                onChange={(e) => setRating(Number(e.target.value))}
                className="w-full accent-blue-500"
              />
              
              <div className="flex justify-between text-xs text-stone-500">
                <span>Poor</span>
                <span>Masterpiece</span>
              </div>
            </div>

            {/* Platform & Playtime */}
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-stone-900/60 p-6">
                <label className="text-sm font-semibold text-white">
                  Platform (Optional)
                </label>
                <input
                  type="text"
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  placeholder="e.g., PC, PS5, Xbox Series X"
                  className="w-full rounded-xl border border-white/15 bg-stone-900/60 px-4 py-2.5 text-white placeholder:text-stone-500 focus:border-blue-400 focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-stone-900/60 p-6">
                <label className="text-sm font-semibold text-white">
                  Playtime (Hours)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={playtimeHours ?? ""}
                  onChange={(e) => setPlaytimeHours(e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="e.g., 42.5"
                  className="w-full rounded-xl border border-white/15 bg-stone-900/60 px-4 py-2.5 text-white placeholder:text-stone-500 focus:border-blue-400 focus:outline-none"
                />
              </div>
            </div>

            {/* Review Text */}
            <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-stone-900/60 p-6">
              <label className="text-lg font-semibold">Your Thoughts</label>
              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="Share what you loved, what could be improved, or any memorable moments..."
                rows={8}
                className="w-full rounded-xl border border-white/15 bg-stone-900/60 px-4 py-3 text-white placeholder:text-stone-500 focus:border-blue-400 focus:outline-none"
              />
              <p className="text-xs text-stone-500">
                {reviewText.length} characters
              </p>
            </div>

            {/* Submit Button */}
            <div className="flex gap-3">
              <Link
                href="/app"
                className="flex-1 rounded-xl border border-white/20 px-6 py-3 text-center font-semibold text-stone-200 transition hover:border-white/40 hover:text-white"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={!selectedGame || isSubmitting}
                className="flex-1 rounded-xl bg-blue-500 px-6 py-3 font-semibold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? "Publishing..." : "Publish Review"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}

export type SearchResult = {
  igdbId?: number;
  title: string;
  coverUrl?: string;
  releaseYear?: number;
  convexId?: Id<"games">;
  _id?: Id<"games">;
};

export type SelectedGame = {
  convexId: Id<"games">;
  title: string;
  coverUrl?: string;
  releaseYear?: number;
};
