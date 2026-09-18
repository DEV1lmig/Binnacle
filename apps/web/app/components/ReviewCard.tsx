"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { Heart, MessageCircle, MoreHorizontal, Clock, Gamepad2, ArrowUpRight } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { CommentSection } from "./CommentSection";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/app/components/ui/dropdown-menu";
import { ReportDialog } from "@/app/components/ReportDialog";
import { Cover, OpenCaseLink, ScoreMark } from "@/app/components/playchive";
import { useOpenFromCover } from "@/app/components/playchive/OpenCaseLink";
import { mediumOf } from "@/app/lib/medium";

type ReviewAuthor = { _id: Id<"users">; name: string; username: string; avatarUrl?: string };
type ReviewGame = { _id: Id<"games">; title: string; coverUrl?: string; releaseYear?: number; platforms?: string };

export type ReviewCardData = {
  _id: Id<"reviews">;
  _creationTime?: number;
  userId: Id<"users">;
  gameId: Id<"games">;
  rating: number;
  platform?: string;
  text?: string;
  playtimeHours?: number;
  likeCount?: number;
  viewerHasLiked?: boolean;
  commentCount?: number;
  author: ReviewAuthor;
  game: ReviewGame;
};

export function relativeTime(timestamp?: number): string {
  if (!timestamp) return "Just now";
  const diff = Date.now() - timestamp;
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric", year: days > 300 ? "numeric" : undefined });
}

/** Editorial review tile: cover spine, big score, quoted text, like / comment rail. Clicking opens the review. */
export function ReviewCard({ review, clampText = true }: { review: ReviewCardData; clampText?: boolean }) {
  const toggleLike = useMutation(api.likes.toggle);

  const [liked, setLiked] = useState(review.viewerHasLiked ?? false);
  const [likeCount, setLikeCount] = useState(review.likeCount ?? 0);
  const [commentCount, setCommentCount] = useState(review.commentCount ?? 0);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const card = useRef<HTMLElement>(null);
  const snapshot = useRef({ id: review._id, viewerHasLiked: review.viewerHasLiked, likeCount: review.likeCount, commentCount: review.commentCount });
  useEffect(() => {
    const s = snapshot.current;
    if (s.id !== review._id || s.viewerHasLiked !== review.viewerHasLiked || s.likeCount !== review.likeCount || s.commentCount !== review.commentCount) {
      snapshot.current = { id: review._id, viewerHasLiked: review.viewerHasLiked, likeCount: review.likeCount, commentCount: review.commentCount };
      setLiked(review.viewerHasLiked ?? false);
      setLikeCount(review.likeCount ?? 0);
      setCommentCount(review.commentCount ?? 0);
    }
  }, [review._id, review.viewerHasLiked, review.likeCount, review.commentCount]);

  const when = useMemo(() => relativeTime(review._creationTime), [review._creationTime]);

  const handleLike = async (event: React.MouseEvent) => {
    event.stopPropagation();
    if (isBusy) return;
    const next = !liked;
    setLiked(next);
    setLikeCount(count => Math.max(0, count + (next ? 1 : -1)));
    setIsBusy(true);
    try {
      await toggleLike({ reviewId: review._id });
    } catch (error) {
      console.error("[ReviewCard] Failed to toggle like", error);
      setLiked(liked);
      setLikeCount(count => Math.max(0, count + (liked ? 1 : -1)));
    } finally {
      setIsBusy(false);
    }
  };

  // Wherever the card is activated, it is the case on its spine that opens.
  const openFrom = useOpenFromCover();
  const open = () => openFrom(card.current?.querySelector<HTMLElement>(".pk-cover") ?? null, { href: `/review/${review._id}`, gameId: review.gameId, coverUrl: review.game.coverUrl, title: review.game.title });
  const stop = (event: React.SyntheticEvent) => event.stopPropagation();

  return (
    <article ref={card} className="pk-review" onClick={open} onKeyDown={event => { if (event.key === "Enter" && event.target === event.currentTarget) open(); }} tabIndex={0} aria-label={`${review.author.name} reviewed ${review.game.title}`}>
      <div className="pk-review-spine" onClick={stop}>
        <OpenCaseLink href={`/review/${review._id}`} gameId={review.gameId} coverUrl={review.game.coverUrl} title={review.game.title} aria-label={`Open ${review.author.name}’s review of ${review.game.title}`}>
          <Cover src={review.game.coverUrl} title={review.game.title} sizes="96px" gameId={review.gameId} medium={mediumOf(review.game)} />
        </OpenCaseLink>
      </div>

      <div className="min-w-0">
        <header className="pk-review-head">
          <div className="pk-review-who">
            <Avatar className="h-9 w-9 rounded-full">
              {review.author.avatarUrl && <AvatarImage src={review.author.avatarUrl} alt="" />}
              <AvatarFallback className="bg-primary text-white text-xs font-semibold">{review.author.name.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate"><b>{review.author.name}</b> <span className="text-textDim">reviewed</span></p>
              <p className="truncate">@{review.author.username} · {when}</p>
            </div>
          </div>
          <ScoreMark value={review.rating} size="sm" />
        </header>

        <h3 className="pk-review-game">{review.game.title}</h3>
        <div className="pk-review-meta">
          {review.game.releaseYear && <span>{review.game.releaseYear}</span>}
          {review.platform && <span className="inline-flex items-center gap-1"><Gamepad2 size={13} aria-hidden="true" />{review.platform}</span>}
          {!!review.playtimeHours && <span className="inline-flex items-center gap-1"><Clock size={13} aria-hidden="true" />{review.playtimeHours}h played</span>}
        </div>

        {review.text && <p className="pk-review-text" data-clamp={clampText || undefined}>{review.text}</p>}

        <footer className="pk-actions">
          <button type="button" className="pk-action" data-active={liked || undefined} onClick={handleLike} disabled={isBusy} aria-pressed={liked} aria-label={liked ? "Unlike this review" : "Like this review"}>
            <Heart size={17} />{likeCount}
          </button>
          <button type="button" className="pk-action" aria-expanded={commentsOpen} onClick={event => { stop(event); setCommentsOpen(v => !v); }} aria-label={commentsOpen ? "Hide comments" : "Show comments"}>
            <MessageCircle size={17} />{commentCount}
          </button>
          <button type="button" className="pk-action" onClick={event => { stop(event); open(); }}>
            Read<ArrowUpRight size={15} />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="pk-action pk-more" onClick={stop} aria-label="More actions"><MoreHorizontal size={17} /></button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={stop}>
              <DropdownMenuItem onSelect={event => { event.preventDefault(); setReportOpen(true); }}>Report</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </footer>
      </div>

      {commentsOpen && (
        <div className="pk-review-comments" onClick={stop} onKeyDown={stop}>
          <CommentSection reviewId={review._id} onCountDelta={delta => setCommentCount(count => Math.max(0, count + delta))} />
        </div>
      )}

      <ReportDialog open={reportOpen} onOpenChange={setReportOpen} targetType="review" targetId={review._id} />
    </article>
  );
}
