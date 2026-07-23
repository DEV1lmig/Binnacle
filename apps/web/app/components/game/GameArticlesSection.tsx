"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { ArticleCard } from "@/app/components/articles/ArticleCard";
import { Skeleton } from "@/app/components/ui/skeleton";
import { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";

interface GameArticlesSectionProps {
  gameId: Id<"games">;
  limit?: number;
}

export function GameArticlesSection({ gameId, limit = 6 }: GameArticlesSectionProps) {
  const router = useRouter();
  const articles = useQuery(api.articles.listPublishedByGame, { gameId, limit });

  const isLoading = articles === undefined;
  const entries = useMemo(() => articles ?? [], [articles]);

  if (!isLoading && entries.length === 0) {
    return null;
  }

  return (
    <section className="bg-[var(--bkl-color-bg-secondary)] border border-[var(--bkl-color-border)] rounded-[var(--bkl-radius-lg)] p-6">
      <div className="flex items-center justify-between mb-4">
        <h2
          className="text-[var(--bkl-color-text-primary)]"
          style={{ fontSize: "var(--bkl-font-size-2xl)", fontWeight: "var(--bkl-font-weight-semibold)" }}
        >
          Articles about this game
        </h2>
        <button
          onClick={() => router.push(`/article/new?gameId=${gameId}`)}
          className="text-[var(--bkl-color-accent-primary)] hover:text-[var(--bkl-color-accent-hover)]"
          style={{ fontSize: "var(--bkl-font-size-sm)" }}
        >
          Write an Article →
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(2)].map((_, index) => (
            <Skeleton key={index} className="h-40 bg-[var(--bkl-color-bg-tertiary)]" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {entries.map((article) => (
            <ArticleCard key={String(article._id)} article={article} compact />
          ))}
        </div>
      )}
    </section>
  );
}
