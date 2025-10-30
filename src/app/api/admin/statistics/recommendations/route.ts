/**
 * API endpoint for alliance selection recommendations
 *
 * GET /api/admin/statistics/recommendations - Get alliance recommendations based on CCWM
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api/auth-middleware';
import { createOPRService, type OPRMetrics } from '@/lib/services/opr.service';
import { createMatchRepository } from '@/lib/repositories';
import { createServiceClient } from '@/lib/supabase/server';
import type { CCWMResult } from '@/lib/algorithms/ccwm';

/**
 * GET /api/admin/statistics/recommendations
 * Get alliance selection recommendations based on CCWM analysis
 *
 * Query params: eventKey (required)
 *
 * Returns categorized teams:
 * - firstPicks: Top 8 teams by CCWM
 * - secondPicks: Next tier teams
 * - defensivePicks: Teams with exceptional defense (low DPR)
 * - balancedPicks: Teams good at both offense and defense
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

    // Get alliance recommendations
    const recommendations = await service.getAllianceRecommendations(eventKey);

    // Also get the raw OPR metrics for additional context
    const metrics = await service.getOPRMetrics(eventKey);

    // Format response with helpful information
    const response = {
      eventKey,
      calculatedAt: metrics?.calculatedAt || new Date(),
      totalMatches: metrics?.totalMatches || 0,
      recommendations: {
        firstPicks: formatTeamList(recommendations.firstPicks, 'Elite teams with highest CCWM'),
        secondPicks: formatTeamList(recommendations.secondPicks, 'Strong second-round picks'),
        defensivePicks: formatTeamList(recommendations.defensivePicks, 'Exceptional defensive teams'),
        balancedPicks: formatTeamList(recommendations.balancedPicks, 'Well-rounded teams'),
      },
      statistics: calculateFieldStatistics(metrics),
      warnings: metrics?.warnings || [],
    };

    return NextResponse.json({
      success: true,
      data: response,
    });
  } catch (error: unknown) {
    console.error('[Recommendations API] Error generating recommendations:', error);

    // Return appropriate error response
    const errorMessage = error instanceof Error ? error.message : '';
    if (errorMessage.includes('No completed matches')) {
      return NextResponse.json(
        {
          error: 'No completed matches found for this event',
          hint: 'OPR calculations require match results',
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: errorMessage || 'Failed to generate recommendations' },
      { status: 500 }
    );
  }
}

/**
 * Format team list with descriptive category
 */
function formatTeamList(teams: CCWMResult[], description: string) {
  return {
    description,
    count: teams.length,
    teams: teams.map(team => ({
      teamNumber: team.teamNumber,
      opr: team.opr,
      dpr: team.dpr,
      ccwm: team.ccwm,
      matchesPlayed: team.matchesPlayed,
      // Add ranking within category
      rank: teams.findIndex(t => t.teamNumber === team.teamNumber) + 1,
    })),
  };
}

/**
 * Calculate field-wide statistics for context
 */
function calculateFieldStatistics(metrics: OPRMetrics | null) {
  if (!metrics || !metrics.ccwm || metrics.ccwm.length === 0) {
    return null;
  }

  const ccwmValues = metrics.ccwm.map(t => t.ccwm);
  const oprValues = metrics.opr.map(t => t.opr);
  const dprValues = metrics.dpr.map(t => t.dpr);

  return {
    field: {
      teamCount: metrics.ccwm.length,
      averageOPR: average(oprValues),
      averageDPR: average(dprValues),
      averageCCWM: average(ccwmValues),
      medianCCWM: median(ccwmValues),
      topCCWM: Math.max(...ccwmValues),
      bottomCCWM: Math.min(...ccwmValues),
    },
  };
}

/**
 * Calculate average of an array
 */
function average(arr: number[]): number {
  if (arr.length === 0) return 0;
  return Number((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2));
}

/**
 * Calculate median of an array
 */
function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Number(((sorted[mid - 1] + sorted[mid]) / 2).toFixed(2))
    : Number(sorted[mid].toFixed(2));
}