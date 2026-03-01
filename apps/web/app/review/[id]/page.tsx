"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useState, useRef, useEffect, Suspense } from "react";
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
  Pencil,
  Trash2,
  X,
  Loader2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/app/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/app/components/ui/dialog";
import { C, FONT_HEADING, FONT_MONO, FONT_BODY, FONT_IMPORT_URL } from "@/app/lib/design-system";
import { CornerMarkers, GrainOverlay } from "@/app/lib/design-primitives";
import { useCurrentUser } from "@/app/context/CurrentUserContext";

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  background: C.bgAlt,
  border: `1px solid ${C.border}`,
  borderRadius: 1,
  color: C.text,
  fontFamily: FONT_BODY,
  fontSize: 14,
  fontWeight: 300,
  outline: "none",
  transition: "border-color 0.2s",
};

const labelStyle: React.CSSProperties = {
  fontFamily: FONT_MONO,
  fontSize: 10,
  fontWeight: 400,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: C.textMuted,
};

function useReveal(className: string) {
  const ref = useRef<HTMLDivElement>(null);
  const [cls, setCls] = useState<string | undefined>(undefined);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight) {
      setCls(`${className} ${className}-visible`);
      return;
    }
    setCls(className);
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setCls(`${className} ${className}-visible`);
          io.disconnect();
        }
      },
      { threshold: 0.08 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [className]);

  return { ref, className: cls };
}

function ReviewDetailContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const reviewId = params.id as string;
  const { currentUser } = useCurrentUser();

  const review = useQuery(
    api.reviews.get,
    reviewId ? { reviewId: reviewId as Id<"reviews"> } : "skip"
  );
  const comments = useQuery(api.comments.listForReview, {
    reviewId: reviewId as Id<"reviews">,
    limit: 50,
  });

  const toggleLike = useMutation(api.likes.toggle);
  const updateReview = useMutation(api.reviews.update);
  const removeReview = useMutation(api.reviews.remove);

  const [linkCopied, setLinkCopied] = useState(false);

  // Edit mode
  const editParam = searchParams.get("edit") === "true";
  const [editing, setEditing] = useState(false);
  const [editRating, setEditRating] = useState(8);
  const [editPlatform, setEditPlatform] = useState("");
  const [editPlaytime, setEditPlaytime] = useState("");
  const [editText, setEditText] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete mode
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isOwner = Boolean(currentUser && review && currentUser._id === review.userId);

  // Enter edit mode from query param
  useEffect(() => {
    if (editParam && review && isOwner && !editing) {
      setEditing(true);
      setEditRating(review.rating);
      setEditPlatform(review.platform || "");
      setEditPlaytime(review.playtimeHours != null ? String(review.playtimeHours) : "");
      setEditText(review.text || "");
      // Remove ?edit=true from URL without navigation
      window.history.replaceState({}, "", `/review/${reviewId}`);
    }
  }, [editParam, review, isOwner, editing, reviewId]);

  const startEditing = () => {
    if (!review) return;
    setEditing(true);
    setEditRating(review.rating);
    setEditPlatform(review.platform || "");
    setEditPlaytime(review.playtimeHours != null ? String(review.playtimeHours) : "");
    setEditText(review.text || "");
    setEditError(null);
  };

  const cancelEditing = () => {
    setEditing(false);
    setEditError(null);
  };

  const handleSave = async () => {
    if (!review) return;

    if (editRating < 1 || editRating > 10) {
      setEditError("Rating must be between 1 and 10.");
      return;
    }

    const parsedPlaytime = editPlaytime.trim() ? Number(editPlaytime) : undefined;
    if (parsedPlaytime !== undefined && (Number.isNaN(parsedPlaytime) || parsedPlaytime < 0)) {
      setEditError("Playtime must be a non-negative number.");
      return;
    }

    setIsSaving(true);
    setEditError(null);
    try {
      await updateReview({
        reviewId: review._id,
        rating: editRating,
        platform: editPlatform.trim() || undefined,
        text: editText.trim() || undefined,
        playtimeHours: parsedPlaytime,
      });
      setEditing(false);
    } catch (error) {
      console.error("Failed to update review:", error);
      setEditError(error instanceof Error ? error.message : "Failed to save changes.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!review) return;
    setIsDeleting(true);
    try {
      await removeReview({ reviewId: review._id });
      setDeleteOpen(false);
      router.push(`/game/${review.gameId}`);
    } catch (error) {
      console.error("Failed to delete review:", error);
    } finally {
      setIsDeleting(false);
    }
  };

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
    const text = `Check out this review of ${review?.game?.title || "this game"}`;

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

  const r0 = useReveal("review-reveal");
  const r1 = useReveal("review-reveal");

  if (review === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: C.bg }}>
        <style>{`@import url('${FONT_IMPORT_URL}')`}</style>
        <p style={{ fontFamily: FONT_MONO, fontSize: 12, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.1em" }}>
          Loading review...
        </p>
      </div>
    );
  }

  if (review === null) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: C.bg }}>
        <style>{`@import url('${FONT_IMPORT_URL}')`}</style>
        <p style={{ fontFamily: FONT_MONO, fontSize: 12, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.1em" }}>
          Review not found
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 md:pb-8" style={{ background: C.bg, position: "relative" }}>
      <style>{`
        @import url('${FONT_IMPORT_URL}');
        .review-reveal { opacity: 0; transform: translateY(12px); transition: opacity 0.5s ease, transform 0.5s ease; }
        .review-reveal-visible { opacity: 1; transform: translateY(0); }
        @media (prefers-reduced-motion: reduce) { .review-reveal { opacity: 1; transform: none; transition: none; } }
      `}</style>
      <GrainOverlay id="review-grain" />

      <div className="pointer-events-none fixed" style={{ top: -100, left: -100, width: 400, height: 400, background: `radial-gradient(circle, ${C.gold}12 0%, transparent 70%)`, filter: "blur(60px)" }} />
      <div className="pointer-events-none fixed" style={{ bottom: -100, right: -100, width: 400, height: 400, background: `radial-gradient(circle, ${C.accent}10 0%, transparent 70%)`, filter: "blur(60px)" }} />

      <div className="max-w-4xl mx-auto p-4 md:p-6 lg:p-8">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 mb-6"
          style={{ color: C.textMuted, transition: "color 0.2s", background: "none", border: "none", cursor: "pointer" }}
          onMouseEnter={(e) => { e.currentTarget.style.color = C.gold; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = C.textMuted; }}
        >
          <ArrowLeft className="w-4 h-4" />
          <span style={{ fontFamily: FONT_MONO, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase" }}>
            Back
          </span>
        </button>

        <div
          ref={r0.ref}
          className={r0.className || ""}
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 2,
            padding: 24,
            marginBottom: 24,
            position: "relative",
          }}
        >
          <CornerMarkers size={10} />

          {/* Author row + owner actions */}
          <div className="flex items-center gap-3 mb-6">
            <Avatar className="h-12 w-12">
              <AvatarImage src={review.author?.avatarUrl} alt={review.author?.name || "User"} />
              <AvatarFallback style={{ background: C.gold, color: C.bg, fontFamily: FONT_MONO }}>
                {review.author?.name?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p style={{ fontFamily: FONT_HEADING, fontWeight: 300, fontSize: 16, color: C.text }}>
                {review.author?.name || "Unknown User"}
              </p>
              <p style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.textDim }}>
                {new Date(review._creationTime || 0).toLocaleDateString()}
              </p>
            </div>

            {/* Owner action buttons */}
            {isOwner && !editing && (
              <div className="flex items-center gap-2">
                <button
                  onClick={startEditing}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 14px",
                    background: "transparent",
                    border: `1px solid ${C.border}`,
                    borderRadius: 2,
                    fontFamily: FONT_MONO,
                    fontSize: 10,
                    fontWeight: 400,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: C.textMuted,
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.gold; e.currentTarget.style.color = C.text; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textMuted; }}
                >
                  <Pencil className="w-3 h-3" />
                  Edit
                </button>
                <button
                  onClick={() => setDeleteOpen(true)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 14px",
                    background: "transparent",
                    border: `1px solid ${C.border}`,
                    borderRadius: 2,
                    fontFamily: FONT_MONO,
                    fontSize: 10,
                    fontWeight: 400,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: C.textMuted,
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.red; e.currentTarget.style.color = C.red; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textMuted; }}
                >
                  <Trash2 className="w-3 h-3" />
                  Delete
                </button>
              </div>
            )}

            {/* Rating display (hidden in edit mode) */}
            {!editing && (
              <div className="flex items-baseline gap-1">
                <span style={{ fontFamily: FONT_HEADING, fontWeight: 200, fontSize: 28, color: C.amber }}>
                  {Math.max(0, Math.min(10, review.rating)).toFixed(1)}
                </span>
                <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: C.textDim }}>/10</span>
              </div>
            )}
          </div>

          {/* Game card (always visible) */}
          <div
            className="flex gap-4 mb-6 pb-6 cursor-pointer"
            onClick={() => router.push(`/game/${review.gameId}`)}
            style={{
              background: C.bgAlt,
              borderBottom: `1px solid ${C.border}`,
              borderRadius: 1,
              padding: 12,
              transition: "border-color 0.2s, box-shadow 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = C.gold;
              e.currentTarget.style.boxShadow = `0 0 16px ${C.bloom}`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = C.border;
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <div className="w-24 h-32 overflow-hidden flex-shrink-0" style={{ borderRadius: 1 }}>
              <ImageWithFallback
                src={getStandardCoverUrl(review.game?.coverUrl) || ""}
                alt={review.game?.title || "Game"}
              />
            </div>
            <div className="flex flex-col justify-center">
              <p style={{ fontFamily: FONT_HEADING, fontWeight: 300, fontSize: 18, color: C.text, marginBottom: 4 }}>
                {review.game?.title || "Unknown Game"}
              </p>
              <p style={{ fontFamily: FONT_MONO, fontSize: 11, color: C.gold, textTransform: "uppercase" }}>
                View Game Details
              </p>
            </div>
          </div>

          {/* EDIT MODE */}
          {editing ? (
            <div className="grid gap-6 mb-6">
              {/* Rating selector */}
              <div className="grid gap-2">
                <label style={labelStyle}>Rating</label>
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((value) => {
                    const isSelected = value <= editRating;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setEditRating(value)}
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: "50%",
                          border: `1px solid ${isSelected ? C.gold : C.border}`,
                          background: isSelected ? C.gold : "transparent",
                          color: isSelected ? C.bg : C.textMuted,
                          fontFamily: FONT_MONO,
                          fontSize: 12,
                          fontWeight: 400,
                          cursor: "pointer",
                          transition: "all 0.15s",
                        }}
                        onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.borderColor = C.gold; }}
                        onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.borderColor = C.border; }}
                      >
                        {value}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Platform + Playtime */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <label htmlFor="edit-platform" style={labelStyle}>Platform (optional)</label>
                  <input
                    id="edit-platform"
                    placeholder="PC, PS5, Switch..."
                    value={editPlatform}
                    onChange={(e) => setEditPlatform(e.target.value)}
                    style={inputStyle}
                    onFocus={(e) => { e.currentTarget.style.borderColor = C.gold; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = C.border; }}
                  />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="edit-playtime" style={labelStyle}>Playtime in hours (optional)</label>
                  <input
                    id="edit-playtime"
                    type="number"
                    min={0}
                    step={0.5}
                    placeholder="e.g. 42"
                    value={editPlaytime}
                    onChange={(e) => setEditPlaytime(e.target.value)}
                    style={inputStyle}
                    onFocus={(e) => { e.currentTarget.style.borderColor = C.gold; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = C.border; }}
                  />
                </div>
              </div>

              {/* Review text */}
              <div className="grid gap-2">
                <label htmlFor="edit-text" style={labelStyle}>Review</label>
                <textarea
                  id="edit-text"
                  placeholder="What stood out? How did it play?"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  style={{
                    ...inputStyle,
                    minHeight: 180,
                    padding: 12,
                    resize: "vertical",
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = C.gold; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = C.border; }}
                />
              </div>

              {/* Error */}
              {editError && (
                <div style={{ background: C.red + "10", border: `1px solid ${C.red}40`, borderRadius: 1, padding: 12 }}>
                  <p style={{ fontFamily: FONT_BODY, fontSize: 13, color: C.red, margin: 0 }}>{editError}</p>
                </div>
              )}

              {/* Save / Cancel */}
              <div className="flex flex-col-reverse gap-3 md:flex-row md:items-center md:justify-end">
                <button
                  type="button"
                  onClick={cancelEditing}
                  disabled={isSaving}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "10px 20px",
                    background: "transparent",
                    border: `1px solid ${C.border}`,
                    borderRadius: 2,
                    fontFamily: FONT_MONO,
                    fontSize: 11,
                    fontWeight: 400,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: C.textMuted,
                    cursor: isSaving ? "not-allowed" : "pointer",
                    opacity: isSaving ? 0.5 : 1,
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => { if (!isSaving) { e.currentTarget.style.borderColor = C.gold; e.currentTarget.style.color = C.text; } }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textMuted; }}
                >
                  <X className="w-3.5 h-3.5" />
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "10px 20px",
                    background: C.gold,
                    color: C.bg,
                    border: "none",
                    borderRadius: 2,
                    fontFamily: FONT_MONO,
                    fontSize: 11,
                    fontWeight: 400,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    cursor: isSaving ? "not-allowed" : "pointer",
                    opacity: isSaving ? 0.5 : 1,
                    boxShadow: `0 0 16px ${C.bloom}`,
                    transition: "all 0.2s",
                  }}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* VIEW MODE - review text + metadata */
            <div className="mb-6">
              {(review.platform || review.playtimeHours != null) && (
                <div className="flex flex-wrap gap-4 mb-4">
                  {review.platform && (
                    <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      Played on {review.platform}
                    </span>
                  )}
                  {review.playtimeHours != null && (
                    <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: C.textMuted, letterSpacing: "0.06em" }}>
                      {review.playtimeHours}h played
                    </span>
                  )}
                </div>
              )}
              <p
                className="whitespace-pre-wrap break-words"
                style={{ fontFamily: FONT_BODY, fontWeight: 300, fontSize: 15, lineHeight: 1.8, color: C.text }}
              >
                {review.text}
              </p>
            </div>
          )}

          {/* Action bar */}
          <div className="flex items-center gap-6" style={{ borderTop: `1px solid ${C.border}`, paddingTop: 24 }}>
            <button
              onClick={handleLike}
              className="flex items-center gap-2"
              style={{
                color: review?.viewerHasLiked ? C.red : C.textMuted,
                transition: "color 0.2s",
                background: "none",
                border: "none",
                cursor: "pointer",
              }}
            >
              <Heart className={`w-5 h-5 ${review?.viewerHasLiked ? "fill-current" : ""}`} />
              <span style={{ fontFamily: FONT_MONO, fontSize: 12 }}>
                {review?.likeCount || 0}
              </span>
            </button>
            <div className="flex items-center gap-2" style={{ color: C.textMuted }}>
              <MessageCircle className="w-5 h-5" />
              <span style={{ fontFamily: FONT_MONO, fontSize: 12 }}>
                {comments?.length || 0}
              </span>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex items-center gap-2 ml-auto"
                  style={{
                    fontFamily: FONT_MONO,
                    fontSize: 12,
                    color: C.textMuted,
                    transition: "color 0.2s",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = C.text; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = C.textMuted; }}
                >
                  <Share2 className="w-5 h-5" />
                  Share
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 2 }}
              >
                <DropdownMenuItem
                  onClick={() => handleShare("twitter")}
                  className="cursor-pointer"
                  style={{ color: C.text }}
                >
                  <Twitter className="w-4 h-4 mr-2" />
                  Share on Twitter
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleShare("facebook")}
                  className="cursor-pointer"
                  style={{ color: C.text }}
                >
                  <Facebook className="w-4 h-4 mr-2" />
                  Share on Facebook
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleShare("link")}
                  className="cursor-pointer"
                  style={{ color: C.text }}
                >
                  {linkCopied ? (
                    <>
                      <Check className="w-4 h-4 mr-2" style={{ color: C.green }} />
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

        {/* Comments section */}
        <div
          ref={r1.ref}
          className={r1.className || ""}
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 2,
            padding: 24,
            position: "relative",
          }}
        >
          <CornerMarkers size={8} />
          <h2 style={{ fontFamily: FONT_HEADING, fontWeight: 200, fontSize: 20, color: C.text, marginBottom: 24 }}>
            Comments ({comments?.length || 0})
          </h2>
          <CommentSection reviewId={review._id} />
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 2,
            maxWidth: 420,
          }}
        >
          <DialogHeader>
            <DialogTitle style={{ fontFamily: FONT_HEADING, fontWeight: 200, fontSize: 20, color: C.text }}>
              Delete Review
            </DialogTitle>
            <DialogDescription style={{ fontFamily: FONT_BODY, fontWeight: 300, fontSize: 13, color: C.textMuted }}>
              This will permanently delete your review of{" "}
              <span style={{ color: C.text, fontWeight: 500 }}>{review.game?.title}</span>.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div
            className="flex gap-3 justify-end"
            style={{ paddingTop: 16, borderTop: `1px solid ${C.border}` }}
          >
            <button
              type="button"
              onClick={() => setDeleteOpen(false)}
              disabled={isDeleting}
              style={{
                padding: "10px 20px",
                background: "transparent",
                border: `1px solid ${C.border}`,
                borderRadius: 2,
                fontFamily: FONT_MONO,
                fontSize: 11,
                fontWeight: 400,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: C.textMuted,
                cursor: isDeleting ? "not-allowed" : "pointer",
                opacity: isDeleting ? 0.5 : 1,
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => { if (!isDeleting) { e.currentTarget.style.borderColor = C.gold; e.currentTarget.style.color = C.text; } }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textMuted; }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 20px",
                background: C.red,
                color: "#fff",
                border: "none",
                borderRadius: 2,
                fontFamily: FONT_MONO,
                fontSize: 11,
                fontWeight: 400,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                cursor: isDeleting ? "not-allowed" : "pointer",
                opacity: isDeleting ? 0.5 : 1,
                transition: "all 0.2s",
              }}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Review"
              )}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function ReviewDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center" style={{ background: C.bg }}>
          <style>{`@import url('${FONT_IMPORT_URL}')`}</style>
          <p style={{ fontFamily: FONT_MONO, fontSize: 12, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.1em" }}>
            Loading review...
          </p>
        </div>
      }
    >
      <ReviewDetailContent />
    </Suspense>
  );
}
