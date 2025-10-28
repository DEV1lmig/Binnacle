"use client";

import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@binnacle/convex-generated/api";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Doc, Id } from "@binnacle/convex-generated/dataModel";
import { FavoriteToggle } from "@/app/components/FavoriteToggle";
import { BacklogToggle } from "@/app/components/BacklogToggle";
import { MediaGallery } from "@/app/components/game/MediaGallery";
import { MetadataChips } from "@/app/components/game/MetadataChips";
import { CreditsSection } from "@/app/components/game/CreditsSection";
import { ExternalLinks } from "@/app/components/game/ExternalLinks";
import { RatingsDisplay } from "@/app/components/game/RatingsDisplay";
import { SimilarGamesCarousel } from "@/app/components/game/SimilarGamesCarousel";
import { useEffect } from "react";

/**
 * Game detail page showing all reviews and aggregate ratings.
 */
export default function GameDetailPage() {
  const params = useParams();
  const gameId = params.gameId as Id<"games">;
  
  const game = useQuery(api.games.getById, { gameId });
  const reviews = useQuery(api.reviews.listForGame, { gameId, limit: 50 });
  const enrichGame = useAction(api.igdb.enrichGame);

  // Auto-enrich games that don't have enriched data yet
  useEffect(() => {
    if (game && !game.summary && game.igdbId) {
      enrichGame({ igdbId: game.igdbId }).catch((error) =>
        console.error("Failed to enrich game:", error)
      );
    }
  }, [game, enrichGame]);

  const averageRating = reviews && reviews.length > 0
    ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length
    : 0;

  return (
    <main className="min-h-screen bg-gradient-to-b from-stone-950 via-stone-950/95 to-stone-900 text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-8">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-white/10 pb-6">
          <Link href="/" className="text-2xl font-semibold tracking-tight text-white">
            Binnacle
          </Link>
          <Link
            href="/app/backlog"
            className="rounded-xl border border-white/20 px-4 py-2 text-sm font-medium text-stone-200 transition hover:border-blue-400 hover:text-white"
          >
            Back to Backlog
          </Link>
        </header>

        {!game ? (
          <div className="flex items-center justify-center rounded-2xl border border-white/10 bg-stone-900/60 p-16">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
          </div>
        ) : (
          <>
            {/* Game Header */}
            <div className="flex flex-col gap-6 rounded-2xl border border-white/10 bg-stone-900/60 p-8">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
                {/* Cover */}
                {game.coverUrl && (
                  <div className="relative h-64 w-48 overflow-hidden rounded-xl">
                    <Image
                      src={game.coverUrl}
                      alt={game.title}
                      fill
                      sizes="192px"
                      className="object-cover shadow-lg"
                    />
                  </div>
                )}

                {/* Info */}
                <div className="flex flex-1 flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <h1 className="text-4xl font-bold">{game.title}</h1>
                    {game.releaseYear && (
                      <p className="text-lg text-stone-400">{game.releaseYear}</p>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4 rounded-xl border border-white/10 bg-stone-900/80 p-4 sm:grid-cols-3">
                    <div className="flex flex-col gap-1">
                      <span className="text-sm text-stone-400">Average Rating</span>
                      <span className="text-2xl font-bold text-blue-400">
                        {averageRating > 0 ? averageRating.toFixed(1) : "—"}/10
                      </span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-sm text-stone-400">Total Reviews</span>
                      <span className="text-2xl font-bold text-white">
                        {reviews?.length ?? 0}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-sm text-stone-400">Stars</span>
                      <div className="flex gap-1">
                        {[...Array(5)].map((_, i) => (
                          <svg
                            key={i}
                            className={`h-5 w-5 ${
                              i < Math.round(averageRating / 2) ? "text-yellow-400" : "text-stone-700"
                            }`}
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Link
                      href={`/app/review/new?gameId=${game.igdbId}`}
                      className="flex items-center justify-center gap-2 rounded-xl bg-blue-500 px-6 py-3 font-semibold text-white transition hover:bg-blue-400"
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add Your Review
                    </Link>
                    <BacklogToggle gameId={gameId} />
                    <FavoriteToggle gameId={gameId} />
                  </div>
                </div>
              </div>
            </div>

            {/* Summary Section */}
            {game.summary && (
              <section className="flex flex-col gap-6 rounded-2xl border border-white/10 bg-stone-900/60 p-6">
                <h2 className="text-2xl font-semibold">Summary</h2>
                <p className="leading-relaxed text-stone-300">{game.summary}</p>
              </section>
            )}

            {/* Storyline Section */}
            {game.storyline && (
              <section className="flex flex-col gap-6 rounded-2xl border border-white/10 bg-stone-900/60 p-6">
                <h2 className="text-2xl font-semibold">Storyline</h2>
                <p className="leading-relaxed text-stone-300">{game.storyline}</p>
              </section>
            )}

            {/* Media Gallery */}
            <MediaGallery
              artworks={game.artworks}
              screenshots={game.screenshots}
              videos={game.videos}
              title={game.title}
            />

            {/* Metadata Chips */}
            <MetadataChips
              genres={game.genres}
              themes={game.themes}
              playerPerspectives={game.playerPerspectives}
              gameModes={game.gameModes}
              platforms={game.platforms}
            />

            {/* Credits Section */}
            <CreditsSection
              developers={game.developers}
              publishers={game.publishers}
            />

            {/* External Links */}
            <ExternalLinks websites={game.websites} />

            {/* Ratings Display */}
            <RatingsDisplay
              aggregatedRating={game.aggregatedRating}
              aggregatedRatingCount={game.aggregatedRatingCount}
              ageRatings={game.ageRatings}
            />

            {/* Similar Games */}
            <SimilarGamesCarousel similarGames={game.similarGames} />

            {/* Reviews List */}
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold">Community Reviews</h2>
                <span className="text-sm text-stone-400">
                  {reviews?.length ?? 0} reviews
                </span>
              </div>

              {!reviews ? (
                <div className="flex items-center justify-center rounded-2xl border border-white/10 bg-stone-900/60 p-12">
                  <p className="text-sm text-stone-400">Loading reviews...</p>
                </div>
              ) : reviews.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-white/10 bg-stone-900/60 p-16 text-center">
                  <svg className="h-12 w-12 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <div className="flex flex-col gap-2">
                    <h3 className="text-lg font-semibold text-white">No reviews yet</h3>
                    <p className="max-w-md text-sm text-stone-400">
                      Be the first to share your thoughts about this game!
                    </p>
                  </div>
                  <Link
                    href={`/app/review/new?gameId=${game.igdbId}`}
                    className="mt-4 flex items-center gap-2 rounded-xl bg-blue-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-400"
                  >
                    Write First Review
                  </Link>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {reviews.map((review) => (
                    <ReviewCard key={review._id} review={review} />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}

/**
 * Individual review card with user info and like button.
 */
function ReviewCard({ review }: { review: Doc<"reviews"> }) {
  const user = useQuery(api.users.getById, { userId: review.userId });
  const likes = useQuery(api.likes.listForReview, { reviewId: review._id, limit: 100 });
  const toggleLike = useMutation(api.likes.toggle);
  const currentUser = useQuery(api.users.current);

  const hasLiked = likes?.some((like) => like.userId === currentUser?._id) ?? false;

  const handleLike = async () => {
    try {
      await toggleLike({ reviewId: review._id });
    } catch (error) {
      console.error("Failed to toggle like:", error);
    }
  };

  if (!user) return null;

  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-stone-900/60 p-6 transition hover:border-white/20">
      {/* User Header */}
      <div className="flex items-center justify-between">
        <Link
          href={`/app/profile/${user.username}`}
          className="flex items-center gap-3 transition hover:opacity-80"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-sm font-bold text-white">
            {user.name[0].toUpperCase()}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-white">{user.name}</span>
            <span className="text-xs text-stone-400">@{user.username}</span>
          </div>
        </Link>

        {/* Rating */}
        <div className="flex items-center gap-2 rounded-xl bg-stone-800/80 px-3 py-1.5">
          <div className="flex gap-0.5">
            {[...Array(5)].map((_, i) => (
              <svg
                key={i}
                className={`h-4 w-4 ${
                  i < Math.round(review.rating / 2) ? "text-yellow-400" : "text-stone-700"
                }`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
          </div>
          <span className="text-sm font-semibold text-white">{review.rating}/10</span>
        </div>
      </div>

      {/* Review Content */}
      {review.text && (
        <p className="text-sm leading-relaxed text-stone-300">{review.text}</p>
      )}

      {/* Meta & Actions */}
      <div className="flex items-center justify-between border-t border-white/10 pt-4">
        <div className="flex gap-2 text-xs text-stone-500">
          {review.platform && (
            <span className="rounded-lg bg-stone-800/80 px-2 py-1">
              {review.platform}
            </span>
          )}
          {review.playtimeHours && (
            <span className="rounded-lg bg-stone-800/80 px-2 py-1">
              {review.playtimeHours}h played
            </span>
          )}
        </div>

        {/* Like Button */}
        <button
          onClick={handleLike}
          className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition hover:bg-stone-800/60"
        >
          <svg
            className={`h-4 w-4 ${hasLiked ? "fill-red-500 text-red-500" : "text-stone-400"}`}
            fill={hasLiked ? "currentColor" : "none"}
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            />
          </svg>
          <span className={hasLiked ? "text-red-400" : "text-stone-400"}>
            {likes?.length ?? 0}
          </span>
        </button>
      </div>
    </article>
  );
}
