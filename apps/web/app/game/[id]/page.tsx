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
import { Calendar, Gamepad2, Heart, Bookmark, ChevronLeft } from "lucide-react";
import { getHighResCoverUrl } from "@/lib/igdb-images";
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
    // dlcsAndExpansions field was removed from schema in Phase 2B optimization
    // Return empty array to maintain compatibility
    return [];
  }, []);
        
  const screenshots = useMemo(() => {
    // screenshots field was removed from schema in Phase 2B optimization
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

  if (!game) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading game details...</p>
      </div>
    );
  }

  const hasRelatedContent = relatedContentEntries.length > 0;

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-8">
      <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-muted-foreground hover:text-primary mb-6 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm">Back</span>
        </button>

        {/* Hero Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Cover */}
          <div className="lg:col-span-1">
            <div className="aspect-[2/3] rounded-lg overflow-hidden shadow-lg sticky top-4">
              <ImageWithFallback
                src={getHighResCoverUrl(game.coverUrl)}
                alt={game.title}
                className="w-full h-full object-cover"
                width={1280}
                height={720}
                quality={95}
              />
            </div>
          </div>

          {/* Game Info */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h1 className="text-foreground mb-3 text-4xl font-bold">
                {game.title}
              </h1>

              {/* Metadata */}
              <div className="flex flex-wrap items-center gap-4 mb-4">
                {game.releaseYear && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm">
                      {game.releaseYear}
                    </span>
                  </div>
                )}
                {game.platforms && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Gamepad2 className="w-4 h-4" />
                    <span className="text-sm">
                      Multi-platform
                    </span>
                  </div>
                )}
              </div>

              {/* Rating Display */}
              {game.aggregatedRating && (
                <div className="mb-6">
                  <span className="text-foreground text-lg font-semibold">
                    {"rating by multiple sources: " + game.aggregatedRating?.toFixed(1)} / 100
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
                <SelectTrigger className="w-[200px] bg-primary border-primary text-primary-foreground disabled:opacity-50">
                  <SelectValue className="text-primary-foreground" placeholder="Add to Backlog" />
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
                className={`border-border ${
                  isWishlist
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground"
                }`}
                onClick={() => setIsWishlist(!isWishlist)}
              >
                <Bookmark className={`w-4 h-4 mr-2 ${isWishlist ? "fill-current" : ""}`} />
                Wishlist
              </Button>

              <Button
                variant="outline"
                className={`border-border ${
                  isFavorite
                    ? "bg-destructive text-white"
                    : "text-foreground"
                }`}
                onClick={() => setIsFavorite(!isFavorite)}
              >
                <Heart className={`w-4 h-4 ${isFavorite ? "fill-current" : ""}`} />
              </Button>
            </div>

            {/* Review CTA */}
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-foreground mb-2 text-base font-semibold">
                Ready to share your experience?
              </h2>
              <p className="text-muted-foreground mb-4 text-sm">
                Head over to the full review editor to capture your thoughts, rating, and playtime in one place.
              </p>
              <Button
                className="bg-primary hover:bg-primary/90"
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
            <section className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-foreground mb-3 text-2xl font-semibold">
                Summary
              </h2>
              <p className="text-muted-foreground text-base">
                {game.summary}
              </p>
            </section>
          )}

          {/* About This Game */}
          <section className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-foreground mb-4 text-2xl font-semibold">
              About This Game
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {game.genres && (
                <div>
                  <h3 className="text-foreground mb-2 text-sm font-semibold">
                    GENRES
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {(() => {
                      const genres: Array<string | Record<string, unknown>> = (() => {
                        if (typeof game.genres === "string") {
                          try {
                            const parsed = JSON.parse(game.genres);
                            return Array.isArray(parsed)
                              ? (parsed as Array<string | Record<string, unknown>>)
                              : [];
                          } catch (error) {
                            console.error("Failed to parse genres", error);
                            return [];
                          }
                        }

                        return Array.isArray(game.genres)
                          ? (game.genres as Array<string | Record<string, unknown>>)
                          : [];
                      })();

                      return genres.map((genre, index) => {
                        const genreObject =
                          typeof genre === "object" && genre !== null
                            ? (genre as Record<string, unknown>)
                            : undefined;
                        const genreName =
                          typeof genre === "string"
                            ? genre
                            : typeof genreObject?.name === "string"
                              ? genreObject.name
                              : String(genre);

                        return (
                          <Badge key={`genre-${index}-${genreName}`} className="bg-primary">
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
                  <h3 className="text-foreground mb-2 text-sm font-semibold">
                    DEVELOPERS
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {developers.map((developer, index) => (
                      <Badge
                        key={`developer-${developer.id ?? index}`}
                        className="bg-secondary border-border text-foreground"
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
                  <h3 className="text-foreground mb-2 text-sm font-semibold">
                    PUBLISHERS
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {publishers.map((publisher, index) => (
                      <Badge
                        key={`publisher-${publisher.id ?? index}`}
                        className="bg-secondary border-border text-foreground"
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
            <section className="flex flex-col gap-2 rounded-2xl border border-border/50 bg-secondary/40 p-6">
              <h2 className="text-lg font-semibold text-foreground">
                Checking for related content
              </h2>
              <p className="text-sm text-muted-foreground">
                Pulling expansions, DLC, and enhanced releases from IGDB…
              </p>
            </section>
          )}

          {relatedError && !hasRelatedContent && (
            <section className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4">
              <p className="text-sm text-destructive">
                Could not fetch related content right now. {relatedError}
              </p>
            </section>
          )}

          <DlcExpansionSection
            dlcsAndExpansions={undefined}
            relatedContent={relatedContentEntries}
          />

          {/* Similar Games */}
          {screenshots && screenshots.length > 0 && (
            <section className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-foreground mb-4 text-2xl font-semibold">
                Screenshots
              </h2>
              <div className="space-y-4">
                <div className="w-full rounded-lg overflow-hidden bg-black">
                  <ImageWithFallback
                    src={screenshots[selectedScreenshot]}
                    alt="Game screenshot"
                    className="w-full h-auto object-contain max-h-[720px]"
                    width={1920}
                    height={1080}
                    quality={100}
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
                            ? "border-primary"
                            : "border-border"
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
