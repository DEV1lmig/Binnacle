"use client";

import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
import { Button } from "@/app/components/ui/button";
import { ImageWithFallback } from "@/app/components/figma/ImageWithFallback";
import { getStandardCoverUrl } from "@/lib/igdb-images";
import { ArticleEditor } from "@/app/components/articles/ArticleEditor";
import { ArticleCommentSection } from "@/app/components/articles/ArticleCommentSection";
import { SpoilerGate } from "@/app/components/articles/SpoilerGate";
import { ReportDialog } from "@/app/components/ReportDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/app/components/ui/dropdown-menu";
import { Heart, MessageCircle, ArrowLeft, MoreHorizontal } from "lucide-react";
import { C, FONT_HEADING, FONT_MONO, FONT_BODY } from "@/app/lib/design-system";

const TYPE_LABEL: Record<string, string> = {
  review: "Review",
  opinion: "Opinion",
  analysis: "Analysis",
};

export default function ArticleDetailClient() {
  const params = useParams();
  const router = useRouter();
  const articleId = params.id as Id<"articles">;

  const article = useQuery(api.articles.getById, { articleId });
  const currentUser = useQuery(api.users.current);
  const toggleLike = useMutation(api.articleLikes.toggle);
  const unpublishArticle = useMutation(api.articles.unpublish);
  const removeArticle = useMutation(api.articles.remove);

  const [reportOpen, setReportOpen] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  if (article === undefined) {
    return (
      <div className="min-h-screen p-8" style={{ backgroundColor: C.bg, color: C.textMuted }}>
        Loading article…
      </div>
    );
  }

  if (article === null) {
    return (
      <div className="min-h-screen p-8" style={{ backgroundColor: C.bg, color: C.textMuted }}>
        Article not found.
      </div>
    );
  }

  const isAuthor = currentUser?._id === article.author._id;
  const cover = article.coverUrl;

  const handleLike = async () => {
    if (isBusy) return;
    setIsBusy(true);
    try {
      await toggleLike({ articleId: article._id });
    } catch (error) {
      console.error("[ArticleDetailClient] Failed to toggle like", error);
    } finally {
      setIsBusy(false);
    }
  };

  const handleUnpublish = async () => {
    if (!window.confirm("Move this article back to drafts?")) return;
    await unpublishArticle({ articleId: article._id });
    router.push(`/article/${article._id}/edit`);
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this article? This cannot be undone.")) return;
    await removeArticle({ articleId: article._id });
    router.push("/profile");
  };

  return (
    <div className="min-h-screen pb-20 md:pb-8" style={{ backgroundColor: C.bg }}>
      <div className="max-w-3xl mx-auto p-4 md:p-6 lg:p-8">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 mb-6"
          style={{ color: C.textMuted, fontFamily: FONT_MONO, fontSize: 12 }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        {cover ? (
          <div className="w-full h-56 md:h-72 rounded-sm overflow-hidden mb-6">
            <ImageWithFallback src={getStandardCoverUrl(cover) ?? cover} alt={article.title} className="w-full h-full object-cover" unoptimized />
          </div>
        ) : null}

        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {article.status === "draft" ? (
            <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: C.amber, border: `1px solid ${C.amber}`, borderRadius: 2, padding: "2px 8px", textTransform: "uppercase" }}>
              Draft
            </span>
          ) : null}
          {article.type ? (
            <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: C.gold, border: `1px solid ${C.border}`, borderRadius: 2, padding: "2px 8px", textTransform: "uppercase" }}>
              {TYPE_LABEL[article.type] ?? article.type}
            </span>
          ) : null}
          {article.tags?.map((tag) => (
            <span key={tag} style={{ fontFamily: FONT_MONO, fontSize: 11, color: C.textDim, border: `1px solid ${C.border}`, borderRadius: 2, padding: "2px 8px" }}>
              #{tag}
            </span>
          ))}
        </div>

        <h1 style={{ fontFamily: FONT_HEADING, fontSize: 32, fontWeight: 200, color: C.text, marginBottom: 16 }}>
          {article.title}
        </h1>

        <div className="flex items-center gap-3 mb-6">
          <Avatar
            className="h-10 w-10 cursor-pointer"
            onClick={() => router.push(`/profile/${article.author.username}`)}
          >
            <AvatarImage src={article.author.avatarUrl} alt={article.author.name} />
            <AvatarFallback style={{ background: `linear-gradient(135deg, ${C.accent}, ${C.gold})`, color: C.bg }}>
              {article.author.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p style={{ fontFamily: FONT_BODY, fontSize: 14, fontWeight: 500, color: C.text }}>{article.author.name}</p>
            <p style={{ fontFamily: FONT_MONO, fontSize: 11, color: C.textDim }}>
              @{article.author.username} · {new Date(article.publishedAt ?? article._creationTime).toLocaleDateString()}
            </p>
          </div>

          {isAuthor ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" style={{ color: C.textMuted }} aria-label="Article actions">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => router.push(`/article/${article._id}/edit`)}>Edit</DropdownMenuItem>
                {article.status === "published" ? (
                  <DropdownMenuItem onSelect={handleUnpublish}>Unpublish</DropdownMenuItem>
                ) : null}
                <DropdownMenuItem onSelect={handleDelete} style={{ color: C.red }}>
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" style={{ color: C.textMuted }} aria-label="More actions">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => setReportOpen(true)}>Report</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {article.games.length > 0 ? (
          <div className="flex flex-wrap gap-3 mb-6">
            {article.games.map((game) => (
              <button
                key={String(game._id)}
                onClick={() => router.push(`/game/${game._id}`)}
                className="flex items-center gap-2 px-3 py-2 rounded-sm transition-colors"
                style={{ border: `1px solid ${C.border}`, backgroundColor: C.surface }}
              >
                <span className="w-6 h-8 rounded-sm overflow-hidden flex-shrink-0">
                  <ImageWithFallback src={getStandardCoverUrl(game.coverUrl) ?? ""} alt={game.title} className="w-full h-full object-cover" />
                </span>
                <span style={{ fontFamily: FONT_BODY, fontSize: 13, color: C.text }}>{game.title}</span>
              </button>
            ))}
          </div>
        ) : null}

        <div style={{ backgroundColor: C.surface, border: `1px solid ${C.border}`, borderRadius: 2, marginBottom: 24 }}>
          {article.containsSpoilers ? (
            <div className="p-4">
              <SpoilerGate>
                <ArticleEditor content={article.content} editable={false} />
              </SpoilerGate>
            </div>
          ) : (
            <ArticleEditor content={article.content} editable={false} />
          )}
        </div>

        <div className="flex items-center gap-6 mb-8">
          <button
            onClick={handleLike}
            disabled={isBusy}
            className="flex items-center gap-2"
            style={{ color: article.viewerHasLiked ? C.red : C.textMuted, background: "none", border: "none", cursor: "pointer" }}
          >
            <Heart className={`w-5 h-5 ${article.viewerHasLiked ? "fill-current" : ""}`} />
            <span style={{ fontFamily: FONT_MONO, fontSize: 14 }}>{article.likeCount}</span>
          </button>
          <div className="flex items-center gap-2" style={{ color: C.textMuted }}>
            <MessageCircle className="w-5 h-5" />
            <span style={{ fontFamily: FONT_MONO, fontSize: 14 }}>{article.commentCount}</span>
          </div>
        </div>

        <div style={{ backgroundColor: C.surface, border: `1px solid ${C.border}`, borderRadius: 2 }} className="p-6 md:p-8">
          <h2 style={{ fontFamily: FONT_HEADING, fontSize: 18, fontWeight: 300, color: C.text, marginBottom: 20 }}>
            Comments ({article.commentCount})
          </h2>
          <ArticleCommentSection articleId={article._id} />
        </div>
      </div>

      <ReportDialog open={reportOpen} onOpenChange={setReportOpen} targetType="article" targetId={article._id} />
    </div>
  );
}
