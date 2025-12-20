/**
 * Settings mutations and queries for managing user preferences.
 */
import { mutation, query, MutationCtx, QueryCtx } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { Doc } from "./_generated/dataModel";

// Validators for preference options
const themeValidator = v.union(
    v.literal("dark"),
    v.literal("light"),
    v.literal("system")
);

const cardViewValidator = v.union(
    v.literal("compact"),
    v.literal("comfortable")
);

const profileVisibilityValidator = v.union(
    v.literal("public"),
    v.literal("friends"),
    v.literal("private")
);

const preferencesValidator = v.object({
    theme: v.optional(themeValidator),
    cardView: v.optional(cardViewValidator),
    profileVisibility: v.optional(profileVisibilityValidator),
    showActivityOnFeed: v.optional(v.boolean()),
    showPlayingStatus: v.optional(v.boolean()),
    defaultPlatforms: v.optional(v.array(v.string())),
    preferredGenres: v.optional(v.array(v.string())),
    timezone: v.optional(v.string()),
});

/**
 * Returns the current user's preferences.
 */
export const getPreferences = query({
    args: {},
    returns: v.union(
        v.null(),
        v.object({
            theme: v.optional(v.string()),
            cardView: v.optional(v.string()),
            profileVisibility: v.optional(v.string()),
            showActivityOnFeed: v.optional(v.boolean()),
            showPlayingStatus: v.optional(v.boolean()),
            defaultPlatforms: v.optional(v.array(v.string())),
            preferredGenres: v.optional(v.array(v.string())),
            timezone: v.optional(v.string()),
        })
    ),
    handler: async (ctx) => {
        const user = await getCurrentUser(ctx);
        if (!user) return null;

        // Return preferences with defaults
        return {
            theme: user.preferences?.theme ?? "system",
            cardView: user.preferences?.cardView ?? "comfortable",
            profileVisibility: user.preferences?.profileVisibility ?? "public",
            showActivityOnFeed: user.preferences?.showActivityOnFeed ?? true,
            showPlayingStatus: user.preferences?.showPlayingStatus ?? true,
            defaultPlatforms: user.preferences?.defaultPlatforms ?? [],
            preferredGenres: user.preferences?.preferredGenres ?? [],
            timezone: user.preferences?.timezone ?? undefined,
        };
    },
});

/**
 * Updates the current user's preferences.
 */
export const updatePreferences = mutation({
    args: {
        theme: v.optional(themeValidator),
        cardView: v.optional(cardViewValidator),
        profileVisibility: v.optional(profileVisibilityValidator),
        showActivityOnFeed: v.optional(v.boolean()),
        showPlayingStatus: v.optional(v.boolean()),
        defaultPlatforms: v.optional(v.array(v.string())),
        preferredGenres: v.optional(v.array(v.string())),
        timezone: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const user = await requireCurrentUser(ctx);

        // Merge with existing preferences
        const currentPrefs = user.preferences ?? {};
        const updatedPrefs = {
            ...currentPrefs,
            ...(args.theme !== undefined && { theme: args.theme }),
            ...(args.cardView !== undefined && { cardView: args.cardView }),
            ...(args.profileVisibility !== undefined && { profileVisibility: args.profileVisibility }),
            ...(args.showActivityOnFeed !== undefined && { showActivityOnFeed: args.showActivityOnFeed }),
            ...(args.showPlayingStatus !== undefined && { showPlayingStatus: args.showPlayingStatus }),
            ...(args.defaultPlatforms !== undefined && { defaultPlatforms: args.defaultPlatforms }),
            ...(args.preferredGenres !== undefined && { preferredGenres: args.preferredGenres }),
            ...(args.timezone !== undefined && { timezone: args.timezone }),
        };

        await ctx.db.patch(user._id, { preferences: updatedPrefs });
        return { success: true };
    },
});

/**
 * Updates the user's username with validation.
 */
export const updateUsername = mutation({
    args: {
        username: v.string(),
    },
    handler: async (ctx, args) => {
        const user = await requireCurrentUser(ctx);
        const newUsername = args.username.trim().toLowerCase();

        // Validate username format
        if (newUsername.length < 3) {
            throw new ConvexError("Username must be at least 3 characters");
        }
        if (newUsername.length > 32) {
            throw new ConvexError("Username must be at most 32 characters");
        }
        if (!/^[a-z0-9_]+$/.test(newUsername)) {
            throw new ConvexError("Username can only contain lowercase letters, numbers, and underscores");
        }

        // Check if username is taken
        if (newUsername !== user.username) {
            const existing = await ctx.db
                .query("users")
                .withIndex("by_username", (q) => q.eq("username", newUsername))
                .unique();

            if (existing) {
                throw new ConvexError("Username is already taken");
            }
        }

        await ctx.db.patch(user._id, { username: newUsername });
        return { success: true, username: newUsername };
    },
});

/**
 * Checks if a username is available.
 */
export const checkUsernameAvailable = query({
    args: {
        username: v.string(),
    },
    returns: v.object({
        available: v.boolean(),
        reason: v.optional(v.string()),
    }),
    handler: async (ctx, args) => {
        const username = args.username.trim().toLowerCase();

        // Validate format
        if (username.length < 3) {
            return { available: false, reason: "Username must be at least 3 characters" };
        }
        if (username.length > 32) {
            return { available: false, reason: "Username must be at most 32 characters" };
        }
        if (!/^[a-z0-9_]+$/.test(username)) {
            return { available: false, reason: "Only lowercase letters, numbers, and underscores allowed" };
        }

        // Check if taken
        const existing = await ctx.db
            .query("users")
            .withIndex("by_username", (q) => q.eq("username", username))
            .unique();

        if (existing) {
            // Check if it's the current user's username
            const identity = await ctx.auth.getUserIdentity();
            if (identity) {
                const currentUser = await ctx.db
                    .query("users")
                    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
                    .unique();
                if (currentUser && currentUser._id === existing._id) {
                    return { available: true };
                }
            }
            return { available: false, reason: "Username is already taken" };
        }

        return { available: true };
    },
});

// === Helper Functions ===

async function getCurrentUser(ctx: QueryCtx): Promise<Doc<"users"> | null> {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    return await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
        .unique();
}

async function requireCurrentUser(ctx: MutationCtx): Promise<Doc<"users">> {
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
