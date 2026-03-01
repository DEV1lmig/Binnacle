"use client";

import { C, FONT_HEADING, FONT_MONO } from "@/app/lib/design-system";
import { CornerMarkers } from "@/app/lib/design-primitives";

interface MetadataChipsProps {
  genres?: string;
  themes?: string;
  playerPerspectives?: string;
  gameModes?: string;
  platforms?: string;
}

interface ChipSection {
  label: string;
  items: string[];
  chipStyle: React.CSSProperties;
}

export function MetadataChips({
  genres,
  themes,
  playerPerspectives,
  gameModes,
  platforms,
}: MetadataChipsProps) {
  const parseChips = (data: string | undefined): string[] => {
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

  const genreList = parseChips(genres);
  const themeList = parseChips(themes);
  const perspectiveList = parseChips(playerPerspectives);
  const modeList = parseChips(gameModes);
  const platformList = parseChips(platforms);

  const hasData =
    genreList.length > 0 ||
    themeList.length > 0 ||
    perspectiveList.length > 0 ||
    modeList.length > 0 ||
    platformList.length > 0;

  if (!hasData) return null;

  const sections: ChipSection[] = [
    { label: "Genres", items: genreList, chipStyle: { background: C.gold + "15", color: C.gold, border: "1px solid " + C.gold + "30" } },
    { label: "Themes", items: themeList, chipStyle: { background: C.accent + "15", color: C.accent, border: "1px solid " + C.accent + "30" } },
    { label: "Perspectives", items: perspectiveList, chipStyle: { background: C.cyan + "15", color: C.cyan, border: "1px solid " + C.cyan + "30" } },
    { label: "Modes", items: modeList, chipStyle: { background: C.red + "15", color: C.red, border: "1px solid " + C.red + "30" } },
    { label: "Platforms", items: platformList, chipStyle: { background: C.green + "15", color: C.green, border: "1px solid " + C.green + "30" } },
  ];

  return (
    <section
      style={{
        position: "relative",
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 2,
        padding: 24,
      }}
      className="flex flex-col gap-6"
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
        About This Game
      </h2>
      {sections.map((section, sectionIdx) =>
        section.items.length > 0 && (
          <div key={`${section.label}-${sectionIdx}`} className="flex flex-col gap-3">
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
              {section.label}
            </h3>
            <div className="flex flex-wrap gap-2">
              {section.items.map((item, itemIdx) => (
                <span
                  key={`${item}-${itemIdx}`}
                  style={{
                    ...section.chipStyle,
                    borderRadius: 1,
                    padding: "4px 10px",
                    fontFamily: FONT_MONO,
                    fontSize: 11,
                    fontWeight: 400,
                    letterSpacing: "0.04em",
                  }}
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        )
      )}
    </section>
  );
}
