/**
 * Match Details API Endpoint
 *
 * GET /api/analytics/match/[matchKey]
 * Returns match details including alliance composition and scores
 */

import { createClient } from '@/lib/supabase/server';
import { successResponse, errorResponse } from '@/lib/api/response';
import { NextRequest } from 'next/server';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ matchKey: string }> }
) {
  try {
    const { matchKey } = await context.params;
    const supabase = await createClient();

    // Fetch match details
    const { data: match, error } = await supabase
      .from('match_schedule')
      .select('*')
      .eq('match_key', matchKey)
      .single();

    if (error) {
      console.error('[Match API] Database error:', error);
      return errorResponse('Failed to fetch match details', 500);
    }

    if (!match) {
      return errorResponse('Match not found', 404);
    }

    return successResponse(match);
  } catch (error) {
    console.error('[Match API] Unexpected error:', error);
    return errorResponse('Internal server error', 500);
  }
}
