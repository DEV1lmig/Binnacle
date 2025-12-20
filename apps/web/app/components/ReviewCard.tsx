"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { Heart, MessageCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { getStandardCoverUrl } from "@/lib/igdb-images";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { CommentSection } from "./CommentSection";

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
      className="bg-[var(--bkl-color-bg-secondary)] border border-[var(--bkl-color-border)] rounded-[var(--bkl-radius-lg)] p-4 md:p-6 cursor-pointer transition-all hover:border-[var(--bkl-color-accent-primary)] hover:shadow-[var(--bkl-shadow-glow)]"
    >
      <header className="flex items-center gap-3 mb-4">
        <Avatar className="h-10 w-10">
          {review.author.avatarUrl ? (
            <AvatarImage src={review.author.avatarUrl} alt={review.author.name} />
          ) : null}
          <AvatarFallback className="bg-[var(--bkl-color-accent-primary)] text-[var(--bkl-color-bg-primary)]">
            {review.author.name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <p
            className="text-[var(--bkl-color-text-primary)]"
            style={{ fontSize: "var(--bkl-font-size-sm)", fontWeight: "var(--bkl-font-weight-semibold)" }}
          >
            {review.author.name}
          </p>
          <p
            className="text-[var(--bkl-color-text-disabled)]"
            style={{ fontSize: "var(--bkl-font-size-xs)" }}
          >
            @{review.author.username} • {createdAt}
          </p>
        </div>
        <div className="flex items-center gap-2" aria-label={`Rated ${review.rating} out of 10`}>
          <span
            className="text-[var(--bkl-color-accent-secondary)] font-bold"
            style={{ fontSize: "var(--bkl-font-size-sm)" }}
          >
            {normalizedRating.toFixed(1)}
          </span>
          <span className="text-[var(--bkl-color-text-disabled)]">/10</span>
        </div>
      </header>

      <div className="flex gap-3 mb-4">
        <div className="w-16 h-24 rounded-[var(--bkl-radius-sm)] overflow-hidden flex-shrink-0">
          <ImageWithFallback
            src={getStandardCoverUrl(review.game.coverUrl) ?? ""}
            alt={review.game.title}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex flex-col justify-center">
          <p
            className="text-[var(--bkl-color-text-primary)]"
            style={{ fontSize: "var(--bkl-font-size-base)", fontWeight: "var(--bkl-font-weight-semibold)" }}
          >
            {review.game.title}
          </p>
          {review.platform ? (
            <p
              className="text-[var(--bkl-color-text-disabled)]"
              style={{ fontSize: "var(--bkl-font-size-xs)" }}
            >
              Played on {review.platform}
            </p>
          ) : null}
        </div>
      </div>

      {review.text ? (
        <p
          className="text-[var(--bkl-color-text-secondary)] mb-4"
          style={{ fontSize: "var(--bkl-font-size-sm)", lineHeight: "var(--bkl-leading-relaxed)" }}
        >
          {review.text}
        </p>
      ) : null}

      <footer className="flex items-center gap-4 pt-4 border-t border-[var(--bkl-color-border)]">
        <button
          onClick={handleLike}
          disabled={isBusy}
          className={`flex items-center gap-2 transition-colors ${
            liked
              ? "text-[var(--bkl-color-feedback-error)]"
              : "text-[var(--bkl-color-text-secondary)] hover:text-[var(--bkl-color-text-primary)]"
          }`}
        >
          <Heart className={`w-5 h-5 ${liked ? "fill-current" : ""}`} />
          <span style={{ fontSize: "var(--bkl-font-size-sm)" }}>{likeCount}</span>
        </button>
        <button
          onClick={handleToggleComments}
          className="flex items-center gap-2 text-[var(--bkl-color-text-secondary)] hover:text-[var(--bkl-color-text-primary)] transition-colors"
        >
          <MessageCircle className="w-4 h-4" />
          <span style={{ fontSize: "var(--bkl-font-size-sm)" }}>{commentCount}</span>
        </button>
        {clerkUser && (
          <div className="ml-auto flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={clerkUser.imageUrl || ""} alt={clerkUser.fullName || "User"} />
              <AvatarFallback className="bg-[var(--bkl-color-accent-primary)] text-[var(--bkl-color-bg-primary)]">
                {clerkUser.firstName?.charAt(0).toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <span
              className="text-[var(--bkl-color-text-secondary)]"
              style={{ fontSize: "var(--bkl-font-size-xs)" }}
            >
              {clerkUser.firstName || clerkUser.username || "You"}
            </span>
          </div>
        )}
      </footer>

      {commentsOpen ? (
        <div
          className="mt-4 pt-4 border-t border-[var(--bkl-color-border)]"
          onClick={(event) => event.stopPropagation()}
        >
          <CommentSection
            reviewId={review._id}
            onCountDelta={(delta) => setCommentCount((count) => Math.max(0, count + delta))}
          />
        </div>
      ) : null}
    </article>
  );
}
