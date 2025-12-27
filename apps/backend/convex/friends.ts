/**
 * Mutations and queries for managing friendships and related requests.
 */
import { mutation, query, MutationCtx, QueryCtx } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { canSendFriendRequestInternal } from "./privacy";
import { getBlockedUserIdSets, isEitherBlockedInternal } from "./blocking";

const defaultListLimit = 50;

type AuthCtx = MutationCtx | QueryCtx;

/**
 * Issues a friendship request to a target user or accepts an existing incoming request.
 */
export const sendRequest = mutation({
  args: {
    recipientId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const requester = await requireCurrentUser(ctx);

    if (requester._id === args.recipientId) {
      throw new ConvexError("You cannot send a friend request to yourself");
    }

    const recipient = await ctx.db.get(args.recipientId);
    if (!recipient) {
      throw new ConvexError("User not found");
    }

    const blocked = await isEitherBlockedInternal(ctx, requester._id, recipient._id);
    if (blocked) {
      throw new ConvexError("You can't send a friend request to this user");
    }

    const allowed = await canSendFriendRequestInternal(ctx, requester, recipient);
    if (!allowed) {
      throw new ConvexError("This user is not accepting friend requests");
    }

    const pairKey = makePairKey(requester._id, args.recipientId);

    const existingFriendship = await ctx.db
      .query("friendships")
      .withIndex("by_pair_key", (q) => q.eq("pairKey", pairKey))
      .unique();

    if (existingFriendship) {
      return existingFriendship._id;
    }

    const existingRequest = await ctx.db
      .query("friendRequests")
      .withIndex("by_pair_key", (q) => q.eq("pairKey", pairKey))
      .unique();

    if (existingRequest) {
      if (existingRequest.requesterId === requester._id) {
        return existingRequest._id;
      }

      await createFriendship(ctx, existingRequest.requesterId, existingRequest.recipientId);
      await ctx.db.delete(existingRequest._id);

      // Accepting an incoming request by sending a request back.
      await ctx.runMutation(internal.notifications.create, {
        userId: existingRequest.requesterId,
        type: "friend_accepted",
        actorId: requester._id,
      });
      return null;
    }

    const requestId = await ctx.db.insert("friendRequests", {
      requesterId: requester._id,
      recipientId: args.recipientId,
      pairKey,
      createdAt: Date.now(),
    });

    await ctx.runMutation(internal.notifications.create, {
      userId: args.recipientId,
      type: "friend_request",
      actorId: requester._id,
    });

    return requestId;
  },
});

/**
 * Cancels a previously issued friendship request from the authenticated user.
 */
export const cancelRequest = mutation({
  args: {
    requestId: v.id("friendRequests"),
  },
  handler: async (ctx, args) => {
    const requester = await requireCurrentUser(ctx);
    const request = await ctx.db.get(args.requestId);

    if (!request) {
      throw new ConvexError("Friend request not found");
    }

    if (request.requesterId !== requester._id) {
      throw new ConvexError("You can only cancel requests you created");
    }

    await ctx.db.delete(request._id);
    return request._id;
  },
});

/**
 * Accepts or declines an incoming friendship request.
 */
export const respondToRequest = mutation({
  args: {
    requestId: v.id("friendRequests"),
    action: v.union(v.literal("accept"), v.literal("decline")),
  },
  handler: async (ctx, args) => {
    const recipient = await requireCurrentUser(ctx);
    const request = await ctx.db.get(args.requestId);

    if (!request) {
      throw new ConvexError("Friend request not found");
    }

    if (request.recipientId !== recipient._id) {
      throw new ConvexError("You can only respond to requests sent to you");
    }

    await ctx.db.delete(request._id);

    if (args.action === "accept") {
      await createFriendship(ctx, request.requesterId, request.recipientId);

      await ctx.runMutation(internal.notifications.create, {
        userId: request.requesterId,
        type: "friend_accepted",
        actorId: recipient._id,
      });
    }

    return args.action;
  },
});

/**
 * Removes an existing friendship between the authenticated user and the target user.
 */
export const removeFriend = mutation({
  args: {
    targetUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const viewer = await requireCurrentUser(ctx);

    if (viewer._id === args.targetUserId) {
      throw new ConvexError("Cannot remove yourself as a friend");
    }

    const pairKey = makePairKey(viewer._id, args.targetUserId);
    const friendship = await ctx.db
      .query("friendships")
      .withIndex("by_pair_key", (q) => q.eq("pairKey", pairKey))
      .unique();

    if (!friendship) {
      return null;
    }

    await ctx.db.delete(friendship._id);
    return friendship._id;
  },
});

/**
 * Lists the viewer's friends along with lightweight profile information.
 */
export const listFriends = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const viewer = await requireCurrentUser(ctx);
    const limit = sanitizeLimit(args.limit);

    const { blocked, blockedBy } = await getBlockedUserIdSets(ctx, viewer._id);
    const isBlockedUser = (userId: Id<"users">) => blocked.has(userId) || blockedBy.has(userId);

    const asUserA = await ctx.db
      .query("friendships")
      .withIndex("by_user_a_id", (q) => q.eq("userAId", viewer._id))
      .order("desc")
      .take(limit);

    const asUserB = await ctx.db
      .query("friendships")
      .withIndex("by_user_b_id", (q) => q.eq("userBId", viewer._id))
      .order("desc")
      .take(limit);

    const combined = [...asUserA, ...asUserB];
    combined.sort((a, b) => b.createdAt - a.createdAt);

    const sliced = combined
      .filter((record) => {
        const friendId = record.userAId === viewer._id ? record.userBId : record.userAId;
        return !isBlockedUser(friendId);
      })
      .slice(0, limit);
    const friends: Array<Doc<"users"> | null> = await Promise.all(
      sliced.map((record) => {
        const friendId = record.userAId === viewer._id ? record.userBId : record.userAId;
        return ctx.db.get(friendId);
      })
    );

    return friends
      .filter((friend): friend is Doc<"users"> => friend !== null)
      .map((friend) => ({
        _id: friend._id,
        name: friend.name,
        username: friend.username,
        avatarUrl: friend.avatarUrl ?? undefined,
      }));
  },
});

