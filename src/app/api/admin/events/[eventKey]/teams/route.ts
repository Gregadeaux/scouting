import { NextRequest, NextResponse } from 'next/server';
import { getTeamService } from '@/lib/services';
import { successResponse, errorResponse } from '@/lib/api/response';
import { requireAdmin } from '@/lib/api/auth-middleware';

/**
 * GET /api/admin/events/[eventKey]/teams
 * Get all teams attending an event with scouting statistics
 *
 * Returns team roster with:
 * - Team metadata (number, name, location)
 * - Number of matches at this event
 * - Number of matches scouted
 * - Scouting coverage percentage
 * - Team statistics for this event
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

    const teamService = getTeamService();
    const teams = await teamService.getTeamsByEvent(eventKey);

    // Sort teams by team number
    const sortedTeams = teams.sort((a, b) => a.team_number - b.team_number);

    return successResponse({
      event_key: eventKey,
      team_count: sortedTeams.length,
      teams: sortedTeams,
    });
  } catch (error: any) {
    console.error('[API] Get event teams error:', error);

    if (error.name === 'EntityNotFoundError') {
      return errorResponse('Event not found', 404);
    }

    return errorResponse('Failed to fetch teams', 500);
  }
}
