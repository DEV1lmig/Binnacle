"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { Heart, MessageCircle, MoreHorizontal, TriangleAlert } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { ImageWithFallback } from "../figma/ImageWithFallback";
import { getStandardCoverUrl } from "@/lib/igdb-images";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { ArticleCommentSection } from "./ArticleCommentSection";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/app/components/ui/dropdown-menu";
import { Button } from "@/app/components/ui/button";
import { ReportDialog } from "@/app/components/ReportDialog";
import { C, FONT_MONO, FONT_BODY } from "@/app/lib/design-system";

type ArticleAuthor = {
  _id: Id<"users">;
  name: string;
  username: string;
  avatarUrl?: string;
};

type ArticleGame = {
  _id: Id<"games">;
  title: string;
  coverUrl?: string;
};

export type ArticleCardData = {
  _id: Id<"articles">;
  _creationTime?: number;
  title: string;
  excerpt?: string;
  type?: string;
  tags?: string[];
  containsSpoilers: boolean;
  coverUrl?: string;
  publishedAt?: number;
  likeCount?: number;
  viewerHasLiked?: boolean;
  commentCount?: number;
  author: ArticleAuthor;
  games: ArticleGame[];
};

const TYPE_LABEL: Record<string, string> = {
  review: "Review",
  opinion: "Opinion",
  analysis: "Analysis",
};

interface ArticleCardProps {
  article: ArticleCardData;
  compact?: boolean;
}

