import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/api/auth-middleware';

interface EventTeamQueryResult {
  event_key: string;
  created_at: string;
  events: {
    event_key: string;
    event_name: string;
    event_code: string;
    year: number;
    event_type: string;
    district: string | null;
    week: number | null;
    city: string | null;
    state_province: string | null;
    country: string | null;
    start_date: string;
    end_date: string;
  };
}

/**
 * GET /api/admin/teams/[id]/events - Get all events a team is attending
 *
 * Returns list of events with basic information for a specific team
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Require admin authentication
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const supabase = createServiceClient();
    const { id } = await params;
    const teamNumber = parseInt(id);

    // Validate team number
    if (isNaN(teamNumber) || teamNumber <= 0) {
      return NextResponse.json(
        { error: 'Invalid team number' },
        { status: 400 }
      );
    }

    // Query event_teams junction table joined with events
    const { data, error } = await supabase
      .from('event_teams')
      .select(`
        event_key,
        created_at,
        events (
          event_key,
          event_name,
          event_code,
          year,
          event_type,
          district,
          week,
          city,
          state_province,
          country,
          start_date,
          end_date
        )
      `)
      .eq('team_number', teamNumber)
      .order('events(start_date)', { ascending: false });

    if (error) {
      console.error('Error fetching team events:', error);
      return NextResponse.json(
        { error: 'Failed to fetch team events' },
        { status: 500 }
      );
    }

    // Transform the data to flatten the events object
    const events = (data as EventTeamQueryResult[])?.map((item) => ({
      ...item.events,
      team_registered_at: item.created_at
    })) || [];

    return NextResponse.json({
      success: true,
      data: events,
      count: events.length
    });
  } catch (error) {
    console.error('Error in GET /api/admin/teams/[id]/events:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
