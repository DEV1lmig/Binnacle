"use client";

interface RatingsData {
  rating?: string;
  organization?: {
    id: number;
    name: string;
  };
}

interface RatingsDisplayProps {
  aggregatedRating?: number;
  aggregatedRatingCount?: number;
  ageRatings?: string;
}

/**
 * RatingsDisplay component for showing IGDB ratings and age ratings.
 * Age ratings data is stored as JSON array with rating and organization fields.
 */
export function RatingsDisplay({
  aggregatedRating,
  aggregatedRatingCount,
  ageRatings,
}: RatingsDisplayProps) {
  const parseAgeRatings = (data: string | undefined): RatingsData[] => {
    if (!data) return [];
    try {
      return JSON.parse(data);
    } catch {
      return [];
    }
  };

  const ageRatingsList = parseAgeRatings(ageRatings);

  const hasRatings =
    (aggregatedRating !== undefined && aggregatedRating > 0) ||
    ageRatingsList.length > 0;

  if (!hasRatings) return null;

  // Map IGDB rating enum values to display names
  const ratingNames: Record<string, string> = {
    "3": "3+",
    "7": "7+",
    "12": "12+",
    "16": "16+",
    "18": "18+",
    "EC": "Early Childhood",
    "E": "Everyone",
    "E10": "Everyone 10+",
    "T": "Teen",
    "M": "Mature",
    "AO": "Adults Only",
    "RP": "Rating Pending",
  };

  return (
    <section className="flex flex-col gap-6 rounded-2xl border border-white/10 bg-stone-900/60 p-6">
      <h2 className="text-2xl font-semibold">Ratings</h2>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {aggregatedRating !== undefined && aggregatedRating > 0 && (
          <div className="flex flex-col gap-4 rounded-xl border border-white/10 bg-stone-800/50 p-4">
            <div className="flex items-end gap-3">
              <div className="text-4xl font-bold text-blue-400">
                {aggregatedRating.toFixed(1)}
              </div>
              <span className="text-sm text-stone-400">/ 100</span>
            </div>
            <p className="text-sm text-stone-300">
              Based on {aggregatedRatingCount || 0} critic {aggregatedRatingCount === 1 ? "review" : "reviews"}
            </p>
            {/* Visual rating bar */}
            <div className="h-2 w-full overflow-hidden rounded-full bg-stone-700">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all"
                style={{ width: `${Math.min(aggregatedRating, 100)}%` }}
              />
            </div>
          </div>
        )}

        {ageRatingsList.length > 0 && (
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-stone-400">
              Age Ratings
            </h3>
            <div className="flex flex-col gap-2">
              {ageRatingsList.map((rating, idx) => {
                const orgName = rating.organization?.name || "Unknown";
                const ratingDisplay = rating.rating ? ratingNames[rating.rating] || rating.rating : "N/A";
                
                return (
                  <div
                    key={`${orgName}-${idx}`}
                    className="flex items-center gap-2 rounded-lg border border-white/10 bg-stone-800/50 px-3 py-2"
                  >
                    <span className="text-xs font-bold text-amber-300">
                      {ratingDisplay}
                    </span>
                    <span className="flex-1 text-sm text-stone-300">
                      {orgName}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
