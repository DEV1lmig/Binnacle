// In apps/convex/schema.ts

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // == Users Table ==
  // Stores user profile information, links to Clerk for auth
  users: defineTable({
    name: v.string(),
    username: v.string(),
    bio: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    clerkId: v.string(), // Links to the Clerk user ID
  })
    .index("by_clerk_id", ["clerkId"]) // Index for fast lookups
    .index("by_username", ["username"]),

  // == Games Table ==
  // Caches basic and enriched game data fetched from an external API like IGDB
  games: defineTable({
    igdbId: v.number(), // The ID from the external API
    title: v.string(),
    coverUrl: v.optional(v.string()),
    releaseYear: v.optional(v.number()),
    lastUpdated: v.number(), // Timestamp of last update

    // Enriched fields from IGDB
    // Narrative content
    summary: v.optional(v.string()), // Game synopsis/description
    storyline: v.optional(v.string()), // Longer narrative description

    // Taxonomy (stored as JSON strings)
    genres: v.optional(v.string()), // JSON array: [{ id, name }]
    themes: v.optional(v.string()), // JSON array: [{ id, name }]
    playerPerspectives: v.optional(v.string()), // JSON array: [{ id, name }]
    gameModes: v.optional(v.string()), // JSON array: [{ id, name }]
    platforms: v.optional(v.string()), // JSON array: [{ id, name }]

    // Media assets (arrays of URLs or metadata)
    artworks: v.optional(v.string()), // JSON array of artwork URLs
    screenshots: v.optional(v.string()), // JSON array of screenshot URLs
    videos: v.optional(v.string()), // JSON array: [{ id, title }]
    websites: v.optional(v.string()), // JSON array: [{ type, url }]

    // Credits
    developers: v.optional(v.string()), // JSON array: [{ id, name, role }]
    publishers: v.optional(v.string()), // JSON array: [{ id, name, role }]

    // Ratings & status
    aggregatedRating: v.optional(v.number()), // Critic score (0-100)
    aggregatedRatingCount: v.optional(v.number()), // Number of critic reviews
    ageRatings: v.optional(v.string()), // JSON array: [{ category, rating }]
    gameStatus: v.optional(v.string()), // e.g., "Released", "Early Access"

    // Additional metadata
    languageSupports: v.optional(v.string()), // JSON array: [{ language, type }]
    multiplayerModes: v.optional(v.string()), // JSON array of multiplayer options
    similarGames: v.optional(v.string()), // JSON array of similar game IDs
  }).index("by_igdb_id", ["igdbId"]),

  // == Reviews Table (The core of the app) ==
  // A user's log entry for a specific game
  reviews: defineTable({
    userId: v.id("users"),
    gameId: v.id("games"),
    rating: v.number(), // e.g., 1-10
    platform: v.optional(v.string()), // e.g., "PC", "PlayStation 5"
    text: v.optional(v.string()), // The actual review content
    playtimeHours: v.optional(v.number()),
  })
    .index("by_user_id", ["userId"])
    .index("by_game_id", ["gameId"]),

  // == Likes Table ==
  // Tracks likes on reviews
  likes: defineTable({
    userId: v.id("users"),
    reviewId: v.id("reviews"),
  })
    .index("by_user_and_review", ["userId", "reviewId"]) // Prevents duplicate likes
    .index("by_review_id", ["reviewId"]),

  // == Comments Table ==
  // User comments on reviews
  comments: defineTable({
    userId: v.id("users"),
    reviewId: v.id("reviews"),
    text: v.string(),
    createdAt: v.number(),
  })
    .index("by_review_id", ["reviewId"])
    .index("by_user_id", ["userId"]),

  // == Followers Table ==
  // Tracks the social graph (who follows whom)
  followers: defineTable({
    followerId: v.id("users"), // The user who is following
    followingId: v.id("users"), // The user who is being followed
  })
    .index("by_follower_and_following", ["followerId", "followingId"])
    .index("by_follower_id", ["followerId"])
    .index("by_following_id", ["followingId"]),

  // == Friend Requests Table ==
  // Tracks pending friendship invitations between users
  friendRequests: defineTable({
    requesterId: v.id("users"),
    recipientId: v.id("users"),
    pairKey: v.string(),
    createdAt: v.number(),
  })
    .index("by_pair_key", ["pairKey"])
    .index("by_recipient_id", ["recipientId"])
    .index("by_requester_id", ["requesterId"]),

  // == Friendships Table ==
  // Stores confirmed mutual friendships between two users
  friendships: defineTable({
    userAId: v.id("users"),
    userBId: v.id("users"),
    pairKey: v.string(),
    createdAt: v.number(),
  })
    .index("by_pair_key", ["pairKey"])
    .index("by_user_a_id", ["userAId"])
    .index("by_user_b_id", ["userBId"]),

  // == API Tokens Table ==
  // Stores cached access tokens for third-party providers like IGDB
  apiTokens: defineTable({
    provider: v.string(),
    accessToken: v.string(),
    expiresAt: v.number(),
  }).index("by_provider", ["provider"]),

  // == Favorites Table ==
  // User-marked favorite games (bookmarks/wishlist)
  favorites: defineTable({
    userId: v.id("users"),
    gameId: v.id("games"),
    createdAt: v.number(),
  })
    .index("by_user_id", ["userId"])
    .index("by_game_id", ["gameId"]),

  // == Backlog Items Table ==
  // User's personal game backlog with play status tracking
  backlogItems: defineTable({
    userId: v.id("users"),
    gameId: v.id("games"),
    status: v.string(), // "want_to_play", "playing", "completed", "dropped", "on_hold"
    platform: v.optional(v.string()), // Platform user is playing on (e.g., "PS5", "PC")
    notes: v.optional(v.string()), // User's personal notes about the game
    priority: v.optional(v.number()), // Priority/ranking (optional, 1-5 or similar)
    startedAt: v.optional(v.number()), // Timestamp when user started playing
    completedAt: v.optional(v.number()), // Timestamp when user completed the game
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user_id", ["userId"])
    .index("by_game_id", ["gameId"])
    .index("by_user_and_game", ["userId", "gameId"]), // For quick duplicate checking
});