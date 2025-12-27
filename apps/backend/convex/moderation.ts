/**
 * Moderation module (Phase 7).
 */

import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { requireModerator } from "./lib/auth";

const moderationContentTypeValidator = v.union(
  v.literal("review"),
  v.literal("comment")
);

function normalizeModerationStatus(existing: {
  warnings: number;
  isMuted: boolean;
  mutedUntil?: number;
  isBanned: boolean;
  bannedAt?: number;
  banReason?: string;
} | null | undefined) {
  return {
    warnings: existing?.warnings ?? 0,
    isMuted: existing?.isMuted ?? false,
    mutedUntil: existing?.mutedUntil,
    isBanned: existing?.isBanned ?? false,
    bannedAt: existing?.bannedAt,
    banReason: existing?.banReason,
  };
}

export const warnUser = mutation({
  args: {
    userId: v.id("users"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const moderator = await requireModerator(ctx);

    const target = await ctx.db.get(args.userId);
    if (!target) {
      throw new ConvexError("User not found");
    }

    const status = normalizeModerationStatus(target.moderationStatus);

    await ctx.db.patch(target._id, {
      moderationStatus: {
        ...status,
        warnings: status.warnings + 1,
      },
    });

    await ctx.db.insert("moderationLogs", {
      moderatorId: moderator._id,
      action: "warn_user",
      targetType: "user",
      targetId: target._id,
      targetUserId: target._id,
      reason: args.reason.trim() || undefined,
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

export const muteUser = mutation({
  args: {
    userId: v.id("users"),
    duration: v.number(),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const moderator = await requireModerator(ctx);

    const target = await ctx.db.get(args.userId);
    if (!target) {
      throw new ConvexError("User not found");
    }

    if (!Number.isFinite(args.duration) || args.duration <= 0) {
      throw new ConvexError("Duration must be a positive number (milliseconds)");
    }

    const status = normalizeModerationStatus(target.moderationStatus);
    const mutedUntil = Date.now() + Math.floor(args.duration);

    await ctx.db.patch(target._id, {
      moderationStatus: {
        ...status,
        isMuted: true,
        mutedUntil,
      },
    });

    await ctx.db.insert("moderationLogs", {
      moderatorId: moderator._id,
      action: "mute_user",
      targetType: "user",
      targetId: target._id,
      targetUserId: target._id,
      reason: args.reason.trim() || undefined,
      createdAt: Date.now(),
    });

    return { success: true, mutedUntil };
  },
});

export const unmuteUser = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const moderator = await requireModerator(ctx);

    const target = await ctx.db.get(args.userId);
    if (!target) {
      throw new ConvexError("User not found");
    }

    const status = normalizeModerationStatus(target.moderationStatus);

    await ctx.db.patch(target._id, {
      moderationStatus: {
        ...status,
        isMuted: false,
        mutedUntil: undefined,
      },
    });

    await ctx.db.insert("moderationLogs", {
      moderatorId: moderator._id,
      action: "unmute_user",
      targetType: "user",
      targetId: target._id,
      targetUserId: target._id,
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

export const banUser = mutation({
  args: {
    userId: v.id("users"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const moderator = await requireModerator(ctx);

    const target = await ctx.db.get(args.userId);
    if (!target) {
      throw new ConvexError("User not found");
    }

    const status = normalizeModerationStatus(target.moderationStatus);

    await ctx.db.patch(target._id, {
      moderationStatus: {
        ...status,
        isBanned: true,
        bannedAt: Date.now(),
        banReason: args.reason.trim() || undefined,
      },
    });

    await ctx.db.insert("moderationLogs", {
      moderatorId: moderator._id,
      action: "ban_user",
      targetType: "user",
      targetId: target._id,
      targetUserId: target._id,
      reason: args.reason.trim() || undefined,
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

export const unbanUser = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const moderator = await requireModerator(ctx);

    const target = await ctx.db.get(args.userId);
    if (!target) {
      throw new ConvexError("User not found");
    }

    const status = normalizeModerationStatus(target.moderationStatus);

    await ctx.db.patch(target._id, {
      moderationStatus: {
        ...status,
        isBanned: false,
        bannedAt: undefined,
        banReason: undefined,
      },
    });

    await ctx.db.insert("moderationLogs", {
      moderatorId: moderator._id,
      action: "unban_user",
      targetType: "user",
      targetId: target._id,
      targetUserId: target._id,
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

export const deleteContent = mutation({
  args: {
    contentType: moderationContentTypeValidator,
    contentId: v.string(),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const moderator = await requireModerator(ctx);

    if (args.contentType === "comment") {
      const comment = await ctx.db.get(args.contentId as Id<"comments">);
      if (!comment) {
        throw new ConvexError("Comment not found");
      }

      await ctx.db.delete(comment._id);

      await ctx.db.insert("moderationLogs", {
        moderatorId: moderator._id,
        action: "delete_content",
        targetType: "comment",
        targetId: comment._id,
        targetUserId: comment.userId,
        reason: args.reason.trim() || undefined,
        createdAt: Date.now(),
      });

      return { success: true };
    }

    const review = await ctx.db.get(args.contentId as Id<"reviews">);
    if (!review) {
      throw new ConvexError("Review not found");
    }

    // Clean up associated likes.
    for await (const like of ctx.db
      .query("likes")
      .withIndex("by_review_id", (q) => q.eq("reviewId", review._id))) {
      await ctx.db.delete(like._id);
    }

    // Clean up associated comments.
    for await (const comment of ctx.db
      .query("comments")
      .withIndex("by_review_id", (q) => q.eq("reviewId", review._id))) {
      await ctx.db.delete(comment._id);
    }

    await ctx.db.delete(review._id);

    await ctx.db.insert("moderationLogs", {
      moderatorId: moderator._id,
      action: "delete_content",
      targetType: "review",
      targetId: review._id,
      targetUserId: review.userId,
      reason: args.reason.trim() || undefined,
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

export const getModerationLog = query({
  args: {
    userId: v.optional(v.id("users")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireModerator(ctx);

    const limit = args.limit === undefined ? 50 : Math.min(Math.max(args.limit, 1), 200);

    const baseQuery = args.userId
      ? ctx.db
          .query("moderationLogs")
          .withIndex("by_target_user", (q) => q.eq("targetUserId", args.userId))
      : ctx.db.query("moderationLogs");

    return await baseQuery.order("desc").take(limit);
  },
});
