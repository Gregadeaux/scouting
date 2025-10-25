/**
 * Auth API: Permissions
 * POST /api/auth/permissions - Check team access permissions
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { canAccessTeam } from '@/lib/supabase/auth';
import { requireAuth, successResponse, errorResponse } from '@/lib/api/auth-middleware';

/**
 * POST /api/auth/permissions
 * Body: { teamNumber: number }
 * Returns: { success: true, data: { canAccess: boolean } }
 */
export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const authResult = await requireAuth(request);

    // Check if authentication failed
    if (authResult instanceof Response) {
      return authResult;
    }

    const { user } = authResult;

    const body = await request.json();

    // Validate team number
    if (!body.teamNumber || typeof body.teamNumber !== 'number') {
      return errorResponse('Valid team number is required', 400);
    }

    const teamNumber = body.teamNumber;
    const supabase = await createClient();

    // Check if user can access this team
    const hasAccess = await canAccessTeam(supabase, user.auth.id, teamNumber);

    return successResponse({ canAccess: hasAccess }, 200);
  } catch (error) {
    console.error('Error in POST /api/auth/permissions:', error);
    return errorResponse('Failed to check permissions', 500);
  }
}
