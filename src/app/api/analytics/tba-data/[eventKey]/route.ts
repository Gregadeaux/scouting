/**
 * TBA Data Attribution API
 *
 * GET /api/analytics/tba-data/[eventKey]
 *   - Returns per-team TBA-attributed data for the event
 *   - Includes per-match tower levels (direct from score_breakdown)
 *   - Includes component OPR estimates (auto, teleop hub, endgame)
 *   - Includes aggregated stats (avg tower points, climb rates)
 *
 * This API complements the game-pieces API (scouted data) with TBA data.
 */

import { NextRequest } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { successResponse, errorResponse } from '@/lib/api/response';
import {
  attributePerRobotData,
  calculateAllComponentOPRs,
  aggregateTeamTBAStats,
} from '@/lib/services/tba-attribution.service';
import type { MatchSchedule } from '@/types';

interface RouteParams {
  params: Promise<{
    eventKey: string;
  }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return errorResponse('Unauthorized', 401);
    }

    const { eventKey } = await params;
    const searchParams = request.nextUrl.searchParams;
    const includeOPR = searchParams.get('opr') !== 'false';

    // Use service client for data access
    const serviceClient = createServiceClient();

    // Fetch matches with score_breakdown
    const { data: matches, error: matchError } = await serviceClient
      .from('match_schedule')
      .select('*')
      .eq('event_key', eventKey)
      .not('score_breakdown', 'is', null)
      .order('match_number', { ascending: true });

    if (matchError) {
      throw new Error(`Failed to fetch matches: ${matchError.message}`);
    }

    if (!matches || matches.length === 0) {
      return successResponse({
        eventKey,
        matchesWithData: 0,
        teams: [],
        perMatchData: [],
      });
    }

    const typedMatches = matches as unknown as MatchSchedule[];

    // Direct attribution: per-robot tower data
    const perMatchData = attributePerRobotData(typedMatches);

    // Component OPR (optional, can be slow for large events)
    let componentOPRs: Awaited<ReturnType<typeof calculateAllComponentOPRs>> | undefined;
    if (includeOPR) {
      try {
        componentOPRs = await calculateAllComponentOPRs(eventKey, typedMatches);
      } catch (err) {
        console.error('[TBA Data API] Component OPR failed:', err);
      }
    }

    // Aggregate per-team stats
    const teamStats = aggregateTeamTBAStats(perMatchData, componentOPRs);

    return successResponse({
      eventKey,
      matchesWithData: matches.length,
      teams: teamStats,
      perMatchData,
    });
  } catch (error) {
    console.error('[API] Error fetching TBA data:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to fetch TBA data',
      500
    );
  }
}
