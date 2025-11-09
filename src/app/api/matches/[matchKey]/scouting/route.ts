/**
 * API route for match-specific scouting data
 * Returns all scouting entries for a specific match, organized by team and alliance
 * GET /api/matches/[matchKey]/scouting
 */

import { NextRequest, NextResponse } from 'next/server';
import { createScoutingDataRepository } from '@/lib/repositories/scouting-data.repository';

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
