"use client";

import {
  Globe,
  BookOpen,
  Tv,
  Camera,
  Play,
  Smartphone,
  Tablet,
  Gamepad2,
  MessageCircle,
  ExternalLink,
  Link as LinkIcon,
} from "lucide-react";
import { C, FONT_HEADING, FONT_MONO, FONT_BODY } from "@/app/lib/design-system";
import { CornerMarkers } from "@/app/lib/design-primitives";
import type { LucideIcon } from "lucide-react";

interface WebsiteData {
  url: string;
  category: number;
}

interface ExternalLinksProps {
  websites?: string;
}

const categoryNames: Record<number, { name: string; icon: LucideIcon }> = {
  1: { name: "Official Site", icon: Globe },
  2: { name: "Wikia", icon: BookOpen },
  3: { name: "Wikipedia", icon: BookOpen },
  4: { name: "Facebook", icon: Globe },
  5: { name: "Twitter", icon: Globe },
  6: { name: "Twitch", icon: Tv },
  8: { name: "Instagram", icon: Camera },
  9: { name: "Youtube", icon: Play },
  10: { name: "iPhone", icon: Smartphone },
  11: { name: "iPad", icon: Tablet },
  12: { name: "Android", icon: Smartphone },
  13: { name: "Steam", icon: Gamepad2 },
  14: { name: "Reddit", icon: MessageCircle },
  15: { name: "Itch", icon: Gamepad2 },
  16: { name: "Epic Games", icon: Gamepad2 },
  17: { name: "GOG", icon: Gamepad2 },
  18: { name: "Discord", icon: MessageCircle },
};

export function ExternalLinks({ websites }: ExternalLinksProps) {
  const parseWebsites = (data: string | undefined): WebsiteData[] => {
    if (!data) return [];
    try {
      return JSON.parse(data);
    } catch {
      return [];
    }
  };

  const websiteList = parseWebsites(websites);

  if (websiteList.length === 0) return null;

  return (
    <section
      style={{
        position: "relative",
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 2,
        padding: 24,
        display: "flex",
        flexDirection: "column",
        gap: 24,
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
        Links
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {websiteList.map((site, idx) => {
          const info = categoryNames[site.category] || { name: "Link", icon: LinkIcon };
          const Icon = info.icon;
          const domain = new URL(site.url).hostname.replace("www.", "");
          return (
            <a
              key={idx}
              href={site.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3"
              style={{
                background: C.bgAlt,
                border: `1px solid ${C.border}`,
                borderRadius: 1,
                padding: "12px 16px",
                textDecoration: "none",
                transition: "border-color 0.2s, box-shadow 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = C.gold;
                e.currentTarget.style.boxShadow = `0 0 12px ${C.bloom}`;
                const arrow = e.currentTarget.querySelector("[data-arrow]") as HTMLElement | null;
                if (arrow) arrow.style.color = C.gold;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = C.border;
                e.currentTarget.style.boxShadow = "none";
                const arrow = e.currentTarget.querySelector("[data-arrow]") as HTMLElement | null;
                if (arrow) arrow.style.color = C.textDim;
              }}
            >
              <Icon size={18} style={{ color: C.textMuted, flexShrink: 0 }} />
              <div className="flex flex-1 flex-col gap-0.5" style={{ minWidth: 0 }}>
                <span
                  style={{
                    fontFamily: FONT_BODY,
                    fontSize: 13,
                    fontWeight: 400,
                    color: C.text,
                  }}
                >
                  {info.name}
                </span>
                <span
                  className="truncate"
                  style={{
                    fontFamily: FONT_MONO,
                    fontSize: 10,
                    color: C.textMuted,
                  }}
                >
                  {domain}
                </span>
              </div>
              <ExternalLink
                size={14}
                data-arrow=""
                style={{ color: C.textDim, flexShrink: 0, transition: "color 0.2s" }}
              />
            </a>
          );
        })}
      </div>
    </section>
  );
}
