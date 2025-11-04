"use client";

import { AdSpace } from "@/app/components/AdSpace";
import { ReviewCard, type ReviewCardData } from "@/app/components/ReviewCard";
import { Skeleton } from "@/app/components/ui/skeleton";
import { Id } from "@/convex/_generated/dataModel";

export type FeedReviewEntry = {
  review: {
    _id: Id<"reviews">;
    _creationTime: number;
    userId: Id<"users">;
    gameId: Id<"games">;
    rating: number;
    platform?: string;
    text?: string;
    playtimeHours?: number;
  };
  author: ReviewCardData["author"];
  game: ReviewCardData["game"] & {
    aggregatedRating?: number;
  };
  likeCount: number;
  viewerHasLiked: boolean;
  commentCount: number;
};

interface FeedReviewListProps {
  entries: FeedReviewEntry[];
  isLoading: boolean;
}

export function FeedReviewList({ entries, isLoading }: FeedReviewListProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, index) => (
          <Skeleton key={index} className="h-32 bg-[var(--bkl-color-bg-secondary)]" />
        ))}
      </div>
    );
  }

  if (!entries.length) {
    return (
      <p className="text-center py-8 text-[var(--bkl-color-text-secondary)]">
        No activity yet. Follow users to see their reviews!
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {entries.map((entry, index) => {
        const review: ReviewCardData = {
          _id: entry.review._id,
          _creationTime: entry.review._creationTime,
          userId: entry.review.userId,
          gameId: entry.review.gameId,
          rating: entry.review.rating,
          platform: entry.review.platform ?? undefined,
          text: entry.review.text ?? undefined,
          playtimeHours: entry.review.playtimeHours ?? undefined,
          likeCount: entry.likeCount,
          viewerHasLiked: entry.viewerHasLiked,
          commentCount: entry.commentCount,
          author: {
            _id: entry.author._id,
            name: entry.author.name,
            username: entry.author.username,
            avatarUrl: entry.author.avatarUrl ?? undefined,
          },
          game: {
            _id: entry.game._id,
            title: entry.game.title,
            coverUrl: entry.game.coverUrl ?? undefined,
            releaseYear: entry.game.releaseYear ?? undefined,
          },
        };

        return (
          <div key={`${entry.review._id}-${index}`} className="space-y-4">
            <ReviewCard review={review} />
            {index === 1 ? (
              <div className="mt-4">
                <AdSpace variant="inline" />
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
