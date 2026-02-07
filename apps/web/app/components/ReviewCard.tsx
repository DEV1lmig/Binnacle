"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { Heart, MessageCircle, MoreHorizontal } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { getStandardCoverUrl } from "@/lib/igdb-images";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { CommentSection } from "./CommentSection";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/app/components/ui/dropdown-menu";
import { Button } from "@/app/components/ui/button";
import { ReportDialog } from "@/app/components/ReportDialog";
import { C, FONT_HEADING, FONT_MONO, FONT_BODY } from "@/app/lib/design-system";

type ReviewAuthor = {
  _id: Id<"users">;
  name: string;
  username: string;
  avatarUrl?: string;
};

type ReviewGame = {
  _id: Id<"games">;
  title: string;
  coverUrl?: string;
  releaseYear?: number;
};

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

interface ReviewCardProps {
  review: ReviewCardData;
}

export function ReviewCard({ review }: ReviewCardProps) {
  const router = useRouter();
  const { user: clerkUser } = useUser();
  const toggleLike = useMutation(api.likes.toggle);

  const [liked, setLiked] = useState(review.viewerHasLiked ?? false);
  const [likeCount, setLikeCount] = useState(review.likeCount ?? 0);
  const [commentCount, setCommentCount] = useState(review.commentCount ?? 0);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    setLiked(review.viewerHasLiked ?? false);
    setLikeCount(review.likeCount ?? 0);
    setCommentCount(review.commentCount ?? 0);
  }, [review._id, review.viewerHasLiked, review.likeCount, review.commentCount]);

  const normalizedRating = useMemo(() => {
    return Math.max(0, Math.min(10, review.rating));
  }, [review.rating]);

  const createdAt = useMemo(() => {
    if (!review._creationTime) {
      return "Just now";
    }
    const date = new Date(review._creationTime);
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }, [review._creationTime]);

  const handleLike = async (event: React.MouseEvent) => {
    event.stopPropagation();
    if (isBusy) {
      return;
    }

    const nextLiked = !liked;
    setLiked(nextLiked);
    setLikeCount((count) => Math.max(0, count + (nextLiked ? 1 : -1)));
    setIsBusy(true);

    try {
      await toggleLike({ reviewId: review._id });
    } catch (error) {
      console.error("[ReviewCard] Failed to toggle like", error);
      setLiked(liked);
      setLikeCount((count) => Math.max(0, count + (liked ? 1 : -1)));
    } finally {
      setIsBusy(false);
    }
  };

  const handleNavigate = () => {
    router.push(`/review/${review._id}`);
  };

  const handleToggleComments = (event: React.MouseEvent) => {
    event.stopPropagation();
    setCommentsOpen((open) => !open);
  };

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
          {review.author.avatarUrl ? (
            <AvatarImage src={review.author.avatarUrl} alt={review.author.name} />
          ) : null}
          <AvatarFallback
            style={{
              background: `linear-gradient(135deg, ${C.accent}, ${C.gold})`,
              color: C.bg,
            }}
          >
            {review.author.name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <p
            style={{
              fontFamily: FONT_BODY,
              fontSize: 14,
              fontWeight: 500,
              color: C.text,
            }}
          >
            {review.author.name}
          </p>
          <p
            style={{
              fontFamily: FONT_MONO,
              fontSize: 11,
              color: C.textDim,
              letterSpacing: "0.02em",
            }}
          >
            @{review.author.username} · {createdAt}
          </p>
        </div>
        <div className="flex items-center gap-1" aria-label={`Rated ${review.rating} out of 10`}>
          <span
            style={{
              fontFamily: FONT_MONO,
              fontSize: 14,
              fontWeight: 700,
              color: C.amber,
            }}
          >
            {normalizedRating.toFixed(1)}
          </span>
          <span
            style={{
              fontFamily: FONT_MONO,
              fontSize: 14,
              color: C.textDim,
            }}
          >
            /10
          </span>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={(event) => event.stopPropagation()}
              style={{ color: C.textMuted }}
              onMouseEnter={(e) => { e.currentTarget.style.color = C.text; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = C.textMuted; }}
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
        <div
          className="overflow-hidden flex-shrink-0"
          style={{ width: 64, height: 96, borderRadius: 2 }}
        >
          <ImageWithFallback
            src={getStandardCoverUrl(review.game.coverUrl) ?? ""}
            alt={review.game.title}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex flex-col justify-center">
          <p
            style={{
              fontFamily: FONT_BODY,
              fontSize: 15,
              fontWeight: 500,
              color: C.text,
            }}
          >
            {review.game.title}
          </p>
          {review.platform ? (
            <p
              style={{
                fontFamily: FONT_MONO,
                fontSize: 11,
                color: C.textDim,
                textTransform: "uppercase",
              }}
            >
              Played on {review.platform}
            </p>
          ) : null}
        </div>
      </div>

      {review.text ? (
        <p
          className="mb-4"
          style={{
            fontFamily: FONT_BODY,
            fontSize: 14,
            fontWeight: 300,
            color: C.textMuted,
            lineHeight: 1.6,
          }}
        >
          {review.text}
        </p>
      ) : null}

      <footer
        className="flex items-center gap-4 pt-4"
        style={{ borderTop: `1px solid ${C.border}` }}
      >
        <button
          onClick={handleLike}
          disabled={isBusy}
          className="flex items-center gap-2 group"
          style={{
            color: liked ? C.red : C.textMuted,
            transition: "color 0.15s",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
          }}
          onMouseEnter={(e) => { if (!liked) e.currentTarget.style.color = C.text; }}
          onMouseLeave={(e) => { if (!liked) e.currentTarget.style.color = C.textMuted; }}
          title={liked ? "Unlike this review" : "Like this review"}
        >
          <div
            className={`transition-transform duration-200 ${liked ? "scale-110" : "group-hover:scale-110"} ${isBusy ? "opacity-50" : ""}`}
          >
            <Heart className={`w-5 h-5 ${liked ? "fill-current" : ""}`} />
          </div>
          <span
            className="flex items-center gap-1"
            style={{
              fontFamily: FONT_MONO,
              fontSize: 13,
              color: C.textMuted,
            }}
          >
            {likeCount}
            {liked && (
              <span
                className="hidden sm:inline-block"
                style={{ fontSize: 10, fontWeight: 500, opacity: 0.8 }}
              >
                (You)
              </span>
            )}
          </span>
        </button>
        <button
          onClick={handleToggleComments}
          className="flex items-center gap-2"
          style={{
            color: C.textMuted,
            transition: "color 0.15s",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = C.text; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = C.textMuted; }}
        >
          <MessageCircle className="w-4 h-4" />
          <span
            style={{
              fontFamily: FONT_MONO,
              fontSize: 13,
              color: C.textMuted,
            }}
          >
            {commentCount}
          </span>
        </button>
        {clerkUser && (
          <div className="ml-auto flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={clerkUser.imageUrl || ""} alt={clerkUser.fullName || "User"} />
              <AvatarFallback
                style={{
                  background: `linear-gradient(135deg, ${C.accent}, ${C.gold})`,
                  color: C.bg,
                }}
              >
                {clerkUser.firstName?.charAt(0).toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <span
              style={{
                fontFamily: FONT_MONO,
                fontSize: 11,
                color: C.textDim,
              }}
            >
              {clerkUser.firstName || clerkUser.username || "You"}
            </span>
          </div>
        )}
      </footer>

      {commentsOpen ? (
        <div
          className="mt-4 pt-4"
          style={{ borderTop: `1px solid ${C.border}` }}
          onClick={(event) => event.stopPropagation()}
        >
          <CommentSection
            reviewId={review._id}
            onCountDelta={(delta) => setCommentCount((count) => Math.max(0, count + delta))}
          />
        </div>
      ) : null}

      <ReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        targetType="review"
        targetId={review._id}
      />
    </article>
  );
}
