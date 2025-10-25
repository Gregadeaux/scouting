/**
 * Auth API: Session
 * GET /api/auth/session - Get current user session
 */

import { NextRequest } from 'next/server';
import { getAuthenticatedUser, successResponse, errorResponse } from '@/lib/api/auth-middleware';

/**
 * GET /api/auth/session
 * Returns the current authenticated user or null if not logged in
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);

    return successResponse({ user });
  } catch (error) {
    console.error('Error in GET /api/auth/session:', error);
    return errorResponse('Failed to get session', 500);
  }
}
