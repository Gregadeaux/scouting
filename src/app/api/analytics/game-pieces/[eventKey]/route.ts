/**
 * Game Pieces Analytics API
 *
 * GET /api/analytics/game-pieces/[eventKey]
 *   - Returns match-by-match game piece scoring data for all teams at an event
 *   - Used for boxplot visualizations showing scoring distributions
 *   - Season-aware: parses JSONB data based on event year
 *
 * Related: SCOUT-7
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { successResponse, errorResponse } from '@/lib/api/response';
import type {
  TeleopPerformance2025,
} from '@/types/season-2025';

interface RouteParams {
  params: Promise<{
    eventKey: string;
  }>;
}

interface TeamGamePieceData {
  teamNumber: number;
  matches: {
    matchNumber: number;
    coralL1: number;
    coralL2: number;
    coralL3: number;
    coralL4: number;
    algaeProcessor: number;
    algaeBarge: number;
    allCoral: number;
    allAlgae: number;
  }[];
}

/**
 * GET /api/analytics/game-pieces/[eventKey]
 * Fetch game piece scoring data for all teams at an event
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

    const { eventKey } = await params;

    // Fetch all match scouting data for this event with match numbers
    const { data: matches, error: matchError } = await supabase
      .from('match_scouting')
      .select(`
        team_number,
        teleop_performance,
        match_schedule!match_scouting_match_id_fkey!inner (
          match_number,
          event_key
        )
      `)
      .eq('match_schedule.event_key', eventKey);

    if (matchError) {
      throw new Error(`Failed to fetch match data: ${matchError.message}`);
    }

    if (!matches || matches.length === 0) {
      return successResponse({
        eventKey,
        teams: [],
      });
    }

    // Group by team and extract game piece data
    const teamDataMap = new Map<number, TeamGamePieceData>();

    for (const match of matches) {
      const teleopData = match.teleop_performance as unknown as TeleopPerformance2025 | null;

      // Access match_number from the joined match_schedule table
      const matchSchedule = match.match_schedule as { match_number: number; event_key: string } | { match_number: number; event_key: string }[] | null;
      const matchNumber = Array.isArray(matchSchedule)
        ? matchSchedule[0]?.match_number ?? 0
        : matchSchedule?.match_number ?? 0;

      if (!teleopData) continue;

      // Extract game piece counts (only from teleop for consistency)
      const coralL1 = teleopData.coral_scored_L1 ?? 0;
      const coralL2 = teleopData.coral_scored_L2 ?? 0;
      const coralL3 = teleopData.coral_scored_L3 ?? 0;
      const coralL4 = teleopData.coral_scored_L4 ?? 0;
      const algaeProcessor = teleopData.algae_scored_processor ?? 0;
      const algaeBarge = teleopData.algae_scored_barge ?? 0;

      const matchData = {
        matchNumber,
        coralL1,
        coralL2,
        coralL3,
        coralL4,
        algaeProcessor,
        algaeBarge,
        allCoral: coralL1 + coralL2 + coralL3 + coralL4,
        allAlgae: algaeProcessor + algaeBarge,
      };

      if (!teamDataMap.has(match.team_number)) {
        teamDataMap.set(match.team_number, {
          teamNumber: match.team_number,
          matches: [],
        });
      }

      teamDataMap.get(match.team_number)!.matches.push(matchData);
    }

    // Convert map to array and sort matches
    const teams = Array.from(teamDataMap.values()).map(team => ({
      ...team,
      matches: team.matches.sort((a, b) => a.matchNumber - b.matchNumber),
    }));

    return successResponse({
      eventKey,
      teams,
    });
  } catch (error) {
    console.error('[API] Error fetching game piece analytics:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to fetch game piece analytics',
      500
    );
  }
}
