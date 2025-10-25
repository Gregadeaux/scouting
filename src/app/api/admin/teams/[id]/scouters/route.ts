import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/api/auth-middleware';

interface TeamMemberQueryResult {
  id: string;
  team_role: string;
  can_submit_data: boolean;
  can_view_analytics: boolean;
  can_manage_team: boolean;
  is_active: boolean;
  joined_at: string;
  left_at: string | null;
  user_profiles: {
    id: string;
    email: string;
    full_name: string | null;
    display_name: string | null;
    role: string;
    preferred_scout_name: string | null;
    is_active: boolean;
    email_verified: boolean;
    onboarding_completed: boolean;
    training_completed_at: string | null;
    last_login_at: string | null;
    created_at: string;
  };
}

/**
 * GET /api/admin/teams/[id]/scouters - Get all scouters associated with a team
 *
 * Returns list of users/scouters who are members of the team
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

    // Query team_members junction table joined with user_profiles
    const { data, error } = await supabase
      .from('team_members')
      .select(`
        id,
        team_role,
        can_submit_data,
        can_view_analytics,
        can_manage_team,
        is_active,
        joined_at,
        left_at,
        user_profiles (
          id,
          email,
          full_name,
          display_name,
          role,
          preferred_scout_name,
          is_active,
          email_verified,
          onboarding_completed,
          training_completed_at,
          last_login_at,
          created_at
        )
      `)
      .eq('team_number', teamNumber)
      .order('joined_at', { ascending: false });

    if (error) {
      console.error('Error fetching team scouters:', error);
      return NextResponse.json(
        { error: 'Failed to fetch team scouters' },
        { status: 500 }
      );
    }

    // Transform the data to flatten user_profiles
    const scouters = (data as TeamMemberQueryResult[])?.map((item) => ({
      membership_id: item.id,
      team_role: item.team_role,
      can_submit_data: item.can_submit_data,
      can_view_analytics: item.can_view_analytics,
      can_manage_team: item.can_manage_team,
      is_active: item.is_active,
      joined_at: item.joined_at,
      left_at: item.left_at,
      user: item.user_profiles
    })) || [];

    return NextResponse.json({
      success: true,
      data: scouters,
      count: scouters.length,
      active_count: scouters.filter((s) => s.is_active).length
    });
  } catch (error) {
    console.error('Error in GET /api/admin/teams/[id]/scouters:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
