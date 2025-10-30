/**
 * API endpoints for OPR/DPR/CCWM calculations
 *
 * POST /api/admin/statistics/opr - Calculate OPR metrics for an event
 * GET /api/admin/statistics/opr - Retrieve cached OPR metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api/auth-middleware';
import { createOPRService } from '@/lib/services/opr.service';
import { createMatchRepository } from '@/lib/repositories';
import { createServiceClient } from '@/lib/supabase/server';

/**
 * POST /api/admin/statistics/opr
 * Calculate OPR/DPR/CCWM for all teams at an event
 *
 * Body: { eventKey: string, forceRecalculate?: boolean }
 */
export async function POST(request: NextRequest) {
  // Require admin authentication
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const body = await request.json();
    const { eventKey, forceRecalculate = false } = body;

    if (!eventKey) {
      return NextResponse.json(
        { error: 'eventKey is required' },
        { status: 400 }
      );
    }

    // Create service with dependencies
    const supabase = createServiceClient();
    const matchRepo = createMatchRepository(supabase);
    const service = createOPRService(matchRepo, supabase);

    // Calculate or recalculate OPR metrics
    const results = forceRecalculate
      ? await service.recalculateOPRMetrics(eventKey)
      : await service.calculateOPRMetrics(eventKey);

    return NextResponse.json({
      success: true,
      data: results,
      message: `Calculated OPR for ${results.opr.length} teams at ${eventKey}`,
    });
  } catch (error: unknown) {
    console.error('[OPR API] Error calculating OPR:', error);

    // Return appropriate error response
    const errorMessage = error instanceof Error ? error.message : '';
    if (errorMessage.includes('No completed matches')) {
      return NextResponse.json(
        { error: 'No completed matches found for this event' },
        { status: 404 }
      );
    }

    if (errorMessage.includes('Insufficient')) {
      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: errorMessage || 'Failed to calculate OPR' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/statistics/opr
 * Retrieve cached OPR/DPR/CCWM metrics for an event
 *
 * Query params: eventKey (required), teamNumber (optional)
 */
export async function GET(request: NextRequest) {
  // Require admin authentication
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const eventKey = searchParams.get('eventKey');
    const teamNumber = searchParams.get('teamNumber');

    // Create service with dependencies
    const supabase = createServiceClient();
    const matchRepo = createMatchRepository(supabase);
    const service = createOPRService(matchRepo, supabase);

    // If teamNumber is provided, get team history across all events
    if (teamNumber) {
      const teamNum = parseInt(teamNumber, 10);
      if (isNaN(teamNum)) {
        return NextResponse.json(
          { error: 'Invalid team number' },
          { status: 400 }
        );
      }

      const history = await service.getTeamOPRHistory(teamNum);

      return NextResponse.json({
        success: true,
        data: {
          teamNumber: teamNum,
          history,
        },
      });
    }

    // Otherwise, get metrics for the event
    if (!eventKey) {
      return NextResponse.json(
        { error: 'eventKey or teamNumber is required' },
        { status: 400 }
      );
    }

    const cached = await service.getOPRMetrics(eventKey);

    if (!cached) {
      return NextResponse.json(
        {
          error: 'OPR not calculated for this event yet',
          hint: 'Use POST to calculate OPR metrics',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: cached,
    });
  } catch (error: unknown) {
    console.error('[OPR API] Error fetching OPR:', error);
    return NextResponse.json(
      { error: 'Failed to fetch OPR metrics' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/statistics/opr
 * Clear cached OPR metrics for an event (forces recalculation on next request)
 *
 * Query params: eventKey (required)
 */
export async function DELETE(request: NextRequest) {
  // Require admin authentication
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const eventKey = searchParams.get('eventKey');

    if (!eventKey) {
      return NextResponse.json(
        { error: 'eventKey is required' },
        { status: 400 }
      );
    }

    // For now, we'll use recalculate which clears the cache
    const supabase = createServiceClient();
    const matchRepo = createMatchRepository(supabase);
    const service = createOPRService(matchRepo, supabase);

    // Clear by requesting recalculation (which clears cache first)
    // We'll catch the error if there are no matches yet
    try {
      await service.recalculateOPRMetrics(eventKey);
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : '';
      if (!errMsg.includes('No completed matches')) {
        throw error;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Cleared OPR cache for event ${eventKey}`,
    });
  } catch (error: unknown) {
    console.error('[OPR API] Error clearing cache:', error);
    return NextResponse.json(
      { error: 'Failed to clear OPR cache' },
      { status: 500 }
    );
  }
}