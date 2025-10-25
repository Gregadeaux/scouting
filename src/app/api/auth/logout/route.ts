/**
 * Auth API: Logout
 * POST /api/auth/logout - Sign out current user
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { signOut } from '@/lib/supabase/auth';
import { successResponse, errorResponse } from '@/lib/api/auth-middleware';

/**
 * POST /api/auth/logout
 * Signs out the current user
 * Returns: { success: true, data: { success: true } }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Sign out user
    const { error: signOutError } = await signOut(supabase);

    if (signOutError) {
      return errorResponse(
        signOutError.message || 'Failed to sign out',
        500
      );
    }

    return successResponse({ success: true }, 200);
  } catch (error) {
    console.error('Error in POST /api/auth/logout:', error);
    return errorResponse('Failed to sign out', 500);
  }
}
