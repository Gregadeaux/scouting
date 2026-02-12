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
import { extractAllianceBreakdown, extractHubCounts } from '@/types/tba-score-breakdown-2026';

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

interface TeamGamePieceData2026 {
  teamNumber: number;
  matches: {
    matchNumber: number;
    autoCount: number;
    transitionCount: number;
    shift1Count: number;
    shift2Count: number;
    shift3Count: number;
    shift4Count: number;
    endgameCount: number;
    totalCount: number;
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

    // Detect season from eventKey prefix
    const eventYear = parseInt(eventKey.substring(0, 4), 10);

    if (eventYear >= 2026) {
      // 2026+ season: source data from TBA score_breakdown in match_schedule
      return await handle2026(supabase, eventKey);
    }

    // 2025 and earlier: source data from scouted match_scouting data
    return await handle2025(supabase, eventKey);
  } catch (error) {
    console.error('[API] Error fetching game piece analytics:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to fetch game piece analytics',
      500
    );
  }
}

/**
 * Handle 2025 Reefscape season — data from match_scouting.teleop_performance
 */
async function handle2025(supabase: Awaited<ReturnType<typeof createClient>>, eventKey: string) {
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
    return successResponse({ eventKey, season: 2025, teams: [] });
  }

  const teamDataMap = new Map<number, TeamGamePieceData>();

  for (const match of matches) {
    const teleopData = match.teleop_performance as unknown as TeleopPerformance2025 | null;
    const rawSchedule = match.match_schedule as
      | { match_number: number }
      | { match_number: number }[]
      | null;
    const matchNumber = (Array.isArray(rawSchedule) ? rawSchedule[0] : rawSchedule)?.match_number ?? 0;

    if (!teleopData) continue;

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
      teamDataMap.set(match.team_number, { teamNumber: match.team_number, matches: [] });
    }
    teamDataMap.get(match.team_number)!.matches.push(matchData);
  }

  const teams = Array.from(teamDataMap.values()).map((team) => ({
    ...team,
    matches: team.matches.sort((a, b) => a.matchNumber - b.matchNumber),
  }));

  return successResponse({ eventKey, season: 2025, teams });
}

/**
 * Handle 2026 season — data from match_schedule.score_breakdown (TBA hub counts)
 *
 * For each match, extract hubScore counts from the alliance's score_breakdown
 * and attribute them to each team on that alliance.
 */
async function handle2026(supabase: Awaited<ReturnType<typeof createClient>>, eventKey: string) {
  const { data: matches, error: matchError } = await supabase
    .from('match_schedule')
    .select('match_number, red_1, red_2, red_3, blue_1, blue_2, blue_3, score_breakdown')
    .eq('event_key', eventKey)
    .not('score_breakdown', 'is', null);

  if (matchError) {
    throw new Error(`Failed to fetch match schedule: ${matchError.message}`);
  }

  if (!matches || matches.length === 0) {
    return successResponse({ eventKey, season: 2026, teams: [] });
  }

  const teamDataMap = new Map<number, TeamGamePieceData2026>();

  for (const match of matches) {
    const scoreBreakdown = match.score_breakdown as Record<string, unknown> | null;
    if (!scoreBreakdown) continue;

    // Process each alliance
    for (const alliance of ['red', 'blue'] as const) {
      const breakdown = extractAllianceBreakdown(scoreBreakdown, alliance);
      if (!breakdown) continue;

      const hubCounts = extractHubCounts(breakdown);

      // Get teams for this alliance
      const teamKeys = alliance === 'red'
        ? [match.red_1, match.red_2, match.red_3]
        : [match.blue_1, match.blue_2, match.blue_3];

      for (const teamNum of teamKeys) {
        if (!teamNum) continue;

        if (!teamDataMap.has(teamNum)) {
          teamDataMap.set(teamNum, { teamNumber: teamNum, matches: [] });
        }

        teamDataMap.get(teamNum)!.matches.push({
          matchNumber: match.match_number,
          ...hubCounts,
        });
      }
    }
  }

  const teams = Array.from(teamDataMap.values()).map((team) => ({
    ...team,
    matches: team.matches.sort((a, b) => a.matchNumber - b.matchNumber),
  }));

  return successResponse({ eventKey, season: 2026, teams });
}
