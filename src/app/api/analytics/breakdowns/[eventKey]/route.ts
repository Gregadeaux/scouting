/**
 * API Route: /api/analytics/breakdowns/[eventKey]
 *
 * Returns breakdown match details for teams at an event
 * A match is a breakdown if robot_disabled, robot_disconnected, or robot_tipped is true
 *
 * Related: SCOUT-88
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { successResponse, errorResponse } from '@/lib/api/response';

export interface BreakdownMatch {
  team_number: number;
  match_number: number;
  comp_level: string;
  match_key: string;
  breakdown_types: string[];
}

export interface TeamBreakdownData {
  team_number: number;
  total_breakdowns: number;
  breakdown_matches: BreakdownMatch[];
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventKey: string }> }
) {
  try {
    const { eventKey } = await params;

    if (!eventKey) {
      return errorResponse('Event key is required', 400);
    }

    const supabase = await createClient();

    // Query to get all breakdown matches for this event
    // Join match_scouting with match_schedule to get match numbers
    const { data: breakdownData, error } = await supabase
      .from('match_scouting')
      .select(`
        team_number,
        robot_disabled,
        robot_disconnected,
        robot_tipped,
        match_id,
        match_schedule!inner (
          match_number,
          comp_level,
          match_key,
          event_key
        )
      `)
      .eq('match_schedule.event_key', eventKey)
      .or('robot_disabled.eq.true,robot_disconnected.eq.true,robot_tipped.eq.true');

    if (error) {
      console.error('[Breakdowns API] Database error:', error);
      return errorResponse('Failed to fetch breakdown data', 500);
    }

    if (!breakdownData || breakdownData.length === 0) {
      return successResponse({ teams: [] });
    }

    // Group by team and collect breakdown matches
    const teamBreakdowns = new Map<number, TeamBreakdownData>();

    for (const row of breakdownData) {
      const teamNumber = row.team_number;
      const matchSchedule = Array.isArray(row.match_schedule)
        ? row.match_schedule[0]
        : row.match_schedule;

      if (!matchSchedule) continue;

      // Determine breakdown types for this match
      const breakdownTypes: string[] = [];
      if (row.robot_disabled) breakdownTypes.push('disabled');
      if (row.robot_disconnected) breakdownTypes.push('disconnected');
      if (row.robot_tipped) breakdownTypes.push('tipped');

      const breakdownMatch: BreakdownMatch = {
        team_number: teamNumber,
        match_number: matchSchedule.match_number,
        comp_level: matchSchedule.comp_level,
        match_key: matchSchedule.match_key,
        breakdown_types: breakdownTypes,
      };

      if (!teamBreakdowns.has(teamNumber)) {
        teamBreakdowns.set(teamNumber, {
          team_number: teamNumber,
          total_breakdowns: 0,
          breakdown_matches: [],
        });
      }

      const teamData = teamBreakdowns.get(teamNumber)!;
      teamData.total_breakdowns++;
      teamData.breakdown_matches.push(breakdownMatch);
    }

    // Convert to array and sort by total breakdowns descending
    const teams = Array.from(teamBreakdowns.values())
      .map(team => ({
        ...team,
        breakdown_matches: team.breakdown_matches.sort((a, b) =>
          a.match_number - b.match_number
        ),
      }))
      .sort((a, b) => b.total_breakdowns - a.total_breakdowns);

    return successResponse({ teams });

  } catch (error) {
    console.error('[Breakdowns API] Unexpected error:', error);
    return errorResponse('An unexpected error occurred', 500);
  }
}
