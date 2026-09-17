import type { Metadata } from "next";
import { DM_Sans, Outfit } from "next/font/google";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { PlaychiveLanding } from "./components/landing/PlaychiveLanding";
import type { LandingGame } from "./components/landing/PlaychiveScene";

const display = Outfit({ subsets: ["latin"], weight: ["700", "800"], variable: "--playchive-display" });
const body = DM_Sans({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--playchive-body" });

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Playchive | Your games. Your story.",
  description: "Organize your gaming backlog, keep track of what you play, and share the games that stay with you.",
  icons: { icon: "/brand/playchive-symbol.svg" },
};

type GameList = { games?: { title: string; coverUrl?: string | null }[] };

// Real covers for the 3D cases: two trending games, a top-rated classic, then extras for the shelf.
async function landingGames(): Promise<LandingGame[]> {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) return [];
  const client = new ConvexHttpClient(url);
  const timeout = new Promise<null>(resolve => setTimeout(() => resolve(null), 2500));
  try {
    const result = await Promise.race([
      Promise.all([
        client.query(api.games.getTrendingGames, { limit: 8 }) as Promise<GameList>,
        client.query(api.games.getTopRatedGames, { limit: 8 }) as Promise<GameList>,
      ]),
      timeout,
    ]);
    if (!result) return [];
    const [trending, topRated] = result.map(list => (list.games ?? []).filter(game => game.coverUrl));
    // Chapter covers first (two trending, one classic), then the rest of the shelf.
    const order = [trending[0], trending[1], topRated[0], ...Array.from({ length: 8 }, (_, i) => [trending[i + 2], topRated[i + 1]]).flat()];
    const seen = new Set<string>();
    return order.flatMap(game => {
      if (!game?.coverUrl || seen.has(game.coverUrl)) return [];
      seen.add(game.coverUrl);
      const cover = game.coverUrl.replace("/t_cover_big/", "/t_cover_big_2x/");
      return [{ title: game.title, cover: `/_next/image?url=${encodeURIComponent(cover)}&w=640&q=75` }];
    }).slice(0, 11);
  } catch {
    return [];
  }
}

export default async function LandingPage() {
  const games = await landingGames();
  return <PlaychiveLanding fontClassName={`${display.variable} ${body.variable}`} games={games} />;
}
