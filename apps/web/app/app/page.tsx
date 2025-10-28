"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@binnacle/convex-generated/api";
import { useState, useMemo } from "react";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { Id } from "@binnacle/convex-generated/dataModel";

/**
 * Main app dashboard displaying the user's feed and game search.
 */
export default function AppPage() {
  const { user } = useUser();
  const currentUser = useQuery(api.users.current);
  const timeline = useQuery(
    api.feed.timeline,
    currentUser ? { limit: 20 } : "skip"
  );
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <main className="min-h-screen bg-gradient-to-b from-stone-950 via-stone-950/95 to-stone-900 text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-8">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-white/10 pb-6">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-2xl font-semibold tracking-tight text-white">
              Binnacle
            </Link>
            <nav className="hidden items-center gap-1 sm:flex">
              <Link
                href="/app"
                className="rounded-xl px-4 py-2 text-sm font-medium text-white transition hover:bg-stone-800/60"
              >
                Feed
              </Link>
              <Link
                href="/app/backlog"
                className="rounded-xl px-4 py-2 text-sm font-medium text-stone-400 transition hover:bg-stone-800/60 hover:text-white"
              >
                Backlog
              </Link>
              <Link
                href="/app/discover"
                className="rounded-xl px-4 py-2 text-sm font-medium text-stone-400 transition hover:bg-stone-800/60 hover:text-white"
              >
                Discover
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            {currentUser && (
              <Link
                href={`/app/profile/${currentUser.username}`}
                className="flex items-center gap-2 rounded-full border border-white/20 bg-stone-900/60 px-3 py-1.5 text-sm font-medium text-stone-200 transition hover:border-blue-400/70 hover:text-white"
              >
                {user?.imageUrl && (
                  <img
                    src={user.imageUrl}
                    alt={currentUser.name}
                    className="h-6 w-6 rounded-full object-cover"
                  />
                )}
                {currentUser.username}
              </Link>
            )}
          </div>
        </header>

        {/* Main Content Grid */}
        <div className="grid gap-8 lg:grid-cols-[1fr_350px]">
          {/* Feed */}
          <section className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-semibold">Your Feed</h1>
              <Link
                href="/app/review/new"
                className="flex items-center gap-2 rounded-xl bg-blue-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-400"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Review
              </Link>
            </div>

            {!currentUser || timeline === undefined ? (
              <div className="flex items-center justify-center rounded-2xl border border-white/10 bg-stone-900/60 p-12">
                <p className="text-sm text-stone-400">Loading your feed...</p>
              </div>
            ) : timeline.community.length === 0 && timeline.friends.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-white/10 bg-stone-900/60 p-12 text-center">
                <svg className="h-12 w-12 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <div className="flex flex-col gap-2">
                  <h3 className="text-lg font-semibold text-white">Your feed is empty</h3>
                  <p className="max-w-md text-sm text-stone-400">
                    Start by adding your first game review or follow some users to see their activity here.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-8">
                {timeline.friends.length > 0 && (
                  <div className="flex flex-col gap-4">
                    <h2 className="text-lg font-semibold text-white">Friend Activity</h2>
                    <div className="flex flex-col gap-4">
                      {timeline.friends.map((entry) => (
                        <ReviewCard key={entry.review._id} entry={entry} />
                      ))}
                    </div>
                  </div>
                )}
                {timeline.community.length > 0 && (
                  <div className="flex flex-col gap-4">
                    <h2 className="text-lg font-semibold text-white">Community Feed</h2>
                    <div className="flex flex-col gap-4">
                      {timeline.community.map((entry) => (
                        <ReviewCard key={entry.review._id} entry={entry} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Sidebar */}
          <aside className="flex flex-col gap-6">
            {/* Discover People */}
            <div className="rounded-2xl border border-white/10 bg-stone-900/60 p-6">
              <h2 className="mb-4 text-lg font-semibold">Discover People</h2>
              <DiscoverPeopleWidget />
            </div>

            {/* Search Games */}
            <div className="rounded-2xl border border-white/10 bg-stone-900/60 p-6">
              <h2 className="mb-4 text-lg font-semibold">Search Games</h2>
              <SearchGamesWidget />
            </div>

            {/* Quick Stats */}
            {currentUser && (
              <div className="rounded-2xl border border-white/10 bg-stone-900/60 p-6">
                <h2 className="mb-4 text-lg font-semibold">Your Stats</h2>
                <UserStatsWidget userId={currentUser._id} />
              </div>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}

/**
 * Displays a single review card in the feed.
 */
function ReviewCard({
  entry,
}: {
  entry: {
    review: {
      _id: Id<"reviews">;
      _creationTime: number;
      userId: Id<"users">;
      gameId: Id<"games">;
      rating: number;
      platform?: string;
      text?: string;
      playtimeHours?: number;
    };
    author: {
      _id: Id<"users">;
      name: string;
      username: string;
      avatarUrl?: string;
    };
    game: {
      _id: Id<"games">;
      title: string;
      coverUrl?: string;
      releaseYear?: number;
    };
    likeCount: number;
    viewerHasLiked: boolean;
    commentCount: number;
  };
}) {
  const toggleLike = useMutation(api.likes.toggle);
  const [liked, setLiked] = useState(entry.viewerHasLiked);
  const [likeCount, setLikeCount] = useState(entry.likeCount);
  const [isMutating, setIsMutating] = useState(false);
  const [showComments, setShowComments] = useState(false);

  const ratingStars = Math.round(entry.review.rating / 2);
  const relativeTime = formatRelativeTime(entry.review._creationTime);

  const handleToggleLike = async () => {
    if (isMutating) {
      return;
    }

    setIsMutating(true);
    try {
      setLiked((prev) => !prev);
      setLikeCount((prev) => (liked ? Math.max(0, prev - 1) : prev + 1));
      await toggleLike({ reviewId: entry.review._id });
    } catch (error) {
      setLiked(entry.viewerHasLiked);
      setLikeCount(entry.likeCount);
      console.error("Failed to toggle like", error);
    } finally {
      setIsMutating(false);
    }
  };

  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-stone-900/60 p-6 transition hover:border-white/20">
      <div className="flex items-start justify-between">
        <Link
          href={`/app/profile/${entry.author.username}`}
          className="flex items-center gap-3 transition hover:opacity-80"
        >
          {entry.author.avatarUrl ? (
            <img
              src={entry.author.avatarUrl}
              alt={entry.author.name}
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500 text-sm font-semibold">
              {entry.author.name[0]?.toUpperCase() ?? "?"}
            </div>
          )}
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-white">{entry.author.name}</span>
            <span className="text-xs text-stone-400">{relativeTime}</span>
          </div>
        </Link>
        <div className="flex flex-col items-end text-right">
          <span className="text-sm font-semibold text-white">{entry.game.title}</span>
          {entry.game.releaseYear && <span className="text-xs text-stone-500">{entry.game.releaseYear}</span>}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {[...Array(5)].map((_, index) => (
              <svg
                key={index}
                className={`h-4 w-4 ${index < ratingStars ? "text-yellow-400" : "text-stone-700"}`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
          </div>
          <span className="text-sm text-stone-400">{entry.review.rating}/10</span>
        </div>

        {entry.review.text && <p className="text-sm text-stone-300">{entry.review.text}</p>}

        <div className="flex flex-wrap gap-2 text-xs text-stone-500">
          {entry.review.platform && (
            <span className="rounded-lg bg-stone-800/80 px-2 py-1">{entry.review.platform}</span>
          )}
          {entry.review.playtimeHours && (
            <span className="rounded-lg bg-stone-800/80 px-2 py-1">{entry.review.playtimeHours}h played</span>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-white/10 pt-4 text-sm">
        <Link href={`/app/game/${entry.game._id}`} className="text-blue-300 transition hover:text-blue-200">
          View game
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowComments(!showComments)}
            className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition hover:bg-stone-800/60"
          >
            <svg
              className="h-4 w-4 text-stone-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <span className="text-stone-400">{entry.commentCount}</span>
          </button>
          <button
            onClick={handleToggleLike}
            disabled={isMutating}
            className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition hover:bg-stone-800/60 disabled:cursor-not-allowed"
          >
            <svg
              className={`h-4 w-4 ${liked ? "fill-red-500 text-red-400" : "text-stone-400"}`}
              fill={liked ? "currentColor" : "none"}
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
            <span className={liked ? "text-red-300" : "text-stone-400"}>{likeCount}</span>
          </button>
        </div>
      </div>

      {showComments && (
        <CommentSection reviewId={entry.review._id} />
      )}
    </article>
  );
}

/**
 * Comment section for a review, showing all comments and an input form.
 */
function CommentSection({ reviewId }: { reviewId: Id<"reviews"> }) {
  const [commentText, setCommentText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const comments = useQuery(api.comments.listForReview, { reviewId });
  const createComment = useMutation(api.comments.create);
  const removeComment = useMutation(api.comments.remove);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await createComment({ reviewId, text: commentText.trim() });
      setCommentText("");
    } catch (error) {
      console.error("Failed to create comment:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (commentId: Id<"comments">) => {
    try {
      await removeComment({ commentId });
    } catch (error) {
      console.error("Failed to delete comment:", error);
    }
  };

  const charCount = commentText.length;
  const maxChars = 1000;
  const isOverLimit = charCount > maxChars;

  return (
    <div className="border-t border-white/10 pt-4 space-y-4">
      {/* Comment Form */}
      <form onSubmit={handleSubmit} className="space-y-2">
        <textarea
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          placeholder="Write a comment..."
          className="w-full rounded-lg border border-white/15 bg-stone-900/60 px-3 py-2 text-sm text-white placeholder:text-stone-500 focus:border-blue-400 focus:outline-none resize-none"
          rows={3}
          disabled={isSubmitting}
        />
        <div className="flex items-center justify-between">
          <span className={`text-xs ${isOverLimit ? "text-red-400" : "text-stone-500"}`}>
            {charCount} / {maxChars}
          </span>
          <button
            type="submit"
            disabled={isSubmitting || !commentText.trim() || isOverLimit}
            className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? "Posting..." : "Post"}
          </button>
        </div>
      </form>

      {/* Comments List */}
      {comments && comments.length > 0 && (
        <div className="space-y-3">
          {comments.map((comment) => (
            <div key={comment._id} className="flex gap-3">
              {comment.author.avatarUrl && (
                <img
                  src={comment.author.avatarUrl}
                  alt={comment.author.username}
                  className="h-8 w-8 rounded-full"
                />
              )}
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white">
                    {comment.author.username}
                  </span>
                  <span className="text-xs text-stone-500">
                    {new Date(comment.createdAt).toLocaleDateString()}
                  </span>
                  {comment.isAuthor && (
                    <button
                      onClick={() => handleDelete(comment._id)}
                      className="ml-auto text-xs text-red-400 transition hover:text-red-300"
                    >
                      Delete
                    </button>
                  )}
                </div>
                <p className="text-sm text-stone-300">{comment.text}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Game search widget for discovering and adding games.
 */
function SearchGamesWidget() {
  const [query, setQuery] = useState("");
  
  return (
    <div className="flex flex-col gap-3">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search IGDB..."
        className="w-full rounded-xl border border-white/15 bg-stone-900/60 px-4 py-2.5 text-sm text-white placeholder:text-stone-500 focus:border-blue-400 focus:outline-none"
      />
      {query && (
        <p className="text-xs text-stone-500">Press Enter to search</p>
      )}
    </div>
  );
}

/**
 * Displays user statistics like review count, average rating, and playtime.
 */
function UserStatsWidget({ userId }: { userId: Id<"users"> }) {
  const reviews = useQuery(api.reviews.listForUser, { userId, limit: 200 });

  const computed = useMemo(() => {
    if (!reviews || reviews.length === 0) {
      return { count: 0, average: "0.0", playtime: 0 } as const;
    }

    const count = reviews.length;
    const ratingSum = reviews.reduce((acc, review) => acc + review.rating, 0);
    const playtime = reviews.reduce((acc, review) => acc + (review.playtimeHours ?? 0), 0);

    return {
      count,
      average: (ratingSum / count).toFixed(1),
      playtime,
    } as const;
  }, [reviews]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-stone-400">Total Reviews</span>
        <span className="text-lg font-semibold text-white">{computed.count}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-stone-400">Average Rating</span>
        <span className="text-lg font-semibold text-white">{computed.average}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-stone-400">Hours Played</span>
        <span className="text-lg font-semibold text-white">{computed.playtime}</span>
      </div>
    </div>
  );
}

/**
 * Discover people to follow with follow/unfollow actions.
 */
function DiscoverPeopleWidget() {
  const discover = useQuery(api.users.discover, { limit: 6 });
  const follow = useMutation(api.followers.follow);
  const unfollow = useMutation(api.followers.unfollow);
  const [busyId, setBusyId] = useState<Id<"users"> | null>(null);

  if (discover === undefined) {
    return <p className="text-sm text-stone-500">Loading suggestions...</p>;
  }

  if (discover.length === 0) {
    return <p className="text-sm text-stone-400">No suggestions available right now.</p>;
  }

  const handleToggleFollow = async (userId: Id<"users">, currentlyFollowing: boolean) => {
    try {
      setBusyId(userId);
      if (currentlyFollowing) {
        await unfollow({ targetUserId: userId });
      } else {
        await follow({ targetUserId: userId });
      }
    } catch (error) {
      console.error("Failed to toggle follow", error);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {discover.map((person) => {
        const disabled = busyId === person._id;

        return (
          <div
            key={person._id}
            className="flex items-center justify-between gap-3 rounded-xl bg-stone-950/50 px-3 py-3"
          >
            <Link
              href={`/app/profile/${person.username}`}
              className="flex items-center gap-3 transition hover:opacity-80"
            >
              {person.avatarUrl ? (
                <img
                  src={person.avatarUrl}
                  alt={person.name}
                  className="h-9 w-9 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-500 text-xs font-semibold">
                  {person.name[0]?.toUpperCase() ?? "?"}
                </div>
              )}
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-white">{person.name}</span>
                <span className="text-xs text-stone-500">
                  {person.reviewCount} reviews · {person.followerCount} followers
                </span>
              </div>
            </Link>
            <button
              onClick={() => handleToggleFollow(person._id, person.viewerFollows)}
              disabled={disabled}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                person.viewerFollows
                  ? "border border-white/20 text-stone-200 hover:border-red-400 hover:text-red-300"
                  : "bg-blue-500 text-white hover:bg-blue-400"
              }`}
            >
              {person.viewerFollows ? "Unfollow" : "Follow"}
            </button>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Formats a timestamp into a concise relative time string.
 */
function formatRelativeTime(timestamp: number) {
  const now = Date.now();
  const diffMs = timestamp - now;
  const diffSeconds = Math.round(diffMs / 1000);
  const absSeconds = Math.abs(diffSeconds);

  const units: Array<{ unit: Intl.RelativeTimeFormatUnit; value: number; seconds: number }> = [
    { unit: "year", value: 60 * 60 * 24 * 365, seconds: 60 * 60 * 24 * 365 },
    { unit: "month", value: 60 * 60 * 24 * 30, seconds: 60 * 60 * 24 * 30 },
    { unit: "week", value: 60 * 60 * 24 * 7, seconds: 60 * 60 * 24 * 7 },
    { unit: "day", value: 60 * 60 * 24, seconds: 60 * 60 * 24 },
    { unit: "hour", value: 60 * 60, seconds: 60 * 60 },
    { unit: "minute", value: 60, seconds: 60 },
  ];

  for (const entry of units) {
    if (absSeconds >= entry.seconds) {
      const value = Math.round(diffSeconds / entry.value);
      return new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(value, entry.unit);
    }
  }

  const value = Math.round(diffSeconds);
  return new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(value, "second");
}
