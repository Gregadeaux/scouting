/**
 * API route for team-specific scouting data
 * Returns all scouting entries for a specific team across all their matches at an event
 * GET /api/teams/[teamNumber]/scouting
 */

import { NextRequest, NextResponse } from 'next/server';
import { createScoutingDataRepository } from '@/lib/repositories/scouting-data.repository';

/**
 * GET /api/teams/[teamNumber]/scouting
 * Fetch all scouting entries for a specific team at an event
 * Query params:
 *   - eventKey: (required) Filter by event
 *   - sortBy: (optional) Sort by match_number, created_at, total_points (default: match_number)
 *   - sortOrder: (optional) 'asc' or 'desc' (default: asc)
 *   - limit: (optional) Pagination limit (default: 50)
 *   - page: (optional) Pagination page (default: 1)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ teamNumber: string }> }
) {
  try {
    const { teamNumber } = await params;
    const searchParams = request.nextUrl.searchParams;

    // Parse team number
    const teamNum = parseInt(teamNumber);
    if (isNaN(teamNum)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid team number',
        },
        { status: 400 }
      );
    }

    // Parse and validate query parameters
    const eventKey = searchParams.get('eventKey');
    if (!eventKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'eventKey parameter is required',
        },
        { status: 400 }
      );
    }

    const sortBy = (searchParams.get('sortBy') || 'match_number') as
      | 'match_number'
      | 'created_at'
      | 'total_points';
    const sortOrder = (searchParams.get('sortOrder') || 'asc') as 'asc' | 'desc';
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');

    // Validate sortBy parameter
    if (!['match_number', 'created_at', 'total_points'].includes(sortBy)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid sortBy parameter. Must be match_number, created_at, or total_points',
        },
        { status: 400 }
      );
    }

    // Validate sortOrder parameter
    if (sortOrder !== 'asc' && sortOrder !== 'desc') {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid sortOrder parameter. Must be asc or desc',
        },
        { status: 400 }
      );
    }

    // Validate pagination parameters
    if (limit < 1 || limit > 250) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid limit parameter. Must be between 1 and 250',
        },
        { status: 400 }
      );
    }

    if (page < 1) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid page parameter. Must be >= 1',
        },
        { status: 400 }
      );
    }

    // Fetch scouting data
    const repo = createScoutingDataRepository();
    const result = await repo.getScoutingByTeamWithDetails(teamNum, eventKey, {
      sortBy,
      sortOrder,
      limit,
      page,
    });

    return NextResponse.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
      aggregates: result.aggregates,
    });
  } catch (error) {
    console.error('Error fetching team scouting data:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch team scouting data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
