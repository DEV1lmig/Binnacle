"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ArticleCard } from "@/app/components/articles/ArticleCard";
import { Button } from "@/app/components/ui/button";
import { Skeleton } from "@/app/components/ui/skeleton";
import { PenLine } from "lucide-react";
import { C, FONT_HEADING, FONT_MONO, FONT_BODY } from "@/app/lib/design-system";

type TabValue = "all" | "review" | "opinion" | "analysis";

const TABS: Array<{ value: TabValue; label: string }> = [
  { value: "all", label: "All" },
  { value: "review", label: "Reviews" },
  { value: "opinion", label: "Opinion" },
  { value: "analysis", label: "Analysis" },
];

export default function ArticlesDiscoverPage() {
  const router = useRouter();
  const [tab, setTab] = useState<TabValue>("all");

  const articles = useQuery(api.articles.listPublished, {
    type: tab === "all" ? undefined : tab,
    limit: 30,
  });

  return (
    <div className="min-h-screen pb-20 md:pb-8" style={{ backgroundColor: C.bg }}>
      <div className="max-w-3xl mx-auto p-4 md:p-6 lg:p-8">
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 style={{ fontFamily: FONT_HEADING, fontSize: 28, fontWeight: 200, color: C.text }}>Articles</h1>
            <p style={{ fontFamily: FONT_BODY, fontSize: 13, color: C.textMuted, marginTop: 4 }}>
              Criticism, opinion, and analysis from the community.
            </p>
          </div>
          <Button onClick={() => router.push("/article/new")} className="text-white" style={{ backgroundColor: C.gold }}>
            <PenLine className="w-4 h-4 mr-2" />
            Write
          </Button>
        </header>

        <div className="flex items-center gap-1 mb-6" style={{ borderBottom: `1px solid ${C.border}` }}>
          {TABS.map((t) => {
            const active = tab === t.value;
            return (
              <button
                key={t.value}
                onClick={() => setTab(t.value)}
                className="px-4 py-2 transition-colors"
                style={{
                  fontFamily: FONT_MONO,
                  fontSize: 12,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: active ? C.gold : C.textMuted,
                  borderBottom: `2px solid ${active ? C.gold : "transparent"}`,
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {articles === undefined ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-40" style={{ backgroundColor: C.surface }} />
            ))}
          </div>
        ) : articles.length === 0 ? (
          <div className="text-center py-16" style={{ backgroundColor: C.surface, border: `1px solid ${C.border}`, borderRadius: 2 }}>
            <p style={{ fontFamily: FONT_BODY, fontSize: 14, color: C.textMuted }}>
              No articles yet. Be the first to write one.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {articles.map((article) => (
              <ArticleCard key={String(article._id)} article={article} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
