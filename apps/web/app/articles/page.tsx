"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { PenLine, BookOpen } from "lucide-react";
import { ArticleCard } from "@/app/components/articles/ArticleCard";
import { EmptyState } from "@/app/components/EmptyState";
import { Skeleton } from "@/app/components/ui/skeleton";
import { PageHero, Pill, SectionHeading, Segmented } from "@/app/components/playchive";
import { withViewTransition } from "@/app/lib/viewTransition";

type Tab = "all" | "review" | "opinion" | "analysis";

export default function ArticlesPage() {
  const [tab, setTab] = useState<Tab>("all");
  const articles = useQuery(api.articles.listPublished, { type: tab === "all" ? undefined : tab, limit: 30 });
  const [lead, ...rest] = articles ?? [];

  return (
    <div className="min-h-screen pb-24 md:pb-12 bg-bg">
      <PageHero
        tone="orange"
        eyebrow="Stories"
        title={<>Longer than a rating. <em>Worth the read.</em></>}
        lede="Criticism, opinion and analysis written by players. Every story is linked to the games it’s about, and spoilers stay behind a gate until you say so."
        aside={<Pill href="/article/new" tone="ink"><PenLine size={17} />Write a story</Pill>}
        strip={<Segmented value={tab} onChange={next => withViewTransition(() => setTab(next))} label="Story type" tone="cobalt" scroll options={[{ value: "all", label: "All" }, { value: "review", label: "Reviews" }, { value: "opinion", label: "Opinion" }, { value: "analysis", label: "Analysis" }]} />}
      />

      <div className="max-w-[1400px] mx-auto px-5 md:px-8 pt-10">
        {articles === undefined ? (
          <div className="space-y-6">
            <Skeleton className="h-[420px] rounded-2xl bg-surface" />
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-80 rounded-2xl bg-surface" />)}</div>
          </div>
        ) : !lead ? (
          <EmptyState icon={<BookOpen size={36} />} title="No stories yet" description="Be the first to publish. Reviews, opinions and analysis all belong here." actionLabel="Write a story" actionHref="/article/new" />
        ) : (
          <>
            <SectionHeading eyebrow="Latest" title="The lead story." />
            <ArticleCard article={lead} layout="feature" />
            {rest.length > 0 && (
              <section className="pt-12">
                <SectionHeading eyebrow={<>More stories <b>{rest.length}</b></>} title="Keep reading." />
                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{rest.map(article => <ArticleCard key={String(article._id)} article={article} />)}</div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
