"use client";

interface WebsiteData {
  url: string;
  category: number;
}

interface ExternalLinksProps {
  websites?: string;
}

/**
 * ExternalLinks component for displaying game official websites and social links.
 * Data is stored as JSON array with url and category fields (IGDB category enum).
 */
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

  // IGDB website category mapping
  const categoryNames: Record<number, { name: string; icon: string }> = {
    1: { name: "Official Site", icon: "🌐" },
    2: { name: "Wikia", icon: "📖" },
    3: { name: "Wikipedia", icon: "📚" },
    4: { name: "Facebook", icon: "f" },
    5: { name: "Twitter", icon: "𝕏" },
    6: { name: "Twitch", icon: "▶" },
    8: { name: "Instagram", icon: "📷" },
    9: { name: "Youtube", icon: "▶" },
    10: { name: "iPhone", icon: "🍎" },
    11: { name: "iPad", icon: "🍎" },
    12: { name: "Android", icon: "🤖" },
    13: { name: "Steam", icon: "🎮" },
    14: { name: "Reddit", icon: "🔴" },
    15: { name: "Itch", icon: "🎮" },
    16: { name: "Epic Games", icon: "🎮" },
    17: { name: "GOG", icon: "🎮" },
    18: { name: "Discord", icon: "💬" },
  };

  return (
    <section className="flex flex-col gap-6 rounded-2xl border border-white/10 bg-stone-900/60 p-6">
      <h2 className="text-2xl font-semibold">Links</h2>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {websiteList.map((site, idx) => {
          const categoryInfo = categoryNames[site.category] || {
            name: "Link",
            icon: "🔗",
          };
          const domain = new URL(site.url).hostname.replace("www.", "");

          return (
            <a
              key={idx}
              href={site.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-lg border border-white/10 bg-stone-800/50 px-4 py-3 transition hover:border-blue-400/50 hover:bg-stone-800/80"
            >
              <span className="text-lg">{categoryInfo.icon}</span>
              <div className="flex flex-1 flex-col gap-0.5">
                <span className="text-sm font-semibold text-white">
                  {categoryInfo.name}
                </span>
                <span className="truncate text-xs text-stone-400">{domain}</span>
              </div>
              <svg
                className="h-4 w-4 text-stone-400 transition group-hover:text-blue-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </a>
          );
        })}
      </div>
    </section>
  );
}
