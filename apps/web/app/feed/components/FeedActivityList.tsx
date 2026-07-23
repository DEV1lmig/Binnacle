"use client";

import { AdSpace } from "@/app/components/AdSpace";
import { ReviewCard, type ReviewCardData } from "@/app/components/ReviewCard";
import { ArticleCard, type ArticleCardData } from "@/app/components/articles/ArticleCard";
import { Skeleton } from "@/app/components/ui/skeleton";
import { Id } from "@/convex/_generated/dataModel";
import { C, FONT_BODY } from "@/app/lib/design-system";
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

interface FeedActivityListProps {
  reviewEntries: FeedReviewEntry[];
  articleEntries: FeedArticleEntry[];
  isLoading: boolean;
  emptyMessage?: string;
}

export function FeedActivityList({
  reviewEntries,
  articleEntries,
  isLoading,
  emptyMessage,
}: FeedActivityListProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, index) => (
          <Skeleton key={index} className="h-32" style={{ backgroundColor: C.surface }} />
        ))}
      </div>
    );
  }

  const mixed: MixedEntry[] = [
    ...reviewEntries.map((entry) => ({
      kind: "review" as const,
      timestamp: entry.review._creationTime,
      entry,
    })),
    ...articleEntries.map((entry) => ({
      kind: "article" as const,
      timestamp: entry.article.publishedAt ?? entry.article._creationTime,
      entry,
    })),
  ].sort((a, b) => b.timestamp - a.timestamp);

  if (mixed.length === 0) {
    return (
      <div
        className="text-center py-12"
        style={{ backgroundColor: C.surface, border: `1px solid ${C.border}`, borderRadius: 2 }}
      >
        <p style={{ color: C.textMuted, fontFamily: FONT_BODY, fontSize: 14 }}>
          {emptyMessage || "No activity yet. Follow users to see their reviews!"}
        </p>
      </div>
    );
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
            <div key={`review-${entry.review._id}-${index}`} className="space-y-4">
              <ReviewCard review={review} />
              {index === 1 ? (
                <div className="mt-4">
                  <AdSpace variant="inline" />
                </div>
              ) : null}
            </div>
          );
        }

        const { entry } = item;
        const article: ArticleCardData = {
          _id: entry.article._id,
          _creationTime: entry.article._creationTime,
          title: entry.article.title,
          excerpt: entry.article.excerpt,
          type: entry.article.type,
          tags: entry.article.tags,
          containsSpoilers: entry.article.containsSpoilers,
          coverUrl: entry.article.coverUrl,
          publishedAt: entry.article.publishedAt,
          likeCount: entry.likeCount,
          viewerHasLiked: entry.viewerHasLiked,
          commentCount: entry.commentCount,
          author: entry.author,
          games: entry.games,
        };

        return (
          <div key={`article-${entry.article._id}-${index}`} className="space-y-4">
            <ArticleCard article={article} compact />
          </div>
        );
      })}
    </div>
  );
}
