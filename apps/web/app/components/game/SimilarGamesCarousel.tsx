"use client";

import { useState } from "react";
import { C, FONT_HEADING, FONT_MONO, FONT_BODY } from "@/app/lib/design-system";
import { CornerMarkers } from "@/app/lib/design-primitives";
import { Gamepad2, ChevronRight } from "lucide-react";

interface SimilarGamesCarouselProps {
  similarGames?: string;
}

export function SimilarGamesCarousel({ similarGames }: SimilarGamesCarouselProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const parseSimilarGames = (data: string | undefined): string[] => {
    if (!data) return [];
    try {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => (typeof item === "string" ? item : item.name)).filter(Boolean);
      }
      return [];
    } catch {
      return [];
    }
  };

  const gamesList = parseSimilarGames(similarGames);
  if (gamesList.length === 0) return null;

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
        Similar Games
      </h2>
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {gamesList.slice(0, 6).map((gameName, idx) => (
            <div
              key={`${gameName}-${idx}`}
              className="flex items-center gap-3"
              style={{
                background: C.bgAlt,
                border: `1px solid ${hoveredIdx === idx ? C.gold : C.border}`,
                borderRadius: 1,
                padding: "12px 16px",
                cursor: "pointer",
                transition: "border-color 0.2s, box-shadow 0.2s",
                boxShadow: hoveredIdx === idx ? `0 0 12px ${C.bloom}` : "none",
              }}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              <Gamepad2 className="flex-shrink-0" style={{ color: C.gold, width: 16, height: 16 }} />
              <span
                className="flex-1"
                style={{
                  fontFamily: FONT_BODY,
                  fontSize: 13,
                  fontWeight: 400,
                  color: C.text,
                }}
              >
                {gameName}
              </span>
              <ChevronRight style={{ color: C.textDim, width: 16, height: 16 }} />
            </div>
          ))}
        </div>
        {gamesList.length > 6 && (
          <p
            style={{
              fontFamily: FONT_MONO,
              fontSize: 10,
              color: C.textDim,
              margin: 0,
            }}
          >
            +{gamesList.length - 6} more recommendations
          </p>
        )}
      </div>
    </section>
  );
}
