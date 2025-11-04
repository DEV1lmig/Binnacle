"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentUser } from "@/app/context/CurrentUserContext";
import { GameCard, type GameCardGame } from "@/app/components/GameCard";
import { AdSpace } from "@/app/components/AdSpace";
import { Input } from "@/app/components/ui/input";
import { Search, TrendingUp, Star, Calendar, Users, ArrowRight, AlertCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";

export default function DiscoverPage() {
  const router = useRouter();
  const { currentUser } = useCurrentUser();
  const [searchQuery, setSearchQuery] = useState("");
  const [isEnriching, setIsEnriching] = useState(false);

  // Fetch search results when user types (only if searchQuery is not empty)
  const searchResults = useQuery(
    api.games.searchCached,
    searchQuery ? { query: searchQuery, limit: 20 } : "skip"
  );

  // Background enrichment action (doesn't block UI)
  const enrichCache = useAction(api.igdb.searchOptimizedWithFallback);

  // Trigger background enrichment if results are insufficient
  useEffect(() => {
    const triggerEnrichment = async () => {
      if (!searchQuery || !searchResults) return;
      
      const MIN_RESULTS_THRESHOLD = 3;
      
      // If we have very few results, trigger background IGDB fetch
      if (searchResults.length < MIN_RESULTS_THRESHOLD && !isEnriching) {
        setIsEnriching(true);
        try {
          await enrichCache({
            query: searchQuery,
            limit: 20,
            minCachedResults: MIN_RESULTS_THRESHOLD,
          });
        } catch (error) {
          console.error("Background enrichment failed:", error);
        } finally {
          setIsEnriching(false);
        }
      }
    };

    // Debounce enrichment to avoid spamming IGDB
    const timeoutId = setTimeout(triggerEnrichment, 1000);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, searchResults, enrichCache, isEnriching]);

  // Fetch curated data from Convex (always available)
  const discoverPeople = useQuery(api.users.search, { query: "", limit: 15 });
  const trendingGamesData = useQuery(api.games.getTrendingGames, { limit: 24 });
  const topRatedData = useQuery(api.games.getTopRatedGames, { limit: 24 });
  const newReleasesData = useQuery(api.games.getNewReleases, { limit: 24 });
  
  const mockUsers = (discoverPeople || []).filter((user) => !currentUser || user._id !== currentUser._id);
  const gameResults = searchResults || [];
  const trendingGames = trendingGamesData || [];
  const topRated = topRatedData || [];
  const newReleases = newReleasesData || [];

const mapToGameCardGame = (game: {
  _id: string | { toString(): string };
  title?: string | null;
  cover?: string | null;
  coverUrl?: string | null;
  rating?: number | null;
  aggregatedRating?: number | null;
  releaseYear?: number | null;
  status?: string | null;
}): GameCardGame => {
  const validStatuses = ["backlog", "playing", "completed", "dropped", "onhold"] as const;
  const status = game.status && validStatuses.includes(game.status as typeof validStatuses[number])
    ? (game.status as typeof validStatuses[number])
    : undefined;
  
  return {
    id: String(game._id),
    _id: String(game._id),
    title: game.title ?? "Unknown Title",
    cover: game.cover ?? undefined,
    coverUrl: game.coverUrl ?? undefined,
    rating: game.rating ?? undefined,
    aggregatedRating: game.aggregatedRating ?? undefined,
    releaseYear: game.releaseYear ?? undefined,
    status,
  };
};  return (
    <div className="min-h-screen bg-[var(--bkl-color-bg-primary)] pb-20 md:pb-8">

      <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
        <div className="mb-6">
          <h1
            className="text-[var(--bkl-color-text-primary)] mb-2"
            style={{ fontSize: "var(--bkl-font-size-3xl)", fontWeight: "var(--bkl-font-weight-bold)" }}
          >
            Discover Games
          </h1>
          <p
            className="text-[var(--bkl-color-text-secondary)]"
            style={{ fontSize: "var(--bkl-font-size-sm)" }}
          >
            Browse and search for games to add to your backlog
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[var(--bkl-color-text-disabled)]" />
            <Input
              type="text"
              placeholder="Search for games..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[var(--bkl-color-bg-secondary)] border-[var(--bkl-color-border)] text-[var(--bkl-color-text-primary)] placeholder:text-[var(--bkl-color-text-disabled)] pl-12 pr-4 py-4 rounded-[var(--bkl-radius-lg)]"
              style={{ fontSize: "var(--bkl-font-size-base)" }}
            />
          </div>
        </div>

        <div className="space-y-8">
          {/* Search Results or Curated Sections */}
          {searchQuery ? (
            <>
              {/* Search Results */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2
                    className="text-[var(--bkl-color-text-primary)]"
                    style={{ fontSize: "var(--bkl-font-size-2xl)", fontWeight: "var(--bkl-font-weight-semibold)" }}
                  >
                    Search Results for &quot;{searchQuery}&quot;
                  </h2>
                  {isEnriching && (
                    <div className="flex items-center gap-2 text-[var(--bkl-color-accent-primary)] animate-pulse">
                      <AlertCircle className="w-4 h-4" />
                      <span style={{ fontSize: "var(--bkl-font-size-sm)" }}>Searching IGDB...</span>
                    </div>
                  )}
                </div>
                {gameResults.length > 0 ? (
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[var(--bkl-color-text-secondary)]" style={{ fontSize: "var(--bkl-font-size-sm)" }}>
                        Found {gameResults.length} game{gameResults.length !== 1 ? 's' : ''}
                      </p>
                      {gameResults.length < 3 && isEnriching && (
                        <p className="text-[var(--bkl-color-accent-primary)]" style={{ fontSize: "var(--bkl-font-size-sm)" }}>
                          Looking for more results...
                        </p>
                      )}
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                      {gameResults.map((game) => (
                        <GameCard
                          key={game._id}
                          game={mapToGameCardGame(game)}
                          variant="compact"
                          onClick={() => router.push(`/game/${game._id}`)}
                        />
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12">
                    <p
                      className="text-[var(--bkl-color-text-secondary)]"
                      style={{ fontSize: "var(--bkl-font-size-lg)" }}
                    >
                      {isEnriching 
                        ? "Searching for games..." 
                        : `No games found matching "${searchQuery}". Try a different search term.`}
                    </p>
                    {isEnriching && (
                      <p
                        className="text-[var(--bkl-color-text-disabled)] mt-2"
                        style={{ fontSize: "var(--bkl-font-size-sm)" }}
                      >
                        We&apos;re checking the IGDB database for you...
                      </p>
                    )}
                  </div>
                )}
              </section>
            </>
          ) : (
            <>
              {/* Discover People */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-[var(--bkl-color-accent-primary)]" />
                    <h2
                      className="text-[var(--bkl-color-text-primary)]"
                      style={{ fontSize: "var(--bkl-font-size-2xl)", fontWeight: "var(--bkl-font-weight-semibold)" }}
                    >
                      Discover People
                    </h2>
                  </div>
                  <button
                    onClick={() => router.push("/discover/people")}
                    className="flex items-center gap-2 px-3 py-2 bg-[var(--bkl-color-bg-secondary)] border border-[var(--bkl-color-border)] hover:border-[var(--bkl-color-accent-primary)] rounded-[var(--bkl-radius-md)] transition-all group"
                  >
                    <span
                      className="text-[var(--bkl-color-text-secondary)] group-hover:text-[var(--bkl-color-accent-primary)]"
                      style={{ fontSize: "var(--bkl-font-size-sm)", fontWeight: "var(--bkl-font-weight-medium)" }}
                    >
                      View All
                    </span>
                    <ArrowRight className="w-4 h-4 text-[var(--bkl-color-text-secondary)] group-hover:text-[var(--bkl-color-accent-primary)] transition-colors" />
                  </button>
                </div>
                <div className="relative">
                  <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-[var(--bkl-color-border)] scrollbar-track-transparent">
                    <div className="flex gap-3 pb-2">
                      {mockUsers.map((user) => (
                        <button
                          key={user.username}
                          onClick={() => router.push(`/profile/${user.username}`)}
                          className="flex-shrink-0 w-[180px] bg-[var(--bkl-color-bg-secondary)] border border-[var(--bkl-color-border)] hover:border-[var(--bkl-color-accent-primary)] rounded-[var(--bkl-radius-lg)] p-4 transition-all hover:shadow-[var(--bkl-shadow-glow)] group"
                        >
                          <div className="flex flex-col items-center gap-3">
                            <Avatar className="w-12 h-12">
                              <AvatarImage src={user.avatarUrl} alt={user.name} />
                              <AvatarFallback className="bg-[var(--bkl-color-accent-primary)] text-white">
                                {user.name?.charAt(0).toUpperCase() || "U"}
                              </AvatarFallback>
                            </Avatar>
                            <div className="text-center w-full">
                              <p
                                className="text-[var(--bkl-color-text-primary)] truncate"
                                style={{ fontSize: "var(--bkl-font-size-base)", fontWeight: "var(--bkl-font-weight-semibold)" }}
                              >
                                {user.name}
                              </p>
                              <p
                                className="text-[var(--bkl-color-text-disabled)] truncate"
                                style={{ fontSize: "var(--bkl-font-size-sm)" }}
                              >
                                @{user.username}
                              </p>
                              <div className="flex justify-center gap-4 mt-2">
                                <div>
                                  <p
                                    className="text-[var(--bkl-color-accent-primary)]"
                                    style={{ fontSize: "var(--bkl-font-size-sm)", fontWeight: "var(--bkl-font-weight-semibold)" }}
                                  >
                                    0
                                  </p>
                                  <p
                                    className="text-[var(--bkl-color-text-disabled)]"
                                    style={{ fontSize: "var(--bkl-font-size-xs)" }}
                                  >
                                    Reviews
                                  </p>
                                </div>
                                <div>
                                  <p
                                    className="text-[var(--bkl-color-accent-primary)]"
                                    style={{ fontSize: "var(--bkl-font-size-sm)", fontWeight: "var(--bkl-font-weight-semibold)" }}
                                  >
                                    0
                                  </p>
                                  <p
                                    className="text-[var(--bkl-color-text-disabled)]"
                                    style={{ fontSize: "var(--bkl-font-size-xs)" }}
                                  >
                                    Followers
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              {/* Trending Now */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-5 h-5 text-[var(--bkl-color-accent-primary)]" />
                  <h2
                    className="text-[var(--bkl-color-text-primary)]"
                    style={{ fontSize: "var(--bkl-font-size-2xl)", fontWeight: "var(--bkl-font-weight-semibold)" }}
                  >
                    Trending Now
                  </h2>
                  {trendingGamesData === undefined && (
                    <span className="text-[var(--bkl-color-text-disabled)] text-sm">Loading...</span>
                  )}
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                  {trendingGamesData === undefined ? (
                    // Loading skeletons
                    Array(24).fill(0).map((_, i) => (
                      <div key={i} className="aspect-video bg-[var(--bkl-color-bg-secondary)] rounded-[var(--bkl-radius-lg)] animate-pulse" />
                    ))
                  ) : trendingGames.length > 0 ? (
                    trendingGames.map((game) => (
                      <GameCard
                        key={game._id}
                        game={mapToGameCardGame(game)}
                        variant="compact"
                        onClick={() => router.push(`/game/${game._id}`)}
                      />
                    ))
                  ) : (
                    <p className="text-[var(--bkl-color-text-secondary)] col-span-full">
                      No trending games available. Check back soon or seed games from the admin panel.
                    </p>
                  )}
                </div>
              </section>

              {/* Top Rated */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Star className="w-5 h-5 text-[var(--bkl-color-accent-secondary)]" />
                  <h2
                    className="text-[var(--bkl-color-text-primary)]"
                    style={{ fontSize: "var(--bkl-font-size-2xl)", fontWeight: "var(--bkl-font-weight-semibold)" }}
                  >
                    Top Rated
                  </h2>
                  {topRatedData === undefined && (
                    <span className="text-[var(--bkl-color-text-disabled)] text-sm">Loading...</span>
                  )}
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                  {topRatedData === undefined ? (
                    // Loading skeletons
                    Array(24).fill(0).map((_, i) => (
                      <div key={i} className="aspect-video bg-[var(--bkl-color-bg-secondary)] rounded-[var(--bkl-radius-lg)] animate-pulse" />
                    ))
                  ) : topRated.length > 0 ? (
                    topRated.map((game) => (
                      <GameCard
                        key={game._id}
                        game={mapToGameCardGame(game)}
                        variant="compact"
                        onClick={() => router.push(`/game/${game._id}`)}
                      />
                    ))
                  ) : (
                    <p className="text-[var(--bkl-color-text-secondary)] col-span-full">
                      No top rated games available. Check back soon or seed games from the admin panel.
                    </p>
                  )}
                </div>
              </section>

              {/* Ad Space */}
              <div className="flex justify-center">
                <AdSpace variant="banner" className="w-full max-w-[728px]" />
              </div>

              {/* New Releases */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Calendar className="w-5 h-5 text-[var(--bkl-color-accent-primary)]" />
                  <h2
                    className="text-[var(--bkl-color-text-primary)]"
                    style={{ fontSize: "var(--bkl-font-size-2xl)", fontWeight: "var(--bkl-font-weight-semibold)" }}
                  >
                    New Releases
                  </h2>
                  {newReleasesData === undefined && (
                    <span className="text-[var(--bkl-color-text-disabled)] text-sm">Loading...</span>
                  )}
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                  {newReleasesData === undefined ? (
                    // Loading skeletons
                    Array(24).fill(0).map((_, i) => (
                      <div key={i} className="aspect-video bg-[var(--bkl-color-bg-secondary)] rounded-[var(--bkl-radius-lg)] animate-pulse" />
                    ))
                  ) : newReleases.length > 0 ? (
                    newReleases.map((game) => (
                      <GameCard
                        key={game._id}
                        game={mapToGameCardGame(game)}
                        variant="compact"
                        onClick={() => router.push(`/game/${game._id}`)}
                      />
                    ))
                  ) : (
                    <p className="text-[var(--bkl-color-text-secondary)] col-span-full">
                      No new releases available. Check back soon or seed games from the admin panel.
                    </p>
                  )}
                </div>
              </section>

              {/* Browse by Genre */}
              <section>
                <h2
                  className="text-[var(--bkl-color-text-primary)] mb-4"
                  style={{ fontSize: "var(--bkl-font-size-2xl)", fontWeight: "var(--bkl-font-weight-semibold)" }}
                >
                  Browse by Genre
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {["RPG", "Action", "Adventure", "Strategy", "Racing", "Shooter", "Fighting", "Puzzle"].map((genre) => (
                    <button
                      key={genre}
                      className="bg-[var(--bkl-color-bg-secondary)] border border-[var(--bkl-color-border)] hover:border-[var(--bkl-color-accent-primary)] rounded-[var(--bkl-radius-lg)] p-6 text-center transition-all hover:shadow-[var(--bkl-shadow-glow)]"
                    >
                      <span
                        className="text-[var(--bkl-color-text-primary)]"
                        style={{ fontSize: "var(--bkl-font-size-lg)", fontWeight: "var(--bkl-font-weight-semibold)" }}
                      >
                        {genre}
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
