"use client";

import { useState, useMemo } from "react";
import { ChevronDown } from "lucide-react";
import { C, FONT_HEADING, FONT_MONO, FONT_BODY } from "@/app/lib/design-system";
import { CornerMarkers } from "@/app/lib/design-primitives";

interface DLC {
  id: number;
  title: string;
  releaseDate?: number;
  category?: string;
}

interface DlcExpansionSectionProps {
  dlcsAndExpansions?: string;
  relatedContent?: Array<{
    id: number;
    title: string;
    releaseDate?: number;
    category?: string;
  }>;
}

function badgeStyle(color: string): React.CSSProperties {
  return { background: color + "15", color, border: "1px solid " + color + "25" };
}

const CATEGORY_LABELS: Record<string, { label: string; style: React.CSSProperties }> = {
  dlc: { label: "DLC / Add-on", style: badgeStyle(C.amber) },
  expansion: { label: "Expansion", style: badgeStyle(C.accent) },
  standalone_expansion: { label: "Standalone Expansion", style: badgeStyle(C.accentDim) },
  mod: { label: "Mod", style: badgeStyle(C.red) },
  episode: { label: "Episode", style: badgeStyle(C.gold) },
  season: { label: "Season", style: badgeStyle(C.cyan) },
  pack: { label: "Content Pack", style: badgeStyle(C.goldDim) },
  bundle: { label: "Bundle", style: badgeStyle(C.amber) },
  remake: { label: "Remake", style: badgeStyle(C.green) },
  remaster: { label: "Remaster", style: badgeStyle(C.cyan) },
  expanded_game: { label: "Expanded Game", style: badgeStyle(C.accent) },
  port: { label: "Port", style: badgeStyle(C.gold) },
  fork: { label: "Fork", style: badgeStyle(C.red) },
  update: { label: "Update", style: badgeStyle(C.green) },
  related: { label: "Related", style: badgeStyle(C.textMuted) },
};

export function DlcExpansionSection({ dlcsAndExpansions, relatedContent }: DlcExpansionSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  const dlcList = useMemo(() => {
    if (relatedContent && relatedContent.length > 0) return relatedContent;
    if (!dlcsAndExpansions) return [];
    try {
      const parsed = JSON.parse(dlcsAndExpansions) as DLC[];
      return parsed;
    } catch (error) {
      console.error("[DlcExpansionSection] Failed to parse cached related content", error);
      return [];
    }
  }, [dlcsAndExpansions, relatedContent]);

  if (!dlcList || dlcList.length === 0) return null;

  const grouped = dlcList.reduce((acc, dlc) => {
    const category = dlc.category?.toLowerCase() || "dlc";
    if (!acc[category]) acc[category] = [];
    acc[category].push(dlc);
    return acc;
  }, {} as Record<string, DLC[]>);

  const totalItems = dlcList.length;

  return (
    <section
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        gap: 16,
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 2,
        padding: 24,
      }}
    >
      <CornerMarkers size={8} />
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "none",
          border: "none",
          padding: 0,
          cursor: "pointer",
          transition: "opacity 150ms",
        }}
      >
        <h2
          style={{
            fontFamily: FONT_HEADING,
            fontWeight: 200,
            fontSize: 20,
            color: C.text,
            margin: 0,
          }}
        >
          Related Content
        </h2>
        <div className="flex items-center gap-3">
          <span
            style={{
              fontFamily: FONT_MONO,
              fontSize: 11,
              color: C.textMuted,
            }}
          >
            {totalItems} {totalItems === 1 ? "item" : "items"}
          </span>
          <ChevronDown
            size={20}
            color={C.textMuted}
            style={{
              transition: "transform 200ms",
              transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
            }}
          />
        </div>
      </button>
      {isExpanded && (
        <div className="flex flex-col gap-6">
          {Object.entries(grouped).map(([category, items]) => {
            const info = CATEGORY_LABELS[category] || {
              label: category.charAt(0).toUpperCase() + category.slice(1),
              style: badgeStyle(C.textMuted),
            };
            return (
              <div key={category} className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <h3
                    style={{
                      fontFamily: FONT_MONO,
                      fontSize: 12,
                      fontWeight: 400,
                      color: C.textMuted,
                      margin: 0,
                    }}
                  >
                    {info.label}
                  </h3>
                  <span
                    style={{
                      ...info.style,
                      borderRadius: 1,
                      padding: "2px 8px",
                      fontFamily: FONT_MONO,
                      fontSize: 10,
                    }}
                  >
                    {items.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {items.map((dlc) => (
                    <div
                      key={dlc.id}
                      onMouseEnter={() => setHoveredId(dlc.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        background: C.bg,
                        border: `1px solid ${hoveredId === dlc.id ? C.borderLight : C.border}`,
                        borderRadius: 1,
                        padding: "12px 16px",
                        transition: "border-color 150ms",
                      }}
                    >
                      <div className="flex flex-1 flex-col gap-0.5" style={{ minWidth: 0 }}>
                        <span
                          style={{
                            fontFamily: FONT_BODY,
                            fontSize: 13,
                            fontWeight: 400,
                            color: C.text,
                          }}
                        >
                          {dlc.title}
                        </span>
                        {dlc.releaseDate && (
                          <span
                            style={{
                              fontFamily: FONT_MONO,
                              fontSize: 10,
                              color: C.textDim,
                            }}
                          >
                            {dlc.releaseDate}
                          </span>
                        )}
                      </div>
                      <div
                        style={{
                          ...info.style,
                          marginLeft: 16,
                          display: "flex",
                          alignItems: "center",
                          height: 28,
                          borderRadius: 1,
                          padding: "0 8px",
                          fontFamily: FONT_MONO,
                          fontSize: 10,
                        }}
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
