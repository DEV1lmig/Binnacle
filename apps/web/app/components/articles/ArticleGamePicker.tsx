"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Doc, Id } from "@/convex/_generated/dataModel";
import { Input } from "@/app/components/ui/input";
import { ImageWithFallback } from "@/app/components/figma/ImageWithFallback";
import { getStandardCoverUrl } from "@/lib/igdb-images";
import { X } from "lucide-react";
import { C, FONT_MONO, FONT_BODY } from "@/app/lib/design-system";

const maxGames = 10;

export type PickedGame = {
  _id: Id<"games">;
  title: string;
  coverUrl?: string;
  releaseYear?: number;
};

type ArticleGamePickerProps = {
  selected: PickedGame[];
  onChange: (games: PickedGame[]) => void;
};

export function ArticleGamePicker({ selected, onChange }: ArticleGamePickerProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => clearTimeout(timer);
  }, [query]);

  const results = useQuery(
    api.games.searchCached,
    debouncedQuery.length >= 2 ? { query: debouncedQuery, limit: 8 } : "skip"
  );

  const selectedIds = useMemo(() => new Set(selected.map((g) => String(g._id))), [selected]);

  const addGame = (game: Doc<"games">) => {
    if (selectedIds.has(String(game._id))) return;
    if (selected.length >= maxGames) return;

    onChange([
      ...selected,
      {
        _id: game._id,
        title: game.title,
        coverUrl: game.coverUrl ?? undefined,
        releaseYear: game.releaseYear ?? undefined,
      },
    ]);
    setQuery("");
    setDebouncedQuery("");
  };

  const removeGame = (gameId: Id<"games">) => {
    onChange(selected.filter((g) => String(g._id) !== String(gameId)));
  };

  return (
    <div className="space-y-3">
      {selected.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {selected.map((game) => (
            <span
              key={String(game._id)}
              className="inline-flex items-center gap-2 pl-1 pr-2 py-1 rounded-sm"
              style={{ backgroundColor: C.bgAlt, border: `1px solid ${C.border}` }}
            >
              <span className="w-6 h-8 rounded-sm overflow-hidden flex-shrink-0">
                <ImageWithFallback
                  src={getStandardCoverUrl(game.coverUrl) ?? ""}
                  alt={game.title}
                  className="w-full h-full object-cover"
                />
              </span>
              <span style={{ fontFamily: FONT_BODY, fontSize: 13, color: C.text }}>
                {game.title}
              </span>
              <button
                type="button"
                onClick={() => removeGame(game._id)}
                aria-label={`Remove ${game.title}`}
                style={{ color: C.textDim }}
                onMouseEnter={(e) => { e.currentTarget.style.color = C.red; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = C.textDim; }}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
        </div>
      ) : null}

      {selected.length < maxGames ? (
        <div className="relative">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search a game to link…"
            style={{
              backgroundColor: C.bgAlt,
              borderColor: C.border,
              color: C.text,
              borderRadius: 2,
            }}
          />
          {debouncedQuery.length >= 2 && results && results.length > 0 ? (
            <div
              className="absolute z-10 mt-1 w-full max-h-64 overflow-y-auto rounded-sm"
              style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}
            >
              {results
                .filter((game) => !selectedIds.has(String(game._id)))
                .map((game) => (
                  <button
                    key={String(game._id)}
                    type="button"
                    onClick={() => addGame(game)}
                    className="w-full flex items-center gap-3 px-3 py-2 text-left transition-colors"
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = C.bgAlt; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                  >
                    <span className="w-8 h-11 rounded-sm overflow-hidden flex-shrink-0">
                      <ImageWithFallback
                        src={getStandardCoverUrl(game.coverUrl) ?? ""}
                        alt={game.title}
                        className="w-full h-full object-cover"
                      />
                    </span>
                    <span>
                      <span
                        className="block"
                        style={{ fontFamily: FONT_BODY, fontSize: 14, color: C.text }}
                      >
                        {game.title}
                      </span>
                      {game.releaseYear ? (
                        <span
                          className="block"
                          style={{ fontFamily: FONT_MONO, fontSize: 11, color: C.textDim }}
                        >
                          {game.releaseYear}
                        </span>
                      ) : null}
                    </span>
                  </button>
                ))}
            </div>
          ) : null}
        </div>
      ) : (
        <p style={{ fontFamily: FONT_MONO, fontSize: 11, color: C.textDim }}>
          Maximum of {maxGames} games reached.
        </p>
      )}
    </div>
  );
}
