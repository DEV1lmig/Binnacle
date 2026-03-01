"use client";

import { useMemo, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
import { ImageWithFallback } from "@/app/components/figma/ImageWithFallback";
import { getStandardCoverUrl } from "@/lib/igdb-images";
import { ChevronLeft, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/app/components/ui/radio-group";
import { C, FONT_HEADING, FONT_MONO, FONT_BODY, FONT_IMPORT_URL } from "@/app/lib/design-system";
import { CornerMarkers, GrainOverlay } from "@/app/lib/design-primitives";

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  background: C.bgAlt,
  border: `1px solid ${C.border}`,
  borderRadius: 1,
  color: C.text,
  fontFamily: FONT_BODY,
  fontSize: 14,
  fontWeight: 300,
  outline: "none",
  transition: "border-color 0.2s",
};

const labelStyle: React.CSSProperties = {
  fontFamily: FONT_MONO,
  fontSize: 10,
  fontWeight: 400,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: C.textMuted,
};

const ghostButtonStyle: React.CSSProperties = {
  padding: "10px 20px",
  background: "transparent",
  border: `1px solid ${C.border}`,
  borderRadius: 2,
  fontFamily: FONT_MONO,
  fontSize: 11,
  fontWeight: 400,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: C.textMuted,
  cursor: "pointer",
  transition: "all 0.2s",
};

const primaryButtonStyle: React.CSSProperties = {
  padding: "10px 20px",
  background: C.gold,
  color: C.bg,
  border: "none",
  borderRadius: 2,
  fontFamily: FONT_MONO,
  fontSize: 11,
  fontWeight: 400,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  cursor: "pointer",
  boxShadow: `0 0 16px ${C.bloom}`,
  transition: "all 0.2s",
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
};

const BACKLOG_STATUSES = [
  { value: "want_to_play", name: "Want to Play", desc: "Planning to play this game" },
  { value: "playing", name: "Playing", desc: "Currently playing through this game" },
  { value: "completed", name: "Completed", desc: "You've finished this game (recommended)" },
  { value: "on_hold", name: "On Hold", desc: "Paused for now, might return later" },
  { value: "dropped", name: "Dropped", desc: "Not finishing this one" },
] as const;

function NewReviewPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const gameIdParam = searchParams.get("gameId");
  const typedGameId = gameIdParam ? (gameIdParam as Id<"games">) : null;

  const game = useQuery(api.games.getById, typedGameId ? { gameId: typedGameId } : "skip");
  const currentUser = useQuery(api.users.current);
  const createReview = useMutation(api.reviews.create);
  const addToBacklog = useMutation(api.backlog.add);

  const [rating, setRating] = useState(8);
  const [platform, setPlatform] = useState("");
  const [playtime, setPlaytime] = useState("");
  const [text, setText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showBacklogModal, setShowBacklogModal] = useState(false);
  const [selectedBacklogStatus, setSelectedBacklogStatus] = useState("completed");
  const [pendingReviewData, setPendingReviewData] = useState<{
    gameId: Id<"games">;
    rating: number;
    platform?: string;
    text?: string;
    playtimeHours?: number;
  } | null>(null);

  const authorInitials = useMemo(() => {
    if (!currentUser?.name) return "?";
    return currentUser.name
      .split(" ")
      .map((part) => part.charAt(0).toUpperCase())
      .slice(0, 2)
      .join("");
  }, [currentUser?.name]);

  const isReady = Boolean(currentUser) && Boolean(typedGameId);

  const handleCancel = () => {
    if (typedGameId) {
      router.push(`/game/${typedGameId}`);
      return;
    }
    router.back();
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!typedGameId) {
      setError("Select a game before publishing a review.");
      return;
    }

    if (rating < 1 || rating > 10) {
      setError("Please choose a rating between 1 and 10.");
      return;
    }

    const parsedPlaytime = playtime.trim() ? Number(playtime) : undefined;
    if (parsedPlaytime !== undefined && (Number.isNaN(parsedPlaytime) || parsedPlaytime < 0)) {
      setError("Playtime must be a non-negative number of hours.");
      return;
    }

    setPendingReviewData({
      gameId: typedGameId,
      rating,
      platform: platform.trim() || undefined,
      text: text.trim() || undefined,
      playtimeHours: parsedPlaytime,
    });
    setShowBacklogModal(true);
    setError(null);
  };

  const handleConfirmWithBacklog = async () => {
    if (!pendingReviewData) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await addToBacklog({
        gameId: pendingReviewData.gameId,
        status: selectedBacklogStatus as "want_to_play" | "playing" | "completed" | "on_hold" | "dropped",
      });

      const reviewId = await createReview({
        gameId: pendingReviewData.gameId,
        rating: pendingReviewData.rating,
        platform: pendingReviewData.platform,
        text: pendingReviewData.text,
        playtimeHours: pendingReviewData.playtimeHours,
      });

      setShowBacklogModal(false);
      setPendingReviewData(null);
      router.replace(`/review/${reviewId}`);
    } catch (submissionError) {
      console.error("[NewReviewPage] Failed to create review", submissionError);
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Something went wrong while saving your review."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, position: "relative" }} className="pb-20 md:pb-8">
      <style>{`@import url('${FONT_IMPORT_URL}')`}</style>
      <GrainOverlay id="review-new-grain" />

      <div
        className="pointer-events-none fixed"
        style={{
          top: -120, left: -120, width: 400, height: 400,
          background: `radial-gradient(circle, ${C.gold}15 0%, transparent 70%)`,
          filter: "blur(60px)",
        }}
      />
      <div
        className="pointer-events-none fixed"
        style={{
          bottom: -120, right: -120, width: 400, height: 400,
          background: `radial-gradient(circle, ${C.accent}12 0%, transparent 70%)`,
          filter: "blur(60px)",
        }}
      />

      <div className="max-w-4xl mx-auto p-4 md:p-6 lg:p-8 relative" style={{ zIndex: 1 }}>
        <button
          onClick={handleCancel}
          className="flex items-center gap-2 mb-6"
          style={{
            fontFamily: FONT_MONO,
            fontSize: 11,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: C.textMuted,
            background: "none",
            border: "none",
            cursor: "pointer",
            transition: "color 0.2s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = C.gold; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = C.textMuted; }}
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
          <div
            className="relative"
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 2,
            }}
          >
            <CornerMarkers size={10} />

            <header style={{ borderBottom: `1px solid ${C.border}`, padding: 24 }}>
              <h1 style={{ fontFamily: FONT_HEADING, fontWeight: 200, fontSize: 28, color: C.text, letterSpacing: "-0.01em", margin: 0 }}>
                Craft a Review
              </h1>
              <p style={{ fontFamily: FONT_BODY, fontWeight: 300, fontSize: 13, color: C.textMuted, marginTop: 6, lineHeight: 1.5 }}>
                Share your thoughts, assign a score, and help the community discover their next favorite game.
              </p>
            </header>

            <form onSubmit={handleSubmit} className="grid gap-6" style={{ padding: 24 }}>
              {game ? (
                <section
                  className="flex gap-4 items-center"
                  style={{
                    background: C.bgAlt,
                    border: `1px solid ${C.border}`,
                    borderRadius: 1,
                    padding: 16,
                  }}
                >
                  <div style={{ width: 64, height: 96, borderRadius: 1, overflow: "hidden", flexShrink: 0 }}>
                    <ImageWithFallback
                      src={getStandardCoverUrl(game.coverUrl) ?? ""}
                      alt={game.title}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 style={{ fontFamily: FONT_HEADING, fontWeight: 300, fontSize: 16, color: C.text, margin: 0 }}>
                      {game.title}
                    </h2>
                    {game.releaseYear ? (
                      <p style={{ fontFamily: FONT_MONO, fontSize: 11, color: C.textMuted, marginTop: 4 }}>
                        Released in {game.releaseYear}
                      </p>
                    ) : null}
                  </div>
                </section>
              ) : typedGameId ? (
                <div
                  style={{
                    background: C.bgAlt,
                    border: `1px solid ${C.border}`,
                    borderRadius: 1,
                    padding: 16,
                  }}
                >
                  <p style={{ fontFamily: FONT_BODY, fontSize: 13, color: C.textMuted, margin: 0 }}>
                    Loading game details...
                  </p>
                </div>
              ) : (
                <div
                  style={{
                    background: C.red + "10",
                    border: `1px solid ${C.red}40`,
                    borderRadius: 1,
                    padding: 16,
                  }}
                >
                  <p style={{ fontFamily: FONT_BODY, fontSize: 13, color: C.red, margin: 0 }}>
                    No game selected. Return to a game page and use &quot;Write a Review&quot; to get started.
                  </p>
                </div>
              )}

              <section className="grid gap-2">
                <label htmlFor="rating" style={labelStyle}>
                  Rating
                </label>
                <div className="flex flex-wrap gap-2" id="rating">
                  {Array.from({ length: 10 }, (_, index) => index + 1).map((value) => {
                    const isSelected = value <= rating;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setRating(value)}
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: "50%",
                          border: `1px solid ${isSelected ? C.gold : C.border}`,
                          background: isSelected ? C.gold : "transparent",
                          color: isSelected ? C.bg : C.textMuted,
                          fontFamily: FONT_MONO,
                          fontSize: 12,
                          fontWeight: 400,
                          cursor: "pointer",
                          transition: "all 0.15s",
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) e.currentTarget.style.borderColor = C.gold;
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) e.currentTarget.style.borderColor = C.border;
                        }}
                      >
                        {value}
                      </button>
                    );
                  })}
                </div>
                <p style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.textDim, marginTop: 2 }}>
                  Choose a score from 1 (lowest) to 10 (highest).
                </p>
              </section>

              <section className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <label htmlFor="platform" style={labelStyle}>
                    Platform (optional)
                  </label>
                  <input
                    id="platform"
                    placeholder="PC, PS5, Switch..."
                    value={platform}
                    onChange={(event) => setPlatform(event.target.value)}
                    style={inputStyle}
                    onFocus={(e) => { e.currentTarget.style.borderColor = C.gold; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = C.border; }}
                  />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="playtime" style={labelStyle}>
                    Playtime in hours (optional)
                  </label>
                  <input
                    id="playtime"
                    type="number"
                    min={0}
                    step={0.5}
                    placeholder="e.g. 42"
                    value={playtime}
                    onChange={(event) => setPlaytime(event.target.value)}
                    style={inputStyle}
                    onFocus={(e) => { e.currentTarget.style.borderColor = C.gold; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = C.border; }}
                  />
                </div>
              </section>

              <section className="grid gap-2">
                <label htmlFor="review-text" style={labelStyle}>
                  Review
                </label>
                <textarea
                  id="review-text"
                  placeholder="What stood out? How did it play? Would you recommend it?"
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  style={{
                    ...inputStyle,
                    minHeight: 180,
                    padding: 12,
                    resize: "vertical",
                    background: C.bgAlt,
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = C.gold; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = C.border; }}
                />
                <p style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.textDim, marginTop: 2 }}>
                  Reviews are public. Keep spoilers marked and follow community guidelines.
                </p>
              </section>

              {error ? (
                <div
                  style={{
                    background: C.red + "10",
                    border: `1px solid ${C.red}40`,
                    borderRadius: 1,
                    padding: 12,
                  }}
                >
                  <p style={{ fontFamily: FONT_BODY, fontSize: 13, color: C.red, margin: 0 }}>
                    {error}
                  </p>
                </div>
              ) : null}

              <footer className="flex flex-col-reverse gap-3 md:flex-row md:items-center md:justify-between">
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={isSubmitting}
                  style={{
                    ...ghostButtonStyle,
                    opacity: isSubmitting ? 0.5 : 1,
                    cursor: isSubmitting ? "not-allowed" : "pointer",
                  }}
                  onMouseEnter={(e) => {
                    if (!isSubmitting) {
                      e.currentTarget.style.borderColor = C.gold;
                      e.currentTarget.style.color = C.text;
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = C.border;
                    e.currentTarget.style.color = C.textMuted;
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!isReady || isSubmitting}
                  style={{
                    ...primaryButtonStyle,
                    opacity: (!isReady || isSubmitting) ? 0.5 : 1,
                    cursor: (!isReady || isSubmitting) ? "not-allowed" : "pointer",
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Publish Review"
                  )}
                </button>
              </footer>
            </form>
          </div>

          <aside
            className="relative h-fit"
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 2,
              padding: 24,
            }}
          >
            <CornerMarkers size={8} />
            <h2 style={{ fontFamily: FONT_HEADING, fontWeight: 200, fontSize: 18, color: C.text, margin: 0, marginBottom: 16 }}>
              Publishing as
            </h2>
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                {currentUser?.avatarUrl ? (
                  <AvatarImage src={currentUser.avatarUrl} alt={currentUser.name} />
                ) : null}
                <AvatarFallback style={{ background: C.gold, color: C.bg, fontFamily: FONT_MONO, fontSize: 13 }}>
                  {authorInitials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p style={{ fontFamily: FONT_HEADING, fontWeight: 300, fontSize: 15, color: C.text, margin: 0 }}>
                  {currentUser?.name ?? "Guest"}
                </p>
                <p style={{ fontFamily: FONT_MONO, fontSize: 11, color: C.textMuted, margin: 0, marginTop: 2 }}>
                  {currentUser?.username ? `@${currentUser.username}` : "Sign in to publish"}
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <Dialog open={showBacklogModal} onOpenChange={setShowBacklogModal}>
        <DialogContent
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 2,
          }}
        >
          <DialogHeader>
            <DialogTitle style={{ fontFamily: FONT_HEADING, fontWeight: 200, fontSize: 20, color: C.text }}>
              Add to Your Backlog
            </DialogTitle>
            <DialogDescription style={{ fontFamily: FONT_BODY, fontWeight: 300, fontSize: 13, color: C.textMuted }}>
              Before publishing, let&apos;s add this game to your backlog. Select a status that best describes your experience:
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 py-4">
            <RadioGroup value={selectedBacklogStatus} onValueChange={setSelectedBacklogStatus}>
              {BACKLOG_STATUSES.map((status) => (
                <div
                  key={status.value}
                  className="flex items-center gap-3 cursor-pointer"
                  style={{
                    padding: 12,
                    border: `1px solid ${C.border}`,
                    borderRadius: 1,
                    background: selectedBacklogStatus === status.value ? C.bgAlt : "transparent",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = C.bgAlt; }}
                  onMouseLeave={(e) => {
                    if (selectedBacklogStatus !== status.value) e.currentTarget.style.background = "transparent";
                  }}
                >
                  <RadioGroupItem value={status.value} id={status.value} />
                  <label htmlFor={status.value} className="cursor-pointer flex-1">
                    <p style={{ fontFamily: FONT_BODY, fontWeight: 500, fontSize: 14, color: C.text, margin: 0 }}>
                      {status.name}
                    </p>
                    <p style={{ fontFamily: FONT_BODY, fontWeight: 300, fontSize: 12, color: C.textMuted, margin: 0, marginTop: 2 }}>
                      {status.desc}
                    </p>
                  </label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div
            className="flex gap-3 justify-end"
            style={{ paddingTop: 16, borderTop: `1px solid ${C.border}` }}
          >
            <button
              type="button"
              onClick={() => setShowBacklogModal(false)}
              disabled={isSubmitting}
              style={{
                ...ghostButtonStyle,
                opacity: isSubmitting ? 0.5 : 1,
                cursor: isSubmitting ? "not-allowed" : "pointer",
              }}
              onMouseEnter={(e) => {
                if (!isSubmitting) {
                  e.currentTarget.style.borderColor = C.gold;
                  e.currentTarget.style.color = C.text;
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = C.border;
                e.currentTarget.style.color = C.textMuted;
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmWithBacklog}
              disabled={isSubmitting}
              style={{
                ...primaryButtonStyle,
                opacity: isSubmitting ? 0.5 : 1,
                cursor: isSubmitting ? "not-allowed" : "pointer",
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Publishing...
                </>
              ) : (
                "Publish Review"
              )}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function NewReviewPage() {
  return (
    <Suspense
      fallback={
        <div
          className="flex min-h-screen items-center justify-center"
          style={{ background: C.bg }}
        >
          <style>{`@import url('${FONT_IMPORT_URL}')`}</style>
          <p style={{ fontFamily: FONT_MONO, fontSize: 12, color: C.textMuted, letterSpacing: "0.1em", textTransform: "uppercase" }}>
            Loading...
          </p>
        </div>
      }
    >
      <NewReviewPageContent />
    </Suspense>
  );
}
