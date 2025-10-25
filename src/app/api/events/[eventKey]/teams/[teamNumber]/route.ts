import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { TeamService } from '@/lib/services/team.service';
import { canViewTeamDetails } from '@/lib/services/auth.service';
import { successResponse, errorResponse, notFoundError } from '@/lib/api/response';
import { getTBAApiService } from '@/lib/services/tba-api.service';
import { TeamRepository } from '@/lib/repositories/team.repository';
import { EventRepository } from '@/lib/repositories/event.repository';
import { MatchRepository } from '@/lib/repositories/match.repository';
import { ScoutingDataRepository } from '@/lib/repositories/scouting-data.repository';
import { createTeamMergeStrategy } from '@/lib/strategies/merge-strategies';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventKey: string; teamNumber: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return errorResponse('Unauthorized', 401);
    }

    // Get user profile for role check
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role, is_active')
      .eq('id', user.id)
      .single();

    if (!canViewTeamDetails(profile)) {
      return errorResponse('Forbidden - insufficient permissions', 403);
    }

    const { eventKey, teamNumber: teamNumberStr } = await params;
    const teamNumber = parseInt(teamNumberStr, 10);

    if (isNaN(teamNumber)) {
      return errorResponse('Invalid team number', 400);
    }

    // Initialize service dependencies
    const tbaApi = getTBAApiService();
    const teamRepo = new TeamRepository(supabase);
    const eventRepo = new EventRepository(supabase);
    const matchRepo = new MatchRepository(supabase);
    const scoutingDataRepo = new ScoutingDataRepository(supabase);
    const teamMergeStrategy = createTeamMergeStrategy();

    const teamService = new TeamService(
      tbaApi,
      teamRepo,
      eventRepo,
      matchRepo,
      scoutingDataRepo,
      teamMergeStrategy
    );

    const teamDetail = await teamService.getTeamDetailForMentor(teamNumber, eventKey);

    if (!teamDetail) {
      return notFoundError('Team');
    }

    return successResponse(teamDetail);
  } catch (error: any) {
    console.error('Error fetching team details:', error);
    return errorResponse(error.message || 'Failed to fetch team details', 500);
  }
}
