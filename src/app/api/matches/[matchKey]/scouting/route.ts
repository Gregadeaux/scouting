/**
 * API route for match-specific scouting data
 * Returns all scouting entries for a specific match, organized by team and alliance
 * GET /api/matches/[matchKey]/scouting
 *
 * SCOUT-55: For teams without scouting data in upcoming matches, returns event averages
 */

import { NextRequest, NextResponse } from 'next/server';
import { createScoutingDataRepository } from '@/lib/repositories/scouting-data.repository';
import { createServiceClient } from '@/lib/supabase/server';
import type { ScoutingEntryWithDetails, PreviewMetrics } from '@/types/admin';

/**
 * GET /api/matches/[matchKey]/scouting
 * Fetch all scouting entries for a specific match
 * Query params:
 *   - eventKey: (optional) Filter by event
 *   - teamNumber: (optional) Filter to specific team
 *   - alliance: (optional) Filter by 'red' or 'blue'
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ matchKey: string }> }
) {
  try {
    const { matchKey } = await params;
    const searchParams = request.nextUrl.searchParams;

    // Parse query parameters
    const eventKey = searchParams.get('eventKey') || undefined;
    const teamNumber = searchParams.get('teamNumber')
      ? parseInt(searchParams.get('teamNumber')!)
      : undefined;
    const alliance = searchParams.get('alliance') as 'red' | 'blue' | undefined;

    // Validate alliance parameter if provided
    if (alliance && alliance !== 'red' && alliance !== 'blue') {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid alliance parameter. Must be "red" or "blue"',
        },
        { status: 400 }
      );
    }

    // Fetch scouting data
    const repo = createScoutingDataRepository();
    const result = await repo.getScoutingByMatchWithDetails(matchKey, {
      eventKey,
      teamNumber,
      alliance,
    });

    // SCOUT-55: For teams without scouting data, fetch averages
    if (eventKey) {
      const supabase = createServiceClient();

      // Get match schedule to find all teams in the match
      const { data: matchSchedule } = await supabase
        .from('match_schedule')
        .select('red_1, red_2, red_3, blue_1, blue_2, blue_3')
        .eq('match_key', matchKey)
        .single();

      if (matchSchedule) {
        // Get all teams in the match
        const redTeams = [matchSchedule.red_1, matchSchedule.red_2, matchSchedule.red_3].filter(Boolean) as number[];
        const blueTeams = [matchSchedule.blue_1, matchSchedule.blue_2, matchSchedule.blue_3].filter(Boolean) as number[];

        // Check which teams already have scouting data
        const scoutedTeams = new Set<number>();
        [...result.data.red_alliance, ...result.data.blue_alliance].forEach(entry => {
          scoutedTeams.add(entry.team_number);
        });

        // Fetch averages only for teams that don't have scouting data
        for (const team of redTeams) {
          if (!scoutedTeams.has(team)) {
            const avg = await repo.getTeamEventAverages(team, eventKey);
            if (avg) {
              // Convert average data to ScoutingEntryWithDetails format
              const avgEntry: ScoutingEntryWithDetails = {
                id: `avg-${team}`,
                match_key: matchKey,
                team_number: team,
                team_name: avg.team_name,
                scout_name: 'Event Average',
                event_key: eventKey,
                auto_performance: { is_average: true, match_count: avg.match_count },
                teleop_performance: { is_average: true, match_count: avg.match_count },
                endgame_performance: { is_average: true, match_count: avg.match_count },
                created_at: new Date().toISOString(),
                preview_metrics: {
                  auto_points: avg.avg_auto_points,
                  teleop_points: avg.avg_teleop_points,
                  endgame_points: avg.avg_endgame_points,
                  total_points: avg.avg_total_points,
                } as PreviewMetrics,
                data_quality: 'complete',
              };
              result.data.red_alliance.push(avgEntry);
              if (!result.data.by_team[team]) {
                result.data.by_team[team] = [];
              }
              result.data.by_team[team].push(avgEntry);
            } else {
              // No average data available, create placeholder
              const placeholderEntry: ScoutingEntryWithDetails = {
                id: `no-data-${team}`,
                match_key: matchKey,
                team_number: team,
                scout_name: 'No Data',
                event_key: eventKey,
                auto_performance: { is_average: true, match_count: 0 },
                teleop_performance: { is_average: true, match_count: 0 },
                endgame_performance: { is_average: true, match_count: 0 },
                created_at: new Date().toISOString(),
                preview_metrics: {
                  auto_points: 0,
                  teleop_points: 0,
                  endgame_points: 0,
                  total_points: 0,
                } as PreviewMetrics,
                data_quality: 'issues',
              };
              result.data.red_alliance.push(placeholderEntry);
              if (!result.data.by_team[team]) {
                result.data.by_team[team] = [];
              }
              result.data.by_team[team].push(placeholderEntry);
            }
          }
        }

        for (const team of blueTeams) {
          if (!scoutedTeams.has(team)) {
            const avg = await repo.getTeamEventAverages(team, eventKey);
            if (avg) {
              // Convert average data to ScoutingEntryWithDetails format
              const avgEntry: ScoutingEntryWithDetails = {
                id: `avg-${team}`,
                match_key: matchKey,
                team_number: team,
                team_name: avg.team_name,
                scout_name: 'Event Average',
                event_key: eventKey,
                auto_performance: { is_average: true, match_count: avg.match_count },
                teleop_performance: { is_average: true, match_count: avg.match_count },
                endgame_performance: { is_average: true, match_count: avg.match_count },
                created_at: new Date().toISOString(),
                preview_metrics: {
                  auto_points: avg.avg_auto_points,
                  teleop_points: avg.avg_teleop_points,
                  endgame_points: avg.avg_endgame_points,
                  total_points: avg.avg_total_points,
                } as PreviewMetrics,
                data_quality: 'complete',
              };
              result.data.blue_alliance.push(avgEntry);
              if (!result.data.by_team[team]) {
                result.data.by_team[team] = [];
              }
              result.data.by_team[team].push(avgEntry);
            } else {
              // No average data available, create placeholder
              const placeholderEntry: ScoutingEntryWithDetails = {
                id: `no-data-${team}`,
                match_key: matchKey,
                team_number: team,
                scout_name: 'No Data',
                event_key: eventKey,
                auto_performance: { is_average: true, match_count: 0 },
                teleop_performance: { is_average: true, match_count: 0 },
                endgame_performance: { is_average: true, match_count: 0 },
                created_at: new Date().toISOString(),
                preview_metrics: {
                  auto_points: 0,
                  teleop_points: 0,
                  endgame_points: 0,
                  total_points: 0,
                } as PreviewMetrics,
                data_quality: 'issues',
              };
              result.data.blue_alliance.push(placeholderEntry);
              if (!result.data.by_team[team]) {
                result.data.by_team[team] = [];
              }
              result.data.by_team[team].push(placeholderEntry);
            }
          }
        }

        // Update metadata if we added averages
        const totalTeams = redTeams.length + blueTeams.length;
        const teamsWithData = new Set([
          ...result.data.red_alliance.map(e => e.team_number),
          ...result.data.blue_alliance.map(e => e.team_number),
        ]).size;

        result.metadata.total_entries = result.data.red_alliance.length + result.data.blue_alliance.length;
        result.metadata.teams_scouted = teamsWithData;
        result.metadata.coverage_percentage = (teamsWithData / totalTeams) * 100;
      }
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      metadata: result.metadata,
    });
  } catch (error) {
    console.error('Error fetching match scouting data:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch match scouting data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
