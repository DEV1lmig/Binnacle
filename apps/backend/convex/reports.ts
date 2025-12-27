/**
 * Reports module (Phase 7).
 *
 * Allows users to report content (users/reviews/comments) and moderators to
 * triage and resolve those reports.
 */

import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { requireCurrentUser, requireModerator } from "./lib/auth";
import type { ReportListItem } from "@binnacle/shared-types";

const defaultListLimit = 50;

const reportTargetTypeValidator = v.union(
  v.literal("user"),
  v.literal("review"),
  v.literal("comment")
);

const reportReasonValidator = v.union(
  v.literal("spam"),
  v.literal("harassment"),
  v.literal("inappropriate"),
  v.literal("other")
);

const reportStatusValidator = v.union(
  v.literal("pending"),
  v.literal("reviewed"),
  v.literal("resolved"),
  v.literal("dismissed")
);

function sanitizeLimit(rawLimit: number | undefined) {
  if (rawLimit === undefined) return defaultListLimit;
  if (rawLimit <= 0) throw new ConvexError("Limit must be a positive number");
  return Math.min(rawLimit, 200);
}

export const create = mutation({
  args: {
    targetType: reportTargetTypeValidator,
    targetId: v.string(),
    reason: reportReasonValidator,
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const reporter = await requireCurrentUser(ctx);

    // Basic rate limiting to reduce spam.
    const last = await ctx.db
      .query("reports")
      .withIndex("by_reporter", (q) => q.eq("reporterId", reporter._id))
      .order("desc")
      .take(1);

    if (last.length > 0) {
      const secondsSinceLast = (Date.now() - last[0].createdAt) / 1000;
      if (secondsSinceLast < 30) {
        throw new ConvexError("You're reporting too quickly. Please try again in a moment.");
      }
    }

    if (args.targetType === "user") {
      if (args.targetId === reporter._id) {
        throw new ConvexError("You can't report yourself");
      }

      const target = await ctx.db.get(args.targetId as Id<"users">);
      if (!target) {
        throw new ConvexError("User not found");
      }
    }

    if (args.targetType === "review") {
      const target = await ctx.db.get(args.targetId as Id<"reviews">);
      if (!target) {
        throw new ConvexError("Review not found");
      }

      if (target.userId === reporter._id) {
        throw new ConvexError("You can't report your own review");
      }
    }

    if (args.targetType === "comment") {
      const target = await ctx.db.get(args.targetId as Id<"comments">);
      if (!target) {
        throw new ConvexError("Comment not found");
      }

      if (target.userId === reporter._id) {
        throw new ConvexError("You can't report your own comment");
      }
    }

    const description = args.description?.trim();
    if (description && description.length > 1000) {
      throw new ConvexError("Description cannot exceed 1000 characters");
    }

    const reportId = await ctx.db.insert("reports", {
      reporterId: reporter._id,
      targetType: args.targetType,
      targetId: args.targetId,
      reason: args.reason,
      description: description || undefined,
      status: "pending",
      createdAt: Date.now(),
    });

    return { reportId };
  },
});

