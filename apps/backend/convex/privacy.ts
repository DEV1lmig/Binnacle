/**
 * Privacy module (Phase 2)
 *
 * Stores and enforces per-user visibility rules for profile, backlog, reviews, and activity.
 */
import { mutation, query, QueryCtx, MutationCtx } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";
import { getCurrentUser, requireCurrentUser, getUserRole, ROLES } from "./lib/auth";

const visibilityValidator = v.union(
  v.literal("public"),
  v.literal("friends"),
  v.literal("private")
);

type Visibility = "public" | "friends" | "private";

type AllowFriendRequests = "everyone" | "friends_of_friends" | "nobody";

const allowFriendRequestsValidator = v.union(
  v.literal("everyone"),
  v.literal("friends_of_friends"),
  v.literal("nobody")
);

export type NormalizedPrivacySettings = {
  profileVisibility: Visibility;
  backlogVisibility: Visibility;
  reviewsVisibility: Visibility;
  activityVisibility: Visibility;
  showStats: boolean;
  allowFriendRequests: AllowFriendRequests;
  showOnlineStatus: boolean;
};

const defaultVisibility: Visibility = "public";

export function normalizePrivacySettings(user: Doc<"users">): NormalizedPrivacySettings {
  const raw = user.privacySettings ?? {};
  const legacyPrefs = user.preferences ?? {};

  const profileVisibility =
    (raw.profileVisibility as Visibility | undefined) ??
    (legacyPrefs.profileVisibility as Visibility | undefined) ??
    defaultVisibility;

  const backlogVisibility =
    (raw.backlogVisibility as Visibility | undefined) ??
    profileVisibility;

  const reviewsVisibility =
    (raw.reviewsVisibility as Visibility | undefined) ??
    profileVisibility;

  // If legacy toggle disables activity, force private for others.
  const legacyShowActivity = legacyPrefs.showActivityOnFeed;
  const activityVisibility =
    (raw.activityVisibility as Visibility | undefined) ??
    (legacyShowActivity === false ? "private" : profileVisibility);

  return {
    profileVisibility,
    backlogVisibility,
    reviewsVisibility,
    activityVisibility,
    showStats: raw.showStats ?? true,
    allowFriendRequests: (raw.allowFriendRequests as AllowFriendRequests | undefined) ?? "everyone",
    showOnlineStatus: raw.showOnlineStatus ?? true,
  };
}

export const getSettings = query({
  args: {},
  returns: v.object({
    profileVisibility: visibilityValidator,
    backlogVisibility: visibilityValidator,
    reviewsVisibility: visibilityValidator,
    activityVisibility: visibilityValidator,
    showStats: v.boolean(),
    allowFriendRequests: allowFriendRequestsValidator,
    showOnlineStatus: v.boolean(),
  }),
  handler: async (ctx) => {
    const user = await requireCurrentUser(ctx);
    return normalizePrivacySettings(user);
  },
});

export const updateSettings = mutation({
  args: {
    profileVisibility: v.optional(visibilityValidator),
    backlogVisibility: v.optional(visibilityValidator),
    reviewsVisibility: v.optional(visibilityValidator),
    activityVisibility: v.optional(visibilityValidator),
    showStats: v.optional(v.boolean()),
    allowFriendRequests: v.optional(allowFriendRequestsValidator),
    showOnlineStatus: v.optional(v.boolean()),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);

    const current = user.privacySettings ?? {};
    const updated = {
      ...current,
      ...(args.profileVisibility !== undefined && { profileVisibility: args.profileVisibility }),
      ...(args.backlogVisibility !== undefined && { backlogVisibility: args.backlogVisibility }),
      ...(args.reviewsVisibility !== undefined && { reviewsVisibility: args.reviewsVisibility }),
      ...(args.activityVisibility !== undefined && { activityVisibility: args.activityVisibility }),
      ...(args.showStats !== undefined && { showStats: args.showStats }),
      ...(args.allowFriendRequests !== undefined && { allowFriendRequests: args.allowFriendRequests }),
      ...(args.showOnlineStatus !== undefined && { showOnlineStatus: args.showOnlineStatus }),
    };

    await ctx.db.patch(user._id, {
      privacySettings: updated,
      // Keep legacy preferences in sync for existing UI / consumers.
      preferences: {
        ...(user.preferences ?? {}),
        ...(args.profileVisibility !== undefined && { profileVisibility: args.profileVisibility }),
        ...(args.activityVisibility !== undefined && {
          showActivityOnFeed: args.activityVisibility !== "private",
        }),
      },
    });

    return { success: true };
  },
});

export const canViewProfile = query({
  args: { targetUserId: v.id("users") },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const target = await ctx.db.get(args.targetUserId);
    if (!target) return false;

    const viewer = await getCurrentUser(ctx);
    return await canViewVisibility(ctx, viewer, target, normalizePrivacySettings(target).profileVisibility);
  },
});

