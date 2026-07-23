"use client";

import { useParams } from "next/navigation";
import { Id } from "@/convex/_generated/dataModel";
import { ArticleForm } from "@/app/components/articles/ArticleForm";

export default function EditArticlePage() {
  const params = useParams();
  const articleId = params.id as Id<"articles">;

  return <ArticleForm articleId={articleId} />;
}
