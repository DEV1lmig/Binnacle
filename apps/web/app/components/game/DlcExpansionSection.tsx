"use client";

import { useState } from "react";

interface DLC {
  id: number;
  title: string;
  releaseDate?: number;
}

interface DlcExpansionSectionProps {
  dlcsAndExpansions?: string;
  gameTitle: string;
}

/**
 * Displays DLCs and expansions for a game in an expandable section.
 */
export function DlcExpansionSection({ dlcsAndExpansions, gameTitle }: DlcExpansionSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Parse the dlcsAndExpansions JSON string
  let dlcList: DLC[] = [];
  if (dlcsAndExpansions) {
    try {
      dlcList = JSON.parse(dlcsAndExpansions);
    } catch (error) {
      console.error("Failed to parse DLCs:", error);
    }
  }

  if (!dlcList || dlcList.length === 0) {
    return null;
  }

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-stone-900/60 p-6">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between transition hover:opacity-80"
      >
        <h2 className="text-2xl font-semibold">DLCs & Expansions</h2>
        <svg
          className={`h-6 w-6 text-stone-400 transition ${isExpanded ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </button>

      {isExpanded && (
        <div className="flex flex-col gap-2">
          <div className="text-sm text-stone-400">
            {dlcList.length} {dlcList.length === 1 ? "item" : "items"}
          </div>
          <div className="max-h-96 space-y-2 overflow-y-auto">
            {dlcList.map((dlc) => (
              <div
                key={dlc.id}
                className="flex items-center justify-between rounded-lg border border-white/5 bg-stone-950/50 px-4 py-3 transition hover:border-white/10"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium text-white">{dlc.title}</span>
                  {dlc.releaseDate && (
                    <span className="text-xs text-stone-500">{dlc.releaseDate}</span>
                  )}
                </div>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-800/60 text-xs font-semibold text-stone-400">
                  DLC
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
