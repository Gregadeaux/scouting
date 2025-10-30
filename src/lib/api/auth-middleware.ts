/**
 * API Authentication & Authorization Middleware
 * For Next.js API Routes and Server Components
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser, getUserProfile, canAccessTeam as checkCanAccessTeam } from '@/lib/supabase/auth';
import type { AuthenticatedUser, UserRole } from '@/types/auth';

// ============================================================================
// TYPES
// ============================================================================

export interface AuthMiddlewareOptions {
  requireAuth?: boolean;
  requireRole?: UserRole;
  requireTeam?: number;
}

export interface AuthenticatedRequest extends NextRequest {
  user?: AuthenticatedUser;
}

// ============================================================================
// MIDDLEWARE FUNCTIONS
// ============================================================================

/**
 * Get authenticated user from request
 */
export async function getAuthenticatedUser(
  request: NextRequest
): Promise<AuthenticatedUser | null> {
  try {
    const supabase = await createClient();

    // The createClient() function automatically handles cookies
    // We just need to call getUser() and it will read the session
    const currentUser = await getCurrentUser(supabase);
    return currentUser;
  } catch (error) {
    console.error('Error getting authenticated user:', error);
    return null;
  }
}

/**
 * Require authentication middleware
 */
export async function requireAuth(
  request: NextRequest,
  options: AuthMiddlewareOptions = {}
): Promise<{ user: AuthenticatedUser } | NextResponse> {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'Authentication required' },
      { status: 401 }
    );
  }

  // Check role requirement
  if (options.requireRole) {
    const roleHierarchy: Record<UserRole, number> = {
      admin: 3,
      mentor: 2,
      scouter: 1,
    };

    const userLevel = roleHierarchy[user.profile.role];
    const requiredLevel = roleHierarchy[options.requireRole];

    if (userLevel < requiredLevel) {
      return NextResponse.json(
        {
          error: 'Forbidden',
          message: `This action requires ${options.requireRole} role or higher`,
        },
        { status: 403 }
      );
    }
  }

  // Check team access requirement
  if (options.requireTeam) {
    const supabase = await createClient();
    const hasAccess = await checkCanAccessTeam(
      supabase,
      user.auth.id,
      options.requireTeam
    );

    if (!hasAccess) {
      return NextResponse.json(
        {
          error: 'Forbidden',
          message: 'You do not have access to this team',
        },
        { status: 403 }
      );
    }
  }

  return { user };
}

/**
 * Check if user has permission
 */
export function hasPermission(
  user: AuthenticatedUser,
  permission: keyof typeof user.permissions
): boolean {
  return user.permissions[permission] as boolean;
}

/**
 * Require admin role
 */
export async function requireAdmin(
  request: NextRequest
): Promise<{ user: AuthenticatedUser } | NextResponse> {
  return requireAuth(request, { requireRole: 'admin' });
}

/**
 * Require mentor role or higher
 */
export async function requireMentor(
  request: NextRequest
): Promise<{ user: AuthenticatedUser } | NextResponse> {
  return requireAuth(request, { requireRole: 'mentor' });
}

/**
 * Require admin or mentor role
 */
export async function requireAdminOrMentor(
  request: NextRequest
): Promise<{ user: AuthenticatedUser } | NextResponse> {
  const result = await requireAuth(request);

  if (result instanceof NextResponse) {
    return result;
  }

  const { user } = result;

  // Check if user is admin or mentor
  if (user.profile.role !== 'admin' && user.profile.role !== 'mentor') {
    return forbiddenResponse('Admin or mentor access required');
  }

  return result;
}

// ============================================================================
// RESPONSE HELPERS
// ============================================================================

/**
 * Create unauthorized response
 */
export function unauthorizedResponse(message = 'Authentication required'): NextResponse {
  return NextResponse.json(
    { error: 'Unauthorized', message },
    { status: 401 }
  );
}

/**
 * Create forbidden response
 */
export function forbiddenResponse(message = 'Access denied'): NextResponse {
  return NextResponse.json(
    { error: 'Forbidden', message },
    { status: 403 }
  );
}

/**
 * Create success response
 */
export function successResponse<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(
    { success: true, data },
    { status }
  );
}

/**
 * Create error response
 */
export function errorResponse(
  message: string,
  status = 400,
  details?: unknown
): NextResponse {
  return NextResponse.json(
    { success: false, error: message, details },
    { status }
  );
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate request body
 */
export async function validateRequestBody<T>(
  request: NextRequest,
  schema: (data: unknown) => T | null
): Promise<{ data: T } | NextResponse> {
  try {
    const body = await request.json();
    const validatedData = schema(body);

    if (!validatedData) {
      return errorResponse('Invalid request body', 400);
    }

    return { data: validatedData };
  } catch (error) {
    return errorResponse('Invalid JSON in request body', 400);
  }
}

/**
 * Validate query parameters
 */
export function validateQueryParam(
  request: NextRequest,
  param: string,
  required = true
): string | null {
  const value = request.nextUrl.searchParams.get(param);

  if (required && !value) {
    return null;
  }

  return value;
}

// ============================================================================
// EXAMPLE USAGE IN API ROUTES
// ============================================================================

/**
 * Example: Protected API route with role check
 *
 * ```typescript
 * import { requireAuth, successResponse, errorResponse } from '@/lib/api/auth-middleware';
 *
 * export async function GET(request: NextRequest) {
 *   // Require authentication and mentor role
 *   const authResult = await requireAuth(request, { requireRole: 'mentor' });
 *
 *   // Check if authentication failed
 *   if (authResult instanceof NextResponse) {
 *     return authResult;
 *   }
 *
 *   const { user } = authResult;
 *
 *   // Your API logic here
 *   const data = await fetchData(user.auth.id);
 *
 *   return successResponse(data);
 * }
 * ```
 */

/**
 * Example: Team-specific API route
 *
 * ```typescript
 * export async function GET(
 *   request: NextRequest,
 *   { params }: { params: { teamNumber: string } }
 * ) {
 *   const teamNumber = parseInt(params.teamNumber);
 *
 *   // Require authentication and team access
 *   const authResult = await requireAuth(request, { requireTeam: teamNumber });
 *
 *   if (authResult instanceof NextResponse) {
 *     return authResult;
 *   }
 *
 *   const { user } = authResult;
 *
 *   // Your API logic here
 *   const teamData = await fetchTeamData(teamNumber);
 *
 *   return successResponse(teamData);
 * }
 * ```
 */
