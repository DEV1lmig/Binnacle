"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { MessageSquare } from "lucide-react";
import { ReviewCard } from "@/app/components/ReviewCard";
import { AdSpace } from "@/app/components/AdSpace";
import { Skeleton } from "@/app/components/ui/skeleton";
import { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { C, FONT_HEADING, FONT_MONO, FONT_BODY } from "@/app/lib/design-system";
import { CornerMarkers } from "@/app/lib/design-primitives";

interface GameReviewsSectionProps {
  gameId: Id<"games">;
  limit?: number;
}

export function GameReviewsSection({ gameId, limit = 6 }: GameReviewsSectionProps) {
  const router = useRouter();
  const reviews = useQuery(api.reviews.listForGame, { gameId, limit });
  const [btnHover, setBtnHover] = useState(false);

  const isLoading = reviews === undefined;
  const entries = useMemo(() => reviews ?? [], [reviews]);

  return (
    <section
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 2,
        padding: 24,
        position: "relative",
      }}
    >
      <CornerMarkers size={8} />

      <div className="flex items-center justify-between mb-4">
        <h2
          style={{
            fontFamily: FONT_HEADING,
            fontWeight: 200,
            fontSize: 20,
            color: C.text,
          }}
        >
          Community Reviews
        </h2>
        <button
          onClick={() => router.push(`/review/new?gameId=${gameId}`)}
          onMouseEnter={() => setBtnHover(true)}
          onMouseLeave={() => setBtnHover(false)}
          style={{
            fontFamily: FONT_MONO,
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: btnHover ? C.text : C.gold,
            background: "none",
            border: "none",
            cursor: "pointer",
          }}
        >
          Write a Review →
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, index) => (
            <Skeleton key={index} style={{ height: 128, backgroundColor: C.bgAlt }} />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div
          className="text-center"
          style={{
            background: C.bgAlt,
            border: `1px solid ${C.border}`,
            borderRadius: 2,
            padding: 32,
            position: "relative",
          }}
        >
          <CornerMarkers size={6} />
          <MessageSquare className="w-8 h-8 mx-auto mb-3" style={{ color: C.textDim }} />
          <p
            style={{
              fontFamily: FONT_BODY,
              fontSize: 14,
              fontWeight: 300,
              color: C.textMuted,
            }}
          >
            No reviews yet. Be the first to review this game!
          </p>
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
