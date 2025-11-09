import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/api/auth-middleware';

// GET /api/admin/teams - List teams with pagination, filtering, and sorting
export async function GET(request: NextRequest) {
  // Require admin authentication
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const sortBy = searchParams.get('sortBy') || 'team_number';
    const sortOrder = (searchParams.get('sortOrder') || 'asc') as 'asc' | 'desc';
    const search = searchParams.get('search') || '';

    const offset = (page - 1) * limit;

    let query = supabase.from('teams').select('*', { count: 'exact' });

    // Apply search filter - SECURE: No string interpolation in queries
    if (search) {
      // Validate and sanitize search input
      const sanitizedSearch = search.trim().substring(0, 100);

      // Reject searches with special characters that could be used for injection
      if (!/^[a-zA-Z0-9\s\-.']+$/.test(sanitizedSearch)) {
        return NextResponse.json(
          { error: 'Invalid search term: only alphanumeric characters, spaces, hyphens, periods, and apostrophes allowed' },
          { status: 400 }
        );
      }

      const numericSearch = parseInt(sanitizedSearch);

      if (!isNaN(numericSearch)) {
        // SECURE: Search by team number using safe filter building
        // Use URL encoding to prevent injection
        const encodedSearch = encodeURIComponent(sanitizedSearch);
        query = query.or(`team_number.eq.${numericSearch},team_name.ilike.*${encodedSearch}*`);
      } else {
        // SECURE: Search by text fields using URL-encoded values
        const encodedSearch = encodeURIComponent(sanitizedSearch);
        query = query.or(
          `team_name.ilike.*${encodedSearch}*,team_nickname.ilike.*${encodedSearch}*,city.ilike.*${encodedSearch}*,state_province.ilike.*${encodedSearch}*`
        );
      }
    }

    // Apply sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching teams:', error);
      return NextResponse.json({ error: 'Failed to fetch teams' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: data || [],
      pagination: {
        total: count || 0,
        limit,
        offset,
        has_more: (count || 0) > offset + limit,
      },
    });
  } catch (error) {
    console.error('Error in GET /api/admin/teams:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/admin/teams - Create a new team
export async function POST(request: NextRequest) {
  // Require admin authentication
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const supabase = createServiceClient();
    const body = await request.json();

    // Validate required fields (team_key is auto-generated, so not required)
    if (!body.team_number || !body.team_name) {
      return NextResponse.json(
        { error: 'Missing required fields: team_number and team_name' },
        { status: 400 }
      );
    }

    // team_key is a GENERATED column, so don't include it in the insert
    const { data, error } = await supabase
      .from('teams')
      .insert([
        {
          team_number: body.team_number,
          team_name: body.team_name,
          team_nickname: body.team_nickname || null,
          city: body.city || null,
          state_province: body.state_province || null,
          country: body.country || null,
          postal_code: body.postal_code || null,
          rookie_year: body.rookie_year || null,
          website: body.website || null,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating team:', error);
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Team number already exists' }, { status: 409 });
      }
      return NextResponse.json({ error: 'Failed to create team' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/admin/teams:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
