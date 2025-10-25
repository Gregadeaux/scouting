import { NextRequest, NextResponse } from 'next/server';
import { getMatchService } from '@/lib/services';
import { successResponse, errorResponse } from '@/lib/api/response';
import { requireAdmin } from '@/lib/api/auth-middleware';
import { getErrorMessage } from '@/lib/utils/error';

/**
 * GET /api/admin/events/[eventKey]/matches
 * Get match schedule for an event with scouting status
 *
 * Query parameters:
 * - compLevel: Filter by competition level (qm, qf, sf, f)
 * - showScoutedOnly: Only return matches with scouting data
 * - showUnscoutedOnly: Only return matches without scouting data
 * - includeTeams: Include team details (default: true)
 * - includeScoutingData: Include scouting data summaries (default: false)
 *
 * Returns:
 * - Match metadata (key, number, time)
 * - Alliance assignments (red/blue teams)
 * - Match results (if played)
 * - Scouting status (teams scouted, coverage %)
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
    const { searchParams } = new URL(request.url);

    // Parse filters from query parameters
    const compLevel = searchParams.get('compLevel') || undefined;
    const showScoutedOnly = searchParams.get('showScoutedOnly') === 'true';
    const showUnscoutedOnly = searchParams.get('showUnscoutedOnly') === 'true';

    // Validate compLevel if provided
    const validCompLevels = ['qm', 'qf', 'sf', 'f'];
    if (compLevel && !validCompLevels.includes(compLevel)) {
      return errorResponse(
        `Invalid compLevel. Must be one of: ${validCompLevels.join(', ')}`,
        400
      );
    }

    // Get matches from service
    const matchService = getMatchService();
    const matches = await matchService.getMatchesForEvent(eventKey, {
      compLevel,
      showScoutedOnly,
      showUnscoutedOnly,
    });

    return successResponse({
      event_key: eventKey,
      match_count: matches.length,
      filters: {
        compLevel: compLevel || 'all',
        showScoutedOnly,
        showUnscoutedOnly,
      },
      matches,
    });
  } catch (error: unknown) {
    console.error('[API] Get event matches error:', error);

    if (error instanceof Error && error.name === 'EntityNotFoundError') {
      return errorResponse('Event not found', 404);
    }

    return errorResponse(getErrorMessage(error), 500);
  }
}
