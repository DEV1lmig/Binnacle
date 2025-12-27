"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
import { ImageWithFallback } from "@/app/components/figma/ImageWithFallback";
import { getStandardCoverUrl } from "@/lib/igdb-images";
import { CommentSection } from "@/app/components/CommentSection";
import {
  Heart,
  MessageCircle,
  ArrowLeft,
  Share2,
  Twitter,
  Facebook,
  Link as LinkIcon,
  Check,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/app/components/ui/dropdown-menu";

export default function ReviewDetailPage() {
  const params = useParams();
  const router = useRouter();
  const reviewId = params.id as string;

  // Fetch review and comments data
  const review = useQuery(
    api.reviews.get,
    reviewId ? { reviewId: reviewId as Id<"reviews"> } : "skip"
  );
  const comments = useQuery(api.comments.listForReview, {
    reviewId: reviewId as Id<"reviews">,
    limit: 50,
  });

  // Mutations
  const toggleLike = useMutation(api.likes.toggle);
  const [linkCopied, setLinkCopied] = useState(false);

  const handleLike = async () => {
    if (!review) return;
    try {
      await toggleLike({ reviewId: review._id });
    } catch (error) {
      console.error("Failed to toggle like:", error);
    }
  };


  const handleShare = (platform: "twitter" | "facebook" | "link") => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const text = `Check out this review of ${review.game?.title || "this game"}`;

    switch (platform) {
      case "twitter":
        window.open(
          `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
          "_blank"
        );
        break;
      case "facebook":
        window.open(
          `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
          "_blank"
        );
        break;
      case "link":
        navigator.clipboard.writeText(url);
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000);
        break;
    }
  };

  if (review === undefined) {
    return (
      <div className="min-h-screen bg-[var(--bkl-color-bg-primary)] pb-20 md:pb-8">
        <div className="max-w-4xl mx-auto p-4 md:p-6 lg:p-8">
          <p className="text-[var(--bkl-color-text-secondary)]">Loading review...</p>
        </div>
      </div>
    );
  }

  if (review === null) {
    return (
      <div className="min-h-screen bg-[var(--bkl-color-bg-primary)] pb-20 md:pb-8">
        <div className="max-w-4xl mx-auto p-4 md:p-6 lg:p-8">
          <p className="text-[var(--bkl-color-text-secondary)]">Review not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bkl-color-bg-primary)] pb-20 md:pb-8">
      <div className="max-w-4xl mx-auto p-4 md:p-6 lg:p-8">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 mb-6 text-[var(--bkl-color-text-secondary)] hover:text-[var(--bkl-color-accent-primary)] transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span style={{ fontSize: "var(--bkl-font-size-sm)", fontWeight: "var(--bkl-font-weight-medium)" }}>
            Back
          </span>
        </button>

        {/* Review Card */}
        <div className="bg-[var(--bkl-color-bg-secondary)] border border-[var(--bkl-color-border)] rounded-[var(--bkl-radius-lg)] p-6 md:p-8 mb-6">
          {/* User Info */}
          <div className="flex items-center gap-3 mb-6">
            <Avatar className="h-12 w-12">
              <AvatarImage src={review.author?.avatarUrl} alt={review.author?.name || "User"} />
              <AvatarFallback className="bg-[var(--bkl-color-accent-primary)] text-[var(--bkl-color-bg-primary)]">
                {review.author?.name?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p
                className="text-[var(--bkl-color-text-primary)]"
                style={{ fontSize: "var(--bkl-font-size-base)", fontWeight: "var(--bkl-font-weight-semibold)" }}
              >
                {review.author?.name || "Unknown User"}
              </p>
              <p
                className="text-[var(--bkl-color-text-disabled)]"
                style={{ fontSize: "var(--bkl-font-size-sm)" }}
              >
                {new Date(review._creationTime || 0).toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span
                className="text-[var(--bkl-color-accent-secondary)] font-bold"
                style={{ fontSize: "var(--bkl-font-size-2xl)" }}
              >
                {Math.max(0, Math.min(10, review.rating)).toFixed(1)}
              </span>
              <span className="text-[var(--bkl-color-text-disabled)]">/10</span>
            </div>
          </div>

          {/* Game Info */}
          <div
            className="flex gap-4 mb-6 pb-6 border-b border-[var(--bkl-color-border)] cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => router.push(`/game/${review.gameId}`)}
          >
            <div className="w-24 h-32 rounded-[var(--bkl-radius-md)] overflow-hidden flex-shrink-0">
              <ImageWithFallback
                src={getStandardCoverUrl(review.game?.coverUrl) || ""}
                alt={review.game?.title || "Game"}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex flex-col justify-center">
              <p
                className="text-[var(--bkl-color-text-primary)] mb-1"
                style={{ fontSize: "var(--bkl-font-size-xl)", fontWeight: "var(--bkl-font-weight-semibold)" }}
              >
                {review.game?.title || "Unknown Game"}
              </p>
              <p
                className="text-[var(--bkl-color-accent-primary)]"
                style={{ fontSize: "var(--bkl-font-size-sm)", fontWeight: "var(--bkl-font-weight-medium)" }}
              >
                View Game Details →
              </p>
            </div>
          </div>

          {/* Review Text */}
          <div className="mb-6">
            <p
              className="text-[var(--bkl-color-text-primary)] whitespace-pre-wrap break-words"
              style={{ fontSize: "var(--bkl-font-size-lg)", lineHeight: "var(--bkl-leading-relaxed)" }}
            >
              {review.text}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-6 pt-6 border-t border-[var(--bkl-color-border)]">
            <button
              onClick={handleLike}
              className={`flex items-center gap-2 transition-colors ${
                review?.viewerHasLiked
                  ? "text-[var(--bkl-color-feedback-error)]"
                  : "text-[var(--bkl-color-text-secondary)] hover:text-[var(--bkl-color-text-primary)]"
              }`}
            >
              <Heart className={`w-5 h-5 ${review?.viewerHasLiked ? "fill-current" : ""}`} />
              <span style={{ fontSize: "var(--bkl-font-size-base)", fontWeight: "var(--bkl-font-weight-medium)" }}>
                {review?.likeCount || 0}
              </span>
            </button>
            <div className="flex items-center gap-2 text-[var(--bkl-color-text-secondary)]">
              <MessageCircle className="w-5 h-5" />
              <span style={{ fontSize: "var(--bkl-font-size-base)", fontWeight: "var(--bkl-font-weight-medium)" }}>
                {comments?.length || 0}
              </span>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 text-[var(--bkl-color-text-secondary)] hover:text-[var(--bkl-color-text-primary)] transition-colors ml-auto">
                  <Share2 className="w-5 h-5" />
                  <span style={{ fontSize: "var(--bkl-font-size-base)", fontWeight: "var(--bkl-font-weight-medium)" }}>
                    Share
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="bg-[var(--bkl-color-bg-secondary)] border-[var(--bkl-color-border)] text-[var(--bkl-color-text-primary)]"
              >
                <DropdownMenuItem
                  onClick={() => handleShare("twitter")}
                  className="cursor-pointer hover:bg-[var(--bkl-color-bg-tertiary)] focus:bg-[var(--bkl-color-bg-tertiary)]"
                >
                  <Twitter className="w-4 h-4 mr-2" />
                  Share on Twitter
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleShare("facebook")}
                  className="cursor-pointer hover:bg-[var(--bkl-color-bg-tertiary)] focus:bg-[var(--bkl-color-bg-tertiary)]"
                >
                  <Facebook className="w-4 h-4 mr-2" />
                  Share on Facebook
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleShare("link")}
                  className="cursor-pointer hover:bg-[var(--bkl-color-bg-tertiary)] focus:bg-[var(--bkl-color-bg-tertiary)]"
                >
                  {linkCopied ? (
                    <>
                      <Check className="w-4 h-4 mr-2 text-[var(--bkl-color-feedback-success)]" />
                      Link Copied!
                    </>
                  ) : (
                    <>
                      <LinkIcon className="w-4 h-4 mr-2" />
                      Copy Link
                    </>
                  )}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Comments Section */}
        <div className="bg-[var(--bkl-color-bg-secondary)] border border-[var(--bkl-color-border)] rounded-[var(--bkl-radius-lg)] p-6 md:p-8">
          <h2
            className="text-[var(--bkl-color-text-primary)] mb-6"
            style={{ fontSize: "var(--bkl-font-size-xl)", fontWeight: "var(--bkl-font-weight-semibold)" }}
          >
            Comments ({comments?.length || 0})
          </h2>

          <CommentSection reviewId={review._id} />
        </div>
      </div>
    </div>
  );
}