export function ArticleCard({ article, compact = false }: ArticleCardProps) {
  const router = useRouter();
  const { user: clerkUser } = useUser();
  const toggleLike = useMutation(api.articleLikes.toggle);

  const [liked, setLiked] = useState(article.viewerHasLiked ?? false);
  const [likeCount, setLikeCount] = useState(article.likeCount ?? 0);
  const [commentCount, setCommentCount] = useState(article.commentCount ?? 0);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [spoilerRevealed, setSpoilerRevealed] = useState(false);

  const snapshotRef = useRef({
    id: article._id,
    viewerHasLiked: article.viewerHasLiked,
    likeCount: article.likeCount,
    commentCount: article.commentCount,
  });

  useEffect(() => {
    if (
      snapshotRef.current.id !== article._id ||
      snapshotRef.current.viewerHasLiked !== article.viewerHasLiked ||
      snapshotRef.current.likeCount !== article.likeCount ||
      snapshotRef.current.commentCount !== article.commentCount
    ) {
      snapshotRef.current = {
        id: article._id,
        viewerHasLiked: article.viewerHasLiked,
        likeCount: article.likeCount,
        commentCount: article.commentCount,
      };
      setLiked(article.viewerHasLiked ?? false);
      setLikeCount(article.likeCount ?? 0);
      setCommentCount(article.commentCount ?? 0);
    }
  }, [article._id, article.viewerHasLiked, article.likeCount, article.commentCount]);

  const publishedLabel = useMemo(() => {
    const timestamp = article.publishedAt ?? article._creationTime;
    if (!timestamp) return "Just now";
    return new Date(timestamp).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }, [article.publishedAt, article._creationTime]);

  const cover = article.coverUrl ?? article.games.find((g) => g.coverUrl)?.coverUrl;

  const handleLike = async (event: React.MouseEvent) => {
    event.stopPropagation();
    if (isBusy) return;

    const nextLiked = !liked;
    setLiked(nextLiked);
    setLikeCount((count) => Math.max(0, count + (nextLiked ? 1 : -1)));
    setIsBusy(true);

    try {
      await toggleLike({ articleId: article._id });
    } catch (error) {
      console.error("[ArticleCard] Failed to toggle like", error);
      setLiked(liked);
      setLikeCount((count) => Math.max(0, count + (liked ? 1 : -1)));
    } finally {
      setIsBusy(false);
    }
  };

  const handleNavigate = () => {
    router.push(`/article/${article._id}`);
  };

  const handleToggleComments = (event: React.MouseEvent) => {
    event.stopPropagation();
    setCommentsOpen((open) => !open);
  };

  const showSpoilerGate = article.containsSpoilers && !spoilerRevealed;

  return (
    <article
      onClick={handleNavigate}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="p-4 md:p-6 cursor-pointer"
      style={{
        background: C.surface,
        border: `1px solid ${hovered ? C.gold : C.border}`,
        borderRadius: 2,
        boxShadow: hovered ? `0 0 16px ${C.bloom}` : "none",
        transform: hovered ? "translateY(-1px)" : "none",
        transition: "border-color 0.2s, box-shadow 0.2s, transform 0.2s",
      }}
    >
      <header className="flex items-center gap-3 mb-4">
        <Avatar className="h-10 w-10">
          {article.author.avatarUrl ? (
            <AvatarImage src={article.author.avatarUrl} alt={article.author.name} />
          ) : null}
          <AvatarFallback style={{ background: `linear-gradient(135deg, ${C.accent}, ${C.gold})`, color: C.bg }}>
            {article.author.name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <p style={{ fontFamily: FONT_BODY, fontSize: 14, fontWeight: 500, color: C.text }}>
            {article.author.name}
          </p>
          <p style={{ fontFamily: FONT_MONO, fontSize: 11, color: C.textDim, letterSpacing: "0.02em" }}>
            @{article.author.username} · {publishedLabel}
          </p>
        </div>
        {article.type ? (
          <span
            className="px-2 py-1"
            style={{
              fontFamily: FONT_MONO,
              fontSize: 10,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: C.gold,
              border: `1px solid ${C.border}`,
              borderRadius: 2,
            }}
          >
            {TYPE_LABEL[article.type] ?? article.type}
          </span>
        ) : null}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={(event) => event.stopPropagation()}
              style={{ color: C.textMuted }}
              aria-label="More actions"
            >
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(event) => event.stopPropagation()}>
            <DropdownMenuItem
              onSelect={(event) => {
                event.preventDefault();
                setReportOpen(true);
              }}
            >
              Report
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <div className="flex gap-3 mb-4">
        {cover ? (
          <div className="overflow-hidden flex-shrink-0" style={{ width: 64, height: 96, borderRadius: 2 }}>
            <ImageWithFallback src={getStandardCoverUrl(cover) ?? ""} alt={article.title} className="w-full h-full object-cover" unoptimized />
          </div>
        ) : null}
        <div className="flex flex-col justify-center">
          <p style={{ fontFamily: FONT_BODY, fontSize: !compact ? 18 : 15, fontWeight: 500, color: C.text }}>
            {article.title}
          </p>
          {article.games.length > 0 ? (
            <p style={{ fontFamily: FONT_MONO, fontSize: 11, color: C.textDim, textTransform: "uppercase" }}>
              {article.games.map((g) => g.title).join(" · ")}
            </p>
          ) : null}
        </div>
      </div>

      {article.excerpt ? (
        showSpoilerGate ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setSpoilerRevealed(true);
            }}
            className="w-full flex items-center gap-2 mb-4 px-3 py-2 text-left"
            style={{ border: `1px solid ${C.border}`, borderRadius: 2, backgroundColor: C.bgAlt }}
          >
            <TriangleAlert className="w-4 h-4 flex-shrink-0" style={{ color: C.amber }} />
            <span style={{ fontFamily: FONT_MONO, fontSize: 12, color: C.textMuted }}>
              Contains spoilers — tap to show excerpt
            </span>
          </button>
        ) : (
          <p
            className="mb-4"
            style={{ fontFamily: FONT_BODY, fontSize: 14, fontWeight: 300, color: C.textMuted, lineHeight: 1.6 }}
          >
            {article.excerpt}
          </p>
        )
      ) : null}

      {article.tags && article.tags.length > 0 ? (
        <div className="flex flex-wrap gap-2 mb-4">
          {article.tags.map((tag) => (
            <span
              key={tag}
              style={{
                fontFamily: FONT_MONO,
                fontSize: 10,
                color: C.textDim,
                border: `1px solid ${C.border}`,
                borderRadius: 2,
                padding: "2px 6px",
              }}
            >
              #{tag}
            </span>
          ))}
        </div>
      ) : null}

      <footer className="flex items-center gap-4 pt-4" style={{ borderTop: `1px solid ${C.border}` }}>
        <button
          onClick={handleLike}
          disabled={isBusy}
          className="flex items-center gap-2 group"
          style={{ color: liked ? C.red : C.textMuted, background: "none", border: "none", cursor: "pointer", padding: 0 }}
          title={liked ? "Unlike this article" : "Like this article"}
        >
          <div className={`transition-transform duration-200 ${liked ? "scale-110" : "group-hover:scale-110"} ${isBusy ? "opacity-50" : ""}`}>
            <Heart className={`w-5 h-5 ${liked ? "fill-current" : ""}`} />
          </div>
          <span style={{ fontFamily: FONT_MONO, fontSize: 13, color: C.textMuted }}>{likeCount}</span>
        </button>
        <button
          onClick={handleToggleComments}
          className="flex items-center gap-2"
          style={{ color: C.textMuted, background: "none", border: "none", cursor: "pointer", padding: 0 }}
        >
          <MessageCircle className="w-4 h-4" />
          <span style={{ fontFamily: FONT_MONO, fontSize: 13, color: C.textMuted }}>{commentCount}</span>
        </button>
        {clerkUser && (
          <div className="ml-auto flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={clerkUser.imageUrl || ""} alt={clerkUser.fullName || "User"} />
              <AvatarFallback style={{ background: `linear-gradient(135deg, ${C.accent}, ${C.gold})`, color: C.bg }}>
                {clerkUser.firstName?.charAt(0).toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
          </div>
        )}
      </footer>

      {commentsOpen ? (
        <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${C.border}` }} onClick={(event) => event.stopPropagation()}>
          <ArticleCommentSection
            articleId={article._id}
            onCountDelta={(delta) => setCommentCount((count) => Math.max(0, count + delta))}
          />
        </div>
      ) : null}

      <ReportDialog open={reportOpen} onOpenChange={setReportOpen} targetType="article" targetId={article._id} />
    </article>
  );
}
