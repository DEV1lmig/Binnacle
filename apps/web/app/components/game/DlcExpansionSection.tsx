"use client";

import { useMemo } from "react";
import { ChevronDown } from "lucide-react";

interface DLC {
  id: number;
  title: string;
  releaseDate?: number;
  category?: string;
}

interface DlcExpansionSectionProps {
  dlcsAndExpansions?: string;
  relatedContent?: Array<{ id: number; title: string; releaseDate?: number; category?: string }>;
}

/** Tone per category, drawn from the three brand families. */
const CATEGORY: Record<string, { label: string; tone?: "gold" | "orange" | "cobalt" }> = {
  dlc: { label: "DLC / Add-on", tone: "gold" },
  expansion: { label: "Expansion", tone: "orange" },
  standalone_expansion: { label: "Standalone expansion", tone: "orange" },
  mod: { label: "Mod" },
  episode: { label: "Episode", tone: "cobalt" },
  season: { label: "Season", tone: "cobalt" },
  pack: { label: "Content pack", tone: "gold" },
  bundle: { label: "Bundle", tone: "gold" },
  remake: { label: "Remake", tone: "orange" },
  remaster: { label: "Remaster", tone: "orange" },
  expanded_game: { label: "Expanded game", tone: "orange" },
  port: { label: "Port", tone: "cobalt" },
  fork: { label: "Fork" },
  update: { label: "Update" },
  related: { label: "Related" },
};

/** Expansions, DLC and related releases, grouped by kind. Collapsed by default. */
export function DlcExpansionSection({ dlcsAndExpansions, relatedContent }: DlcExpansionSectionProps) {
  const dlcList = useMemo<DLC[]>(() => {
    if (relatedContent && relatedContent.length > 0) return relatedContent;
    if (!dlcsAndExpansions) return [];
    try {
      return JSON.parse(dlcsAndExpansions) as DLC[];
    } catch (error) {
      console.error("[DlcExpansionSection] Failed to parse cached related content", error);
      return [];
    }
  }, [dlcsAndExpansions, relatedContent]);

  if (dlcList.length === 0) return null;

  const grouped = dlcList.reduce((acc, dlc) => {
    const key = dlc.category?.toLowerCase() || "dlc";
    (acc[key] ??= []).push(dlc);
    return acc;
  }, {} as Record<string, DLC[]>);

  return (
    <details className="pk-panel group">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
        <h3 className="!mb-0">Related releases</h3>
        <span className="flex items-center gap-2 text-sm text-textDim">
          {dlcList.length}
          <ChevronDown size={18} className="transition-transform group-open:rotate-180" />
        </span>
      </summary>

      <div className="mt-5 space-y-5">
        {Object.entries(grouped).map(([key, items]) => {
          const info = CATEGORY[key] ?? { label: key.charAt(0).toUpperCase() + key.slice(1) };
          return (
            <div key={key}>
              <span className="pk-eyebrow">{info.label} <b>{items.length}</b></span>
              <ul className="mt-2 space-y-1.5">
                {items.map(dlc => (
                  <li key={dlc.id} className="flex items-baseline justify-between gap-3 rounded-lg bg-bgAlt px-3 py-2">
                    <span className="text-sm font-medium">{dlc.title}</span>
                    {dlc.releaseDate ? <span className="shrink-0 text-xs text-textDim tabular-nums">{dlc.releaseDate}</span> : null}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </details>
  );
}
