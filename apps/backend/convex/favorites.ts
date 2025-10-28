import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id, Doc } from "./_generated/dataModel";
import { internal } from "./_generated/api";

// Constants
const MAX_FAVORITES_PER_USER = 1000;

/**
 * Add a game to user's favorites.
 * Idempotent: adding the same game twice returns existing favorite ID.
 */
export const add = mutation({
  args: {
    gameId: v.id("games"),
  },
  returns: v.id("favorites"),
  handler: async (ctx, args) => {
    // Get current user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    // Look up the Convex user by Clerk ID
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    
    if (!user) {
      throw new Error("User not found");
    }

    const userId = user._id;

    // Check if favorite already exists (idempotent)
    for await (const row of ctx.db
      .query("favorites")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))) {
      if (row.gameId === args.gameId) {
        return row._id;
      }
    }

    // Check user's favorite count
    let count = 0;
    for await (const _ of ctx.db
      .query("favorites")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))) {
      count++;
    }

    if (count >= MAX_FAVORITES_PER_USER) {
      throw new Error(
        `Maximum ${MAX_FAVORITES_PER_USER} favorites per user exceeded`
      );
    }

    // Create new favorite
    return await ctx.db.insert("favorites", {
      userId,
      gameId: args.gameId,
      createdAt: Date.now(),
    });
  },
});

/**
 * Remove a favorite by ID.
 * Only the owner can remove their favorite.
 */
export const remove = mutation({
  args: {
    favoriteId: v.id("favorites"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    // Look up the Convex user by Clerk ID
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    
    if (!user) {
      throw new Error("User not found");
    }

    const userId = user._id;
    const favorite = await ctx.db.get(args.favoriteId);

    if (!favorite) {
      throw new Error("Favorite not found");
    }

    if (favorite.userId !== userId) {
      throw new Error("Not authorized to delete this favorite");
    }

    await ctx.db.delete(args.favoriteId);
    return null;
  },
});

/**
 * Remove a favorite by game ID.
 * For easier UI toggling - removes the favorite for the current user and this game.
 */
export const removeByGameId = mutation({
  args: {
    gameId: v.id("games"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    // Look up the Convex user by Clerk ID
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    
    if (!user) {
      throw new Error("User not found");
    }

    const userId = user._id;

    // Find the favorite for this user and game
    for await (const fav of ctx.db
      .query("favorites")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))) {
      if (fav.gameId === args.gameId) {
        await ctx.db.delete(fav._id);
        return null;
      }
    }

    throw new Error("Favorite not found");
  },
});

/**
 * List favorites for a user, paginated.
 */
export const listForUser = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
    cursor: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    const favorites: Doc<"favorites">[] = [];

    const iter = ctx.db
      .query("favorites")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .order("desc");

    for await (const fav of iter) {
      favorites.push(fav);
      if (favorites.length >= limit) break;
    }

    return favorites;
  },
});

/**
 * Quick query: get all favorite game IDs for the current authenticated user.
 * Used for fast UI toggles; returns empty if not authenticated.
 */
export const listFavoriteGameIdsForCurrentUser = query({
  args: {},
  returns: v.array(v.id("games")),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    // Look up the Convex user by Clerk ID
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    
    if (!user) {
      return [];
    }

    const userId = user._id;
    const gameIds: Id<"games">[] = [];

    for await (const fav of ctx.db
      .query("favorites")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))) {
      gameIds.push(fav.gameId);
    }

    return gameIds;
  },
});

/**
 * Count favorites for a specific game.
 */
export const countForGame = query({
  args: {
    gameId: v.id("games"),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    let count = 0;

    for await (const _ of ctx.db
      .query("favorites")
      .withIndex("by_game_id", (q) => q.eq("gameId", args.gameId))) {
      count++;
    }

    return count;
  },
});

/**
 * Check if a specific user has favorited a specific game.
 * Useful for optimistic UI updates.
 */
export const isFavorited = query({
  args: {
    gameId: v.id("games"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return false;
    }

    const userId = identity.subject as Id<"users">;

    for await (const fav of ctx.db
      .query("favorites")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))) {
      if (fav.gameId === args.gameId) {
        return true;
      }
    }

    return false;
  },
});
