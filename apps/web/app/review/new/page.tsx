"use client";

import { useMemo, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Textarea } from "@/app/components/ui/textarea";
import { Label } from "@/app/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
import { ImageWithFallback } from "@/app/components/figma/ImageWithFallback";
import { cn } from "@/app/components/ui/utils";
import { ChevronLeft } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/app/components/ui/radio-group";

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
  
  // Backlog modal state
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
    if (!currentUser?.name) {
      return "?";
    }

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

    // Store the review data and show backlog modal
    setPendingReviewData({
      gameId: typedGameId,
      rating,
      platform: platform.trim() ? platform.trim() : undefined,
      text: text.trim() ? text.trim() : undefined,
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
      // Add to backlog first
      await addToBacklog({
        gameId: pendingReviewData.gameId,
        status: selectedBacklogStatus as "want_to_play" | "playing" | "completed" | "on_hold" | "dropped",
      });

      // Then create the review
      const reviewId = await createReview({
        gameId: pendingReviewData.gameId,
        rating: pendingReviewData.rating,
        platform: pendingReviewData.platform,
        text: pendingReviewData.text,
        playtimeHours: pendingReviewData.playtimeHours,
      });

      // Close modal and navigate
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
    <div className="min-h-screen bg-[var(--bkl-color-bg-primary)] pb-20 md:pb-8">
      <div className="max-w-4xl mx-auto p-4 md:p-6 lg:p-8">
        <button
          onClick={handleCancel}
          className="flex items-center gap-2 text-[var(--bkl-color-text-secondary)] hover:text-[var(--bkl-color-accent-primary)] transition-colors mb-6"
        >
          <ChevronLeft className="w-5 h-5" />
          <span style={{ fontSize: "var(--bkl-font-size-sm)" }}>Back</span>
        </button>

        <div className="bg-[var(--bkl-color-bg-secondary)] border border-[var(--bkl-color-border)] rounded-[var(--bkl-radius-lg)] shadow-[var(--bkl-shadow-md)]">
          <header className="border-b border-[var(--bkl-color-border)] p-6">
            <h1
              className="text-[var(--bkl-color-text-primary)] mb-2"
              style={{ fontSize: "var(--bkl-font-size-3xl)", fontWeight: "var(--bkl-font-weight-bold)" }}
            >
              Craft a Review
            </h1>
            <p
              className="text-[var(--bkl-color-text-secondary)]"
              style={{ fontSize: "var(--bkl-font-size-sm)" }}
            >
              Share your thoughts, assign a score, and help the community discover their next favorite game.
            </p>
          </header>

          <form onSubmit={handleSubmit} className="grid gap-6 p-6">
            {game ? (
              <section className="flex gap-4 items-center bg-[var(--bkl-color-bg-tertiary)]/60 border border-[var(--bkl-color-border)] rounded-[var(--bkl-radius-md)] p-4">
                <div className="w-16 h-24 rounded-[var(--bkl-radius-sm)] overflow-hidden flex-shrink-0">
                  <ImageWithFallback
                    src={game.coverUrl ?? ""}
                    alt={game.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1">
                  <h2
                    className="text-[var(--bkl-color-text-primary)]"
                    style={{ fontSize: "var(--bkl-font-size-lg)", fontWeight: "var(--bkl-font-weight-semibold)" }}
                  >
                    {game.title}
                  </h2>
                  {game.releaseYear ? (
                    <p
                      className="text-[var(--bkl-color-text-secondary)]"
                      style={{ fontSize: "var(--bkl-font-size-sm)" }}
                    >
                      Released in {game.releaseYear}
                    </p>
                  ) : null}
                </div>
              </section>
            ) : typedGameId ? (
              <div className="bg-[var(--bkl-color-bg-tertiary)] border border-[var(--bkl-color-border)] rounded-[var(--bkl-radius-md)] p-4">
                <p className="text-[var(--bkl-color-text-secondary)]">Loading game details…</p>
              </div>
            ) : (
              <div className="bg-[var(--bkl-color-feedback-error)]/10 border border-[var(--bkl-color-feedback-error)]/40 text-[var(--bkl-color-feedback-error)] rounded-[var(--bkl-radius-md)] p-4">
                No game selected. Return to a game page and use “Write a Review” to get started.
              </div>
            )}

            <section className="grid gap-2">
              <Label htmlFor="rating" className="text-[var(--bkl-color-text-primary)]">
                Rating
              </Label>
              <div className="flex flex-wrap gap-2" id="rating">
                {Array.from({ length: 10 }, (_, index) => index + 1).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRating(value)}
                    className={cn(
                      "w-10 h-10 rounded-full border transition-all",
                      value <= rating
                        ? "bg-[var(--bkl-color-accent-primary)] text-[var(--bkl-color-bg-primary)] border-[var(--bkl-color-accent-primary)]"
                        : "border-[var(--bkl-color-border)] text-[var(--bkl-color-text-secondary)] hover:border-[var(--bkl-color-accent-primary)]"
                    )}
                  >
                    {value}
                  </button>
                ))}
              </div>
              <p
                className="text-[var(--bkl-color-text-secondary)]"
                style={{ fontSize: "var(--bkl-font-size-xs)" }}
              >
                Choose a score from 1 (lowest) to 10 (highest).
              </p>
            </section>

            <section className="grid gap-2 md:grid-cols-2 md:gap-4">
              <div className="grid gap-2">
                <Label htmlFor="platform" className="text-[var(--bkl-color-text-primary)]">
                  Platform (optional)
                </Label>
                <Input
                  id="platform"
                  placeholder="PC, PS5, Switch…"
                  value={platform}
                  onChange={(event) => setPlatform(event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="playtime" className="text-[var(--bkl-color-text-primary)]">
                  Playtime in hours (optional)
                </Label>
                <Input
                  id="playtime"
                  type="number"
                  min={0}
                  step={0.5}
                  placeholder="e.g. 42"
                  value={playtime}
                  onChange={(event) => setPlaytime(event.target.value)}
                />
              </div>
            </section>

            <section className="grid gap-2">
              <Label htmlFor="review-text" className="text-[var(--bkl-color-text-primary)]">
                Review
              </Label>
              <Textarea
                id="review-text"
                placeholder="What stood out? How did it play? Would you recommend it?"
                value={text}
                onChange={(event) => setText(event.target.value)}
                className="min-h-[180px] bg-[var(--bkl-color-bg-primary)] border-[var(--bkl-color-border)] text-[var(--bkl-color-text-primary)]"
              />
              <p
                className="text-[var(--bkl-color-text-secondary)]"
                style={{ fontSize: "var(--bkl-font-size-xs)" }}
              >
                Reviews are public. Keep spoilers marked and follow community guidelines.
              </p>
            </section>

            {error ? (
              <div className="bg-[var(--bkl-color-feedback-error)]/10 border border-[var(--bkl-color-feedback-error)]/40 text-[var(--bkl-color-feedback-error)] rounded-[var(--bkl-radius-md)] p-3">
                {error}
              </div>
            ) : null}

            <footer className="flex flex-col-reverse gap-3 md:flex-row md:items-center md:justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                className="border-[var(--bkl-color-border)] text-[var(--bkl-color-text-secondary)] hover:bg-[var(--bkl-color-bg-tertiary)]"
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!isReady || isSubmitting}
                className="bg-[var(--bkl-color-accent-primary)] hover:bg-[var(--bkl-color-accent-primary)]/90 disabled:opacity-60"
              >
                {isSubmitting ? "Saving…" : "Publish Review"}
              </Button>
            </footer>
          </form>
        </div>

        <aside className="mt-8 bg-[var(--bkl-color-bg-secondary)] border border-[var(--bkl-color-border)] rounded-[var(--bkl-radius-lg)] p-6">
          <h2
            className="text-[var(--bkl-color-text-primary)] mb-4"
            style={{ fontSize: "var(--bkl-font-size-xl)", fontWeight: "var(--bkl-font-weight-semibold)" }}
          >
            Publishing as
          </h2>
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              {currentUser?.avatarUrl ? (
                <AvatarImage src={currentUser.avatarUrl} alt={currentUser.name} />
              ) : null}
              <AvatarFallback className="bg-[var(--bkl-color-accent-primary)] text-[var(--bkl-color-bg-primary)]">
                {authorInitials}
              </AvatarFallback>
            </Avatar>
            <div>
              <p
                className="text-[var(--bkl-color-text-primary)]"
                style={{ fontSize: "var(--bkl-font-size-base)", fontWeight: "var(--bkl-font-weight-semibold)" }}
              >
                {currentUser?.name ?? "Guest"}
              </p>
              <p
                className="text-[var(--bkl-color-text-secondary)]"
                style={{ fontSize: "var(--bkl-font-size-sm)" }}
              >
                {currentUser?.username ? `@${currentUser.username}` : "Sign in to publish"}
              </p>
            </div>
          </div>
        </aside>
      </div>

      {/* Backlog Status Modal */}
      <Dialog open={showBacklogModal} onOpenChange={setShowBacklogModal}>
        <DialogContent className="bg-[var(--bkl-color-bg-secondary)] border-[var(--bkl-color-border)] text-[var(--bkl-color-text-primary)]">
          <DialogHeader>
            <DialogTitle style={{ fontSize: "var(--bkl-font-size-xl)", fontWeight: "var(--bkl-font-weight-bold)" }}>
              Add to Your Backlog
            </DialogTitle>
            <DialogDescription className="text-[var(--bkl-color-text-secondary)]">
              Before publishing, let&apos;s add this game to your backlog. Select a status that best describes your experience:
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <RadioGroup value={selectedBacklogStatus} onValueChange={setSelectedBacklogStatus}>
              <div className="flex items-center space-x-3 p-3 rounded-[var(--bkl-radius-md)] hover:bg-[var(--bkl-color-bg-tertiary)] cursor-pointer transition-colors border border-[var(--bkl-color-border)]">
                <RadioGroupItem value="want_to_play" id="want_to_play" />
                <Label htmlFor="want_to_play" className="cursor-pointer flex-1">
                  <p className="font-semibold text-[var(--bkl-color-text-primary)]">Want to Play</p>
                  <p className="text-sm text-[var(--bkl-color-text-secondary)]">Planning to play this game</p>
                </Label>
              </div>

              <div className="flex items-center space-x-3 p-3 rounded-[var(--bkl-radius-md)] hover:bg-[var(--bkl-color-bg-tertiary)] cursor-pointer transition-colors border border-[var(--bkl-color-border)]">
                <RadioGroupItem value="playing" id="playing" />
                <Label htmlFor="playing" className="cursor-pointer flex-1">
                  <p className="font-semibold text-[var(--bkl-color-text-primary)]">Playing</p>
                  <p className="text-sm text-[var(--bkl-color-text-secondary)]">Currently playing through this game</p>
                </Label>
              </div>

              <div className="flex items-center space-x-3 p-3 rounded-[var(--bkl-radius-md)] hover:bg-[var(--bkl-color-bg-tertiary)] cursor-pointer transition-colors border border-[var(--bkl-color-border)] bg-[var(--bkl-color-bg-tertiary)]">
                <RadioGroupItem value="completed" id="completed" />
                <Label htmlFor="completed" className="cursor-pointer flex-1">
                  <p className="font-semibold text-[var(--bkl-color-text-primary)]">Completed ✓</p>
                  <p className="text-sm text-[var(--bkl-color-text-secondary)]">You&apos;ve finished this game (recommended)</p>
                </Label>
              </div>

              <div className="flex items-center space-x-3 p-3 rounded-[var(--bkl-radius-md)] hover:bg-[var(--bkl-color-bg-tertiary)] cursor-pointer transition-colors border border-[var(--bkl-color-border)]">
                <RadioGroupItem value="on_hold" id="on_hold" />
                <Label htmlFor="on_hold" className="cursor-pointer flex-1">
                  <p className="font-semibold text-[var(--bkl-color-text-primary)]">On Hold</p>
                  <p className="text-sm text-[var(--bkl-color-text-secondary)]">Paused for now, might return later</p>
                </Label>
              </div>

              <div className="flex items-center space-x-3 p-3 rounded-[var(--bkl-radius-md)] hover:bg-[var(--bkl-color-bg-tertiary)] cursor-pointer transition-colors border border-[var(--bkl-color-border)]">
                <RadioGroupItem value="dropped" id="dropped" />
                <Label htmlFor="dropped" className="cursor-pointer flex-1">
                  <p className="font-semibold text-[var(--bkl-color-text-primary)]">Dropped</p>
                  <p className="text-sm text-[var(--bkl-color-text-secondary)]">Not finishing this one</p>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-[var(--bkl-color-border)]">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowBacklogModal(false)}
              className="border-[var(--bkl-color-border)] text-[var(--bkl-color-text-secondary)] hover:bg-[var(--bkl-color-bg-tertiary)]"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirmWithBacklog}
              disabled={isSubmitting}
              className="bg-[var(--bkl-color-accent-primary)] hover:bg-[var(--bkl-color-accent-primary)]/90"
            >
              {isSubmitting ? "Publishing…" : "Publish Review"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function NewReviewPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[var(--bkl-color-bg-primary)] flex items-center justify-center">
        <div className="text-[var(--bkl-color-text-secondary)]">Loading...</div>
      </div>
    }>
      <NewReviewPageContent />
    </Suspense>
  );
}
