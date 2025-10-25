import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/api/auth-middleware';

// GET /api/admin/teams/[id] - Get a single team
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

    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .eq('team_number', teamNumber)
      .single();

    if (error) {
      console.error('Error fetching team:', error);
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Team not found' }, { status: 404 });
      }
      return NextResponse.json({ error: 'Failed to fetch team' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in GET /api/admin/teams/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/admin/teams/[id] - Update a team
export async function PUT(
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
    const body = await request.json();
    const { id } = await params;
    const teamNumber = parseInt(id);

    const { data, error } = await supabase
      .from('teams')
      .update({
        team_name: body.team_name,
        team_nickname: body.team_nickname || null,
        city: body.city || null,
        state_province: body.state_province || null,
        country: body.country || null,
        postal_code: body.postal_code || null,
        rookie_year: body.rookie_year || null,
        website: body.website || null,
        updated_at: new Date().toISOString(),
      })
      .eq('team_number', teamNumber)
      .select()
      .single();

    if (error) {
      console.error('Error updating team:', error);
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Team not found' }, { status: 404 });
      }
      return NextResponse.json({ error: 'Failed to update team' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error in PUT /api/admin/teams/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/admin/teams/[id] - Delete a team
export async function DELETE(
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

    const { error } = await supabase
      .from('teams')
      .delete()
      .eq('team_number', teamNumber);

    if (error) {
      console.error('Error deleting team:', error);
      if (error.code === '23503') {
        return NextResponse.json(
          { error: 'Cannot delete team with associated data (scouting, matches)' },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: 'Failed to delete team' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/admin/teams/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
