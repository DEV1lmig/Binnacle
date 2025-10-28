"use client";

interface MetadataChipsProps {
  genres?: string;
  themes?: string;
  playerPerspectives?: string;
  gameModes?: string;
  platforms?: string;
}

/**
 * MetadataChips component for displaying game taxonomy data.
 * Data is stored as JSON arrays of {id, name} objects.
 */
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
      // Handle both array of objects {id, name} and array of strings
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

  interface ChipSection {
    label: string;
    items: string[];
    color: string;
  }

  const sections: ChipSection[] = [
    { label: "Genres", items: genreList, color: "bg-blue-500/20 text-blue-300" },
    { label: "Themes", items: themeList, color: "bg-purple-500/20 text-purple-300" },
    {
      label: "Perspectives",
      items: perspectiveList,
      color: "bg-indigo-500/20 text-indigo-300",
    },
    { label: "Modes", items: modeList, color: "bg-pink-500/20 text-pink-300" },
    { label: "Platforms", items: platformList, color: "bg-emerald-500/20 text-emerald-300" },
  ];

  return (
    <section className="flex flex-col gap-6 rounded-2xl border border-white/10 bg-stone-900/60 p-6">
      <h2 className="text-2xl font-semibold">About This Game</h2>

      {sections.map((section, sectionIdx) =>
        section.items.length > 0 && (
          <div key={`${section.label}-${sectionIdx}`} className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-stone-400">
              {section.label}
            </h3>
            <div className="flex flex-wrap gap-2">
              {section.items.map((item, itemIdx) => (
                <span
                  key={`${item}-${itemIdx}`}
                  className={`rounded-full px-3 py-1 text-sm font-medium ${section.color}`}
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
