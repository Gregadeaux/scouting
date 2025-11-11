/**
 * Event Analytics API
 *
 * GET /api/analytics/event/[eventKey]
 *   - Returns aggregated statistics for all teams at an event
 *
 * Related: SCOUT-7
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { successResponse, errorResponse } from '@/lib/api/response';

interface RouteParams {
  params: Promise<{
    eventKey: string;
  }>;
}

/**
 * GET /api/analytics/event/[eventKey]
 * Fetch event-level team statistics
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return errorResponse('Unauthorized', 401);
    }

    const { eventKey } = await params;

    // Fetch team statistics for the event
    const { data: stats, error: statsError } = await supabase
      .from('team_statistics')
      .select('*')
      .eq('event_key', eventKey)
      .order('opr', { ascending: false, nullsFirst: false });

    if (statsError) {
      throw new Error(`Failed to fetch team statistics: ${statsError.message}`);
    }

    // Return as-is (already matches TeamStatistics type from database)
    return successResponse(stats || []);
  } catch (error) {
    console.error('[API] Error fetching event analytics:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to fetch event analytics',
      500
    );
  }
}
