/**
 * Admin module for role management and administrative functions.
 * All functions in this module require admin role.
 */
import { mutation, query, internalMutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";
import {
  requireAdmin,
  requireModerator,
  getCurrentUser,
  getUserRole,
  canModifyUserRole,
  isAdmin,
  isModerator,
  ROLES,
  type Role,
} from "./lib/auth";

/**
 * Get the current user's role information.
 * Public query - used by frontend to determine access.
 */
export const getCurrentUserRole = query({
  args: {},
  returns: v.object({
    isAuthenticated: v.boolean(),
    userId: v.optional(v.id("users")),
    role: v.string(),
    isAdmin: v.boolean(),
    isModerator: v.boolean(),
  }),
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    
    if (!user) {
      return {
        isAuthenticated: false,
        userId: undefined,
        role: ROLES.USER,
        isAdmin: false,
        isModerator: false,
      };
    }

    const role = getUserRole(user);
    
    return {
      isAuthenticated: true,
      userId: user._id,
      role,
      isAdmin: isAdmin(user),
      isModerator: isModerator(user),
    };
  },
});

/**
 * Set a user's role. Only admins can do this.
 */
export const setUserRole = mutation({
  args: {
    userId: v.id("users"),
    role: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
    previousRole: v.optional(v.string()),
    newRole: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    
    // Validate role
    const validRoles = [ROLES.USER, ROLES.MODERATOR, ROLES.ADMIN];
    if (!validRoles.includes(args.role as Role)) {
      throw new ConvexError(`Invalid role: ${args.role}. Must be one of: ${validRoles.join(", ")}`);
    }

    const targetUser = await ctx.db.get(args.userId);
    if (!targetUser) {
      throw new ConvexError("User not found");
    }

    // Check if allowed to modify
    const check = canModifyUserRole(admin, args.userId, args.role as Role);
    if (!check.allowed) {
      throw new ConvexError(check.reason || "Cannot modify user role");
    }

    const previousRole = getUserRole(targetUser);
    
    // Update the role
    await ctx.db.patch(args.userId, {
      role: args.role,
    });

    return {
      success: true,
      message: `User role updated from ${previousRole} to ${args.role}`,
      previousRole,
      newRole: args.role,
    };
  },
});

/**
 * List all users with their roles. Admin only.
 * Optimized with strict limits to avoid timeouts.
 */
export const listUsersWithRoles = query({
  args: {
    limit: v.optional(v.number()),
    roleFilter: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    
    // Strict limit to avoid timeouts
    const limit = Math.min(args.limit ?? 25, 50);
    
    let users: Doc<"users">[];
    
    // Filter by role if specified
    if (args.roleFilter && args.roleFilter !== "all") {
      users = await ctx.db
        .query("users")
        .withIndex("by_role", (q) => q.eq("role", args.roleFilter))
        .order("desc")
        .take(limit);
    } else {
      users = await ctx.db
        .query("users")
        .order("desc")
        .take(limit);
    }
    
    return users.map((user) => ({
      _id: user._id,
      name: user.name,
      username: user.username,
      avatarUrl: user.avatarUrl,
      role: getUserRole(user),
      _creationTime: user._creationTime,
    }));
  },
});

/**
 * Get admin dashboard stats.
 * Optimized to avoid full table scans.
 */
export const getDashboardStats = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    
    // Use parallel queries with strict limits to avoid timeouts
    const [admins, moderators, recentUsers, gamesSnapshot, reviewsSnapshot] = await Promise.all([
      // Admins - should be very few
      ctx.db
        .query("users")
        .withIndex("by_role", (q) => q.eq("role", ROLES.ADMIN))
        .take(100),
      // Moderators - should be few
      ctx.db
        .query("users")
        .withIndex("by_role", (q) => q.eq("role", ROLES.MODERATOR))
        .take(100),
      // Sample of recent users for estimation
      ctx.db
        .query("users")
        .order("desc")
        .take(500),
      // Sample games count
      ctx.db.query("games").take(1000),
      // Sample reviews count
      ctx.db.query("reviews").take(1000),
    ]);

    // Estimate total users from sample
    const estimatedTotal = recentUsers.length;
    // Regular users = total - admins - moderators
    const regularUsers = Math.max(0, estimatedTotal - admins.length - moderators.length);
    
    return {
      users: {
        total: estimatedTotal,
        admins: admins.length,
        moderators: moderators.length,
        users: regularUsers,
      },
      games: gamesSnapshot.length,
      reviews: reviewsSnapshot.length,
    };
  },
});

/**
 * Internal mutation to set up initial admin.
 * Called once during setup or via dashboard command.
 */
export const setupInitialAdmin = internalMutation({
  args: {
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (!user) {
      throw new ConvexError("User not found with the provided Clerk ID");
    }

    // Check if there are any admins already
    const existingAdmins = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", ROLES.ADMIN))
      .take(1);

    if (existingAdmins.length > 0) {
      // Already have admins, only allow if called by existing admin
      console.log("[setupInitialAdmin] Admin already exists, skipping setup");
      return { success: false, message: "Admin already exists" };
    }

    await ctx.db.patch(user._id, {
      role: ROLES.ADMIN,
    });

    console.log(`[setupInitialAdmin] User ${user.username} (${user._id}) promoted to admin`);
    
    return {
      success: true,
      message: `User ${user.username} is now an admin`,
      userId: user._id,
    };
  },
});

/**
 * Promote yourself to admin if no admins exist (bootstrap only).
 * This is a safety mechanism for initial setup.
 */
export const bootstrapAdmin = mutation({
  args: {},
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
  }),
  handler: async (ctx) => {
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

    // Check if there are any admins
    const existingAdmins = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", ROLES.ADMIN))
      .take(1);

    if (existingAdmins.length > 0) {
      throw new ConvexError("Cannot bootstrap: admin already exists. Contact an existing admin.");
    }

    // No admins exist, promote this user
    await ctx.db.patch(user._id, {
      role: ROLES.ADMIN,
    });

    console.log(`[bootstrapAdmin] User ${user.username} (${user._id}) bootstrapped as first admin`);

    return {
      success: true,
      message: `You are now an admin. Welcome to the admin panel!`,
    };
  },
});

/**
 * Check if admin setup is needed (no admins exist).
 */
export const needsAdminSetup = query({
  args: {},
  returns: v.boolean(),
  handler: async (ctx) => {
    const existingAdmins = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", ROLES.ADMIN))
      .take(1);

    return existingAdmins.length === 0;
  },
});
