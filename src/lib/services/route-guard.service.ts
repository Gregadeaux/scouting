/**
 * Route Guard Service
 *
 * Centralized route protection logic for determining access control.
 * Works in conjunction with RedirectService to enforce authentication
 * and authorization rules consistently across the application.
 */

import type { UserRole } from '@/types/auth';
import { isPublicRoute } from './redirect.service';

/**
 * Route protection configuration
 * Maps route patterns to required roles
 */
export const ROUTE_GUARDS = {
  // Admin routes - accessible by admins and mentors (with read-only for mentors)
  '/admin': ['admin', 'mentor'],

  // Protected routes accessible by all authenticated users
  '/dashboard': ['admin', 'mentor', 'scouter'],
  '/pit-scouting': ['admin', 'mentor', 'scouter'],
  '/scouting': ['admin', 'mentor', 'scouter'],
  '/analytics': ['admin', 'mentor', 'scouter'],
  '/profile': ['admin', 'mentor', 'scouter'],

  // Future: Mentor routes (subset of admin features)
  // '/team-management': ['admin', 'mentor'],
} as const;

/**
 * Role hierarchy for access checks
 * Higher number = more privileges
 */
const ROLE_HIERARCHY: Record<UserRole, number> = {
  admin: 3,
  mentor: 2,
  scouter: 1,
};

/**
 * Check if a user's role has sufficient privileges for a required role
 *
 * @param userRole - The user's actual role
 * @param requiredRole - The minimum required role
 * @returns true if user has sufficient privileges
 */
export function hasRoleAccess(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

/**
 * Check if a route requires authentication
 *
 * @param path - The route path to check
 * @returns true if route requires authentication
 */
export function requiresAuth(path: string): boolean {
  // Public routes don't require auth
  if (isPublicRoute(path)) {
    return false;
  }

  // All other routes require authentication
  return true;
}

/**
 * Get required roles for a specific route
 *
 * @param path - The route path to check
 * @returns Array of roles that can access this route, or null if route is public
 */
export function getRequiredRoles(path: string): UserRole[] | null {
  // Check for exact match first
  for (const [route, roles] of Object.entries(ROUTE_GUARDS)) {
    if (path.startsWith(route)) {
      return [...roles] as UserRole[];
    }
  }

  // Public routes
  if (isPublicRoute(path)) {
    return null;
  }

  // Default: all authenticated users can access
  return ['admin', 'mentor', 'scouter'];
}

/**
 * Check if a user can access a specific route
 *
 * @param path - The route path to check
 * @param isAuthenticated - Whether the user is authenticated
 * @param role - The user's role (if authenticated)
 * @returns Object with access decision and reason
 */
export function canAccessRoute(
  path: string,
  isAuthenticated: boolean,
  role?: UserRole
): {
  allowed: boolean;
  reason?: string;
  requiresAuth: boolean;
} {
  // Check if route requires authentication
  if (!requiresAuth(path)) {
    return { allowed: true, requiresAuth: false };
  }

  // Route requires auth, but user is not authenticated
  if (!isAuthenticated || !role) {
    return {
      allowed: false,
      reason: 'Authentication required',
      requiresAuth: true,
    };
  }

  // Get required roles for this route
  const requiredRoles = getRequiredRoles(path);

  // If no specific role required, any authenticated user can access
  if (!requiredRoles) {
    return { allowed: true, requiresAuth: true };
  }

  // Check if user's role is in the allowed list
  if (requiredRoles.includes(role)) {
    return { allowed: true, requiresAuth: true };
  }

  // User doesn't have required role
  return {
    allowed: false,
    reason: `Requires one of: ${requiredRoles.join(', ')}`,
    requiresAuth: true,
  };
}

/**
 * Check if a user is an admin
 *
 * @param role - The user's role
 * @returns true if user is admin
 */
export function isAdmin(role?: UserRole): boolean {
  return role === 'admin';
}

/**
 * Check if a user is a mentor or higher
 *
 * @param role - The user's role
 * @returns true if user is mentor or admin
 */
export function isMentorOrHigher(role?: UserRole): boolean {
  if (!role) return false;
  return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY.mentor;
}

/**
 * Get all routes a user can access based on their role
 *
 * @param role - The user's role
 * @returns Array of route paths the user can access
 */
export function getAccessibleRoutes(role: UserRole): string[] {
  const routes: string[] = [];

  for (const [route, requiredRoles] of Object.entries(ROUTE_GUARDS)) {
    if (requiredRoles.includes(role)) {
      routes.push(route);
    }
  }

  return routes;
}
