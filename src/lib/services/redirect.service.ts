/**
 * Redirect Service
 *
 * Single source of truth for all role-based routing in the application.
 * This service centralizes redirect logic to maintain SOLID principles:
 * - Single Responsibility: All routing decisions in one place
 * - Open/Closed: Add new roles by extending this service only
 * - Dependency Inversion: Components depend on this abstraction
 */

import type { UserRole } from '@/types/auth';

/**
 * Configuration for route redirects based on authentication and role
 */
export const ROUTE_CONFIG = {
  // Public routes that don't require authentication
  public: [
    '/auth/login',
    '/auth/signup',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/auth/verify-email',
  ],

  // Routes that should redirect authenticated users
  authPages: [
    '/auth/login',
    '/auth/signup',
    '/auth/forgot-password',
  ],

  // Default landing pages by role
  roleDefaults: {
    admin: '/admin',
    mentor: '/dashboard', // Future: will have subset of admin features
    scouter: '/pit-scouting',
  },

  // Fallback for unauthenticated users
  unauthenticated: '/auth/login',
} as const;

/**
 * Get the default redirect path for a user based on their role
 *
 * @param role - User's role (admin, mentor, scouter)
 * @returns The path to redirect to
 */
export function getRedirectPathForRole(role: UserRole): string {
  return ROUTE_CONFIG.roleDefaults[role];
}

/**
 * Get the redirect path for unauthenticated users
 *
 * @param intendedPath - Optional path user was trying to access
 * @returns Login path with optional redirect parameter
 */
export function getUnauthenticatedRedirect(intendedPath?: string): string {
  if (intendedPath && !isPublicRoute(intendedPath)) {
    return `${ROUTE_CONFIG.unauthenticated}?redirect=${encodeURIComponent(intendedPath)}`;
  }
  return ROUTE_CONFIG.unauthenticated;
}

/**
 * Check if a route is public (doesn't require authentication)
 *
 * @param path - The route path to check
 * @returns true if route is public
 */
export function isPublicRoute(path: string): boolean {
  return ROUTE_CONFIG.public.some(route => path.startsWith(route));
}

/**
 * Check if a route is an auth page that should redirect authenticated users
 *
 * @param path - The route path to check
 * @returns true if authenticated users should be redirected away
 */
export function isAuthPage(path: string): boolean {
  return ROUTE_CONFIG.authPages.some(route => path.startsWith(route));
}

/**
 * Determine where to redirect an authenticated user who is on an auth page
 *
 * @param role - User's role
 * @param redirectParam - Optional redirect query parameter
 * @returns Path to redirect to
 */
export function getAuthenticatedRedirect(
  role: UserRole,
  redirectParam?: string | null
): string {
  // If there's a valid redirect parameter, use it
  if (redirectParam && !isAuthPage(redirectParam) && !isPublicRoute(redirectParam)) {
    return redirectParam;
  }

  // Otherwise, redirect to role's default page
  return getRedirectPathForRole(role);
}

/**
 * Get redirect path for user on any page based on authentication state
 *
 * This is the main entry point for determining redirects
 *
 * @param currentPath - The current page path
 * @param isAuthenticated - Whether user is authenticated
 * @param role - User's role (if authenticated)
 * @param redirectParam - Optional redirect query parameter
 * @returns Redirect path, or null if user should stay on current page
 */
export function getRedirectPath(
  currentPath: string,
  isAuthenticated: boolean,
  role?: UserRole,
  redirectParam?: string | null
): string | null {
  // Root page: always redirect based on auth status
  if (currentPath === '/') {
    if (isAuthenticated && role) {
      return getRedirectPathForRole(role);
    }
    return ROUTE_CONFIG.unauthenticated;
  }

  // Auth pages: redirect authenticated users to their role's default page
  if (isAuthPage(currentPath) && isAuthenticated && role) {
    return getAuthenticatedRedirect(role, redirectParam);
  }

  // Public routes: authenticated users can access
  if (isPublicRoute(currentPath)) {
    return null; // Stay on current page
  }

  // Protected routes: redirect unauthenticated users
  if (!isAuthenticated) {
    return getUnauthenticatedRedirect(currentPath);
  }

  // User is authenticated and on a valid protected route
  return null;
}

/**
 * Type-safe route builder for redirects
 */
export const Routes = {
  admin: () => ROUTE_CONFIG.roleDefaults.admin,
  mentor: () => ROUTE_CONFIG.roleDefaults.mentor,
  scouter: () => ROUTE_CONFIG.roleDefaults.scouter,
  login: (redirect?: string) =>
    redirect ? `${ROUTE_CONFIG.unauthenticated}?redirect=${encodeURIComponent(redirect)}` : ROUTE_CONFIG.unauthenticated,
  unauthorized: () => '/unauthorized',
} as const;
