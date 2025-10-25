import { NextRequest, NextResponse } from 'next/server';
import { getEventService } from '@/lib/services';
import { successResponse, errorResponse } from '@/lib/api/response';
import { requireAdmin } from '@/lib/api/auth-middleware';

/**
 * GET /api/admin/events/[eventKey]/coverage
 * Get match scouting coverage statistics for an event
 *
 * Returns:
 * - Total matches scheduled
 * - Matches with at least one scout
 * - Matches with full coverage (all teams scouted)
 * - Coverage percentage
 * - Breakdown by competition level (qual, playoff)
 * - List of unscouted matches
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventKey: string }> }
) {
  // Require admin authentication
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { eventKey } = await params;
    const eventService = getEventService();
    const coverage = await eventService.getEventCoverageStats(eventKey);

    return successResponse(coverage);
  } catch (error: any) {
    console.error('[API] Get coverage stats error:', error);

    if (error.name === 'EntityNotFoundError') {
      return errorResponse('Event not found', 404);
    }

    return errorResponse('Failed to fetch coverage statistics', 500);
  }
}
