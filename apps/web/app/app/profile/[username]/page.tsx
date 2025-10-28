"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@binnacle/convex-generated/api";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Doc, Id } from "@binnacle/convex-generated/dataModel";
import { FavoritesGrid } from "@/app/components/FavoritesGrid";
import { BacklogGrid } from "@/app/components/BacklogGrid";

/**
 * User profile page showing reviews, stats, and social information.
 */
export default function ProfilePage() {
  const params = useParams();
  const username = params.username as string;
  
  const profile = useQuery(api.users.profileByUsername, { username });
  const currentUser = useQuery(api.users.current);
  const [activeTab, setActiveTab] = useState<"reviews" | "stats" | "favorites" | "backlog">("reviews");
  
  return (
    <main className="min-h-screen bg-gradient-to-b from-stone-950 via-stone-950/95 to-stone-900 text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-8">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-white/10 pb-6">
          <Link href="/" className="text-2xl font-semibold tracking-tight text-white">
            Binnacle
          </Link>
          <Link
            href="/app"
            className="rounded-xl border border-white/20 px-4 py-2 text-sm font-medium text-stone-200 transition hover:border-blue-400 hover:text-white"
          >
            Back to Feed
          </Link>
        </header>

        {profile === undefined ? (
          <div className="flex items-center justify-center rounded-2xl border border-white/10 bg-stone-900/60 p-16">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
          </div>
        ) : profile === null ? (
          <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-white/10 bg-stone-900/60 p-16 text-center">
            <svg className="h-12 w-12 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex flex-col gap-2">
              <h1 className="text-2xl font-semibold text-white">User not found</h1>
              <p className="text-sm text-stone-400">We couldn&apos;t find a profile for @{username}.</p>
            </div>
            <Link
              href="/app"
              className="mt-4 rounded-xl bg-blue-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-400"
            >
              Back to feed
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-6 rounded-2xl border border-white/10 bg-stone-900/60 p-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
              {/* User Info */}
              <div className="flex items-center gap-6">
                {profile.user.avatarUrl ? (
                  <Image
                    src={profile.user.avatarUrl}
                    alt={profile.user.name}
                    width={96}
                    height={96}
                    className="h-24 w-24 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-3xl font-bold text-white">
                    {profile.user.name[0]?.toUpperCase() ?? "?"}
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  <h1 className="text-3xl font-semibold">{profile.user.name}</h1>
                  <p className="text-sm text-stone-400">@{profile.user.username}</p>
                  {profile.user.bio && (
                    <p className="mt-2 max-w-md text-sm text-stone-300">
                      {profile.user.bio}
                    </p>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                {profile.viewerIsSelf ? (
                  <Link
                    href="/app/settings"
                    className="flex items-center gap-2 rounded-xl border border-white/20 px-4 py-2 text-sm font-medium text-stone-200 transition hover:border-blue-400 hover:text-white"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Edit Profile
                  </Link>
                ) : (
                  <FollowButton
                    targetUserId={profile.user._id}
                    isFollowing={profile.viewerFollows}
                    disabled={!currentUser}
                  />
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 border-t border-white/10 pt-6">
              <StatCard label="Reviews" value={profile.stats.reviewCount} />
              <StatCard label="Followers" value={profile.followerCount} />
              <StatCard label="Following" value={profile.followingCount} />
            </div>
          </div>
        )}

        {profile && (
          <>
            <div className="flex gap-2 border-b border-white/10">
              <button
                onClick={() => setActiveTab("reviews")}
                className={`rounded-t-xl px-6 py-3 text-sm font-semibold transition ${
                  activeTab === "reviews"
                    ? "border-b-2 border-blue-500 text-white"
                    : "text-stone-400 hover:text-white"
                }`}
              >
                Reviews
              </button>
              <button
                onClick={() => setActiveTab("backlog")}
                className={`rounded-t-xl px-6 py-3 text-sm font-semibold transition ${
                  activeTab === "backlog"
                    ? "border-b-2 border-blue-500 text-white"
                    : "text-stone-400 hover:text-white"
                }`}
              >
                Backlog
              </button>
              <button
                onClick={() => setActiveTab("favorites")}
                className={`rounded-t-xl px-6 py-3 text-sm font-semibold transition ${
                  activeTab === "favorites"
                    ? "border-b-2 border-blue-500 text-white"
                    : "text-stone-400 hover:text-white"
                }`}
              >
                Favorites
              </button>
              <button
                onClick={() => setActiveTab("stats")}
                className={`rounded-t-xl px-6 py-3 text-sm font-semibold transition ${
                  activeTab === "stats"
                    ? "border-b-2 border-blue-500 text-white"
                    : "text-stone-400 hover:text-white"
                }`}
              >
                Statistics
              </button>
            </div>

            {activeTab === "reviews" && (
              <ReviewsList userId={profile.user._id} author={profile.user} />
            )}
            {activeTab === "backlog" && (
              <BacklogGrid userId={profile.user._id} />
            )}
            {activeTab === "favorites" && (
              <FavoritesGrid userId={profile.user._id} />
            )}
            {activeTab === "stats" && (
              <StatsView stats={profile.stats} />
            )}
          </>
        )}
      </div>
    </main>
  );
}

/**
 * Individual stat card for profile header.
 */
function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-2xl font-bold text-white">{value}</span>
      <span className="text-sm text-stone-400">{label}</span>
    </div>
  );
}

/**
 * Follow/Unfollow button for user profiles.
 */
function FollowButton({
  targetUserId,
  isFollowing,
  disabled,
}: {
  targetUserId: Id<"users">;
  isFollowing: boolean;
  disabled: boolean;
}) {
  const follow = useMutation(api.followers.follow);
  const unfollow = useMutation(api.followers.unfollow);
  const [following, setFollowing] = useState(isFollowing);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setFollowing(isFollowing);
  }, [isFollowing]);

  const handleToggleFollow = async () => {
    if (disabled) {
      return;
    }

    setIsLoading(true);
    try {
      if (following) {
        await unfollow({ targetUserId });
        setFollowing(false);
      } else {
        await follow({ targetUserId });
        setFollowing(true);
      }
    } catch (error) {
      console.error("Follow action failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggleFollow}
      disabled={isLoading || disabled}
      className={`flex items-center gap-2 rounded-xl px-6 py-2 text-sm font-semibold transition ${
        following
          ? "border border-white/20 text-stone-200 hover:border-red-400 hover:text-red-400"
          : "bg-blue-500 text-white hover:bg-blue-400"
      }`}
    >
      {following ? "Following" : "Follow"}
    </button>
  );
}

/**
 * List of user's reviews.
 */
function ReviewsList({
  userId,
  author,
}: {
  userId: Id<"users">;
  author: {
    _id: Id<"users">;
    name: string;
    username: string;
  };
}) {
  const reviews = useQuery(api.reviews.listForUser, { userId, limit: 50 });

  if (!reviews) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-white/10 bg-stone-900/60 p-12">
        <p className="text-sm text-stone-400">Loading reviews...</p>
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-white/10 bg-stone-900/60 p-16 text-center">
        <svg className="h-12 w-12 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <div className="flex flex-col gap-2">
          <h3 className="text-lg font-semibold text-white">No reviews yet</h3>
          <p className="max-w-md text-sm text-stone-400">
            This user hasn&apos;t posted any reviews yet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {reviews.map((review) => (
        <ReviewCard key={review._id} review={review} author={author} />
      ))}
    </div>
  );
}

/**
 * Individual review card.
 */
function ReviewCard({
  review,
  author,
}: {
  review: Doc<"reviews">;
  author: {
    name: string;
    username: string;
  };
}) {
  const game = useQuery(api.games.getById, { gameId: review.gameId });
  const coverUrl = game?.coverUrl;
  const gameTitle = game?.title ?? "Unknown Game";

  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-stone-900/60 p-6 transition hover:border-white/20">
      <div className="flex items-start gap-4">
        {coverUrl ? (
          <div className="relative h-20 w-[60px] overflow-hidden rounded-lg">
            <Image
              src={coverUrl}
              alt={gameTitle}
              fill
              sizes="60px"
              className="object-cover"
            />
          </div>
        ) : null}
        <div className="flex flex-1 flex-col gap-2">
          <h3 className="font-semibold text-white">{gameTitle}</h3>
          <div className="flex items-center gap-2">
            <div className="flex gap-0.5">
              {[...Array(5)].map((_, i) => (
                <svg
                  key={i}
                  className={`h-3.5 w-3.5 ${
                    i < Math.round(review.rating / 2) ? "text-yellow-400" : "text-stone-700"
                  }`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <span className="text-xs font-medium text-stone-400">{review.rating}/10</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs text-stone-500">
        <Link href={`/app/profile/${author.username}`} className="text-blue-300 transition hover:text-blue-200">
          {author.name}
        </Link>
        <span>@{author.username}</span>
      </div>
      {review.text && (
        <p className="line-clamp-3 text-sm text-stone-300">{review.text}</p>
      )}
      <div className="flex gap-2 text-xs text-stone-500">
        {review.platform && (
          <span className="rounded-lg bg-stone-800/80 px-2 py-1">
            {review.platform}
          </span>
        )}
        {review.playtimeHours && (
          <span className="rounded-lg bg-stone-800/80 px-2 py-1">
            {review.playtimeHours}h
          </span>
        )}
      </div>
    </article>
  );
}

/**
 * Statistics view showing aggregated data.
 */
function StatsView({
  stats,
}: {
  stats: {
    reviewCount: number;
    averageRating?: number;
    totalPlaytimeHours: number;
    topPlatforms: Array<{ name: string; count: number }>;
  };
}) {
  const topPlatform = stats.topPlatforms[0]?.name ?? "—";

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-stone-900/60 p-6">
        <h3 className="text-sm font-semibold text-stone-400">Total Games</h3>
        <p className="text-4xl font-bold text-white">{stats.reviewCount}</p>
      </div>
      <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-stone-900/60 p-6">
        <h3 className="text-sm font-semibold text-stone-400">Average Rating</h3>
        <p className="text-4xl font-bold text-white">
          {stats.averageRating ? stats.averageRating.toFixed(1) : "0.0"}/10
        </p>
      </div>
      <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-stone-900/60 p-6">
        <h3 className="text-sm font-semibold text-stone-400">Total Playtime</h3>
        <p className="text-4xl font-bold text-white">{stats.totalPlaytimeHours}h</p>
      </div>
      <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-stone-900/60 p-6">
        <h3 className="text-sm font-semibold text-stone-400">Top Platform</h3>
        <p className="text-4xl font-bold text-white">{topPlatform}</p>
      </div>
    </div>
  );
}
