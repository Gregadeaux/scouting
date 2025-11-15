/**
 * Event Matches API Endpoint
 *
 * GET /api/analytics/matches/[eventKey]
 * Returns list of matches for an event
 */

import { createClient } from '@/lib/supabase/server';
import { successResponse, errorResponse } from '@/lib/api/response';
import { NextRequest } from 'next/server';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ eventKey: string }> }
) {
  try {
    const { eventKey } = await context.params;
    const supabase = await createClient();

    // Fetch matches for the event, ordered by match number
    const { data: matches, error } = await supabase
      .from('match_schedule')
      .select('*')
      .eq('event_key', eventKey)
      .order('comp_level')
      .order('match_number');

    if (error) {
      console.error('[Matches API] Database error:', error);
      return errorResponse('Failed to fetch matches', 500);
    }

    return successResponse(matches || []);
  } catch (error) {
    console.error('[Matches API] Unexpected error:', error);
    return errorResponse('Internal server error', 500);
  }
}
