import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/api/auth-middleware';
import { getEventService } from '@/lib/services';

// GET /api/admin/events - List events with pagination, filtering, and sorting
export async function GET(request: NextRequest) {
  // Require admin authentication
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const searchParams = request.nextUrl.searchParams;

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const sortBy = searchParams.get('sortBy') || 'start_date';
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';
    const search = searchParams.get('search') || '';
    const yearParam = searchParams.get('year');
    const year = yearParam ? parseInt(yearParam) : undefined;

    // Use EventService to get events with filtering
    const eventService = getEventService();
    const result = await eventService.listEvents({
      page,
      limit,
      sortBy,
      sortOrder,
      search,
      year,
    });

    return NextResponse.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error('Error in GET /api/admin/events:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/admin/events - Create a new event
export async function POST(request: NextRequest) {
  // Require admin authentication
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const supabase = createServiceClient();
    const body = await request.json();

    // Validate required fields
    if (!body.event_key || !body.event_name || !body.event_code || !body.year || !body.event_type) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate date range
    if (body.start_date && body.end_date && body.start_date > body.end_date) {
      return NextResponse.json(
        { error: 'End date must be after start date' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('events')
      .insert([
        {
          event_key: body.event_key,
          event_name: body.event_name,
          event_code: body.event_code,
          year: body.year,
          event_type: body.event_type,
          district: body.district || null,
          week: body.week || null,
          city: body.city || null,
          state_province: body.state_province || null,
          country: body.country || null,
          start_date: body.start_date,
          end_date: body.end_date,
          manual_schedule: body.manual_schedule ?? false,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating event:', error);
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Event key already exists' }, { status: 409 });
      }
      return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/admin/events:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
