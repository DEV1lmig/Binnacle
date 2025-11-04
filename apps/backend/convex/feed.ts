/**
 * Feed query for assembling a personalized review timeline.
 */
import { query, QueryCtx } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";

const defaultFeedLimit = 30;
const maxFollowingForFeed = 200;
const maxFriendsForFeed = 200;
const perUserReviewLimit = 25;

const timelineEntryValidator = v.object({
  review: v.object({
    _id: v.id("reviews"),
    _creationTime: v.number(),
    userId: v.id("users"),
    gameId: v.id("games"),
    rating: v.number(),
    platform: v.optional(v.string()),
    text: v.optional(v.string()),
    playtimeHours: v.optional(v.number()),
  }),
  author: v.object({
    _id: v.id("users"),
    name: v.string(),
    username: v.string(),
    avatarUrl: v.optional(v.string()),
  }),
  game: v.object({
    _id: v.id("games"),
    title: v.string(),
    coverUrl: v.optional(v.string()),
    releaseYear: v.optional(v.number()),
    aggregatedRating: v.optional(v.number()),
  }),
  likeCount: v.number(),
  viewerHasLiked: v.boolean(),
  commentCount: v.number(),
});

/**
 * Returns the latest reviews from the viewer and the users they follow.
 */
export const timeline = query({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.object({
    community: v.array(timelineEntryValidator),
    friends: v.array(timelineEntryValidator),
  }),
  handler: async (ctx, args) => {
    const viewer = await requireCurrentUser(ctx);
    const limit = sanitizeLimit(args.limit);
    const perUserLimit = Math.min(limit, perUserReviewLimit);

    const friendIds = await getFriendIdsForFeed(ctx, viewer._id, maxFriendsForFeed);
    const friendIdSet = new Set(friendIds);

    const friendReviews = await collectReviewsForUsers(
      ctx,
      friendIds,
      perUserLimit,
      limit
    );

    const followingRecords = await ctx.db
      .query("followers")
      .withIndex("by_follower_id", (q) => q.eq("followerId", viewer._id))
      .take(maxFollowingForFeed);

    const communitySources = new Set<Id<"users">>([viewer._id]);

    for (const record of followingRecords) {
      if (!friendIdSet.has(record.followingId)) {
        communitySources.add(record.followingId);
      }
    }

    const communityReviews = await collectReviewsForUsers(
      ctx,
      communitySources,
      perUserLimit,
      limit
    );

    const friends = await hydrateReviews(ctx, viewer._id, friendReviews);
    const community = await hydrateReviews(ctx, viewer._id, communityReviews);

    return {
      community,
      friends,
    };
  },
});

/**
 * Collects recent reviews for the provided set of user IDs.
 */
async function collectReviewsForUsers(
  ctx: QueryCtx,
  userIds: Iterable<Id<"users">>,
  perUserLimit: number,
  totalLimit: number
) {
  const collected: Doc<"reviews">[] = [];

  for (const userId of userIds) {
    const reviews = await ctx.db
      .query("reviews")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .order("desc")
      .take(perUserLimit);

    collected.push(...reviews);
  }

  collected.sort((a, b) => b._creationTime - a._creationTime);
  return collected.slice(0, totalLimit);
}

/**
 * Hydrates review documents with author, game, and viewer-specific like data.
 */