export const list = query({
  args: {
    status: v.optional(reportStatusValidator),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<ReportListItem[]> => {
    await requireModerator(ctx);
    const limit = sanitizeLimit(args.limit);

    const status = args.status;

    const baseQuery = status
      ? ctx.db
          .query("reports")
          .withIndex("by_status", (q) => q.eq("status", status))
      : ctx.db.query("reports");

    const reports = await baseQuery.order("desc").take(limit);

    const enriched = await Promise.all(
      reports.map(async (report) => {
        const reporter = await ctx.db.get(report.reporterId);
        const moderator = report.moderatorId ? await ctx.db.get(report.moderatorId) : null;

        const target = await (async () => {
          if (report.targetType === "user") {
            const user = await ctx.db.get(report.targetId as Id<"users">);
            if (!user) return null;
            return { type: "user" as const, user };
          }

          if (report.targetType === "review") {
            const review = await ctx.db.get(report.targetId as Id<"reviews">);
            if (!review) return null;
            return { type: "review" as const, review };
          }

          const comment = await ctx.db.get(report.targetId as Id<"comments">);
          if (!comment) return null;
          return { type: "comment" as const, comment };
        })();

        const targetUserId =
          target?.type === "user"
            ? target.user._id
            : target?.type === "review"
              ? target.review.userId
              : target?.type === "comment"
                ? target.comment.userId
                : null;

        const targetUser = targetUserId ? await ctx.db.get(targetUserId) : null;

        return {
          ...report,
          reporter: reporter
            ? {
                _id: reporter._id,
                name: reporter.name,
                username: reporter.username,
                avatarUrl: reporter.avatarUrl ?? undefined,
              }
            : null,
          moderator: moderator
            ? {
                _id: moderator._id,
                name: moderator.name,
                username: moderator.username,
                avatarUrl: moderator.avatarUrl ?? undefined,
              }
            : null,
          target: target
            ? target.type === "user"
              ? {
                  type: "user" as const,
                  userId: target.user._id,
                }
              : target.type === "review"
                ? {
                    type: "review" as const,
                    reviewId: target.review._id,
                    gameId: target.review.gameId,
                    userId: target.review.userId,
                    textPreview: target.review.text?.slice(0, 240) ?? undefined,
                  }
                : {
                    type: "comment" as const,
                    commentId: target.comment._id,
                    reviewId: target.comment.reviewId,
                    userId: target.comment.userId,
                    textPreview: target.comment.text.slice(0, 240),
                  }
            : null,
          targetUser: targetUser
            ? {
                _id: targetUser._id,
                name: targetUser.name,
                username: targetUser.username,
                avatarUrl: targetUser.avatarUrl ?? undefined,
                moderationStatus: targetUser.moderationStatus ?? undefined,
              }
            : null,
        };
      })
    );

    return enriched;
  },
});

export const updateStatus = mutation({
  args: {
    reportId: v.id("reports"),
    status: reportStatusValidator,
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const moderator = await requireModerator(ctx);

    const report = await ctx.db.get(args.reportId);
    if (!report) {
      throw new ConvexError("Report not found");
    }

    const resolvedAt =
      args.status === "resolved" || args.status === "dismissed" ? Date.now() : undefined;

    await ctx.db.patch(report._id, {
      status: args.status,
      moderatorId: moderator._id,
      moderatorNote: args.note?.trim() || undefined,
      ...(resolvedAt ? { resolvedAt } : {}),
    });

    const targetUserId = await (async () => {
      if (report.targetType === "user") {
        return report.targetId as Id<"users">;
      }
      if (report.targetType === "review") {
        const review = await ctx.db.get(report.targetId as Id<"reviews">);
        return review?.userId;
      }
      const comment = await ctx.db.get(report.targetId as Id<"comments">);
      return comment?.userId;
    })();

    await ctx.db.insert("moderationLogs", {
      moderatorId: moderator._id,
      action: "report_status_updated",
      targetType: report.targetType,
      targetId: report.targetId,
      targetUserId: targetUserId ?? undefined,
      reason: args.note?.trim() || undefined,
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

export const getStats = query({
  args: {},
  handler: async (ctx) => {
    await requireModerator(ctx);

    const [pending, reviewed, resolved, dismissed] = await Promise.all([
      ctx.db
        .query("reports")
        .withIndex("by_status", (q) => q.eq("status", "pending"))
        .take(1000),
      ctx.db
        .query("reports")
        .withIndex("by_status", (q) => q.eq("status", "reviewed"))
        .take(1000),
      ctx.db
        .query("reports")
        .withIndex("by_status", (q) => q.eq("status", "resolved"))
        .take(1000),
      ctx.db
        .query("reports")
        .withIndex("by_status", (q) => q.eq("status", "dismissed"))
        .take(1000),
    ]);

    return {
      pending: pending.length,
      reviewed: reviewed.length,
      resolved: resolved.length,
      dismissed: dismissed.length,
    };
  },
});
