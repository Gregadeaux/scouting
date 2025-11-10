/**
 * Admin API: User Management
 * GET /api/admin/users - List all users with team info
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { successResponse, errorResponse } from '@/lib/api/response';
import { requireAdmin } from '@/lib/api/auth-middleware';
import { buildSearchFilter } from '@/lib/utils/input-sanitization';

export async function GET(request: NextRequest) {
  // Require admin authentication
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const supabase = await createClient();

    // Get query parameters for filtering
    const searchParams = request.nextUrl.searchParams;
    const role = searchParams.get('role');
    const teamNumber = searchParams.get('team_number');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // Build query with JOIN to fetch team info in single query
    let query = supabase
      .from('user_profiles')
      .select(
        `
        *,
        teams!primary_team_number (
          team_number,
          team_name,
          team_nickname
        ),
        team_members!left (
          team_number,
          team_role,
          is_active,
          joined_at
        )
      `,
        { count: 'exact' }
      );

    // Apply filters
    if (role) {
      query = query.eq('role', role);
    }

    if (teamNumber) {
      query = query.eq('primary_team_number', parseInt(teamNumber));
    }

    // SECURE: Apply search filter using input sanitization utility
    if (search) {
      try {
        const textFilter = buildSearchFilter(['email', 'full_name', 'display_name'], search);
        if (textFilter) {
          query = query.or(textFilter);
        }
      } catch (error) {
        // Sanitization failed - return error to user
        const errorMsg = error instanceof Error ? error.message : 'Invalid search input';
        return errorResponse(errorMsg, 400);
      }
    }

    // Apply pagination and ordering
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: users, error, count } = await query;

    if (error) {
      console.error('Error fetching users:', error);
      return errorResponse('Failed to fetch users', 500);
    }

    // Format response - team info is already included from JOIN
    const usersWithTeams = (users || []).map((user) => ({
      ...user,
      team: user.teams || null, // teams is singular because of foreign key relationship
      memberships: user.team_members || [],
    }));

    return successResponse({
      users: usersWithTeams,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('User list error:', error);
    return errorResponse('Internal server error', 500);
  }
}