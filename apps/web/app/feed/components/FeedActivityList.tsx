"use client";

import { MessageSquareHeart } from "lucide-react";
import { AdSpace } from "@/app/components/AdSpace";
import { ReviewCard, type ReviewCardData } from "@/app/components/ReviewCard";
import { ArticleCard, type ArticleCardData } from "@/app/components/articles/ArticleCard";
import { EmptyState } from "@/app/components/EmptyState";
import { Skeleton } from "@/app/components/ui/skeleton";
import { Id } from "@/convex/_generated/dataModel";
import type { FeedReviewEntry } from "./FeedReviewList";

export type FeedArticleEntry = {
  article: {
    _id: Id<"articles">;
    _creationTime: number;
    title: string;
    excerpt?: string;
    type?: string;
    tags?: string[];
    containsSpoilers: boolean;
    coverUrl?: string;
    publishedAt?: number;
  };
  author: ArticleCardData["author"];
  games: ArticleCardData["games"];
  likeCount: number;
  viewerHasLiked: boolean;
  commentCount: number;
};

type MixedEntry =
  | { kind: "review"; timestamp: number; entry: FeedReviewEntry }
  | { kind: "article"; timestamp: number; entry: FeedArticleEntry };

export function FeedActivityList({ reviewEntries, articleEntries, isLoading, emptyMessage, emptyAction }: {
  reviewEntries: FeedReviewEntry[];
  articleEntries: FeedArticleEntry[];
  isLoading: boolean;
  emptyMessage?: string;
  emptyAction?: { label: string; href: string };
}) {
  if (isLoading) {
    return <div className="space-y-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-44 rounded-2xl bg-surface" />)}</div>;
  }

  const mixed: MixedEntry[] = [
    ...reviewEntries.map(entry => ({ kind: "review" as const, timestamp: entry.review._creationTime, entry })),
    ...articleEntries.map(entry => ({ kind: "article" as const, timestamp: entry.article.publishedAt ?? entry.article._creationTime, entry })),
  ].sort((a, b) => b.timestamp - a.timestamp);

  if (mixed.length === 0) {
    return <EmptyState icon={<MessageSquareHeart size={36} />} title="Nothing here yet" description={emptyMessage ?? "Follow people to see their reviews and stories here."} actionLabel={emptyAction?.label} actionHref={emptyAction?.href} />;
  }

  return (
    <div className="space-y-4">
      {mixed.map((item, index) => {
        if (item.kind === "review") {
          const { entry } = item;
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
            author: entry.author,
            game: entry.game,
          };
          return (
            <div key={`review-${entry.review._id}`} className="space-y-4">
              <ReviewCard review={review} />
              {index === 2 && <AdSpace variant="inline" />}
            </div>
          );
        }
        const { entry } = item;
        const article: ArticleCardData = { ...entry.article, likeCount: entry.likeCount, viewerHasLiked: entry.viewerHasLiked, commentCount: entry.commentCount, author: entry.author, games: entry.games };
        return <ArticleCard key={`article-${entry.article._id}`} article={article} layout="row" />;
      })}
    </div>
  );
}
