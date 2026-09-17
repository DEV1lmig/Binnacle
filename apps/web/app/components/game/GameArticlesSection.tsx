"use client";

import { useQuery } from "convex/react";
import { ArticleCard } from "@/app/components/articles/ArticleCard";
import { Skeleton } from "@/app/components/ui/skeleton";
import { SectionHeading } from "@/app/components/playchive";
import { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";

export function GameArticlesSection({ gameId, limit = 6 }: { gameId: Id<"games">; limit?: number }) {
  const articles = useQuery(api.articles.listPublishedByGame, { gameId, limit });
  if (articles !== undefined && articles.length === 0) return null;
  return (
    <section>
      <SectionHeading eyebrow="Stories" title="Longer takes on this game." action={{ label: "Write a story", href: `/article/new?gameId=${gameId}` }} />
      {articles === undefined ? (
        <div className="space-y-4">{[...Array(2)].map((_, i) => <Skeleton key={i} className="h-48 rounded-2xl bg-surface" />)}</div>
      ) : (
        <div className="space-y-4">{articles.map(article => <ArticleCard key={String(article._id)} article={article} layout="row" />)}</div>
      )}
    </section>
  );
}
