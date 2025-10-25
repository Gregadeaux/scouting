import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { successResponse, errorResponse, unauthorizedError, notFoundError } from '@/lib/api/response';
import type { Team } from '@/types';

/**
 * GET /api/events/[eventKey]/teams
 * Get all teams attending a specific event
 *
 * Path Parameters:
 * - eventKey: The unique event key (e.g., "2025txaus")
 *
 * Returns:
 * {
 *   success: true,
 *   data: Team[]
 * }
 *
 * Authentication: Requires authenticated user (not admin-only)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventKey: string }> }
) {
  try {
    // Authenticate user (not admin-only)
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return unauthorizedError('Authentication required');
    }

    // Extract event key from params
    const { eventKey } = await params;

    if (!eventKey) {
      return errorResponse('Event key is required', 400);
    }

    // First, verify the event exists
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('event_key')
      .eq('event_key', eventKey)
      .single();

    if (eventError || !event) {
      console.error('[API] Event not found:', eventKey, eventError);
      return notFoundError('Event');
    }

    // Query teams for this event by joining event_teams with teams
    const { data, error } = await supabase
      .from('event_teams')
      .select(
        `
        teams:team_number (
          team_number,
          team_key,
          team_name,
          team_nickname,
          city,
          state_province,
          country,
          postal_code,
          rookie_year,
          website,
          created_at,
          updated_at
        )
      `
      )
      .eq('event_key', eventKey)
      .order('team_number', { ascending: true });

    if (error) {
      console.error('[API] Error fetching event teams:', error);
      return errorResponse('Failed to fetch teams for event', 500);
    }

    // Extract teams from the joined data
    // Supabase returns data in format: [{ teams: {...} }, { teams: {...} }]
    const teams = data
      .map((row: any) => row.teams)
      .filter((team: any) => team !== null) as Team[];

    return successResponse(teams);
  } catch (error) {
    console.error('[API] Unexpected error in GET /api/events/[eventKey]/teams:', error);
    return errorResponse('Internal server error', 500);
  }
}
