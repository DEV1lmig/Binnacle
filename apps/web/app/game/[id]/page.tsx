"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useParams } from "next/navigation";
import { useAction, useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { DlcExpansionSection } from "@/app/components/game/DlcExpansionSection";
import { MediaGallery } from "@/app/components/game/MediaGallery";
import { ExternalLinks } from "@/app/components/game/ExternalLinks";
import { Calendar, ChevronLeft, PenLine, BookOpen, ChevronDown, Check, Trash2, Loader2 } from "lucide-react";
import { normalizeRatingToTen } from "@binnacle/shared-types";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/app/components/ui/dropdown-menu";
import { Skeleton } from "@/app/components/ui/skeleton";
import { toneVars } from "@/app/lib/coverColor";
import { CaseBackdrop, Disc, Pill, useCloseCase, SectionHeading, ScoreMark, StatusChip, STATUS_LABEL, STATUS_ORDER, useCaseTone, type LibraryStatus } from "@/app/components/playchive";
import { GameReviewsSection } from "@/app/components/game/GameReviewsSection";
import { GameArticlesSection } from "@/app/components/game/GameArticlesSection";
import { mediumOf } from "@/app/lib/medium";

type CreditEntry = {
  id?: number | string;
  name: string;
  role?: string;
};

type RelatedContentItem = {
  id: number;
  title: string;
  releaseDate?: number;
  category: string;
};

function parseCreditField(raw: unknown): CreditEntry[] {
  if (!raw) {
    return [];
  }

  let parsed: unknown;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      console.error("[GameDetailPage] Failed to parse credit field", error);
      return [];
    }
  } else {
    parsed = raw;
  }

  const entries = Array.isArray(parsed) ? parsed : [parsed];
  const normalized: CreditEntry[] = [];

  entries.forEach((entry) => {
    if (!entry) {
      return;
    }

    if (typeof entry === "string") {
      const name = entry.trim();
      if (name) {
        normalized.push({ name });
      }
      return;
    }

    if (typeof entry === "object") {
      const source = entry as Record<string, unknown>;
      const company = source.company as Record<string, unknown> | undefined;
      const nameCandidate = source.name ?? company?.name;
      if (typeof nameCandidate !== "string" || !nameCandidate.trim()) {
        return;
      }

      const identifier = source.id ?? company?.id;
      const idValue = typeof identifier === "number" || typeof identifier === "string" ? identifier : undefined;
      const roleCandidate = source.role ?? source.type;
      const roleValue = typeof roleCandidate === "string" ? roleCandidate : undefined;

      normalized.push({
        id: idValue,
        name: nameCandidate.trim(),
        role: roleValue,
      });
    }
  });

  const deduped: CreditEntry[] = [];
  const seen = new Set<string>();

  normalized.forEach((entry) => {
    const key = String(entry.id ?? entry.name.toLowerCase());
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(entry);
    }
  });

  return deduped;
}

