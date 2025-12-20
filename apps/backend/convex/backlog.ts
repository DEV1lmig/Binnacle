import { v } from "convex/values";
import { mutation, query, QueryCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { getCurrentUser } from "./lib/auth";
import { canViewBacklogInternal } from "./privacy";

// Valid backlog status values
export const BACKLOG_STATUSES = [
  "want_to_play",
  "playing",
  "completed",
  "dropped",
  "on_hold",
] as const;

export type BacklogStatus = typeof BACKLOG_STATUSES[number];

/**
 * Adds a game to the user's backlog or updates an existing backlog item.
 * Uses upsert semantics: if the user already has the game in their backlog, update it.
 * 
 * Phase 1 Caching: Auto-caches the full IGDB data for the game being added to backlog.
 */
export const add = mutation({
  args: {
    gameId: v.id("games"),
    status: v.optional(v.string()),
    platform: v.optional(v.string()),
    notes: v.optional(v.string()),
    priority: v.optional(v.number()),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized: must be logged in to add to backlog");
    }

    // Lookup Convex user by Clerk ID
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      throw new Error("User not found in database");
    }

    // Verify game exists and get its IGDB ID
    const game = await ctx.db.get(args.gameId);
    if (!game) {
      throw new Error("Game not found");
    }

    // Phase 1 Caching: Auto-cache full IGDB data (non-blocking)
    if (game.igdbId) {
      try {
        await ctx.runMutation(internal.games.cacheGameFromIgdb, {
          igdbId: game.igdbId,
        });
      } catch (error) {
        // Log but don't block backlog addition if caching fails
        console.warn(`[backlog.add] Failed to cache game ${game.igdbId}:`, error);
      }
    }

    // Check if backlog item already exists
    const existing = await ctx.db
      .query("backlogItems")
      .withIndex("by_user_and_game", (q) =>
        q.eq("userId", user._id).eq("gameId", args.gameId)
      )
      .unique();

    const now = Date.now();
    const status = args.status ?? "want_to_play";

    if (existing) {
      // Update existing item
      await ctx.db.patch(existing._id, {
        status,
        platform: args.platform ?? existing.platform,
        notes: args.notes ?? existing.notes,
        priority: args.priority ?? existing.priority,
        startedAt: args.startedAt ?? existing.startedAt,
        completedAt: args.completedAt ?? existing.completedAt,
        updatedAt: now,
      });
      return existing._id;
    }

    // Create new backlog item
    return await ctx.db.insert("backlogItems", {
      userId: user._id,
      gameId: args.gameId,
      status,
      platform: args.platform,
      notes: args.notes,
      priority: args.priority,
      startedAt: args.startedAt,
      completedAt: args.completedAt,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Updates an existing backlog item. Validates ownership.
 */
export const update = mutation({
  args: {
    backlogId: v.id("backlogItems"),
    status: v.optional(v.string()),
    platform: v.optional(v.string()),
    notes: v.optional(v.string()),
    priority: v.optional(v.number()),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized: must be logged in");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    const backlogItem = await ctx.db.get(args.backlogId);
    if (!backlogItem) {
      throw new Error("Backlog item not found");
    }

    // Validate ownership
    if (backlogItem.userId !== user._id) {
      throw new Error("Unauthorized: you can only update your own backlog items");
    }

    // Build update object with only provided fields
    const updates: Record<string, any> = {
      updatedAt: Date.now(),
    };

    if (args.status !== undefined) updates.status = args.status;
    if (args.platform !== undefined) updates.platform = args.platform;
    if (args.notes !== undefined) updates.notes = args.notes;
    if (args.priority !== undefined) updates.priority = args.priority;
    if (args.startedAt !== undefined) updates.startedAt = args.startedAt;
    if (args.completedAt !== undefined) updates.completedAt = args.completedAt;

    await ctx.db.patch(args.backlogId, updates);
    return args.backlogId;
  },
});

/**
 * Removes a game from the user's backlog. Validates ownership.
 */
export const remove = mutation({
  args: {
    backlogId: v.id("backlogItems"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized: must be logged in");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    const backlogItem = await ctx.db.get(args.backlogId);
    if (!backlogItem) {
      throw new Error("Backlog item not found");
    }

    // Validate ownership
    if (backlogItem.userId !== user._id) {
      throw new Error("Unauthorized: you can only remove your own backlog items");
    }

    await ctx.db.delete(args.backlogId);
  },
});

/**
 * Removes a backlog item by gameId for the current user.
 * Convenience method for UI toggles.
 */
export const removeByGameId = mutation({
  args: {
    gameId: v.id("games"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized: must be logged in");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    const backlogItem = await ctx.db
      .query("backlogItems")
      .withIndex("by_user_and_game", (q) =>
        q.eq("userId", user._id).eq("gameId", args.gameId)
      )
      .unique();

    if (backlogItem) {
      await ctx.db.delete(backlogItem._id);
    }
  },
});

/**
 * Lists backlog items for a user with optional filtering and pagination.
 * If userId is not provided, returns items for the current authenticated user.
 */
export const listForUser = query({
  args: {
    userId: v.optional(v.id("users")),
    status: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const viewer = await getCurrentUser(ctx);

    let targetUserId: Id<"users"> | null = null;
    let targetUser: any = null;

    if (args.userId) {
      targetUserId = args.userId;
      targetUser = await ctx.db.get(args.userId);
      if (!targetUser) {
        return [];
      }

      const isSelf = viewer ? viewer._id === targetUserId : false;
      if (!isSelf) {
        const allowed = await canViewBacklogInternal(ctx, viewer, targetUser);
        if (!allowed) {
          return [];
        }
      }
    } else {
      // Get current user
      const identity = await ctx.auth.getUserIdentity();
      if (!identity) {
        return [];
      }

      const user = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
        .unique();

      if (!user) {
        return [];
      }

      targetUserId = user._id;
      targetUser = user;
    }

    const limit = args.limit && args.limit > 0 ? Math.min(args.limit, 100) : 50;

    // Query backlog items
    let query = ctx.db
      .query("backlogItems")
      .withIndex("by_user_id", (q) => q.eq("userId", targetUserId!))
      .order("desc");

    const items = await query.take(limit);

    // Filter by status if provided
    const filtered = args.status
      ? items.filter((item) => item.status === args.status)
      : items;

    // Enrich with game data
    const enriched = await Promise.all(
      filtered.map(async (item) => {
        const game = await ctx.db.get(item.gameId);
        return {
          ...item,
          game: game
            ? {
                _id: game._id,
                igdbId: game.igdbId,
                title: game.title,
                coverUrl: game.coverUrl,
                releaseYear: game.releaseYear,
                aggregatedRating: game.aggregatedRating,
              }
            : null,
        };
      })
    );

    return enriched;
  },
});

/**
 * Returns an array of game IDs that the current user has in their backlog.
 * Useful for UI toggles to show backlog membership state.
 */
export const listGameIdsForCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      return [];
    }

    // IMPORTANT: Keep this query bounded to avoid unbounded bandwidth as users grow their backlog.
    // This endpoint is used for UI membership toggles; if a user has an extremely large backlog,
    // callers should switch to a per-game membership check instead of fetching all IDs.
    const MAX_GAME_IDS = 1000;

    const items = await ctx.db
      .query("backlogItems")
      .withIndex("by_user_id", (q) => q.eq("userId", user._id))
      .take(MAX_GAME_IDS);

    return items.map((item) => item.gameId);
  },
});

/**
 * Gets the backlog item for the current user and a specific game.
 * Returns null if not in backlog.
 */
export const getForCurrentUserAndGame = query({
  args: {
    gameId: v.id("games"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      return null;
    }

    return await ctx.db
      .query("backlogItems")
      .withIndex("by_user_and_game", (q) =>
        q.eq("userId", user._id).eq("gameId", args.gameId)
      )
      .unique();
  },
});

/**
 * Gets backlog statistics for a user (total count, counts by status).
 */
export const getStatsForUser = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query("backlogItems")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .collect();

    const stats = {
      total: items.length,
      want_to_play: 0,
      playing: 0,
      completed: 0,
      dropped: 0,
      on_hold: 0,
    };

    items.forEach((item) => {
      if (item.status in stats) {
        stats[item.status as keyof typeof stats]++;
      }
    });

    return stats;
  },
});
