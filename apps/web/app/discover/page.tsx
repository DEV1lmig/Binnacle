"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentUser } from "@/app/context/CurrentUserContext";
import { AdSpace } from "@/app/components/AdSpace";
import { EmptyState } from "@/app/components/EmptyState";
import { Input } from "@/app/components/ui/input";
import { Skeleton } from "@/app/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
import { Search, Loader2, X, ArrowRight, Compass } from "lucide-react";
import { Cover, OpenCaseLink, PageHero, Pill, SectionHeading } from "@/app/components/playchive";

type DiscoverGame = {
  _id?: string | { toString(): string };
  convexId?: string | { toString(): string };
  igdbId?: number;
  title?: string | null;
  coverUrl?: string | null;
  cover?: string | null;
  releaseYear?: number | null;
  platforms?: string | null;
  aggregatedRating?: number | null;
};

const resolveId = (value: DiscoverGame["_id"]) => (value === undefined || value === null ? undefined : typeof value === "string" ? value : value.toString());
const gameHref = (game: DiscoverGame, index: number) => `/game/${resolveId(game.convexId) ?? resolveId(game._id) ?? (typeof game.igdbId === "number" ? `igdb-${game.igdbId}` : index)}`;

const GENRES = ["RPG", "Action", "Adventure", "Strategy", "Racing", "Shooter", "Fighting", "Puzzle", "Platformer", "Simulation", "Indie", "Horror"];

function GameTile({ game, index, sizes = "180px" }: { game: DiscoverGame; index: number; sizes?: string }) {
  const title = game.title ?? "Untitled";
  return (
    <OpenCaseLink href={gameHref(game, index)} gameId={resolveId(game.convexId) ?? resolveId(game._id)} coverUrl={game.coverUrl ?? game.cover} title={title} className="pk-lib" aria-label={title}>
      <Cover src={game.coverUrl ?? game.cover} title={title} sizes={sizes} gameId={resolveId(game.convexId) ?? resolveId(game._id)} />
      <p className="pk-lib-title">{title}</p>
      <div className="pk-lib-meta"><span>{game.releaseYear ?? ""}</span>{game.aggregatedRating ? <span>{Math.round(game.aggregatedRating)}%</span> : null}</div>
    </OpenCaseLink>
  );
}

function Shelf({ eyebrow, title, games, loading, action }: { eyebrow: ReactNode; title: string; games: DiscoverGame[]; loading: boolean; action?: { label: string; href: string } }) {
  return (
    <section className="pt-12">
      <SectionHeading eyebrow={eyebrow} title={title} action={action} />
      {loading ? (
        <div className="pk-shelf">{[...Array(7)].map((_, i) => <Skeleton key={i} className="aspect-[2/3] rounded-xl bg-surface" />)}</div>
      ) : games.length === 0 ? (
        <p className="text-sm text-textMuted">Nothing here right now.</p>
      ) : (
        <div className="pk-shelf">{games.map((game, i) => <GameTile key={resolveId(game._id) ?? game.igdbId ?? i} game={game} index={i} sizes="148px" />)}</div>
      )}
    </section>
  );
}

