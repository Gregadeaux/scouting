/**
 * Team Analytics API
 *
 * GET /api/analytics/team/[teamNumber]?eventKey=...
 *   - Returns match-by-match performance data for a team
 *
 * Related: SCOUT-7
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { successResponse, errorResponse } from '@/lib/api/response';

interface RouteParams {
  params: Promise<{
    teamNumber: string;
  }>;
}

/**
 * GET /api/analytics/team/[teamNumber]
 * Fetch team match performance data
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return errorResponse('Unauthorized', 401);
    }

    const { teamNumber } = await params;
    const searchParams = request.nextUrl.searchParams;
    const eventKey = searchParams.get('eventKey');

    const teamNum = parseInt(teamNumber, 10);
    if (isNaN(teamNum)) {
      return errorResponse('Invalid team number', 400);
    }

    // Build query
    let query = supabase
      .from('match_scouting')
      .select(`
        match_number,
        auto_performance,
        teleop_performance,
        endgame_performance
      `)
      .eq('team_number', teamNum)
      .order('match_number', { ascending: true });

    if (eventKey) {
      query = query.eq('event_key', eventKey);
    }

    const { data: matches, error: matchError } = await query;

    if (matchError) {
      throw new Error(`Failed to fetch match data: ${matchError.message}`);
    }

    // Extract scores from JSONB data
    const matchData = (matches || []).map((match) => {
      const autoData = match.auto_performance as Record<string, unknown> | null;
      const teleopData = match.teleop_performance as Record<string, unknown> | null;
      const endgameData = match.endgame_performance as Record<string, unknown> | null;

      // Extract points (these would come from season-specific calculation functions)
      const autoScore = typeof autoData?.points === 'number' ? autoData.points : 0;
      const teleopScore = typeof teleopData?.points === 'number' ? teleopData.points : 0;
      const endgameScore = typeof endgameData?.points === 'number' ? endgameData.points : 0;

      return {
        matchNumber: match.match_number,
        autoScore,
        teleopScore,
        endgameScore,
        totalScore: autoScore + teleopScore + endgameScore,
      };
    });

    return successResponse({
      teamNumber: teamNum,
      eventKey,
      matches: matchData,
    });
  } catch (error) {
    console.error('[API] Error fetching team analytics:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to fetch team analytics',
      500
    );
  }
}
