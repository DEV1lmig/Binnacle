/**
 * Notifications module (Phase 6).
 *
 * Phase 6A scope: schema + API for listing and marking notifications.
 * UI wiring is Phase 6B.
 */

import { internalMutation, mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { requireCurrentUser } from "./lib/auth";

const defaultListLimit = 50;

const notificationTypeValidator = v.union(
  v.literal("follow"),
  v.literal("friend_request"),
  v.literal("friend_accepted"),
  v.literal("like"),
  v.literal("comment"),
  v.literal("mention")
);

const notificationTargetTypeValidator = v.union(
  v.literal("review"),
  v.literal("comment"),
  v.literal("game")
);

const notificationPreferencesValidator = v.object({
  email: v.object({
    newFollower: v.boolean(),
    friendRequest: v.boolean(),
    likes: v.boolean(),
    comments: v.boolean(),
  }),
  push: v.object({
    newFollower: v.boolean(),
    friendRequest: v.boolean(),
    likes: v.boolean(),
    comments: v.boolean(),
  }),
});

function sanitizeLimit(rawLimit: number | undefined) {
  if (rawLimit === undefined) return defaultListLimit;
  if (rawLimit <= 0) throw new ConvexError("Limit must be a positive number");
  return Math.min(rawLimit, 200);
}

/**
 * Internal helper for other modules to create a notification.
 */
export const create = internalMutation({
  args: {
    userId: v.id("users"),
    type: notificationTypeValidator,
    actorId: v.id("users"),
    targetType: v.optional(notificationTargetTypeValidator),
    targetId: v.optional(v.string()),
    message: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const createdAt = Date.now();

    const notificationId = await ctx.db.insert("notifications", {
      userId: args.userId,
      type: args.type,
      actorId: args.actorId,
      targetType: args.targetType,
      targetId: args.targetId,
      message: args.message,
      read: false,
      createdAt,
    });

    return { notificationId };
  },
});

/**
 * Lists notifications for the current user.
 */
export const list = query({
  args: {
    limit: v.optional(v.number()),
    unreadOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const viewer = await requireCurrentUser(ctx);
    const limit = sanitizeLimit(args.limit);

    const unreadOnly = args.unreadOnly ?? false;

    const baseQuery = unreadOnly
      ? ctx.db
          .query("notifications")
          .withIndex("by_user_and_read", (q) =>
            q.eq("userId", viewer._id).eq("read", false)
          )
      : ctx.db
          .query("notifications")
          .withIndex("by_user", (q) => q.eq("userId", viewer._id));

    return await baseQuery.order("desc").take(limit);
  },
});

/**
 * Returns the number of unread notifications for the current user.
 */
export const getUnreadCount = query({
  args: {},
  handler: async (ctx) => {
    const viewer = await requireCurrentUser(ctx);

    // Convex doesn't currently support a server-side count without reading.
    // We keep this bounded and suitable for a navbar badge.
    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user_and_read", (q) =>
        q.eq("userId", viewer._id).eq("read", false)
      )
      .take(1000);

    return { count: unread.length };
  },
});

/**
 * Marks a single notification as read.
 */
export const markAsRead = mutation({
  args: {
    notificationId: v.id("notifications"),
  },
  handler: async (ctx, args) => {
    const viewer = await requireCurrentUser(ctx);

    const notification = await ctx.db.get(args.notificationId);
    if (!notification) {
      throw new ConvexError("Notification not found");
    }

    if (notification.userId !== viewer._id) {
      throw new ConvexError("Not authorized");
    }

    if (!notification.read) {
      await ctx.db.patch(notification._id, { read: true });
    }

    return { success: true };
  },
});

/**
 * Marks all unread notifications as read.
 */
export const markAllAsRead = mutation({
  args: {},
  handler: async (ctx) => {
    const viewer = await requireCurrentUser(ctx);

    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user_and_read", (q) =>
        q.eq("userId", viewer._id).eq("read", false)
      )
      .take(500);

    await Promise.all(unread.map((n) => ctx.db.patch(n._id, { read: true })));

    return { success: true, updated: unread.length };
  },
});

/**
 * Updates notification preferences for the current user.
 */
export const updatePreferences = mutation({
  args: {
    preferences: notificationPreferencesValidator,
  },
  handler: async (ctx, args) => {
    const viewer = await requireCurrentUser(ctx);
    await ctx.db.patch(viewer._id, { notificationPreferences: args.preferences });
    return { success: true };
  },
});
