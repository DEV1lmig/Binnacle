"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
import { ImageWithFallback } from "@/app/components/figma/ImageWithFallback";
import { getStandardCoverUrl } from "@/lib/igdb-images";
import { Button } from "@/app/components/ui/button";
import { Textarea } from "@/app/components/ui/textarea";
import { Skeleton } from "@/app/components/ui/skeleton";
import {
  Heart,
  MessageCircle,
  ArrowLeft,
  Send,
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
  const currentUser = useQuery(api.users.current);
  const comments = useQuery(
    api.comments.listForReview,
    reviewId ? { reviewId: reviewId as Id<"reviews"> } : "skip"
  );

  // Mutations
  const toggleLike = useMutation(api.likes.toggle);
  const createComment = useMutation(api.comments.create);

  const [commentText, setCommentText] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  if (!review) {
    return (
      <div className="min-h-screen bg-[var(--bkl-color-bg-primary)] pb-20 md:pb-8">
        <div className="max-w-4xl mx-auto p-4 md:p-6 lg:p-8">
          <p className="text-[var(--bkl-color-text-secondary)]">Review not found</p>
        </div>
      </div>
    );
  }

  const handleLike = async () => {
    if (!review) return;
    try {
      await toggleLike({ reviewId: review._id });
    } catch (error) {
      console.error("Failed to toggle like:", error);
    }
  };

  const handleSubmitComment = async () => {
    if (!commentText.trim() || !review) return;
    setIsSubmittingComment(true);
    try {
      await createComment({
        reviewId: review._id,
        text: commentText,
      });
      setCommentText("");
    } catch (error) {
      console.error("Failed to create comment:", error);
    } finally {
      setIsSubmittingComment(false);
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

  if (!review) {
    return (
      <div className="min-h-screen bg-[var(--bkl-color-bg-primary)] pb-20 md:pb-8">
        <div className="max-w-4xl mx-auto p-4 md:p-6 lg:p-8">
          <p className="text-[var(--bkl-color-text-secondary)]">Loading review...</p>
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

          {/* Add Comment */}
          {currentUser && (
            <div className="mb-8">
              <div className="flex gap-3 mb-4">
                <Avatar className="h-10 w-10 flex-shrink-0">
                  <AvatarImage src={currentUser.avatarUrl} alt={currentUser.name} />
                  <AvatarFallback className="bg-[var(--bkl-color-accent-primary)] text-[var(--bkl-color-bg-primary)]">
                    {currentUser.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <Textarea
                    placeholder="Share your thoughts..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    className="w-full bg-[var(--bkl-color-bg-tertiary)] border-[var(--bkl-color-border)] text-[var(--bkl-color-text-primary)] placeholder:text-[var(--bkl-color-text-disabled)] rounded-[var(--bkl-radius-md)] min-h-[100px] resize-none"
                    style={{ fontSize: "var(--bkl-font-size-sm)" }}
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={handleSubmitComment}
                  disabled={!commentText.trim() || isSubmittingComment}
                  className="bg-[var(--bkl-color-accent-primary)] hover:bg-[var(--bkl-color-accent-hover)] text-[var(--bkl-color-bg-primary)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Post Comment
                </Button>
              </div>
            </div>
          )}

          {/* Comments List */}
          <div className="space-y-6">
            {!comments ? (
              <>
                {[...Array(2)].map((_, i) => (
                  <Skeleton key={i} className="h-24 bg-[var(--bkl-color-bg-tertiary)]" />
                ))}
              </>
            ) : comments.length === 0 ? (
              <p
                className="text-[var(--bkl-color-text-disabled)] text-center py-8"
                style={{ fontSize: "var(--bkl-font-size-sm)" }}
              >
                No comments yet. Be the first to share your thoughts!
              </p>
            ) : (
              comments.map((comment) => (
                <div key={comment._id} className="pb-6 border-b border-[var(--bkl-color-border)] last:border-b-0 last:pb-0">
                  <div className="flex gap-3">
                    <Avatar className="h-10 w-10 flex-shrink-0">
                      <AvatarImage src={comment.author.avatarUrl} alt={comment.author.name} />
                      <AvatarFallback className="bg-gray-500 text-white">
                        {comment.author.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <p
                          className="text-[var(--bkl-color-text-primary)]"
                          style={{ fontSize: "var(--bkl-font-size-sm)", fontWeight: "var(--bkl-font-weight-semibold)" }}
                        >
                          {comment.author.name}
                        </p>
                        <span className="text-[var(--bkl-color-text-disabled)]">•</span>
                        <p
                          className="text-[var(--bkl-color-text-disabled)]"
                          style={{ fontSize: "var(--bkl-font-size-xs)" }}
                        >
                          {new Date(comment.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <p
                        className="text-[var(--bkl-color-text-secondary)] mb-3"
                        style={{ fontSize: "var(--bkl-font-size-sm)", lineHeight: "var(--bkl-leading-relaxed)" }}
                      >
                        {comment.text}
                      </p>
                      {comment.isAuthor && (
                        <p
                          className="text-[var(--bkl-color-text-disabled)] text-xs"
                        >
                          (Your comment)
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
