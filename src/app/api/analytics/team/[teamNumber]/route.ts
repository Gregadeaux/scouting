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
import {
  calculateAutoClimbPoints2026,
  calculateEndgameClimbPoints2026,
  getAverageRating2026,
  type AutoPerformance2026,
  type TeleopPerformance2026,
  type EndgamePerformance2026,
} from '@/types/season-2026';

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
      // Supabase may return a single object or an array depending on the join
      type MatchScheduleJoin = { match_number: number; event_key: string };
      const rawSchedule = match.match_schedule as MatchScheduleJoin | MatchScheduleJoin[] | null;
      const matchSchedule = Array.isArray(rawSchedule) ? rawSchedule[0] : rawSchedule;
      const matchNumber = matchSchedule?.match_number ?? 0;
      const matchEventKey = matchSchedule?.event_key ?? '';

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
        if (autoData) {
          autoScore = calculateAutoPoints2025(autoData as unknown as AutoPerformance2025);
        }
        if (teleopData) {
          teleopScore = calculateTeleopPoints2025(teleopData as unknown as TeleopPerformance2025);
        }
        if (endgameData) {
          endgameScore = calculateEndgamePoints2025(endgameData as unknown as EndgamePerformance2025);
        }
      } else if (schemaVersion === '2026.1' || eventYear === 2026) {
        if (autoData) {
          autoScore = calculateAutoClimbPoints2026(autoData as unknown as AutoPerformance2026);
        }
        if (endgameData) {
          endgameScore = calculateEndgameClimbPoints2026(endgameData as unknown as EndgamePerformance2026);
        }
      }

      // Build base response
      const matchResult: Record<string, unknown> = {
        matchNumber,
        eventKey: matchEventKey,
        year: eventYear,
        autoScore,
        teleopScore,
        endgameScore,
        totalScore: autoScore + teleopScore + endgameScore,
      };

      // Add 2026-specific fields
      if (schemaVersion === '2026.1' || eventYear === 2026) {
        const teleop2026 = teleopData as unknown as TeleopPerformance2026 | null;
        const endgame2026 = endgameData as unknown as EndgamePerformance2026 | null;
        const auto2026 = autoData as unknown as AutoPerformance2026 | null;
        matchResult.scoringRating = teleop2026?.scoring_rating;
        matchResult.feedingRating = teleop2026?.feeding_rating;
        matchResult.defenseRating = teleop2026?.defense_rating;
        matchResult.reliabilityRating = teleop2026?.reliability_rating;
        matchResult.avgRating = teleop2026 ? getAverageRating2026(teleop2026) : undefined;
        matchResult.autoClimbSuccess = auto2026?.auto_climb_success;
        matchResult.endgameClimbSuccess = endgame2026?.endgame_climb_success;
        matchResult.endgameClimbLevel = endgame2026?.endgame_climb_level;
        matchResult.wasDisabled = endgame2026?.was_disabled;
        matchResult.season = 2026;
      }

      return matchResult;
    }).sort((a, b) => (a.matchNumber as number) - (b.matchNumber as number));

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
