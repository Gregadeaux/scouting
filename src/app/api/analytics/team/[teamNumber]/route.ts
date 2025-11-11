/**
 * Team Analytics API
 *
 * GET /api/analytics/team/[teamNumber]?eventKey=...
 *   - Returns match-by-match performance data for a team
 *   - Season-aware: parses JSONB data based on event year
 *
 * Related: SCOUT-7
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { successResponse, errorResponse } from '@/lib/api/response';
import {
  calculateAutoPoints as calculateAutoPoints2025,
  calculateTeleopPoints as calculateTeleopPoints2025,
  calculateEndgamePoints as calculateEndgamePoints2025,
  type AutoPerformance2025,
  type TeleopPerformance2025,
  type EndgamePerformance2025,
} from '@/types/season-2025';

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

    // Build query - join with match_schedule to get match_number and event_key
    // Specify foreign key constraint to disambiguate (two FK relationships exist)
    let query = supabase
      .from('match_scouting')
      .select(`
        auto_performance,
        teleop_performance,
        endgame_performance,
        match_schedule!match_scouting_match_id_fkey!inner (
          match_number,
          event_key
        )
      `)
      .eq('team_number', teamNum);

    if (eventKey) {
      query = query.eq('match_schedule.event_key', eventKey);
    }

    const { data: matches, error: matchError } = await query;

    if (matchError) {
      throw new Error(`Failed to fetch match data: ${matchError.message}`);
    }

    // Extract scores from JSONB data using season-specific calculation functions
    const matchData = (matches || []).map((match) => {
      const autoData = match.auto_performance as Record<string, unknown> | null;
      const teleopData = match.teleop_performance as Record<string, unknown> | null;
      const endgameData = match.endgame_performance as Record<string, unknown> | null;

      // Access match_number and event_key from the joined match_schedule table
      const matchSchedule = match.match_schedule as { match_number: number; event_key: string } | { match_number: number; event_key: string }[] | null;
      const matchNumber = Array.isArray(matchSchedule) ? matchSchedule[0]?.match_number ?? 0 : matchSchedule?.match_number ?? 0;
      const matchEventKey = Array.isArray(matchSchedule) ? matchSchedule[0]?.event_key ?? '' : matchSchedule?.event_key ?? '';

      // Extract year from event_key (format: "2025wimu" -> 2025)
      const eventYear = matchEventKey ? parseInt(matchEventKey.substring(0, 4), 10) : 0;

      // Determine schema version from JSONB data
      const schemaVersion = (autoData?.schema_version as string) ||
                           (teleopData?.schema_version as string) ||
                           (endgameData?.schema_version as string);

      let autoScore = 0;
      let teleopScore = 0;
      let endgameScore = 0;

      // Use season-specific calculation functions based on schema version or year
      if (schemaVersion === '2025.1' || eventYear === 2025) {
        // 2025 Reefscape season
        if (autoData) {
          autoScore = calculateAutoPoints2025(autoData as AutoPerformance2025);
        }
        if (teleopData) {
          teleopScore = calculateTeleopPoints2025(teleopData as TeleopPerformance2025);
        }
        if (endgameData) {
          endgameScore = calculateEndgamePoints2025(endgameData as EndgamePerformance2025);
        }
      }
      // Add more seasons here as needed:
      // else if (schemaVersion === '2026.1' || eventYear === 2026) {
      //   autoScore = calculateAutoPoints2026(autoData as AutoPerformance2026);
      //   teleopScore = calculateTeleopPoints2026(teleopData as TeleopPerformance2026);
      //   endgameScore = calculateEndgamePoints2026(endgameData as EndgamePerformance2026);
      // }

      return {
        matchNumber,
        eventKey: matchEventKey,
        year: eventYear,
        autoScore,
        teleopScore,
        endgameScore,
        totalScore: autoScore + teleopScore + endgameScore,
      };
    }).sort((a, b) => a.matchNumber - b.matchNumber);

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
