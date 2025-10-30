import { NextRequest, NextResponse } from 'next/server';
import { getMatchService } from '@/lib/services';
import { successResponse, errorResponse } from '@/lib/api/response';
import { getErrorMessage } from '@/lib/utils/error';

/**
 * Match Detail API Route
 *
 * NOTE: For rendering match detail pages, use Server Components that call
 * services directly (see /app/admin/matches/[matchKey]/page.tsx).
 * This API route is kept for:
 * - Manual score updates (PUT endpoint)
 * - External integrations or webhooks
 * - Future client-side refetching if needed
 */

/**
 * PUT /api/admin/matches/[matchKey]
 * Update match scores manually
 *
 * Body:
 * {
 *   red_score: number;
 *   blue_score: number;
 * }
 *
 * Requires admin role
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ matchKey: string }> }
) {
  // Require admin authentication (mentors can view but not edit scores)
  const { requireAdmin } = await import('@/lib/api/auth-middleware');
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { matchKey } = await params;
    const body = await request.json();

    // Validate request body
    if (typeof body.red_score !== 'number' || typeof body.blue_score !== 'number') {
      return errorResponse('red_score and blue_score must be numbers', 400);
    }

    if (body.red_score < 0 || body.blue_score < 0) {
      return errorResponse('Scores must be non-negative', 400);
    }

    const matchService = getMatchService();
    const updatedMatch = await matchService.updateMatchScores(
      matchKey,
      body.red_score,
      body.blue_score
    );

    return successResponse(updatedMatch);
  } catch (error: unknown) {
    console.error('[API] Update match scores error:', error);

    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return errorResponse('Match not found', 404);
      }
    }

    return errorResponse(getErrorMessage(error), 500);
  }
}
