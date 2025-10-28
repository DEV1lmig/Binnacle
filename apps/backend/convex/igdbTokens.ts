/**
 * Internal helpers to cache and retrieve IGDB access tokens.
 */
import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

const providerKey = "igdb" as const;

/**
 * Retrieves the cached IGDB token if one exists.
 */
export const getIgdbToken = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("apiTokens")
      .withIndex("by_provider", (q) => q.eq("provider", providerKey))
      .unique();
  },
});

/**
 * Stores or updates the cached IGDB token so we reuse it until expiry.
 */
export const saveIgdbToken = internalMutation({
  args: {
    accessToken: v.string(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    const existingToken = await ctx.db
      .query("apiTokens")
      .withIndex("by_provider", (q) => q.eq("provider", providerKey))
      .unique();

    if (existingToken) {
      await ctx.db.patch(existingToken._id, {
        accessToken: args.accessToken,
        expiresAt: args.expiresAt,
      });
      return existingToken._id;
    }

    return await ctx.db.insert("apiTokens", {
      provider: providerKey,
      accessToken: args.accessToken,
      expiresAt: args.expiresAt,
    });
  },
});
