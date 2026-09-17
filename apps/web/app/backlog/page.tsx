"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentUser } from "@/app/context/CurrentUserContext";
import { Input } from "@/app/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { LayoutGrid, List, Search, Compass, Library } from "lucide-react";
import { BacklogPageSkeleton } from "@/app/components/PageSkeleton";
import { EmptyState } from "@/app/components/EmptyState";
import { PageHero, Pill, LibraryCard, LibraryRow, SectionHeading, STATUS_LABEL, STATUS_ORDER, STATUS_COLOR, type LibraryItem, type LibraryStatus } from "@/app/components/playchive";
import { withViewTransition } from "@/app/lib/viewTransition";

type Filter = "all" | LibraryStatus;
type View = "grid" | "list";
type Sort = "recent" | "title-asc" | "title-desc" | "year";

const FILTERS: Filter[] = ["all", ...STATUS_ORDER];
const isFilter = (value: string | null): value is Filter => !!value && (FILTERS as string[]).includes(value);

function BacklogContent() {
  const router = useRouter();
  const params = useSearchParams();
  const { currentUser, isLoading: isUserLoading } = useCurrentUser();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>(() => (isFilter(params.get("status")) ? (params.get("status") as Filter) : "all"));
  const [sort, setSort] = useState<Sort>("recent");
  const [view, setView] = useState<View>("grid");

  // Keep the URL shareable: /backlog?status=playing
  useEffect(() => {
    const current = params.get("status");
    if ((filter === "all" && current) || (filter !== "all" && current !== filter)) {
      router.replace(filter === "all" ? "/backlog" : `/backlog?status=${filter}`, { scroll: false });
    }
  }, [filter, params, router]);

  const items = useQuery(api.backlog.listForUser, currentUser ? { userId: currentUser._id, limit: 100 } : "skip") as LibraryItem[] | undefined;

  const counts = useMemo(() => {
    const base: Record<Filter, number> = { all: 0, playing: 0, want_to_play: 0, completed: 0, on_hold: 0, dropped: 0 };
    for (const item of items ?? []) { base.all += 1; if (item.status in base) base[item.status as LibraryStatus] += 1; }
    return base;
  }, [items]);

  const shown = useMemo(() => {
    let list = (items ?? []).filter(i => i.game);
    if (filter !== "all") list = list.filter(i => i.status === filter);
    if (query.trim()) { const q = query.trim().toLowerCase(); list = list.filter(i => i.game!.title.toLowerCase().includes(q)); }
    const byTitle = (a: LibraryItem, b: LibraryItem) => a.game!.title.localeCompare(b.game!.title);
    switch (sort) {
      case "title-asc": list.sort(byTitle); break;
      case "title-desc": list.sort((a, b) => byTitle(b, a)); break;
      case "year": list.sort((a, b) => (b.game!.releaseYear ?? 0) - (a.game!.releaseYear ?? 0)); break;
      default: list.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
    }
    return list;
  }, [items, filter, query, sort]);

  if (isUserLoading || !currentUser || items === undefined) return <BacklogPageSkeleton />;

  const nowPlaying = filter === "all" && !query ? shown.filter(i => i.status === "playing").slice(0, 8) : [];
  const finishedShare = counts.all ? Math.round((counts.completed / counts.all) * 100) : 0;

  return (
    <div className="min-h-screen pb-24 md:pb-12 bg-bg">
      <PageHero
        tone="gold"
        eyebrow="My library"
        title={counts.all ? <><em>{counts.all}</em> {counts.all === 1 ? "game" : "games"} on your shelf.</> : <>Your shelf, <em>your</em> rules.</>}
        lede={counts.all ? `${counts.playing} playing, ${counts.want_to_play} waiting, ${finishedShare}% finished. Move games between shelves right from the card.` : "Save what you want to play, mark what you’re playing, and keep a record of what you finished."}
        aside={<Pill href="/discover" tone="ink"><Compass size={17} />Add games</Pill>}
        strip={FILTERS.map(f => (
          <button key={f} type="button" className="pk-stat" aria-pressed={filter === f} onClick={() => withViewTransition(() => setFilter(f))}>
            <strong>{counts[f]}</strong>
            <span className="inline-flex items-center gap-1.5">{f !== "all" && <i className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: STATUS_COLOR[f] }} aria-hidden="true" />}{f === "all" ? "All games" : STATUS_LABEL[f]}</span>
          </button>
        ))}
      />

      <div className="max-w-[1400px] mx-auto px-5 md:px-8 pt-8">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-textDim" size={16} aria-hidden="true" />
            <Input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search your games" aria-label="Search your library" className="h-11 rounded-full pl-10 bg-surface border-border" />
          </div>
          <Select value={sort} onValueChange={v => setSort(v as Sort)}>
            <SelectTrigger className="h-11 w-[170px] rounded-full bg-surface" aria-label="Sort library"><SelectValue /></SelectTrigger>
            <SelectContent className="rounded-xl bg-surface">
              <SelectItem value="recent">Recently updated</SelectItem>
              <SelectItem value="title-asc">Title A–Z</SelectItem>
              <SelectItem value="title-desc">Title Z–A</SelectItem>
              <SelectItem value="year">Newest release</SelectItem>
            </SelectContent>
          </Select>
          <div className="pk-seg ml-auto" role="group" aria-label="View">
            <button type="button" aria-pressed={view === "grid"} onClick={() => withViewTransition(() => setView("grid"))} aria-label="Grid view"><LayoutGrid size={16} /></button>
            <button type="button" aria-pressed={view === "list"} onClick={() => withViewTransition(() => setView("list"))} aria-label="List view"><List size={16} /></button>
          </div>
        </div>

        {nowPlaying.length > 0 && (
          <section className="pt-10">
            <SectionHeading eyebrow={<>Now playing <b>{String(nowPlaying.length).padStart(2, "0")}</b></>} title="Back to it." action={{ label: "Only playing", onClick: () => withViewTransition(() => setFilter("playing")) }} />
            <div className="pk-shelf">{nowPlaying.map(item => <LibraryCard key={item._id} item={item} />)}</div>
          </section>
        )}

        <section className="pt-10">
          <SectionHeading eyebrow={<>{filter === "all" ? "Everything" : STATUS_LABEL[filter]} <b>{shown.length}</b></>} title={query ? `Results for “${query}”` : filter === "all" ? "The whole shelf." : `${STATUS_LABEL[filter]}.`} />
          {shown.length === 0 ? (
            <EmptyState icon={<Library size={36} />} title={query ? "No games match" : counts.all ? "Nothing on this shelf yet" : "Your library is empty"} description={query ? "Try another title or clear the search." : counts.all ? "Move a game here from its card menu, or add a new one." : "Find a game and add it to your backlog to get started."} actionLabel="Discover games" actionHref="/discover" />
          ) : view === "grid" ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-x-4 gap-y-7">{shown.map(item => <LibraryCard key={item._id} item={item} />)}</div>
          ) : (
            <div className="space-y-2">{shown.map(item => <LibraryRow key={item._id} item={item} />)}</div>
          )}
        </section>
      </div>
    </div>
  );
}

export default function BacklogPage() {
  return <Suspense fallback={<BacklogPageSkeleton />}><BacklogContent /></Suspense>;
}
