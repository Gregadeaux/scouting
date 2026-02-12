/**
 * Event Analytics API
 *
 * GET /api/analytics/event/[eventKey]
 *   - Returns aggregated statistics for all teams at an event
 *   - Auto-calculates statistics if missing or stale
 *
 * Related: SCOUT-7
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { successResponse, errorResponse } from '@/lib/api/response';
import { StatisticsService } from '@/lib/services/statistics.service';
import { StatisticsRepository } from '@/lib/repositories/statistics.repository';
import { ScoutingDataRepository } from '@/lib/repositories/scouting-data.repository';
import { MatchRepository } from '@/lib/repositories/match.repository';
import { OPRService } from '@/lib/services/opr.service';

interface RouteParams {
  params: Promise<{
    eventKey: string;
  }>;
}

/**
 * GET /api/analytics/event/[eventKey]
 * Fetch event-level team statistics, calculating if needed
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

    // Check if we should force recalculate (from query param)
    const searchParams = request.nextUrl.searchParams;
    const forceRecalculate = searchParams.get('recalculate') === 'true';

    // Fetch existing team statistics for the event
    const { data: existingStats, error: statsError } = await supabase
      .from('team_statistics')
      .select('*')
      .eq('event_key', eventKey)
      .order('opr', { ascending: false, nullsFirst: false });

    if (statsError) {
      throw new Error(`Failed to fetch team statistics: ${statsError.message}`);
    }

    // If no stats exist or force recalculate, calculate them now
    if (!existingStats || existingStats.length === 0 || forceRecalculate) {
      console.log(`[Analytics API] Calculating statistics for event ${eventKey}...`);

      // Initialize services
      const statsRepo = new StatisticsRepository();
      const scoutingRepo = new ScoutingDataRepository();
      const matchRepo = new MatchRepository();
      const statsService = new StatisticsService(statsRepo, scoutingRepo, matchRepo);
      const oprService = new OPRService();

      // Calculate statistics for all teams at this event (from scouting data)
      const teamStatsMap = await statsService.calculateAllTeamStatistics(eventKey);
      console.log(`[Analytics API] Calculated scouting statistics for ${teamStatsMap.size} teams`);

      // Calculate OPR/DPR/CCWM for all teams (from official match results)
      try {
        await oprService.calculateOPRMetrics(eventKey);
        console.log(`[Analytics API] Calculated OPR/DPR/CCWM for event ${eventKey}`);
      } catch (oprError) {
        console.error(`[Analytics API] Failed to calculate OPR:`, oprError);
        // Continue anyway - OPR is supplementary data
      }

      // Calculate component OPR (auto, teleop hub, endgame) from TBA score_breakdown
      try {
        await oprService.calculateComponentOPRMetrics(eventKey);
        console.log(`[Analytics API] Calculated component OPR for event ${eventKey}`);
      } catch (componentOprError) {
        console.error(`[Analytics API] Failed to calculate component OPR:`, componentOprError);
        // Continue anyway - component OPR is supplementary
      }

      // Fetch the newly calculated stats from database
      const { data: newStats, error: newStatsError } = await supabase
        .from('team_statistics')
        .select('*')
        .eq('event_key', eventKey)
        .order('opr', { ascending: false, nullsFirst: false });

      if (newStatsError) {
        throw new Error(`Failed to fetch calculated statistics: ${newStatsError.message}`);
      }

      console.log(`[Analytics API] Completed all calculations for ${teamStatsMap.size} teams`);
      return successResponse(newStats || []);
    }

    // Return existing stats
    return successResponse(existingStats);
  } catch (error) {
    console.error('[API] Error fetching event analytics:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to fetch event analytics',
      500
    );
  }
}
