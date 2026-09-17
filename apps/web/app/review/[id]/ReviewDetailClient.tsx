"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
import { CommentSection } from "@/app/components/CommentSection";
import { ShareReviewModal } from "@/app/components/ShareReviewModal";
import { Skeleton } from "@/app/components/ui/skeleton";
import { Heart, MessageCircle, ChevronLeft, Share2, Twitter, Facebook, Link as LinkIcon, Check, ImageIcon, Clock, Gamepad2, ArrowRight } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/app/components/ui/dropdown-menu";
import { toneVars } from "@/app/lib/coverColor";
import { CaseBackdrop, Cover, ScoreMark, SectionHeading, useCaseTone } from "@/app/components/playchive";
import { relativeTime } from "@/app/components/ReviewCard";

export default function ReviewDetailClient() {
  const params = useParams();
  const router = useRouter();
  const reviewId = params.id as string;
  const review = useQuery(api.reviews.get, reviewId ? { reviewId: reviewId as Id<"reviews"> } : "skip");
  const comments = useQuery(api.comments.listForReview, { reviewId: reviewId as Id<"reviews">, limit: 50 });
  const toggleLike = useMutation(api.likes.toggle);
  const [tone, setTone] = useCaseTone(review?.gameId);
  const [linkCopied, setLinkCopied] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);

  const handleLike = async () => {
    if (!review) return;
    try { await toggleLike({ reviewId: review._id }); } catch (error) { console.error("Failed to toggle like:", error); }
  };

  const handleShare = (platform: "twitter" | "facebook" | "link") => {
    const url = window.location.href;
    const text = `Check out this review of ${review?.game?.title || "this game"}`;
    if (platform === "twitter") window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, "_blank");
    else if (platform === "facebook") window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, "_blank");
    else { navigator.clipboard.writeText(url); setLinkCopied(true); setTimeout(() => setLinkCopied(false), 2000); }
  };

  if (review === undefined) {
    return <div className="min-h-screen bg-bg"><div className="max-w-[1100px] mx-auto px-5 md:px-8 pt-10 space-y-4"><Skeleton className="h-8 w-24 bg-surface" /><Skeleton className="h-64 rounded-2xl bg-surface" /></div></div>;
  }
  if (review === null) {
    return <div className="min-h-screen bg-bg"><div className="max-w-[1100px] mx-auto px-5 md:px-8 pt-10"><SectionHeading eyebrow="Review" title="This review isn’t here anymore." action={{ label: "Back to the feed", href: "/feed" }} /></div></div>;
  }

  const author = review.author;
  const game = review.game;

  return (
    <div className="pk-inside min-h-screen pb-24 md:pb-12" style={toneVars(tone)}>
      <CaseBackdrop />
      <section className="pk-hero pk-hero-inside">
        <div className="pk-hero-inner pk-detail-hero" data-size="sm">
          <button type="button" onClick={() => router.back()} className="pk-hero-back pk-textlink !text-white/80"><ChevronLeft size={16} />Back</button>
          <Link href={`/game/${review.gameId}`} className="pk-detail-cover block" aria-label={game?.title ?? "Game"}>
            <Cover src={game?.coverUrl} title={game?.title ?? "Game"} sizes="(max-width: 767px) 48vw, 200px" gameId={review.gameId} onTone={setTone} />
          </Link>
          <div>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <span className="pk-eyebrow !text-white/80">Review</span>
                <h1 className="!text-[clamp(30px,4.2vw,60px)]">{game?.title ?? "Unknown game"}</h1>
              </div>
              <ScoreMark value={review.rating} />
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-[#C9D4E6]">
              {author && <Link href={`/profile/${author.username}`} className="inline-flex items-center gap-2 hover:underline">
                <Avatar className="h-7 w-7 rounded-full"><AvatarImage src={author.avatarUrl} alt="" /><AvatarFallback className="bg-gold text-[#101827] text-xs">{author.name.charAt(0).toUpperCase()}</AvatarFallback></Avatar>
                <b>{author.name}</b> <span className="opacity-80">@{author.username}</span>
              </Link>}
              <span>{relativeTime(review._creationTime)}</span>
              {review.platform && <span className="inline-flex items-center gap-1"><Gamepad2 size={14} aria-hidden="true" />{review.platform}</span>}
              {!!review.playtimeHours && <span className="inline-flex items-center gap-1"><Clock size={14} aria-hidden="true" />{review.playtimeHours}h played</span>}
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-[1100px] mx-auto px-5 md:px-8 pt-10">
        <article className="pk-review-text !border-l-4 !pl-6 !text-[clamp(17px,1.4vw,21px)] !leading-[1.65] whitespace-pre-wrap max-w-[70ch]">{review.text}</article>

        <div className="pk-actions mt-8 max-w-[70ch]">
          <button type="button" className="pk-action" data-active={review.viewerHasLiked || undefined} onClick={handleLike} aria-pressed={!!review.viewerHasLiked} aria-label={review.viewerHasLiked ? "Unlike" : "Like"}><Heart size={18} />{review.likeCount ?? 0}</button>
          <a href="#comments" className="pk-action"><MessageCircle size={18} />{comments?.length ?? 0}</a>
          <Link href={`/game/${review.gameId}`} className="pk-action">Game page<ArrowRight size={15} /></Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><button type="button" className="pk-action pk-more"><Share2 size={18} />Share</button></DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl p-1.5">
              <DropdownMenuItem className="rounded-lg" onClick={() => setShareModalOpen(true)}><ImageIcon size={15} />Share as image</DropdownMenuItem>
              <DropdownMenuItem className="rounded-lg" onClick={() => handleShare("twitter")}><Twitter size={15} />Share on Twitter</DropdownMenuItem>
              <DropdownMenuItem className="rounded-lg" onClick={() => handleShare("facebook")}><Facebook size={15} />Share on Facebook</DropdownMenuItem>
              <DropdownMenuItem className="rounded-lg" onClick={() => handleShare("link")}>{linkCopied ? <><Check size={15} className="text-green" />Link copied</> : <><LinkIcon size={15} />Copy link</>}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <section id="comments" className="pt-12 max-w-[70ch]">
          <SectionHeading eyebrow={<>Comments <b>{comments?.length ?? 0}</b></>} title="Join the conversation." />
          <CommentSection reviewId={review._id} />
        </section>
      </div>

      <ShareReviewModal reviewId={reviewId} gameTitle={game?.title || "this game"} open={shareModalOpen} onOpenChange={setShareModalOpen} />
    </div>
  );
}
