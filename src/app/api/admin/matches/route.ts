import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api/auth-middleware';
import { createMatchService } from '@/lib/services/match.service';
import { createMatchRepository } from '@/lib/repositories/match.repository';
import { createTeamRepository } from '@/lib/repositories/team.repository';
import { createScoutingDataRepository } from '@/lib/repositories/scouting-data.repository';
import { errorResponse } from '@/lib/api/response';
import type { MatchListOptions } from '@/types/admin';

// GET /api/admin/matches - List all matches with filters
export async function GET(request: NextRequest) {
  try {
    // Auth check
    const authResult = await requireAdmin(request);
    if (authResult instanceof NextResponse) {
      return authResult; // Return unauthorized response
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const options: MatchListOptions = {
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50,
      sortBy: searchParams.get('sortBy') || 'match_number',
      sortOrder: (searchParams.get('sortOrder') || 'asc') as 'asc' | 'desc',
      search: searchParams.get('search') || undefined,
      eventKey: searchParams.get('eventKey') || undefined,
      compLevel: searchParams.get('compLevel') || undefined,
      scoutingStatus: searchParams.get('scoutingStatus') || undefined,
      teamNumber: searchParams.get('teamNumber') ? parseInt(searchParams.get('teamNumber')!) : undefined,
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
    };

    // Initialize repositories and service
    const matchRepo = createMatchRepository();
    const teamRepo = createTeamRepository();
    const scoutingDataRepo = createScoutingDataRepository();
    const matchService = createMatchService(matchRepo, teamRepo, scoutingDataRepo);

    // Get matches with pagination and filters
    const result = await matchService.listMatches(options);

    return NextResponse.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error('[API] Error fetching matches:', error);
    return errorResponse('Failed to fetch matches', 500);
  }
}