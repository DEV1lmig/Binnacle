"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAction, useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { ImageWithFallback } from "@/app/components/figma/ImageWithFallback";
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
import { C, FONT_HEADING, FONT_MONO, FONT_BODY, FONT_IMPORT_URL } from "@/app/lib/design-system";
import { CornerMarkers, GrainOverlay } from "@/app/lib/design-primitives";

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

  const game = useQuery(api.games.getById, gameId ? { gameId: gameId as Id<"games"> } : "skip");
  const fetchRelatedContent = useAction(api.igdb.fetchRelatedContent);

  const backlogItem = useQuery(
    api.backlog.getForCurrentUserAndGame,
    gameId ? { gameId: gameId as Id<"games"> } : "skip"
  );

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
  const [backHovered, setBackHovered] = useState(false);
  const [wishlistHovered, setWishlistHovered] = useState(false);
  const [favHovered, setFavHovered] = useState(false);
  const [ctaHovered, setCtaHovered] = useState(false);

  useEffect(() => {
    if (backlogItem) {
      setStatus(backlogItem.status);
    } else {
      setStatus(null);
    }
  }, [backlogItem]);

  const cachedRelatedContent = useMemo<RelatedContentItem[]>(() => {
    return [];
  }, []);

  const screenshots = useMemo(() => {
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
      <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <style>{`@import url('${FONT_IMPORT_URL}')`}</style>
        <GrainOverlay id="game-grain" />
        <p style={{ fontFamily: FONT_MONO, fontSize: 12, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.1em" }}>
          Loading game details...
        </p>
      </div>
    );
  }

  const hasRelatedContent = relatedContentEntries.length > 0;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, position: "relative" }} className="pb-20 md:pb-8">
      <style>{`@import url('${FONT_IMPORT_URL}')`}</style>

      <div style={{ position: "fixed", top: 0, left: 0, width: "40vw", height: "40vh", background: `radial-gradient(ellipse at 20% 20%, ${C.gold}12, transparent 70%)`, filter: "blur(60px)", pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "fixed", bottom: 0, right: 0, width: "40vw", height: "40vh", background: `radial-gradient(ellipse at 80% 80%, ${C.accent}10, transparent 70%)`, filter: "blur(60px)", pointerEvents: "none", zIndex: 0 }} />

      <GrainOverlay id="game-grain" />

      <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8" style={{ position: "relative", zIndex: 1 }}>
        <button
          onClick={() => router.back()}
          onMouseEnter={() => setBackHovered(true)}
          onMouseLeave={() => setBackHovered(false)}
          className="flex items-center gap-2 mb-6"
          style={{
            fontFamily: FONT_MONO,
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            color: backHovered ? C.gold : C.textMuted,
            background: "none",
            border: "none",
            cursor: "pointer",
            transition: "color 0.2s",
          }}
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-1">
            <div
              className="aspect-[2/3] overflow-hidden sticky top-4"
              style={{ borderRadius: 2, position: "relative", boxShadow: `0 0 24px ${C.bloom}` }}
            >
              <CornerMarkers size={10} />
              <ImageWithFallback
                src={getHighResCoverUrl(game.coverUrl)}
                alt={game.title}
              />
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div>
              <h1 style={{ fontFamily: FONT_HEADING, fontWeight: 200, fontSize: 36, color: C.text, letterSpacing: "-0.01em", marginBottom: 12 }}>
                {game.title}
              </h1>

              <div className="flex flex-wrap items-center gap-4 mb-4">
                {game.releaseYear && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" style={{ color: C.gold }} />
                    <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: C.textMuted }}>{game.releaseYear}</span>
                  </div>
                )}
                {game.platforms && (
                  <div className="flex items-center gap-2">
                    <Gamepad2 className="w-4 h-4" style={{ color: C.gold }} />
                    <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: C.textMuted }}>Multi-platform</span>
                  </div>
                )}
              </div>

              {game.aggregatedRating && (
                <div className="mb-6">
                  <span style={{ fontFamily: FONT_HEADING, fontWeight: 200, fontSize: 28, color: C.gold }}>
                    {"rating by multiple sources: " + game.aggregatedRating?.toFixed(1)}
                  </span>
                  <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: C.textDim }}>{" "}/ 100</span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-3">
              <Select
                value={status || ""}
                onValueChange={async (newStatus) => {
                  setIsUpdatingBacklog(true);
                  try {
                    if (newStatus === "remove") {
                      if (backlogItem) {
                        await removeBacklog({ backlogId: backlogItem._id });
                        setStatus(null);
                      }
                    } else if (newStatus === "want_to_play" || newStatus === "playing" || newStatus === "completed" || newStatus === "on_hold" || newStatus === "dropped") {
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
                <SelectTrigger
                  className="w-[200px] disabled:opacity-50"
                  style={{
                    background: C.gold,
                    color: C.bg,
                    fontFamily: FONT_MONO,
                    fontSize: 11,
                    textTransform: "uppercase",
                    borderRadius: 1,
                    border: "none",
                  }}
                >
                  <SelectValue placeholder="Add to Backlog" />
                </SelectTrigger>
                <SelectContent
                  style={{
                    background: C.surface,
                    border: `1px solid ${C.border}`,
                    borderRadius: 2,
                  }}
                >
                  {[
                    { value: "want_to_play", label: "Want to Play", dot: C.gold },
                    { value: "playing", label: "Playing", dot: C.green },
                    { value: "completed", label: "Completed", dot: C.amber },
                    { value: "on_hold", label: "On Hold", dot: C.amber },
                    { value: "dropped", label: "Dropped", dot: C.red },
                  ].map((opt) => (
                    <SelectItem
                      key={opt.value}
                      value={opt.value}
                      className="focus:bg-transparent"
                      style={{
                        fontFamily: FONT_MONO,
                        fontSize: 11,
                        letterSpacing: "0.06em",
                        color: C.text,
                        cursor: "pointer",
                      }}
                      onFocus={(e) => { e.currentTarget.style.background = C.gold + "18"; }}
                      onBlur={(e) => { e.currentTarget.style.background = "transparent"; }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = C.gold + "18"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                    >
                      <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: opt.dot, marginRight: 8, flexShrink: 0 }} />
                      {opt.label}
                    </SelectItem>
                  ))}
                  {status && (
                    <SelectItem
                      value="remove"
                      className="focus:bg-transparent"
                      style={{
                        fontFamily: FONT_MONO,
                        fontSize: 11,
                        letterSpacing: "0.06em",
                        color: C.red,
                        cursor: "pointer",
                        borderTop: `1px solid ${C.border}`,
                        marginTop: 4,
                        paddingTop: 8,
                      }}
                      onFocus={(e) => { e.currentTarget.style.background = C.red + "12"; }}
                      onBlur={(e) => { e.currentTarget.style.background = "transparent"; }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = C.red + "12"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                    >
                      Remove from Backlog
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>

              <button
                onClick={() => setIsWishlist(!isWishlist)}
                onMouseEnter={() => setWishlistHovered(true)}
                onMouseLeave={() => setWishlistHovered(false)}
                className="flex items-center gap-2"
                style={{
                  background: isWishlist ? C.gold : "transparent",
                  color: isWishlist ? C.bg : C.text,
                  border: `1px solid ${C.border}`,
                  borderRadius: 1,
                  padding: "6px 14px",
                  fontFamily: FONT_MONO,
                  fontSize: 11,
                  textTransform: "uppercase",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  opacity: wishlistHovered && !isWishlist ? 0.8 : 1,
                }}
              >
                <Bookmark className="w-4 h-4" style={isWishlist ? { fill: "currentColor" } : undefined} />
                Wishlist
              </button>

              <button
                onClick={() => setIsFavorite(!isFavorite)}
                onMouseEnter={() => setFavHovered(true)}
                onMouseLeave={() => setFavHovered(false)}
                className="flex items-center"
                style={{
                  background: isFavorite ? C.red : "transparent",
                  color: isFavorite ? "#fff" : C.text,
                  border: `1px solid ${C.border}`,
                  borderRadius: 1,
                  padding: "6px 10px",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  opacity: favHovered && !isFavorite ? 0.8 : 1,
                }}
              >
                <Heart className="w-4 h-4" style={isFavorite ? { fill: "currentColor" } : undefined} />
              </button>
            </div>

            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 2, padding: 24, position: "relative" }}>
              <CornerMarkers size={6} />
              <h2 style={{ fontFamily: FONT_HEADING, fontWeight: 300, fontSize: 16, color: C.text, marginBottom: 8 }}>
                Ready to share your experience?
              </h2>
              <p style={{ fontFamily: FONT_BODY, fontWeight: 300, fontSize: 13, color: C.textMuted, marginBottom: 16 }}>
                Head over to the full review editor to capture your thoughts, rating, and playtime in one place.
              </p>
              <button
                onClick={() => router.push(`/review/new?gameId=${game._id}`)}
                onMouseEnter={() => setCtaHovered(true)}
                onMouseLeave={() => setCtaHovered(false)}
                style={{
                  background: C.gold,
                  color: C.bg,
                  fontFamily: FONT_MONO,
                  fontSize: 11,
                  textTransform: "uppercase",
                  border: "none",
                  borderRadius: 1,
                  padding: "8px 18px",
                  cursor: "pointer",
                  boxShadow: `0 0 16px ${C.bloom}`,
                  transition: "opacity 0.2s",
                  opacity: ctaHovered ? 0.9 : 1,
                }}
              >
                Write a Review
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {game.summary && (
            <section style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 2, padding: 24, position: "relative" }}>
              <CornerMarkers size={8} />
              <h2 style={{ fontFamily: FONT_HEADING, fontWeight: 200, fontSize: 20, color: C.text, marginBottom: 12 }}>
                Summary
              </h2>
              <p style={{ fontFamily: FONT_BODY, fontWeight: 300, fontSize: 14, lineHeight: 1.7, color: C.textMuted }}>
                {game.summary}
              </p>
            </section>
          )}

          <section style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 2, padding: 24, position: "relative" }}>
            <CornerMarkers size={8} />
            <h2 style={{ fontFamily: FONT_HEADING, fontWeight: 200, fontSize: 20, color: C.text, marginBottom: 16 }}>
              About This Game
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {game.genres && (
                <div>
                  <h3 style={{ fontFamily: FONT_MONO, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", color: C.textMuted, marginBottom: 8 }}>
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
                          <span
                            key={`genre-${index}-${genreName}`}
                            style={{
                              background: C.gold + "15",
                              color: C.gold,
                              border: `1px solid ${C.gold}30`,
                              borderRadius: 1,
                              fontFamily: FONT_MONO,
                              fontSize: 11,
                              padding: "3px 10px",
                            }}
                          >
                            {genreName}
                          </span>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}

              {developers.length > 0 && (
                <div>
                  <h3 style={{ fontFamily: FONT_MONO, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", color: C.textMuted, marginBottom: 8 }}>
                    DEVELOPERS
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {developers.map((developer, index) => (
                      <span
                        key={`developer-${developer.id ?? index}`}
                        style={{
                          background: C.bgAlt,
                          border: `1px solid ${C.border}`,
                          color: C.text,
                          fontFamily: FONT_MONO,
                          fontSize: 11,
                          borderRadius: 1,
                          padding: "3px 10px",
                        }}
                      >
                        {developer.role
                          ? `${developer.name} \u00B7 ${developer.role}`
                          : developer.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {publishers.length > 0 && (
                <div>
                  <h3 style={{ fontFamily: FONT_MONO, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", color: C.textMuted, marginBottom: 8 }}>
                    PUBLISHERS
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {publishers.map((publisher, index) => (
                      <span
                        key={`publisher-${publisher.id ?? index}`}
                        style={{
                          background: C.bgAlt,
                          border: `1px solid ${C.border}`,
                          color: C.text,
                          fontFamily: FONT_MONO,
                          fontSize: 11,
                          borderRadius: 1,
                          padding: "3px 10px",
                        }}
                      >
                        {publisher.role
                          ? `${publisher.name} \u00B7 ${publisher.role}`
                          : publisher.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          {isRelatedLoading && !hasRelatedContent && (
            <section style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 2, padding: 24, position: "relative" }} className="flex flex-col gap-2">
              <CornerMarkers size={6} />
              <h2 style={{ fontFamily: FONT_HEADING, fontWeight: 300, fontSize: 16, color: C.text }}>
                Checking for related content
              </h2>
              <p style={{ fontFamily: FONT_BODY, fontSize: 13, color: C.textMuted }}>
                Pulling expansions, DLC, and enhanced releases from IGDB...
              </p>
            </section>
          )}

          {relatedError && !hasRelatedContent && (
            <section style={{ background: C.red + "10", border: `1px solid ${C.red}40`, borderRadius: 2, padding: 16 }}>
              <p style={{ fontFamily: FONT_BODY, fontSize: 13, color: C.red }}>
                Could not fetch related content right now. {relatedError}
              </p>
            </section>
          )}

          <DlcExpansionSection
            dlcsAndExpansions={undefined}
            relatedContent={relatedContentEntries}
          />

          {screenshots && screenshots.length > 0 && (
            <section style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 2, padding: 24, position: "relative" }}>
              <CornerMarkers size={8} />
              <h2 style={{ fontFamily: FONT_HEADING, fontWeight: 200, fontSize: 20, color: C.text, marginBottom: 16 }}>
                Screenshots
              </h2>
              <div className="space-y-4">
                <div className="w-full overflow-hidden" style={{ borderRadius: 2, background: C.bg }}>
                  <ImageWithFallback
                    src={screenshots[selectedScreenshot]}
                    alt="Game screenshot"
                    className="w-full h-auto object-contain max-h-[720px]"
                  />
                </div>
                {screenshots.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {screenshots.map((screenshot: string, index: number) => (
                      <button
                        key={index}
                        onClick={() => setSelectedScreenshot(index)}
                        className="flex-shrink-0 w-24 h-16 overflow-hidden"
                        style={{
                          borderRadius: 2,
                          border: `2px solid ${selectedScreenshot === index ? C.gold : C.border}`,
                          transition: "border-color 0.2s",
                          cursor: "pointer",
                          background: "none",
                          padding: 0,
                        }}
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
