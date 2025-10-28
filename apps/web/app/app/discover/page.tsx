"use client";

import { useAction, useQuery } from "convex/react";
import { api } from "@binnacle/convex-generated/api";
import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Doc, Id } from "@binnacle/convex-generated/dataModel";

type SearchResult = {
  igdbId?: number;
  title: string;
  coverUrl?: string;
  releaseYear?: number;
  convexId?: Id<"games">;
  _id?: Id<"games">;
};

/**
 * Game discovery page for searching IGDB and browsing popular titles.
 */
export default function DiscoverPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  
  const searchGames = useAction(api.igdb.searchGames);
  const cachedGames = useQuery(api.games.searchCached, 
    searchQuery.trim() ? { query: searchQuery, limit: 20 } : "skip"
  );

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const query = searchQuery.trim();
    if (!query) return;

    setIsSearching(true);
    setHasSearched(true);
    
    try {
  const results = await searchGames({ query, limit: 20 }) as SearchResult[];
  setSearchResults(results);
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const cachedResults = useMemo(() => {
    if (!cachedGames) {
      return [] as SearchResult[];
    }

  return (cachedGames as Doc<"games">[]).map((game) => ({
      igdbId: undefined,
      title: game.title,
      coverUrl: game.coverUrl ?? undefined,
      releaseYear: game.releaseYear ?? undefined,
      convexId: game._id,
      _id: game._id,
    }));
  }, [cachedGames]);

  const displayResults: SearchResult[] = searchResults.length > 0 ? searchResults : cachedResults;

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
                className="rounded-xl px-4 py-2 text-sm font-medium text-stone-400 transition hover:bg-stone-800/60 hover:text-white"
              >
                Backlog
              </Link>
              <Link
                href="/app/discover"
                className="rounded-xl px-4 py-2 text-sm font-medium text-white transition hover:bg-stone-800/60"
              >
                Discover
              </Link>
            </nav>
          </div>
        </header>

        {/* Search Section */}
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-semibold">Discover Games</h1>
            <p className="text-sm text-stone-400">
              Search the IGDB database to find your next adventure
            </p>
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="relative flex-1">
              <svg
                className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for games (e.g., Elden Ring, Zelda, Final Fantasy)..."
                className="w-full rounded-xl border border-white/15 bg-stone-900/60 py-3 pl-12 pr-4 text-white placeholder:text-stone-500 focus:border-blue-400 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={isSearching || !searchQuery.trim()}
              className="flex items-center gap-2 rounded-xl bg-blue-500 px-6 py-3 font-semibold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSearching ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Searching...
                </>
              ) : (
                "Search IGDB"
              )}
            </button>
          </form>
        </div>

        {/* Results */}
        <div className="flex flex-col gap-6">
          {isSearching ? (
            <div className="flex items-center justify-center rounded-2xl border border-white/10 bg-stone-900/60 p-16">
              <div className="flex flex-col items-center gap-4">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
                <p className="text-sm text-stone-400">Searching IGDB database...</p>
              </div>
            </div>
          ) : hasSearched && displayResults.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-white/10 bg-stone-900/60 p-16 text-center">
              <svg className="h-16 w-16 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex flex-col gap-2">
                <h3 className="text-xl font-semibold text-white">No results found</h3>
                <p className="max-w-md text-sm text-stone-400">
                  Try searching with a different title or check your spelling.
                </p>
              </div>
            </div>
          ) : displayResults.length > 0 ? (
            <>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">
                  {searchResults.length > 0 ? "Search Results" : "From Your Collection"}
                </h2>
                <span className="text-sm text-stone-400">
                  {displayResults.length} games found
                </span>
              </div>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {displayResults.map((game) => (
                  <GameSearchCard
                    key={(game.convexId ?? game._id ?? game.igdbId ?? game.title).toString()}
                    game={game}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-white/10 bg-stone-900/60 p-16 text-center">
              <svg className="h-16 w-16 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <div className="flex flex-col gap-2">
                <h3 className="text-xl font-semibold text-white">Start discovering</h3>
                <p className="max-w-md text-sm text-stone-400">
                  Search for any game in the IGDB database to add to your backlog.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
function GameSearchCard({ game }: { game: SearchResult }) {
  const targetId = game.convexId ?? game._id;
  const href = targetId ? `/app/game/${targetId}` : "#";

  return (
    <Link
      href={href}
      className="group flex flex-col gap-3 rounded-2xl border border-white/10 bg-stone-900/60 p-4 transition hover:border-white/20 hover:bg-stone-900/80"
    >
      {/* Cover Image */}
      <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-stone-800">
        {game.coverUrl ? (
          <Image
            src={game.coverUrl}
            alt={game.title}
            fill
            sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw"
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

      {/* Game Info */}
      <div className="flex flex-col gap-2">
        <h3 className="line-clamp-2 text-sm font-semibold text-white">
          {game.title}
        </h3>
        
        {game.releaseYear && (
          <span className="text-xs text-stone-500">{game.releaseYear}</span>
        )}

        {/* Add Button */}
        <button className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-blue-500/20 px-3 py-2 text-xs font-semibold text-blue-300 transition hover:bg-blue-500/30">
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Review
        </button>
      </div>
    </Link>
  );
}