export default function GameDetailPage() {
  const closeCase = useCloseCase();
  const params = useParams();
  const gameId = params.id as string;

  // Fetch game data
  const game = useQuery(api.games.getById, gameId ? { gameId: gameId as Id<"games"> } : "skip");
  const fetchRelatedContent = useAction(api.igdb.fetchRelatedContent);
  const ensureGameMedia = useAction(api.igdb.ensureGameMedia);
  
  // Fetch backlog status
  const backlogItem = useQuery(
    api.backlog.getForCurrentUserAndGame,
    gameId ? { gameId: gameId as Id<"games"> } : "skip"
  );
  
  // Mutations
  const updateBacklog = useMutation(api.backlog.add);
  const removeBacklog = useMutation(api.backlog.remove);

  const [tone, setTone] = useCaseTone(gameId);
  const [relatedContent, setRelatedContent] = useState<RelatedContentItem[]>([]);
  const [isRelatedLoading, setIsRelatedLoading] = useState(false);
  const [relatedError, setRelatedError] = useState<string | null>(null);

  // Media is fetched on first visit (or when stale) and then arrives through the game query
  useEffect(() => {
    if (!gameId) return;
    ensureGameMedia({ gameId: gameId as Id<"games"> }).catch((error) => {
      console.error("[GameDetailPage] Failed to load media", error);
    });
  }, [gameId, ensureGameMedia]);

  const [status, setStatus] = useState<string | null>(null);
  const [isUpdatingBacklog, setIsUpdatingBacklog] = useState(false);
  
  // Initialize status from backlog data
  const prevBacklogItemRef = useRef(backlogItem);

  useEffect(() => {
    if (prevBacklogItemRef.current !== backlogItem && !isUpdatingBacklog) {
      prevBacklogItemRef.current = backlogItem;
      setStatus(backlogItem?.status ?? null);
    }
  }, [backlogItem, isUpdatingBacklog]);

  const cachedRelatedContent = useMemo<RelatedContentItem[]>(() => {
    // dlcsAndExpansions field was removed from schema in Phase 2B optimization
    // Return empty array to maintain compatibility
    return [];
  }, []);
        
  const developers = useMemo(() => parseCreditField(game?.developers), [game?.developers]);
  const publishers = useMemo(() => parseCreditField(game?.publishers), [game?.publishers]);

  const relatedContentEntries = useMemo(() => {
    const source = relatedContent.length > 0 ? relatedContent : cachedRelatedContent;
    if (!source || source.length === 0) {
      return [];
    }

    const deduped: RelatedContentItem[] = [];
    const seen = new Set<number>();

    source.forEach((item, index) => {
      const idValue = typeof item.id === "number" ? item.id : index;
      if (seen.has(idValue)) {
        return;
      }
      seen.add(idValue);
      deduped.push({
        id: idValue,
        title: item.title,
        releaseDate: item.releaseDate,
        category: item.category ?? "related",
      });
    });

    return deduped;
  }, [cachedRelatedContent, relatedContent]);

  useEffect(() => {
    if (!game?.title) {
      return;
    }

    if (cachedRelatedContent.length > 0) {
      return;
    }

    let didCancel = false;

    const loadRelatedContent = async () => {
      setIsRelatedLoading(true);
      setRelatedError(null);

      try {
        const result = await fetchRelatedContent({
          gameTitle: game.title,
          igdbId: typeof game.igdbId === "number" ? game.igdbId : undefined,
        });

        if (!didCancel) {
          const sanitized = Array.isArray(result)
            ? result.filter(
                (item): item is RelatedContentItem =>
                  !!item && typeof item.id === "number" && typeof item.title === "string",
              )
            : [];
          setRelatedContent(sanitized);
        }
      } catch (error) {
        if (!didCancel) {
          console.error("[GameDetailPage] Failed to load related content", error);
          setRelatedError(error instanceof Error ? error.message : "Failed to load related content");
        }
      } finally {
        if (!didCancel) {
          setIsRelatedLoading(false);
        }
      }
    };

    loadRelatedContent();

    return () => {
      didCancel = true;
    };
  }, [cachedRelatedContent.length, fetchRelatedContent, game?.igdbId, game?.title]);

  const genres = useMemo<string[]>(() => {
    const raw = game?.genres;
    if (!raw) return [];
    let list: unknown = raw;
    if (typeof raw === "string") { try { list = JSON.parse(raw); } catch { return [raw]; } }
    if (!Array.isArray(list)) return [];
    return list.map(g => (typeof g === "string" ? g : typeof g === "object" && g && typeof (g as { name?: unknown }).name === "string" ? (g as { name: string }).name : String(g)));
  }, [game?.genres]);

  const setShelf = async (next: LibraryStatus | "remove") => {
    if (isUpdatingBacklog) return;
    setIsUpdatingBacklog(true);
    try {
      if (next === "remove") {
        if (backlogItem) { await removeBacklog({ backlogId: backlogItem._id }); setStatus(null); toast.success("Removed from your library"); }
      } else {
        await updateBacklog({ gameId: gameId as Id<"games">, status: next });
        setStatus(next);
        toast.success(`Moved to ${STATUS_LABEL[next]}`);
      }
    } catch (error) {
      console.error("Failed to update backlog:", error);
      toast.error("Couldn’t update your library. Try again.");
    } finally {
      setIsUpdatingBacklog(false);
    }
  };

  if (!game) {
    return (
      <div className="min-h-screen bg-bg">
        <div className="max-w-[1400px] mx-auto px-5 md:px-8 pt-8 grid gap-8 md:grid-cols-[260px_minmax(0,1fr)]">
          <Skeleton className="aspect-[2/3] rounded-2xl bg-surface" />
          <div className="space-y-4"><Skeleton className="h-6 w-32 bg-surface" /><Skeleton className="h-16 w-3/4 bg-surface" /><Skeleton className="h-5 w-1/2 bg-surface" /><Skeleton className="h-12 w-64 rounded-full bg-surface" /></div>
        </div>
      </div>
    );
  }

  const hasRelatedContent = relatedContentEntries.length > 0;
  const medium = mediumOf(game);
  const current = (status ?? null) as LibraryStatus | null;
  return (
    <div className="pk-inside min-h-screen pb-24 md:pb-12" style={toneVars(tone)}>
      <CaseBackdrop src={game.coverUrl} gameId={gameId} title={game.title} />
      <div className="pk-page">
      {/* You are inside the case: the cover's own colour behind the artwork. */}
      <section className="pk-hero pk-hero-inside">
        <div className="pk-hero-inner pk-detail-hero">
          <button type="button" onClick={() => closeCase()} className="pk-hero-back pk-textlink text-textMuted"><ChevronLeft size={16} />Back</button>
          <div className="pk-detail-cover">
            <Disc src={game.coverUrl} title={game.title} sizes="(max-width: 767px) 60vw, 280px" priority gameId={gameId} onTone={setTone} medium={medium} />
          </div>
          <div>
            {current ? <StatusChip status={current} size="lg" /> : <span className="pk-eyebrow">Not on your shelf yet</span>}
            <h1 className="!max-w-[20ch]">{game.title}</h1>
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-textMuted">
              {game.releaseYear && <span className="inline-flex items-center gap-1.5"><Calendar size={15} aria-hidden="true" />{game.releaseYear}</span>}
              {developers.slice(0, 2).map(d => <span key={String(d.id ?? d.name)}>{d.name}</span>)}
              {genres.slice(0, 4).map(g => <span key={g} className="pk-tag">{g}</span>)}
            </div>
            {game.aggregatedRating ? <div className="mt-6 flex items-end gap-4"><ScoreMark value={normalizeRatingToTen(game.aggregatedRating)} label={`Critics and players rate this ${normalizeRatingToTen(game.aggregatedRating).toFixed(1)} out of 10`} /><span className="pb-2 text-xs text-textDim">Aggregate rating (IGDB)</span></div> : null}

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button type="button" className="pk-pill" data-tone={current ? "ghost" : "gold"} disabled={isUpdatingBacklog} aria-label={current ? `On your shelf as ${STATUS_LABEL[current]}. Change shelf` : "Add to my library"}>
                    {isUpdatingBacklog ? <Loader2 size={17} className="animate-spin" /> : null}{current ? `On shelf: ${STATUS_LABEL[current]}` : "Add to my library"}<ChevronDown size={16} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-52 rounded-xl p-1.5">
                  {STATUS_ORDER.map(s => <DropdownMenuItem key={s} className="rounded-lg" onSelect={() => setShelf(s)}><StatusChip status={s} />{s === current && <Check size={14} className="ml-auto" />}</DropdownMenuItem>)}
                  {current && <><DropdownMenuSeparator /><DropdownMenuItem className="rounded-lg text-red" onSelect={() => setShelf("remove")}><Trash2 size={14} />Remove from library</DropdownMenuItem></>}
                </DropdownMenuContent>
              </DropdownMenu>
              <Pill href={`/review/new?gameId=${game._id}`} tone="cobalt"><PenLine size={17} />Write a review</Pill>
              <Pill href={`/article/new?gameId=${game._id}`} tone="ghost"><BookOpen size={17} />Tell a story</Pill>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-[1400px] mx-auto px-5 md:px-8 pt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-12">
          {game.summary && (
            <section>
              <SectionHeading eyebrow="About" title="The short version." />
              <p className="max-w-[68ch] text-[17px] leading-[1.65] text-[#D9E1EF]">{game.summary}</p>
            </section>
          )}

          <MediaGallery title={game.title} screenshots={game.screenshots} artworks={game.artworks} videos={game.videos} />

          <GameReviewsSection gameId={game._id as Id<"games">} />
          <GameArticlesSection gameId={game._id as Id<"games">} />
        </div>

        <aside className="space-y-5 lg:sticky lg:top-28 lg:self-start">
          <section className="pk-panel">
            <h3>Credits</h3>
            <dl className="space-y-3 text-sm">
              {developers.length > 0 && <div><dt className="pk-eyebrow" data-plain="true">Developer</dt><dd className="mt-1">{developers.map(d => d.role ? `${d.name} · ${d.role}` : d.name).join(", ")}</dd></div>}
              {publishers.length > 0 && <div><dt className="pk-eyebrow" data-plain="true">Publisher</dt><dd className="mt-1">{publishers.map(p => p.role ? `${p.name} · ${p.role}` : p.name).join(", ")}</dd></div>}
              {genres.length > 0 && <div><dt className="pk-eyebrow" data-plain="true">Genres</dt><dd className="mt-2 flex flex-wrap gap-1.5">{genres.map(g => <span key={g} className="pk-tag">{g}</span>)}</dd></div>}
              {developers.length === 0 && publishers.length === 0 && genres.length === 0 && <dd className="text-textMuted">No credits on file yet.</dd>}
            </dl>
          </section>

          <ExternalLinks websites={game.websites} />

          {isRelatedLoading && !hasRelatedContent && <p className="text-sm text-textDim px-1">Checking IGDB for expansions and DLC…</p>}
          {relatedError && !hasRelatedContent && <p className="text-sm text-red px-1">Couldn’t fetch related content right now.</p>}
          <DlcExpansionSection dlcsAndExpansions={undefined} relatedContent={relatedContentEntries} />
        </aside>
      </div>
      </div>
    </div>
  );
}
