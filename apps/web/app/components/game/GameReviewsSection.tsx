"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { ReviewCard } from "@/app/components/ReviewCard";
import { AdSpace } from "@/app/components/AdSpace";
import { Skeleton } from "@/app/components/ui/skeleton";
import { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";

interface GameReviewsSectionProps {
  gameId: Id<"games">;
  limit?: number;
}

export function GameReviewsSection({ gameId, limit = 6 }: GameReviewsSectionProps) {
  const router = useRouter();
  const reviews = useQuery(api.reviews.listForGame, { gameId, limit });

  const isLoading = reviews === undefined;
  const entries = useMemo(() => reviews ?? [], [reviews]);

  return (
    <section className="bg-[var(--bkl-color-bg-secondary)] border border-[var(--bkl-color-border)] rounded-[var(--bkl-radius-lg)] p-6">
      <div className="flex items-center justify-between mb-4">
        <h2
          className="text-[var(--bkl-color-text-primary)]"
          style={{ fontSize: "var(--bkl-font-size-2xl)", fontWeight: "var(--bkl-font-weight-semibold)" }}
        >
          Community Reviews
        </h2>
        <button
          onClick={() => router.push(`/review/new?gameId=${gameId}`)}
          className="text-[var(--bkl-color-accent-primary)] hover:text-[var(--bkl-color-accent-hover)]"
          style={{ fontSize: "var(--bkl-font-size-sm)" }}
        >
          Write a Review →
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, index) => (
            <Skeleton key={index} className="h-32 bg-[var(--bkl-color-bg-tertiary)]" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-8 text-[var(--bkl-color-text-disabled)]">
          <p>No reviews yet. Be the first to review this game!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {entries.map((review, index) => (
            <div key={review._id} className="space-y-4">
              <ReviewCard review={review} />
              {index === 2 ? (
                <div className="mt-2">
                  <AdSpace variant="inline" />
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}