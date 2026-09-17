"use client";

import { useQuery } from "convex/react";
import { MessageSquareHeart } from "lucide-react";
import { ReviewCard } from "@/app/components/ReviewCard";
import { AdSpace } from "@/app/components/AdSpace";
import { EmptyState } from "@/app/components/EmptyState";
import { Skeleton } from "@/app/components/ui/skeleton";
import { SectionHeading } from "@/app/components/playchive";
import { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";

export function GameReviewsSection({ gameId, limit = 6 }: { gameId: Id<"games">; limit?: number }) {
  const reviews = useQuery(api.reviews.listForGame, { gameId, limit });
  const entries = reviews ?? [];
  return (
    <section>
      <SectionHeading eyebrow={<>Reviews {reviews !== undefined && <b>{entries.length}</b>}</>} title="What players say." action={{ label: "Write yours", href: `/review/new?gameId=${gameId}` }} />
      {reviews === undefined ? (
        <div className="space-y-4">{[...Array(2)].map((_, i) => <Skeleton key={i} className="h-44 rounded-2xl bg-surface" />)}</div>
      ) : entries.length === 0 ? (
        <EmptyState icon={<MessageSquareHeart size={36} />} title="No reviews yet" description="Be the first to say what this game is like to play." actionLabel="Write a review" actionHref={`/review/new?gameId=${gameId}`} />
      ) : (
        <div className="space-y-4">
          {entries.map((review, index) => <div key={review._id} className="space-y-4"><ReviewCard review={review} />{index === 2 && <AdSpace variant="inline" />}</div>)}
        </div>
      )}
    </section>
  );
}
