/**
 * Auth API: Refresh
 * POST /api/auth/refresh - Refresh authentication session
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/supabase/auth';
import { successResponse, errorResponse } from '@/lib/api/auth-middleware';

/**
 * POST /api/auth/refresh
 * Refreshes the user's authentication session
 * Returns: { success: true, data: { user: AuthenticatedUser, session: Session } }
 */
export async function POST(_request: NextRequest) {
  try {
    const supabase = await createClient();

    // Refresh the session
    const { data, error: refreshError } = await supabase.auth.refreshSession();

    if (refreshError || !data.session) {
      return errorResponse(
        refreshError?.message || 'Failed to refresh session',
        401
      );
    }

    // Get updated user with profile and permissions
    const currentUser = await getCurrentUser(supabase);

    if (!currentUser) {
      return errorResponse('Failed to fetch user profile', 500);
    }

    return successResponse(
      {
        user: currentUser,
        session: data.session,
      },
      200
    );
  } catch (error) {
    console.error('Error in POST /api/auth/refresh:', error);
    return errorResponse('Failed to refresh session', 500);
  }
}
