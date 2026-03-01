"use client";

import { C, FONT_HEADING, FONT_MONO, FONT_BODY } from "@/app/lib/design-system";
import { CornerMarkers } from "@/app/lib/design-primitives";

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

  const ratingNames: Record<string, string> = {
    "3": "3+",
    "7": "7+",
    "12": "12+",
    "16": "16+",
    "18": "18+",
    EC: "Early Childhood",
    E: "Everyone",
    E10: "Everyone 10+",
    T: "Teen",
    M: "Mature",
    AO: "Adults Only",
    RP: "Rating Pending",
  };

  return (
    <section
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        gap: 24,
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 2,
        padding: 24,
      }}
    >
      <CornerMarkers size={8} />
      <h2
        style={{
          fontFamily: FONT_HEADING,
          fontWeight: 200,
          fontSize: 20,
          color: C.text,
          margin: 0,
        }}
      >
        Ratings
      </h2>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {aggregatedRating !== undefined && aggregatedRating > 0 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 16,
              background: C.bgAlt,
              border: `1px solid ${C.border}`,
              borderRadius: 2,
              padding: 16,
            }}
          >
            <div className="flex items-end gap-3">
              <div
                style={{
                  fontFamily: FONT_HEADING,
                  fontWeight: 200,
                  fontSize: 36,
                  color: C.gold,
                  lineHeight: 1,
                }}
              >
                {aggregatedRating.toFixed(1)}
              </div>
              <span
                style={{
                  fontFamily: FONT_MONO,
                  fontSize: 11,
                  color: C.textMuted,
                }}
              >
                / 100
              </span>
            </div>
            <p
              style={{
                fontFamily: FONT_BODY,
                fontSize: 13,
                fontWeight: 300,
                color: C.textMuted,
                margin: 0,
              }}
            >
              Based on {aggregatedRatingCount || 0} critic{" "}
              {aggregatedRatingCount === 1 ? "review" : "reviews"}
            </p>
            <div
              style={{
                height: 3,
                width: "100%",
                overflow: "hidden",
                borderRadius: 1,
                background: C.bgAlt,
              }}
            >
              <div
                style={{
                  height: "100%",
                  borderRadius: 1,
                  background: `linear-gradient(to right, ${C.goldDim}, ${C.gold})`,
                  width: `${Math.min(aggregatedRating, 100)}%`,
                  transition: "width 0.3s ease",
                }}
              />
            </div>
          </div>
        )}
        {ageRatingsList.length > 0 && (
          <div className="flex flex-col gap-3">
            <h3
              style={{
                fontFamily: FONT_MONO,
                fontSize: 10,
                fontWeight: 400,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: C.textMuted,
                margin: 0,
              }}
            >
              Age Ratings
            </h3>
            <div className="flex flex-col gap-2">
              {ageRatingsList.map((rating, idx) => {
                const orgName = rating.organization?.name || "Unknown";
                const ratingDisplay = rating.rating
                  ? ratingNames[rating.rating] || rating.rating
                  : "N/A";
                return (
                  <div
                    key={`${orgName}-${idx}`}
                    className="flex items-center gap-2"
                    style={{
                      background: C.bgAlt,
                      border: `1px solid ${C.border}`,
                      borderRadius: 1,
                      padding: "8px 12px",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: FONT_MONO,
                        fontSize: 11,
                        fontWeight: 500,
                        color: C.amber,
                      }}
                    >
                      {ratingDisplay}
                    </span>
                    <span
                      style={{
                        flex: 1,
                        fontFamily: FONT_BODY,
                        fontSize: 13,
                        color: C.textMuted,
                      }}
                    >
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
