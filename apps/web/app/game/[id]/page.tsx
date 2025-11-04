"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAction, useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { ImageWithFallback } from "@/app/components/figma/ImageWithFallback";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { DlcExpansionSection } from "@/app/components/game/DlcExpansionSection";
import { Star, Calendar, Gamepad2, Heart, Bookmark, ChevronLeft } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { GameReviewsSection } from "@/app/components/game/GameReviewsSection";

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
  const router = useRouter();
  const params = useParams();
  const gameId = params.id as string;

  // Fetch game data
  const game = useQuery(api.games.getById, gameId ? { gameId: gameId as Id<"games"> } : "skip");
  const fetchRelatedContent = useAction(api.igdb.fetchRelatedContent);
  
  // Fetch backlog status
  const backlogItem = useQuery(
    api.backlog.getForCurrentUserAndGame,
    gameId ? { gameId: gameId as Id<"games"> } : "skip"
  );
  
  // Mutations
  const updateBacklog = useMutation(api.backlog.add);
  const removeBacklog = useMutation(api.backlog.remove);

  const [relatedContent, setRelatedContent] = useState<RelatedContentItem[]>([]);
  const [isRelatedLoading, setIsRelatedLoading] = useState(false);
  const [relatedError, setRelatedError] = useState<string | null>(null);

  const [status, setStatus] = useState<string | null>(null);
  const [selectedScreenshot, setSelectedScreenshot] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isWishlist, setIsWishlist] = useState(false);
  const [isUpdatingBacklog, setIsUpdatingBacklog] = useState(false);
  
  // Initialize status from backlog data
  useEffect(() => {
    if (backlogItem) {
      setStatus(backlogItem.status);
    } else {
      setStatus(null);
    }
  }, [backlogItem]);

  const cachedRelatedContent = useMemo<RelatedContentItem[]>(() => {
    if (!game?.dlcsAndExpansions) {
      return [];
    }

    try {
      const parsed =
        typeof game.dlcsAndExpansions === "string"
          ? JSON.parse(game.dlcsAndExpansions)
          : game.dlcsAndExpansions;

      if (!Array.isArray(parsed)) {
        return [];
      }

      const normalized: RelatedContentItem[] = [];
      const seen = new Set<number>();

      parsed.forEach((item) => {
        if (!item) {
          return;
        }

        const idValue = typeof item.id === "number" ? item.id : undefined;
        const titleValue = typeof item.title === "string" ? item.title : undefined;

        if (!idValue || !titleValue) {
          return;
        }

        if (seen.has(idValue)) {
          return;
        }

        seen.add(idValue);
        normalized.push({
          id: idValue,
          title: titleValue,
          releaseDate: typeof item.releaseDate === "number" ? item.releaseDate : undefined,
          category: typeof item.category === "string" ? item.category : "related",
        });
      });

      return normalized;
    } catch (error) {
      console.error("[GameDetailPage] Failed to parse cached related content", error);
      return [];
    }
  }, [game?.dlcsAndExpansions]);

  const screenshots = useMemo(() => {
    if (!game?.screenshots) {
      return [];
    }

    try {
      const parsed =
        typeof game.screenshots === "string" ? JSON.parse(game.screenshots) : game.screenshots;
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error("[GameDetailPage] Failed to parse screenshots", error);
      return [];
    }
  }, [game?.screenshots]);

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

  if (!game) {
    return (
      <div className="min-h-screen bg-[var(--bkl-color-bg-primary)] flex items-center justify-center">
        <p className="text-[var(--bkl-color-text-secondary)]">Loading game details...</p>
      </div>
    );
  }

  const hasRelatedContent = relatedContentEntries.length > 0;

  return (
    <div className="min-h-screen bg-[var(--bkl-color-bg-primary)] pb-20 md:pb-8">
      <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-[var(--bkl-color-text-secondary)] hover:text-[var(--bkl-color-accent-primary)] mb-6 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          <span style={{ fontSize: "var(--bkl-font-size-sm)" }}>Back</span>
        </button>

        {/* Hero Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Cover */}
          <div className="lg:col-span-1">
            <div className="aspect-[2/3] rounded-[var(--bkl-radius-lg)] overflow-hidden shadow-[var(--bkl-shadow-lg)] sticky top-4">
              <ImageWithFallback
                src={game.coverUrl}
                alt={game.title}
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Game Info */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h1
                className="text-[var(--bkl-color-text-primary)] mb-3"
                style={{ fontSize: "var(--bkl-font-size-4xl)", fontWeight: "var(--bkl-font-weight-bold)" }}
              >
                {game.title}
              </h1>

              {/* Metadata */}
              <div className="flex flex-wrap items-center gap-4 mb-4">
                {game.releaseYear && (
                  <div className="flex items-center gap-2 text-[var(--bkl-color-text-secondary)]">
                    <Calendar className="w-4 h-4" />
                    <span style={{ fontSize: "var(--bkl-font-size-sm)" }}>
                      {game.releaseYear}
                    </span>
                  </div>
                )}
                {game.platforms && (
                  <div className="flex items-center gap-2 text-[var(--bkl-color-text-secondary)]">
                    <Gamepad2 className="w-4 h-4" />
                    <span style={{ fontSize: "var(--bkl-font-size-sm)" }}>
                      Multi-platform
                    </span>
                  </div>
                )}
              </div>

              {/* Rating Display */}
              {game.aggregatedRating && (
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-6 h-6 ${
                          star <= Math.round((game.aggregatedRating || 0) / 20)
                            ? "fill-[var(--bkl-color-accent-secondary)] text-[var(--bkl-color-accent-secondary)]"
                            : "text-[var(--bkl-color-border)]"
                        }`}
                      />
                    ))}
                  </div>
                  <span
                    className="text-[var(--bkl-color-text-primary)]"
                    style={{ fontSize: "var(--bkl-font-size-lg)", fontWeight: "var(--bkl-font-weight-semibold)" }}
                  >
                    {game.aggregatedRating?.toFixed(1)} / 100
                  </span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              <Select
                value={status || ""}
                onValueChange={async (newStatus) => {
                  setIsUpdatingBacklog(true);
                  try {
                    if (newStatus === "remove") {
                      // Remove from backlog
                      if (backlogItem) {
                        await removeBacklog({ backlogId: backlogItem._id });
                        setStatus(null);
                      }
                    } else if (newStatus === "want_to_play" || newStatus === "playing" || newStatus === "completed" || newStatus === "on_hold" || newStatus === "dropped") {
                      // Add or update backlog
                      await updateBacklog({
                        gameId: gameId as Id<"games">,
                        status: newStatus,
                      });
                      setStatus(newStatus);
                    }
                  } catch (error) {
                    console.error("Failed to update backlog:", error);
                  } finally {
                    setIsUpdatingBacklog(false);
                  }
                }}
                disabled={isUpdatingBacklog}
              >
                <SelectTrigger className="w-[200px] bg-[var(--bkl-color-accent-primary)] border-[var(--bkl-color-accent-primary)] text-[var(--bkl-color-bg-primary)] disabled:opacity-50">
                  <SelectValue placeholder="Add to Backlog" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="want_to_play">Want to Play</SelectItem>
                  <SelectItem value="playing">Playing</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                  <SelectItem value="dropped">Dropped</SelectItem>
                  {status && <SelectItem value="remove">Remove from Backlog</SelectItem>}
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                className={`border-[var(--bkl-color-border)] ${
                  isWishlist
                    ? "bg-[var(--bkl-color-accent-primary)] text-[var(--bkl-color-bg-primary)]"
                    : "text-[var(--bkl-color-text-primary)]"
                }`}
                onClick={() => setIsWishlist(!isWishlist)}
              >
                <Bookmark className={`w-4 h-4 mr-2 ${isWishlist ? "fill-current" : ""}`} />
                Wishlist
              </Button>

              <Button
                variant="outline"
                className={`border-[var(--bkl-color-border)] ${
                  isFavorite
                    ? "bg-[var(--bkl-color-feedback-error)] text-white"
                    : "text-[var(--bkl-color-text-primary)]"
                }`}
                onClick={() => setIsFavorite(!isFavorite)}
              >
                <Heart className={`w-4 h-4 ${isFavorite ? "fill-current" : ""}`} />
              </Button>
            </div>

            {/* Review CTA */}
            <div className="bg-[var(--bkl-color-bg-secondary)] border border-[var(--bkl-color-border)] rounded-[var(--bkl-radius-lg)] p-6">
              <h2
                className="text-[var(--bkl-color-text-primary)] mb-2"
                style={{ fontSize: "var(--bkl-font-size-base)", fontWeight: "var(--bkl-font-weight-semibold)" }}
              >
                Ready to share your experience?
              </h2>
              <p
                className="text-[var(--bkl-color-text-secondary)] mb-4"
                style={{ fontSize: "var(--bkl-font-size-sm)" }}
              >
                Head over to the full review editor to capture your thoughts, rating, and playtime in one place.
              </p>
              <Button
                className="bg-[var(--bkl-color-accent-primary)] hover:bg-[var(--bkl-color-accent-primary)]/90"
                onClick={() => router.push(`/review/new?gameId=${game._id}`)}
              >
                Write a Review
              </Button>
            </div>
          </div>
        </div>

        {/* Content Sections */}
        <div className="space-y-8">
          {/* Summary */}
          {game.summary && (
            <section className="bg-[var(--bkl-color-bg-secondary)] border border-[var(--bkl-color-border)] rounded-[var(--bkl-radius-lg)] p-6">
              <h2
                className="text-[var(--bkl-color-text-primary)] mb-3"
                style={{ fontSize: "var(--bkl-font-size-2xl)", fontWeight: "var(--bkl-font-weight-semibold)" }}
              >
                Summary
              </h2>
              <p
                className="text-[var(--bkl-color-text-secondary)]"
                style={{ fontSize: "var(--bkl-font-size-base)" }}
              >
                {game.summary}
              </p>
            </section>
          )}

          {/* About This Game */}
          <section className="bg-[var(--bkl-color-bg-secondary)] border border-[var(--bkl-color-border)] rounded-[var(--bkl-radius-lg)] p-6">
            <h2
              className="text-[var(--bkl-color-text-primary)] mb-4"
              style={{ fontSize: "var(--bkl-font-size-2xl)", fontWeight: "var(--bkl-font-weight-semibold)" }}
            >
              About This Game
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {game.genres && (
                <div>
                  <h3
                    className="text-[var(--bkl-color-text-primary)] mb-2"
                    style={{ fontSize: "var(--bkl-font-size-sm)", fontWeight: "var(--bkl-font-weight-semibold)" }}
                  >
                    GENRES
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {(() => {
                      const genres = typeof game.genres === 'string' ? JSON.parse(game.genres) : game.genres;
                      return (genres || []).map((genre: any, index: number) => {
                        const genreName = typeof genre === 'string' ? genre : genre.name || String(genre);
                        return (
                          <Badge key={`genre-${index}-${genreName}`} className="bg-[var(--bkl-color-accent-primary)]">
                            {genreName}
                          </Badge>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}

              {developers.length > 0 && (
                <div>
                  <h3
                    className="text-[var(--bkl-color-text-primary)] mb-2"
                    style={{ fontSize: "var(--bkl-font-size-sm)", fontWeight: "var(--bkl-font-weight-semibold)" }}
                  >
                    DEVELOPERS
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {developers.map((developer, index) => (
                      <Badge
                        key={`developer-${developer.id ?? index}`}
                        className="bg-[var(--bkl-color-bg-tertiary)] border-[var(--bkl-color-border)] text-[var(--bkl-color-text-primary)]"
                      >
                        {developer.role
                          ? `${developer.name} · ${developer.role}`
                          : developer.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {publishers.length > 0 && (
                <div>
                  <h3
                    className="text-[var(--bkl-color-text-primary)] mb-2"
                    style={{ fontSize: "var(--bkl-font-size-sm)", fontWeight: "var(--bkl-font-weight-semibold)" }}
                  >
                    PUBLISHERS
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {publishers.map((publisher, index) => (
                      <Badge
                        key={`publisher-${publisher.id ?? index}`}
                        className="bg-[var(--bkl-color-bg-tertiary)] border-[var(--bkl-color-border)] text-[var(--bkl-color-text-primary)]"
                      >
                        {publisher.role
                          ? `${publisher.name} · ${publisher.role}`
                          : publisher.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          {isRelatedLoading && !hasRelatedContent && (
            <section className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-stone-900/40 p-6">
              <h2 className="text-lg font-semibold text-[var(--bkl-color-text-primary)]">
                Checking for related content
              </h2>
              <p className="text-sm text-[var(--bkl-color-text-secondary)]">
                Pulling expansions, DLC, and enhanced releases from IGDB…
              </p>
            </section>
          )}

          {relatedError && !hasRelatedContent && (
            <section className="rounded-2xl border border-[var(--bkl-color-feedback-error)]/40 bg-[var(--bkl-color-feedback-error)]/10 p-4">
              <p className="text-sm text-[var(--bkl-color-feedback-error)]">
                Could not fetch related content right now. {relatedError}
              </p>
            </section>
          )}

          <DlcExpansionSection
            dlcsAndExpansions={game.dlcsAndExpansions ?? undefined}
            gameTitle={game.title}
            relatedContent={relatedContentEntries}
          />

          {/* Similar Games */}
          {screenshots && screenshots.length > 0 && (
            <section className="bg-[var(--bkl-color-bg-secondary)] border border-[var(--bkl-color-border)] rounded-[var(--bkl-radius-lg)] p-6">
              <h2
                className="text-[var(--bkl-color-text-primary)] mb-4"
                style={{ fontSize: "var(--bkl-font-size-2xl)", fontWeight: "var(--bkl-font-weight-semibold)" }}
              >
                Screenshots
              </h2>
              <div className="space-y-4">
                <div className="w-full rounded-lg overflow-hidden">
                  <ImageWithFallback
                    src={screenshots[selectedScreenshot]}
                    alt="Game screenshot"
                    className="w-full h-auto object-cover max-h-96"
                  />
                </div>
                {screenshots.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {screenshots.map((screenshot: string, index: number) => (
                      <button
                        key={index}
                        onClick={() => setSelectedScreenshot(index)}
                        className={`flex-shrink-0 w-24 h-16 rounded border-2 overflow-hidden transition-colors ${
                          selectedScreenshot === index
                            ? "border-[var(--bkl-color-accent-primary)]"
                            : "border-[var(--bkl-color-border)]"
                        }`}
                      >
                        <ImageWithFallback
                          src={screenshot}
                          alt={`Thumbnail ${index}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}

          <GameReviewsSection gameId={game._id as Id<"games">} />
        </div>
      </div>
    </div>
  );
}