export default function DiscoverPage() {
  const router = useRouter();
  const { currentUser } = useCurrentUser();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DiscoverGame[]>([]);
  const [searching, setSearching] = useState(false);
  const search = useAction(api.igdb.searchOptimizedWithFallback);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const result = await search({ query: query.trim(), limit: 24, minCachedResults: 10 });
        if (!cancelled) setResults(Array.isArray(result?.results) ? (result.results as DiscoverGame[]) : []);
      } catch (error) {
        console.error("Search failed:", error);
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 450);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [query, search]);

  const active = query.trim().length > 0;
  const people = useQuery(api.users.search, active ? "skip" : { query: "", limit: 8 });
  const trending = useQuery(api.games.getTrendingGames, active ? "skip" : { limit: 12 });
  const topRated = useQuery(api.games.getTopRatedGames, active ? "skip" : { limit: 12 });
  const fresh = useQuery(api.games.getNewReleases, active ? "skip" : { limit: 12 });
  const users = (people ?? []).filter(u => !currentUser || u._id !== currentUser._id);
  const list = (data: unknown) => ((data as { games?: DiscoverGame[] } | undefined)?.games ?? []);

  return (
    <div className="min-h-screen pb-24 md:pb-12 bg-bg">
      <PageHero
        tone="night"
        eyebrow="Discover"
        title={<>Find your <em>next</em> favorite.</>}
        lede="Search the whole catalog, or browse what’s trending, what players rate highest and what just came out."
        strip={
          <div className="w-full">
            <div className="relative max-w-2xl">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 pointer-events-none text-textDim" size={20} aria-hidden="true" />
              <Input type="search" autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Search games, series, studios…" aria-label="Search games" className="h-14 rounded-full pl-14 pr-14 text-base bg-surface border-border" />
              {searching ? <Loader2 className="absolute right-5 top-1/2 -translate-y-1/2 animate-spin text-gold" size={20} aria-label="Searching" />
                : query ? <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-textMuted hover:bg-bgAlt hover:text-white"><X size={18} /></button> : null}
            </div>
            <div className="mt-4 flex flex-wrap gap-2" aria-label="Browse by genre">
              {GENRES.map(genre => <button key={genre} type="button" className="pk-tag hover:border-gold hover:text-white" data-tone={query.toLowerCase() === genre.toLowerCase() ? "gold" : undefined} onClick={() => setQuery(genre)}>#{genre}</button>)}
            </div>
          </div>
        }
      />

      <div className="max-w-[1400px] mx-auto px-5 md:px-8">
        {active ? (
          <section className="pt-10">
            <SectionHeading eyebrow={<>Results <b>{results.length}</b></>} title={`“${query.trim()}”`} action={{ label: "Clear", onClick: () => setQuery("") }} />
            {searching && results.length === 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-8 gap-4">{[...Array(8)].map((_, i) => <Skeleton key={i} className="aspect-[2/3] rounded-xl bg-surface" />)}</div>
            ) : results.length === 0 ? (
              <EmptyState icon={<Compass size={36} />} title="No games found" description="Try a different spelling, or the name the game shipped under." actionLabel="Clear search" onAction={() => setQuery("")} />
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-8 gap-x-4 gap-y-7">{results.map((game, i) => <GameTile key={resolveId(game._id) ?? game.igdbId ?? i} game={game} index={i} />)}</div>
            )}
          </section>
        ) : (
          <>
            <Shelf eyebrow="Trending" title="Big right now." games={list(trending)} loading={trending === undefined} />
            <Shelf eyebrow="Top rated" title="Loved by players." games={list(topRated)} loading={topRated === undefined} />

            <section className="pt-12">
              <SectionHeading eyebrow="Players" title="People to follow." action={{ label: "See everyone", href: "/discover/people" }} />
              {people === undefined ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl bg-surface" />)}</div>
              ) : users.length === 0 ? (
                <p className="text-sm text-textMuted">No players to suggest yet.</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {users.map(u => (
                    <button key={u._id} type="button" className="pk-panel flex items-center gap-3 text-left hover:border-gold" onClick={() => router.push(`/profile/${u.username}`)}>
                      <Avatar className="h-11 w-11 rounded-full"><AvatarImage src={u.avatarUrl} alt="" /><AvatarFallback className="bg-primary text-white">{u.name.charAt(0).toUpperCase()}</AvatarFallback></Avatar>
                      <span className="min-w-0"><span className="block truncate text-sm font-semibold">{u.name}</span><span className="block truncate text-xs text-textDim">@{u.username}</span></span>
                      <ArrowRight size={16} className="ml-auto shrink-0 text-textDim" />
                    </button>
                  ))}
                </div>
              )}
            </section>

            <Shelf eyebrow="New releases" title="Fresh off the press." games={list(fresh)} loading={fresh === undefined} />

            <div className="pt-12 grid gap-4 md:grid-cols-2">
              <AdSpace variant="banner" />
              <div className="pk-prompt" data-tone="cobalt">
                <div><span className="pk-eyebrow">Your shelf</span><h3>Found something? Save it.</h3><p className="mt-2">Open any game and add it to your backlog, or mark it as playing right away.</p></div>
                <Pill href="/backlog" tone="gold" size="sm">Open my library<ArrowRight size={15} /></Pill>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
