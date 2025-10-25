/**
 * Next.js Middleware for route protection and authentication
 *
 * This middleware runs before every request and handles:
 * - Authentication checks for protected routes
 * - Role-based access control
 * - Redirecting users based on authentication state and role
 * - Preventing authenticated users from accessing auth pages
 *
 * Uses centralized services for SOLID architecture:
 * - RedirectService: Single source of truth for routing decisions
 * - RouteGuardService: Centralized route protection logic
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { getRedirectPath, isAuthPage, isPublicRoute } from '@/lib/services/redirect.service';
import { canAccessRoute } from '@/lib/services/route-guard.service';
import type { UserRole } from '@/types/auth';

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const response = NextResponse.next();

  // Create Supabase client for middleware
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Get the current session
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const isAuthenticated = !!session;
  let userRole: UserRole | undefined;

  // If user is authenticated, get their role
  if (session) {
    // PERFORMANCE OPTIMIZATION: Try to get role from JWT first (fast path, ~5-10ms)
    // This avoids a database query on every request for users with role in JWT
    userRole = (session.user.user_metadata?.role || session.user.app_metadata?.role) as UserRole | undefined;

    if (!userRole) {
      // Fallback: Query database for existing users without role in JWT (~50-100ms)
      // TODO: This can be removed once all users have role in JWT (via signup or profile update)
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      userRole = profile?.role as UserRole | undefined;

      if (!userRole) {
        // User exists but has no role - redirect to complete profile
        return NextResponse.redirect(new URL('/auth/complete-profile', req.url));
      }
    }
  }

  // Check if user can access this route
  const accessCheck = canAccessRoute(pathname, isAuthenticated, userRole);

  // If access is denied and route requires auth, redirect to login
  if (!accessCheck.allowed && accessCheck.requiresAuth) {
    const loginUrl = new URL('/auth/login', req.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If access is denied due to role, redirect to unauthorized
  if (!accessCheck.allowed && isAuthenticated) {
    return NextResponse.redirect(new URL('/unauthorized', req.url));
  }

  // Check if we should redirect (handles root page, auth pages for authenticated users, etc.)
  const redirectParam = req.nextUrl.searchParams.get('redirect');
  const redirectPath = getRedirectPath(pathname, isAuthenticated, userRole, redirectParam);

  if (redirectPath) {
    return NextResponse.redirect(new URL(redirectPath, req.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes - handled separately)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
};
