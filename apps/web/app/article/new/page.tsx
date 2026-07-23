"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Id } from "@/convex/_generated/dataModel";
import { ArticleForm } from "@/app/components/articles/ArticleForm";
import { C } from "@/app/lib/design-system";

function NewArticlePageContent() {
  const searchParams = useSearchParams();
  const gameIdParam = searchParams.get("gameId");
  const draftIdParam = searchParams.get("draftId");

  return (
    <ArticleForm
      articleId={draftIdParam ? (draftIdParam as Id<"articles">) : undefined}
      initialGameId={!draftIdParam && gameIdParam ? (gameIdParam as Id<"games">) : undefined}
    />
  );
}

export default function NewArticlePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: C.bg, color: C.textMuted }}>
          Loading…
        </div>
      }
    >
      <NewArticlePageContent />
    </Suspense>
  );
}