export const canViewBacklog = query({
  args: { targetUserId: v.id("users") },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const target = await ctx.db.get(args.targetUserId);
    if (!target) return false;

    const viewer = await getCurrentUser(ctx);
    return await canViewVisibility(ctx, viewer, target, normalizePrivacySettings(target).backlogVisibility);
  },
});

export const canViewReviews = query({
  args: { targetUserId: v.id("users") },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const target = await ctx.db.get(args.targetUserId);
    if (!target) return false;

    const viewer = await getCurrentUser(ctx);
    return await canViewVisibility(ctx, viewer, target, normalizePrivacySettings(target).reviewsVisibility);
  },
});

export const canViewActivity = query({
  args: { targetUserId: v.id("users") },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const target = await ctx.db.get(args.targetUserId);
    if (!target) return false;

    const viewer = await getCurrentUser(ctx);
    return await canViewVisibility(ctx, viewer, target, normalizePrivacySettings(target).activityVisibility);
  },
});

export const canSendFriendRequest = query({
  args: { targetUserId: v.id("users") },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const target = await ctx.db.get(args.targetUserId);
    if (!target) return false;

    const viewer = await getCurrentUser(ctx);
    if (!viewer) return false;
    return await canSendFriendRequestInternal(ctx, viewer, target);
  },
});

export async function canSendFriendRequestInternal(
  ctx: QueryCtx | MutationCtx,
  viewer: Doc<"users">,
  target: Doc<"users">
) {
  if (viewer._id === target._id) return false;

  // Admin/moderator bypass.
  const role = getUserRole(viewer);
  if (role === ROLES.ADMIN || role === ROLES.MODERATOR) {
    return true;
  }

  const settings = normalizePrivacySettings(target);

  if (settings.allowFriendRequests === "everyone") {
    return true;
  }

  if (settings.allowFriendRequests === "nobody") {
    return false;
  }

  // friends_of_friends
  const [viewerFriends, targetFriends] = await Promise.all([
    listFriendIds(ctx, viewer._id, 200),
    listFriendIds(ctx, target._id, 200),
  ]);

  const viewerSet = new Set(viewerFriends.map(String));
  for (const friendId of targetFriends) {
    if (viewerSet.has(String(friendId))) {
      return true;
    }
  }

  return false;
}

export async function canViewProfileInternal(
  ctx: QueryCtx | MutationCtx,
  viewer: Doc<"users"> | null,
  target: Doc<"users">
) {
  return await canViewVisibility(ctx, viewer, target, normalizePrivacySettings(target).profileVisibility);
}

export async function canViewBacklogInternal(
  ctx: QueryCtx | MutationCtx,
  viewer: Doc<"users"> | null,
  target: Doc<"users">
) {
  return await canViewVisibility(ctx, viewer, target, normalizePrivacySettings(target).backlogVisibility);
}

export async function canViewReviewsInternal(
  ctx: QueryCtx | MutationCtx,
  viewer: Doc<"users"> | null,
  target: Doc<"users">
) {
  return await canViewVisibility(ctx, viewer, target, normalizePrivacySettings(target).reviewsVisibility);
}

export async function canViewActivityInternal(
  ctx: QueryCtx | MutationCtx,
  viewer: Doc<"users"> | null,
  target: Doc<"users">
) {
  return await canViewVisibility(ctx, viewer, target, normalizePrivacySettings(target).activityVisibility);
}

async function canViewVisibility(
  ctx: QueryCtx | MutationCtx,
  viewer: Doc<"users"> | null,
  target: Doc<"users">,
  visibility: Visibility
) {
  if (viewer && viewer._id === target._id) return true;

  // Admin/moderator can view for support/moderation.
  if (viewer) {
    const role = getUserRole(viewer);
    if (role === ROLES.ADMIN || role === ROLES.MODERATOR) {
      return true;
    }
  }

  if (visibility === "public") {
    return true;
  }

  if (visibility === "private") {
    return false;
  }

  // friends
  if (!viewer) {
    return false;
  }

  return await areFriends(ctx, viewer._id, target._id);
}

async function areFriends(ctx: QueryCtx | MutationCtx, userAId: Id<"users">, userBId: Id<"users">) {
  const pairKey = makePairKey(userAId, userBId);
  const friendship = await ctx.db
    .query("friendships")
    .withIndex("by_pair_key", (q) => q.eq("pairKey", pairKey))
    .unique();
  return !!friendship;
}

async function listFriendIds(ctx: QueryCtx | MutationCtx, viewerId: Id<"users">, limit: number) {
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
    if (seen.has(key)) continue;
    seen.add(key);
    friendIds.push(friendId);
    if (friendIds.length >= limit) break;
  }

  return friendIds;
}

function makePairKey(userAId: Id<"users">, userBId: Id<"users">): string {
  return [userAId, userBId].map(String).sort().join(":");
}

function assertVisibility(value: string): asserts value is Visibility {
  if (value !== "public" && value !== "friends" && value !== "private") {
    throw new ConvexError("Invalid visibility value");
  }
}
