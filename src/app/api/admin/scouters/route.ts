/**
 * API Routes for Scouters Management
 * Handles CRUD operations for scout profiles, certifications, and experience tracking
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/api/auth-middleware';
import type {
  CreateScouterInput,
  ExperienceLevel,
  PreferredRole,
  Certification,
  ScouterWithUser,
} from '@/types/scouter';
import {
  isExperienceLevel,
  isPreferredRole,
  areCertifications,
} from '@/types/scouter';

// ============================================================================
// GET /api/admin/scouters - List scouters with filtering and pagination
// ============================================================================
export async function GET(request: NextRequest) {
  // Require admin authentication
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const supabase = createServiceClient();
    const searchParams = request.nextUrl.searchParams;

    // Parse pagination parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // Parse filter parameters
    const search = searchParams.get('search') || '';
    const experienceLevel = searchParams.get('experience_level') as ExperienceLevel | null;
    const teamNumber = searchParams.get('team_number');
    const certification = searchParams.get('certification') as Certification | null;
    const preferredRole = searchParams.get('preferred_role') as PreferredRole | null;

    // Parse sorting parameters
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';

    // Build query with joins to get user profile and team information
    let query = supabase
      .from('scouters')
      .select(
        `
        *,
        user_profiles!inner(
          email,
          full_name,
          display_name
        ),
        teams(
          team_name,
          team_nickname
        )
      `,
        { count: 'exact' }
      );

    // Apply search filter (search by user name or email)
    if (search) {
      query = query.or(
        `user_profiles.full_name.ilike.%${search}%,user_profiles.display_name.ilike.%${search}%,user_profiles.email.ilike.%${search}%`
      );
    }

    // Apply experience level filter
    if (experienceLevel && isExperienceLevel(experienceLevel)) {
      query = query.eq('experience_level', experienceLevel);
    }

    // Apply team number filter
    if (teamNumber) {
      const teamNum = parseInt(teamNumber);
      if (!isNaN(teamNum)) {
        query = query.eq('team_number', teamNum);
      }
    }

    // Apply preferred role filter
    if (preferredRole && isPreferredRole(preferredRole)) {
      query = query.eq('preferred_role', preferredRole);
    }

    // Apply certification filter (JSONB array contains)
    if (certification) {
      query = query.contains('certifications', [certification]);
    }

    // Apply sorting
    const sortColumn = sortBy === 'name' ? 'user_profiles.full_name' : sortBy;
    query = query.order(sortColumn, { ascending: sortOrder === 'asc' });

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    // Execute query
    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching scouters:', error);
      return NextResponse.json(
        { error: 'Failed to fetch scouters' },
        { status: 500 }
      );
    }

    // Transform data to flatten joined fields
    const scouters: ScouterWithUser[] = (data || []).map((row: Record<string, unknown>) => {
      const userProfile = row.user_profiles as Record<string, unknown>;
      const team = row.teams as Record<string, unknown> | null;

      return {
        id: row.id,
        user_id: row.user_id,
        team_number: row.team_number,
        experience_level: row.experience_level,
        preferred_role: row.preferred_role,
        total_matches_scouted: row.total_matches_scouted,
        total_events_attended: row.total_events_attended,
        certifications: row.certifications,
        availability_notes: row.availability_notes,
        created_at: row.created_at,
        updated_at: row.updated_at,
        // User profile fields
        email: userProfile.email,
        full_name: userProfile.full_name,
        display_name: userProfile.display_name,
        // Team fields (optional)
        team_name: team?.team_name,
        team_nickname: team?.team_nickname,
      } as ScouterWithUser;
    });

    return NextResponse.json({
      success: true,
      data: scouters,
      pagination: {
        total: count || 0,
        page,
        limit,
        offset,
        has_more: (count || 0) > offset + limit,
      },
    });
  } catch (error) {
    console.error('Error in GET /api/admin/scouters:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST /api/admin/scouters - Create a new scouter
// ============================================================================
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
    if (!body.user_id || !body.experience_level) {
      return NextResponse.json(
        {
          error: 'Missing required fields',
          details: 'user_id and experience_level are required',
        },
        { status: 400 }
      );
    }

    // Validate experience level
    if (!isExperienceLevel(body.experience_level)) {
      return NextResponse.json(
        {
          error: 'Invalid experience_level',
          details: 'Must be one of: rookie, intermediate, veteran',
        },
        { status: 400 }
      );
    }

    // Validate preferred role (if provided)
    if (body.preferred_role && !isPreferredRole(body.preferred_role)) {
      return NextResponse.json(
        {
          error: 'Invalid preferred_role',
          details: 'Must be one of: match_scouting, pit_scouting, both, or null',
        },
        { status: 400 }
      );
    }

    // Validate certifications array (if provided)
    if (body.certifications && !areCertifications(body.certifications)) {
      return NextResponse.json(
        {
          error: 'Invalid certifications',
          details:
            'Must be an array of valid certification types: pit_certified, match_certified, lead_scout, data_reviewer, trainer, super_scout',
        },
        { status: 400 }
      );
    }

    // Check if user already has a scouter profile
    const { data: existingScouter } = await supabase
      .from('scouters')
      .select('id')
      .eq('user_id', body.user_id)
      .single();

    if (existingScouter) {
      return NextResponse.json(
        { error: 'User already has a scouter profile' },
        { status: 409 }
      );
    }

    // Verify user exists
    const { data: user, error: userError } = await supabase
      .from('user_profiles')
      .select('id, email')
      .eq('id', body.user_id)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify team exists (if team_number is provided)
    if (body.team_number) {
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .select('team_number')
        .eq('team_number', body.team_number)
        .single();

      if (teamError || !team) {
        return NextResponse.json({ error: 'Team not found' }, { status: 404 });
      }
    }

    // Create scouter record
    const scouterInput: CreateScouterInput = {
      user_id: body.user_id,
      experience_level: body.experience_level,
      team_number: body.team_number || null,
      preferred_role: body.preferred_role || null,
      certifications: body.certifications || [],
      availability_notes: body.availability_notes || null,
    };

    const { data, error } = await supabase
      .from('scouters')
      .insert([scouterInput])
      .select(
        `
        *,
        user_profiles(
          email,
          full_name,
          display_name
        ),
        teams(
          team_name,
          team_nickname
        )
      `
      )
      .single();

    if (error) {
      console.error('Error creating scouter:', error);
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Scouter profile already exists for this user' },
          { status: 409 }
        );
      }
      if (error.code === '23503') {
        return NextResponse.json(
          { error: 'Invalid user_id or team_number reference' },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to create scouter' },
        { status: 500 }
      );
    }

    // Transform response
    const userProfile = (data as Record<string, unknown>).user_profiles as Record<string, unknown>;
    const team = (data as Record<string, unknown>).teams as Record<string, unknown> | null;

    const scouter: ScouterWithUser = {
      ...(data as Record<string, unknown>),
      email: userProfile.email,
      full_name: userProfile.full_name,
      display_name: userProfile.display_name,
      team_name: team?.team_name,
      team_nickname: team?.team_nickname,
    } as ScouterWithUser;

    return NextResponse.json({ success: true, data: scouter }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/admin/scouters:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
