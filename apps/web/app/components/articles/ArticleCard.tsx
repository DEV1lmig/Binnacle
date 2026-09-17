"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { Heart, MessageCircle, MoreHorizontal, TriangleAlert } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { getStandardCoverUrl } from "@/lib/igdb-images";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { ArticleCommentSection } from "./ArticleCommentSection";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/app/components/ui/dropdown-menu";
import { ReportDialog } from "@/app/components/ReportDialog";
import { relativeTime } from "@/app/components/ReviewCard";

type ArticleAuthor = { _id: Id<"users">; name: string; username: string; avatarUrl?: string };
type ArticleGame = { _id: Id<"games">; title: string; coverUrl?: string };

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

const TYPE_LABEL: Record<string, string> = { review: "Review", opinion: "Opinion", analysis: "Analysis" };

type Layout = "tile" | "row" | "feature";

/** Cover-led story tile. `layout="row"` for feeds, `"feature"` for the lead story. */
export function ArticleCard({ article, compact = false, layout }: { article: ArticleCardData; compact?: boolean; layout?: Layout }) {
  const router = useRouter();
  const toggleLike = useMutation(api.articleLikes.toggle);
  const mode: Layout = layout ?? (compact ? "row" : "tile");

  const [liked, setLiked] = useState(article.viewerHasLiked ?? false);
  const [likeCount, setLikeCount] = useState(article.likeCount ?? 0);
  const [commentCount, setCommentCount] = useState(article.commentCount ?? 0);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [spoilerRevealed, setSpoilerRevealed] = useState(false);
  const [coverFailed, setCoverFailed] = useState(false);

  const snapshot = useRef({ id: article._id, viewerHasLiked: article.viewerHasLiked, likeCount: article.likeCount, commentCount: article.commentCount });
  useEffect(() => {
    const s = snapshot.current;
    if (s.id !== article._id || s.viewerHasLiked !== article.viewerHasLiked || s.likeCount !== article.likeCount || s.commentCount !== article.commentCount) {
      snapshot.current = { id: article._id, viewerHasLiked: article.viewerHasLiked, likeCount: article.likeCount, commentCount: article.commentCount };
      setLiked(article.viewerHasLiked ?? false);
      setLikeCount(article.likeCount ?? 0);
      setCommentCount(article.commentCount ?? 0);
    }
  }, [article._id, article.viewerHasLiked, article.likeCount, article.commentCount]);

  const when = useMemo(() => relativeTime(article.publishedAt ?? article._creationTime), [article.publishedAt, article._creationTime]);
  const cover = article.coverUrl ?? article.games.find(g => g.coverUrl)?.coverUrl;
  const coverUrl = article.coverUrl ? article.coverUrl : getStandardCoverUrl(cover);

  const handleLike = async (event: React.MouseEvent) => {
    event.stopPropagation();
    if (isBusy) return;
    const next = !liked;
    setLiked(next);
    setLikeCount(count => Math.max(0, count + (next ? 1 : -1)));
    setIsBusy(true);
    try {
      await toggleLike({ articleId: article._id });
    } catch (error) {
      console.error("[ArticleCard] Failed to toggle like", error);
      setLiked(liked);
      setLikeCount(count => Math.max(0, count + (liked ? 1 : -1)));
    } finally {
      setIsBusy(false);
    }
  };

  const open = () => router.push(`/article/${article._id}`);
  const stop = (event: React.SyntheticEvent) => event.stopPropagation();
  const gated = article.containsSpoilers && !spoilerRevealed;
  const kind = article.type ?? "opinion";

  return (
    <article className="pk-article" data-layout={mode} onClick={open} onKeyDown={event => { if (event.key === "Enter" && event.target === event.currentTarget) open(); }} tabIndex={0} aria-label={article.title}>
      <div className="pk-article-art">
        {coverUrl && !coverFailed && <Image src={coverUrl} alt="" fill sizes={mode === "feature" ? "(max-width: 767px) 100vw, 60vw" : "(max-width: 767px) 100vw, 400px"} unoptimized={!!article.coverUrl} onError={() => setCoverFailed(true)} />}
        <span className="pk-article-kind" data-kind={kind}>{TYPE_LABEL[kind] ?? kind}</span>
      </div>

      <div className="pk-article-body">
        {article.games.length > 0 && <span className="pk-article-games">{article.games.map(g => g.title).join(" · ")}</span>}
        <h3>{article.title}</h3>
        {article.excerpt && (gated
          ? <button type="button" className="pk-spoiler" onClick={event => { stop(event); setSpoilerRevealed(true); }}><TriangleAlert size={15} aria-hidden="true" />Contains spoilers. Tap to show the excerpt.</button>
          : <p className="pk-article-excerpt">{article.excerpt}</p>)}
        {mode !== "row" && article.tags && article.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">{article.tags.slice(0, 4).map(tag => <span key={tag} className="pk-tag">#{tag}</span>)}</div>
        )}

        <div className="pk-article-by">
          <Avatar className="h-7 w-7 rounded-full">
            {article.author.avatarUrl && <AvatarImage src={article.author.avatarUrl} alt="" />}
            <AvatarFallback className="bg-primary text-white text-[10px] font-semibold">{article.author.name.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <span className="truncate"><b>{article.author.name}</b> · {when}</span>
          <span className="ml-auto flex items-center">
            <button type="button" className="pk-action" data-active={liked || undefined} onClick={handleLike} disabled={isBusy} aria-pressed={liked} aria-label={liked ? "Unlike this story" : "Like this story"}><Heart size={15} />{likeCount}</button>
            <button type="button" className="pk-action" aria-expanded={commentsOpen} onClick={event => { stop(event); setCommentsOpen(v => !v); }} aria-label={commentsOpen ? "Hide comments" : "Show comments"}><MessageCircle size={15} />{commentCount}</button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className="pk-action" onClick={stop} aria-label="More actions"><MoreHorizontal size={15} /></button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={stop}>
                <DropdownMenuItem onSelect={event => { event.preventDefault(); setReportOpen(true); }}>Report</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </span>
        </div>

        {commentsOpen && (
          <div className="pk-review-comments" onClick={stop} onKeyDown={stop}>
            <ArticleCommentSection articleId={article._id} onCountDelta={delta => setCommentCount(count => Math.max(0, count + delta))} />
          </div>
        )}
      </div>

      <ReportDialog open={reportOpen} onOpenChange={setReportOpen} targetType="article" targetId={article._id} />
    </article>
  );
}
