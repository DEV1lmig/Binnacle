"use client";

interface SimilarGamesCarouselProps {
  similarGames?: string;
}

/**
 * SimilarGamesCarousel component for displaying recommended similar games.
 * Data is stored as JSON array of game names.
 */
export function SimilarGamesCarousel({
  similarGames,
}: SimilarGamesCarouselProps) {
  const parseSimilarGames = (data: string | undefined): string[] => {
    if (!data) return [];
    try {
      const parsed = JSON.parse(data);
      // Handle both array of objects {id, name} and array of strings
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => (typeof item === "string" ? item : item.name))
          .filter(Boolean);
      }
      return [];
    } catch {
      return [];
    }
  };

  const gamesList = parseSimilarGames(similarGames);

  if (gamesList.length === 0) return null;

  return (
    <section className="flex flex-col gap-6 rounded-2xl border border-white/10 bg-stone-900/60 p-6">
      <h2 className="text-2xl font-semibold">Similar Games</h2>

      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {gamesList.slice(0, 6).map((gameName, idx) => (
            <div
              key={`${gameName}-${idx}`}
              className="flex items-center gap-3 rounded-lg border border-white/10 bg-stone-800/50 px-4 py-3 transition hover:border-blue-400/50 hover:bg-stone-800/80"
            >
              <svg
                className="h-5 w-5 flex-shrink-0 text-blue-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
              </svg>
              <span className="flex-1 text-sm font-medium text-stone-200">
                {gameName}
              </span>
              <svg
                className="h-4 w-4 text-stone-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
          ))}
        </div>

        {gamesList.length > 6 && (
          <p className="text-xs text-stone-500">
            +{gamesList.length - 6} more recommendations
          </p>
        )}
      </div>
    </section>
  );
}
