import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api/auth-middleware';
import { createScouterValidationService } from '@/lib/services/scouter-validation.service';

/**
 * GET /api/admin/validation/leaderboard
 *
 * Fetches scouter ELO rankings for a season or event.
 *
 * Query Parameters:
 * - seasonYear: number (required) - Season to get rankings for
 * - eventKey?: string (optional) - Event-specific leaderboard
 *
 * Response:
 * {
 *   success: true;
 *   data: ScouterLeaderboard;
 * }
 */
export async function GET(request: NextRequest) {
  // Require admin authentication
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const searchParams = request.nextUrl.searchParams;

    // Validate seasonYear parameter
    const seasonYearParam = searchParams.get('seasonYear');
    if (!seasonYearParam) {
      return NextResponse.json(
        {
          success: false,
          error: 'seasonYear parameter is required'
        },
        { status: 400 }
      );
    }

    const seasonYear = parseInt(seasonYearParam, 10);
    if (isNaN(seasonYear) || seasonYear < 2000 || seasonYear > 2100) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid seasonYear. Must be a valid year between 2000 and 2100'
        },
        { status: 400 }
      );
    }

    const eventKey = searchParams.get('eventKey');

    // Create validation service
    const validationService = createScouterValidationService();

    // Fetch leaderboard
    let leaderboard;

    if (eventKey) {
      // Event-specific leaderboard
      leaderboard = await validationService.getEventLeaderboard(
        eventKey,
        seasonYear
      );
    } else {
      // Season-wide leaderboard
      leaderboard = await validationService.getSeasonLeaderboard(seasonYear);
    }

    return NextResponse.json({
      success: true,
      data: leaderboard,
    });

  } catch (error) {
    console.error('Error in GET /api/admin/validation/leaderboard:', error);

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json(
          {
            success: false,
            error: error.message
          },
          { status: 404 }
        );
      }

      // Generic error with message
      return NextResponse.json(
        {
          success: false,
          error: error.message
        },
        { status: 500 }
      );
    }

    // Fallback generic error
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error'
      },
      { status: 500 }
    );
  }
}
