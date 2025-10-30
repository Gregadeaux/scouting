/**
 * API Route: Calculate Team Statistics
 * POST /api/admin/statistics/calculate
 *
 * Triggers calculation of aggregate team statistics from scouting data.
 * Admin-only endpoint.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api/auth-middleware';
import { errorResponse, successResponse } from '@/lib/api/response';
import { createStatisticsService } from '@/lib/services/statistics.service';
import { statisticsRepository } from '@/lib/repositories/statistics.repository';
import { createScoutingDataRepository } from '@/lib/repositories/scouting-data.repository';
import { createMatchRepository } from '@/lib/repositories/match.repository';
import { createServiceClient } from '@/lib/supabase/server';

/**
 * Calculate team statistics
 *
 * Request body:
 * - teamNumber?: number - Calculate for specific team
 * - eventKey?: string - Filter by event
 * - recalculateAll?: boolean - Recalculate all teams
 */
export async function POST(request: NextRequest) {
  // Check admin authorization
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const body = await request.json();
    const { teamNumber, eventKey, recalculateAll } = body;

    // Create service with dependencies
    const supabase = createServiceClient();
    const scoutingRepo = createScoutingDataRepository(supabase);
    const matchRepo = createMatchRepository(supabase);
    const service = createStatisticsService(
      statisticsRepository,
      scoutingRepo,
      matchRepo
    );

    if (recalculateAll) {
      // Batch calculation for all teams
      const results = await service.calculateAllTeamStatistics(eventKey);

      return successResponse({
        teamsProcessed: results.size,
        eventKey: eventKey || 'all',
        message: `Successfully calculated statistics for ${results.size} teams`,
      });
    } else if (teamNumber) {
      // Single team calculation
      const stats = await service.calculateTeamStatistics(teamNumber, eventKey);

      return successResponse({
        statistics: stats,
        message: `Successfully calculated statistics for team ${teamNumber}`,
      });
    } else {
      return errorResponse(
        'Must provide either teamNumber or set recalculateAll to true',
        400
      );
    }
  } catch (error) {
    console.error('[Statistics API] Error calculating statistics:', error);

    if (error instanceof Error) {
      return errorResponse(
        `Failed to calculate statistics: ${error.message}`,
        500
      );
    }

    return errorResponse('Failed to calculate statistics', 500);
  }
}

/**
 * Get calculated team statistics
 *
 * Query params:
 * - teamNumber: number - Team to get stats for
 * - eventKey?: string - Filter by event
 */
export async function GET(request: NextRequest) {
  // Check admin authorization
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { searchParams } = new URL(request.url);
    const teamNumber = searchParams.get('teamNumber');
    const eventKey = searchParams.get('eventKey');

    if (!teamNumber) {
      return errorResponse('teamNumber query parameter is required', 400);
    }

    // Create service with dependencies
    const supabase = createServiceClient();
    const scoutingRepo = createScoutingDataRepository(supabase);
    const matchRepo = createMatchRepository(supabase);
    const service = createStatisticsService(
      statisticsRepository,
      scoutingRepo,
      matchRepo
    );

    // Get cached statistics
    const stats = await service.getTeamStatistics(
      parseInt(teamNumber),
      eventKey || undefined
    );

    if (!stats) {
      // No cached stats, calculate them
      const newStats = await service.calculateTeamStatistics(
        parseInt(teamNumber),
        eventKey || undefined
      );

      return successResponse({
        statistics: newStats,
        cached: false,
        message: 'Statistics calculated fresh',
      });
    }

    return successResponse({
      statistics: stats,
      cached: true,
      message: 'Retrieved cached statistics',
    });
  } catch (error) {
    console.error('[Statistics API] Error retrieving statistics:', error);

    if (error instanceof Error) {
      return errorResponse(
        `Failed to retrieve statistics: ${error.message}`,
        500
      );
    }

    return errorResponse('Failed to retrieve statistics', 500);
  }
}