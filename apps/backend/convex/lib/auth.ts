/**
 * Authorization helpers for role-based access control.
 * 
 * Roles hierarchy:
 * - admin: Full access to everything
 * - moderator: Can moderate content (reviews, comments, users)
 * - user: Default role, standard user permissions
 */
import { ConvexError } from "convex/values";
import { QueryCtx, MutationCtx, ActionCtx } from "../_generated/server";
import { Doc, Id } from "../_generated/dataModel";

// Valid roles in the system
export const ROLES = {
  USER: "user",
  MODERATOR: "moderator",
  ADMIN: "admin",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

// Role hierarchy for permission checks (higher index = more permissions)
const ROLE_HIERARCHY: Role[] = [ROLES.USER, ROLES.MODERATOR, ROLES.ADMIN];

/**
 * Get the current authenticated user from context.
 * Returns null if not authenticated.
 */
export async function getCurrentUser(
  ctx: QueryCtx | MutationCtx
): Promise<Doc<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return null;
  }

  return await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .unique();
}

/**
 * Get the current authenticated user or throw an error.
 */
export async function requireCurrentUser(
  ctx: QueryCtx | MutationCtx
): Promise<Doc<"users">> {
  const user = await getCurrentUser(ctx);
  if (!user) {
    throw new ConvexError("Authentication required");
  }
  return user;
}

/**
 * Get the effective role for a user.
 * Returns "user" if no role is set (default).
 */
export function getUserRole(user: Doc<"users"> | null): Role {
  if (!user) return ROLES.USER;
  return (user.role as Role) || ROLES.USER;
}

/**
 * Check if a role has at least the specified permission level.
 */
export function hasRole(userRole: Role, requiredRole: Role): boolean {
  const userLevel = ROLE_HIERARCHY.indexOf(userRole);
  const requiredLevel = ROLE_HIERARCHY.indexOf(requiredRole);
  return userLevel >= requiredLevel;
}

/**
 * Check if user is an admin.
 */
export function isAdmin(user: Doc<"users"> | null): boolean {
  return getUserRole(user) === ROLES.ADMIN;
}

/**
 * Check if user is a moderator or higher.
 */
export function isModerator(user: Doc<"users"> | null): boolean {
  return hasRole(getUserRole(user), ROLES.MODERATOR);
}

/**
 * Require the current user to be an admin.
 * Throws ConvexError if not authorized.
 */
export async function requireAdmin(
  ctx: QueryCtx | MutationCtx
): Promise<Doc<"users">> {
  const user = await requireCurrentUser(ctx);
  
  if (!isAdmin(user)) {
    throw new ConvexError("Admin access required");
  }
  
  return user;
}

/**
 * Require the current user to be a moderator or admin.
 * Throws ConvexError if not authorized.
 */
export async function requireModerator(
  ctx: QueryCtx | MutationCtx
): Promise<Doc<"users">> {
  const user = await requireCurrentUser(ctx);
  
  if (!isModerator(user)) {
    throw new ConvexError("Moderator access required");
  }
  
  return user;
}

/**
 * Require the current user to have at least the specified role.
 * Throws ConvexError if not authorized.
 */
export async function requireRole(
  ctx: QueryCtx | MutationCtx,
  requiredRole: Role
): Promise<Doc<"users">> {
  const user = await requireCurrentUser(ctx);
  const userRole = getUserRole(user);
  
  if (!hasRole(userRole, requiredRole)) {
    throw new ConvexError(`${requiredRole} access required`);
  }
  
  return user;
}

/**
 * Check if the current user can modify a target user's role.
 * Rules:
 * - Only admins can modify roles
 * - Admins cannot demote themselves
 * - Cannot promote to a role higher than your own
 */
export function canModifyUserRole(
  actor: Doc<"users">,
  targetUserId: Id<"users">,
  newRole: Role
): { allowed: boolean; reason?: string } {
  // Only admins can modify roles
  if (!isAdmin(actor)) {
    return { allowed: false, reason: "Only admins can modify user roles" };
  }

  // Prevent self-demotion
  if (actor._id === targetUserId && newRole !== ROLES.ADMIN) {
    return { allowed: false, reason: "Cannot demote yourself" };
  }

  // Valid role check
  if (!ROLE_HIERARCHY.includes(newRole)) {
    return { allowed: false, reason: `Invalid role: ${newRole}` };
  }

  return { allowed: true };
}

/**
 * Utility to check authorization without throwing.
 * Useful for conditional UI rendering.
 */
export async function checkAuthorization(
  ctx: QueryCtx | MutationCtx,
  requiredRole: Role
): Promise<{ authorized: boolean; user: Doc<"users"> | null; role: Role }> {
  const user = await getCurrentUser(ctx);
  const role = getUserRole(user);
  const authorized = user !== null && hasRole(role, requiredRole);
  
  return { authorized, user, role };
}