/**
 * Lists incoming friendship requests waiting for the viewer's response.
 */
export const listIncomingRequests = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const viewer = await requireCurrentUser(ctx);
    const limit = sanitizeLimit(args.limit);

    const { blocked, blockedBy } = await getBlockedUserIdSets(ctx, viewer._id);
    const isBlockedUser = (userId: Id<"users">) => blocked.has(userId) || blockedBy.has(userId);

    const requests = await ctx.db
      .query("friendRequests")
      .withIndex("by_recipient_id", (q) => q.eq("recipientId", viewer._id))
      .order("desc")
      .take(limit);

    const visibleRequests = requests.filter((request) => !isBlockedUser(request.requesterId));

    const enriched = await Promise.all(
      visibleRequests.map(async (request) => {
        const requester = await ctx.db.get(request.requesterId);
        if (!requester) {
          return null;
        }

        return {
          requestId: request._id,
          requester: {
            _id: requester._id,
            name: requester.name,
            username: requester.username,
            avatarUrl: requester.avatarUrl ?? undefined,
          },
          createdAt: request.createdAt,
        };
      })
    );

    return enriched.filter((entry): entry is NonNullable<typeof entry> => entry !== null);
  },
});

/**
 * Lists the friendship requests the viewer has sent that are still pending.
 */
export const listOutgoingRequests = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const viewer = await requireCurrentUser(ctx);
    const limit = sanitizeLimit(args.limit);

    const { blocked, blockedBy } = await getBlockedUserIdSets(ctx, viewer._id);
    const isBlockedUser = (userId: Id<"users">) => blocked.has(userId) || blockedBy.has(userId);

    const requests = await ctx.db
      .query("friendRequests")
      .withIndex("by_requester_id", (q) => q.eq("requesterId", viewer._id))
      .order("desc")
      .take(limit);

    const visibleRequests = requests.filter((request) => !isBlockedUser(request.recipientId));

    const enriched = await Promise.all(
      visibleRequests.map(async (request) => {
        const recipient = await ctx.db.get(request.recipientId);
        if (!recipient) {
          return null;
        }

        return {
          requestId: request._id,
          recipient: {
            _id: recipient._id,
            name: recipient.name,
            username: recipient.username,
            avatarUrl: recipient.avatarUrl ?? undefined,
          },
          createdAt: request.createdAt,
        };
      })
    );

    return enriched.filter((entry): entry is NonNullable<typeof entry> => entry !== null);
  },
});

/**
 * Describes the friendship state between the viewer and the target user.
 */
export const relationship = query({
  args: {
    targetUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const viewer = await requireCurrentUser(ctx);

    if (viewer._id === args.targetUserId) {
      return { status: "self" as const };
    }

    const blocked = await isEitherBlockedInternal(ctx, viewer._id, args.targetUserId);
    if (blocked) {
      return { status: "none" as const };
    }

    const pairKey = makePairKey(viewer._id, args.targetUserId);

    const friendship = await ctx.db
      .query("friendships")
      .withIndex("by_pair_key", (q) => q.eq("pairKey", pairKey))
      .unique();

    if (friendship) {
      return { status: "friends" as const };
    }

    const pending = await ctx.db
      .query("friendRequests")
      .withIndex("by_pair_key", (q) => q.eq("pairKey", pairKey))
      .unique();

    if (!pending) {
      return { status: "none" as const };
    }

    if (pending.requesterId === viewer._id) {
      return { status: "outgoing" as const, requestId: pending._id };
    }

    if (pending.recipientId === viewer._id) {
      return { status: "incoming" as const, requestId: pending._id };
    }

    return { status: "none" as const };
  },
});

/**
 * Creates a friendship pair if one does not already exist.
 */
async function createFriendship(ctx: MutationCtx, userAId: Id<"users">, userBId: Id<"users">) {
  const pairKey = makePairKey(userAId, userBId);

  const existing = await ctx.db
    .query("friendships")
    .withIndex("by_pair_key", (q) => q.eq("pairKey", pairKey))
    .unique();

  if (existing) {
    return existing._id;
  }

  return await ctx.db.insert("friendships", {
    userAId: userAId,
    userBId: userBId,
    pairKey,
    createdAt: Date.now(),
  });
}

/**
 * Ensures that only authenticated users can invoke friend mutations and queries.
 */
async function requireCurrentUser(ctx: AuthCtx): Promise<Doc<"users">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError("Authentication required");
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .unique();

  if (!user) {
    throw new ConvexError("User profile not found");
  }

  return user;
}

/**
 * Builds a unique pair key for an unordered user ID pair.
 */
function makePairKey(userAId: Id<"users">, userBId: Id<"users">): string {
  return [userAId, userBId].map(String).sort().join(":");
}

/**
 * Normalizes pagination limits for friend queries.
 */
function sanitizeLimit(rawLimit: number | undefined) {
  if (rawLimit === undefined) {
    return defaultListLimit;
  }

  if (rawLimit <= 0) {
    throw new ConvexError("Limit must be a positive number");
  }

  return Math.min(rawLimit, 200);
}
