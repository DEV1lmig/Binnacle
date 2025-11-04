"use client";

import { useState, useEffect, useMemo } from "react";

interface DLC {
  id: number;
  title: string;
  releaseDate?: number;
  category?: string;
}

interface DlcExpansionSectionProps {
  dlcsAndExpansions?: string;
  gameTitle: string;
  relatedContent?: Array<{
    id: number;
    title: string;
    releaseDate?: number;
    category?: string;
  }>;
}

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  dlc: { label: "DLC / Add-on", color: "bg-amber-500/20 text-amber-300" },
  expansion: { label: "Expansion", color: "bg-purple-500/20 text-purple-300" },
  standalone_expansion: { label: "Standalone Expansion", color: "bg-violet-500/20 text-violet-300" },
  mod: { label: "Mod", color: "bg-pink-500/20 text-pink-300" },
  episode: { label: "Episode", color: "bg-blue-500/20 text-blue-300" },
  season: { label: "Season", color: "bg-cyan-500/20 text-cyan-300" },
  pack: { label: "Content Pack", color: "bg-indigo-500/20 text-indigo-300" },
  bundle: { label: "Bundle", color: "bg-orange-500/20 text-orange-300" },
  remake: { label: "Remake", color: "bg-emerald-500/20 text-emerald-300" },
  remaster: { label: "Remaster", color: "bg-teal-500/20 text-teal-300" },
  expanded_game: { label: "Expanded Game", color: "bg-fuchsia-500/20 text-fuchsia-300" },
  port: { label: "Port", color: "bg-sky-500/20 text-sky-300" },
  fork: { label: "Fork", color: "bg-rose-500/20 text-rose-300" },
  update: { label: "Update", color: "bg-lime-500/20 text-lime-300" },
  related: { label: "Related", color: "bg-stone-800/60 text-stone-300" },
};

/**
 * Displays DLCs, expansions, mods and related content for a game in categorized sections.
 */
export function DlcExpansionSection({ dlcsAndExpansions, gameTitle, relatedContent }: DlcExpansionSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Memoize the parsed DLC list to avoid re-parsing on every render
  const dlcList = useMemo(() => {
    // First, try to use the relatedContent prop (from action result)
    if (relatedContent && relatedContent.length > 0) {
      return relatedContent;
    }

    // Otherwise, try to parse the dlcsAndExpansions JSON string (from database)
    if (!dlcsAndExpansions) {
      return [];
    }
    try {
      const parsed = JSON.parse(dlcsAndExpansions) as DLC[];
      return parsed;
    } catch (error) {
      console.error("[DlcExpansionSection] Failed to parse cached related content", error);
      return [];
    }
  }, [dlcsAndExpansions, relatedContent]);

  // If there's no data, don't render
  if (!dlcList || dlcList.length === 0) {
    return null;
  }

  // Group by category
  const grouped = dlcList.reduce(
    (acc, dlc) => {
      const category = dlc.category?.toLowerCase() || "dlc";
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(dlc);
      return acc;
    },
    {} as Record<string, DLC[]>
  );

  const totalItems = dlcList.length;

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-stone-900/60 p-6">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between transition hover:opacity-80"
      >
        <h2 className="text-2xl font-semibold">Related Content</h2>
        <div className="flex items-center gap-3">
          <span className="text-sm text-stone-400">
            {totalItems} {totalItems === 1 ? "item" : "items"}
          </span>
          <svg
            className={`h-6 w-6 text-stone-400 transition ${isExpanded ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </button>

      {isExpanded && (
        <div className="flex flex-col gap-6">
          {Object.entries(grouped).map(([category, items]) => {
            const info = CATEGORY_LABELS[category] || {
              label: category.charAt(0).toUpperCase() + category.slice(1),
              color: "bg-stone-800/60 text-stone-300",
            };

            return (
              <div key={category} className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-stone-300">
                    {info.label}
                  </h3>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${info.color}`}>
                    {items.length}
                  </span>
                </div>

                <div className="space-y-2">
                  {items.map((dlc) => (
                    <div
                      key={dlc.id}
                      className="flex items-center justify-between rounded-lg border border-white/5 bg-stone-950/50 px-4 py-3 transition hover:border-white/10 hover:bg-stone-950/80"
                    >
                      <div className="flex flex-1 flex-col gap-0.5">
                        <span className="font-medium text-white">{dlc.title}</span>
                        {dlc.releaseDate && (
                          <span className="text-xs text-stone-500">{dlc.releaseDate}</span>
                        )}
                      </div>
                      <div
                        className={`ml-4 flex h-7 items-center rounded-lg px-2 text-xs font-semibold ${info.color}`}
                      >
                        {info.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