async function hydrateReviews(
  ctx: QueryCtx,
  viewerId: Id<"users">,
  reviews: Doc<"reviews">[]
) {
  const entries = [] as Array<{
    review: Doc<"reviews">;
    author: Doc<"users">;
    game: Doc<"games">;
    likeCount: number;
    viewerHasLiked: boolean;
    commentCount: number;
  }>;

  for (const review of reviews) {
    const [author, game] = await Promise.all([
      ctx.db.get(review.userId),
      ctx.db.get(review.gameId),
    ]);

    if (!author || !game) {
      continue;
    }

    const [likeState, commentCount] = await Promise.all([
      aggregateLikeState(ctx, viewerId, review._id),
      countComments(ctx, review._id),
    ]);

    entries.push({
      review,
      author,
      game,
      likeCount: likeState.likeCount,
      viewerHasLiked: likeState.viewerHasLiked,
      commentCount,
    });
  }

  return entries.map((entry) => ({
    review: {
      _id: entry.review._id,
      _creationTime: entry.review._creationTime,
      userId: entry.review.userId,
      gameId: entry.review.gameId,
      rating: entry.review.rating,
      platform: entry.review.platform ?? undefined,
      text: entry.review.text ?? undefined,
      playtimeHours: entry.review.playtimeHours ?? undefined,
    },
    author: {
      _id: entry.author._id,
      name: entry.author.name,
      username: entry.author.username,
      avatarUrl: entry.author.avatarUrl ?? undefined,
    },
    game: {
      _id: entry.game._id,
      title: entry.game.title,
      coverUrl: entry.game.coverUrl ?? undefined,
      releaseYear: entry.game.releaseYear ?? undefined,
      aggregatedRating: entry.game.aggregatedRating ?? undefined,
    },
    likeCount: entry.likeCount,
    viewerHasLiked: entry.viewerHasLiked,
    commentCount: entry.commentCount,
  }));
}

/**
 * Aggregates like information for a review from the viewer's perspective.
 */
async function aggregateLikeState(
  ctx: QueryCtx,
  viewerId: Id<"users">,
  reviewId: Id<"reviews">
) {
  let likeCount = 0;
  let viewerHasLiked = false;

  const likesQuery = ctx.db
    .query("likes")
    .withIndex("by_review_id", (q) => q.eq("reviewId", reviewId));

  for await (const like of likesQuery) {
    likeCount += 1;
    if (like.userId === viewerId) {
      viewerHasLiked = true;
    }
  }

  return { likeCount, viewerHasLiked };
}

/**
 * Counts the total number of comments for a review.
 */
async function countComments(ctx: QueryCtx, reviewId: Id<"reviews">) {
  let count = 0;
  const iterator = ctx.db
    .query("comments")
    .withIndex("by_review_id", (q) => q.eq("reviewId", reviewId));

  for await (const _ of iterator) {
    count += 1;
  }

  return count;
}

/**
 * Resolves the IDs of friends to include in the feed.
 */
async function getFriendIdsForFeed(
  ctx: QueryCtx,
  viewerId: Id<"users">,
  limit: number
) {
  const [asUserA, asUserB] = await Promise.all([
    ctx.db
      .query("friendships")
      .withIndex("by_user_a_id", (q) => q.eq("userAId", viewerId))
      .order("desc")
      .take(limit),
    ctx.db
      .query("friendships")
      .withIndex("by_user_b_id", (q) => q.eq("userBId", viewerId))
      .order("desc")
      .take(limit),
  ]);

  const combined = [...asUserA, ...asUserB];
  combined.sort((a, b) => b.createdAt - a.createdAt);

  const friendIds: Id<"users">[] = [];
  const seen = new Set<string>();

  for (const record of combined) {
    const friendId = record.userAId === viewerId ? record.userBId : record.userAId;
    const key = String(friendId);

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    friendIds.push(friendId);

    if (friendIds.length >= limit) {
      break;
    }
  }

  return friendIds;
}

/**
 * Retrieves the authenticated user's profile or throws if none is available.
 */
async function requireCurrentUser(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError("Authentication required");
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .unique();

  if (!user) {
    // User profile hasn't been created yet - trigger sync and throw a retriable error
    throw new ConvexError(
      "User profile not found. Please refresh the page or wait a moment for your profile to sync."
    );
  }

  return user;
}

/**
 * Makes sure feed limits stay within a reasonable window.
 */
function sanitizeLimit(rawLimit: number | undefined) {
  if (rawLimit === undefined) {
    return defaultFeedLimit;
  }

  if (rawLimit <= 0) {
    throw new ConvexError("Limit must be a positive number");
  }

  return Math.min(rawLimit, 100);
}
