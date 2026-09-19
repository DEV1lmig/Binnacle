"use client";

import { ArrowUpRight, BookOpen, Globe, MessageCircle, Play, Smartphone, Store, type LucideIcon } from "lucide-react";

type Website = { url: string; category: number };

// IGDB website ids, in the order they are worth showing
const SITES: Record<number, { label: string; icon: LucideIcon; order: number }> = {
  1: { label: "Official site", icon: Globe, order: 0 },
  13: { label: "Steam", icon: Store, order: 1 },
  17: { label: "GOG", icon: Store, order: 1 },
  16: { label: "Epic Games", icon: Store, order: 1 },
  15: { label: "itch.io", icon: Store, order: 1 },
  10: { label: "App Store (iPhone)", icon: Smartphone, order: 2 },
  11: { label: "App Store (iPad)", icon: Smartphone, order: 2 },
  12: { label: "Google Play", icon: Smartphone, order: 2 },
  3: { label: "Wikipedia", icon: BookOpen, order: 3 },
  2: { label: "Fan wiki", icon: BookOpen, order: 3 },
  9: { label: "YouTube", icon: Play, order: 4 },
  6: { label: "Twitch", icon: Play, order: 4 },
  18: { label: "Discord", icon: MessageCircle, order: 5 },
  14: { label: "Reddit", icon: MessageCircle, order: 5 },
  5: { label: "X / Twitter", icon: MessageCircle, order: 5 },
  8: { label: "Instagram", icon: MessageCircle, order: 5 },
  4: { label: "Facebook", icon: MessageCircle, order: 5 },
};

function parseWebsites(raw: string | undefined): Array<Website & { host: string }> {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((site: Partial<Website>) => {
      try {
        const url = new URL(String(site.url));
        if (url.protocol !== "https:" && url.protocol !== "http:") return [];
        return [{ url: url.href, category: Number(site.category) || 0, host: url.hostname.replace(/^www\./, "") }];
      } catch {
        return [];
      }
    });
  } catch {
    return [];
  }
}

/**
 * Places worth visiting for a game: official site, stores, wikis, communities.
 * `websites` is the JSON string stored on the game ([{ url, category }]).
 */
export function ExternalLinks({ websites }: { websites?: string }) {
  const links = parseWebsites(websites).sort(
    (a, b) => (SITES[a.category]?.order ?? 9) - (SITES[b.category]?.order ?? 9)
  );
  if (links.length === 0) return null;

  return (
    <section className="pk-panel">
      <h3>Go further</h3>
      <ul className="-mx-2 space-y-0.5">
        {links.map((link) => {
          const site = SITES[link.category];
          const Icon = site?.icon ?? Globe;
          return (
            <li key={link.url}>
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-3 rounded-lg px-2 py-2 text-sm transition-colors hover:bg-white/5"
              >
                <Icon size={16} className="shrink-0 text-textDim" />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-white">{site?.label ?? link.host}</span>
                  {site && <span className="block truncate text-xs text-textDim">{link.host}</span>}
                </span>
                <ArrowUpRight size={15} className="shrink-0 text-textDim transition-colors group-hover:text-[#FFC400]" />
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
