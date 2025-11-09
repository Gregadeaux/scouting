/**
 * API Routes for Individual Scouter Operations
 * Handles GET, PATCH, and DELETE operations for specific scouters
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/api/auth-middleware';
import type {
  UpdateScouterInput,
  ScouterWithUser,
} from '@/types/scouter';
import {
  isExperienceLevel,
  isPreferredRole,
  areCertifications,
} from '@/types/scouter';

// ============================================================================
// GET /api/admin/scouters/[id] - Get a single scouter
// ============================================================================
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

    // Fetch scouter with user profile and team information
    const { data, error } = await supabase
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
      `
      )
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching scouter:', error);
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Scouter not found' }, { status: 404 });
      }
      return NextResponse.json(
        { error: 'Failed to fetch scouter' },
        { status: 500 }
      );
    }

    // Transform response to flatten joined fields
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

    return NextResponse.json({ success: true, data: scouter });
  } catch (error) {
    console.error('Error in GET /api/admin/scouters/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// PATCH /api/admin/scouters/[id] - Update a scouter (partial update)
// ============================================================================
export async function PATCH(
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

    // Verify scouter exists
    const { data: existingScouter, error: fetchError } = await supabase
      .from('scouters')
      .select('id, user_id')
      .eq('id', id)
      .single();

    if (fetchError || !existingScouter) {
      return NextResponse.json({ error: 'Scouter not found' }, { status: 404 });
    }

    // Build update object (only include provided fields)
    const updateData: Partial<UpdateScouterInput> = {};

    // Validate and add experience_level
    if (body.experience_level !== undefined) {
      if (!isExperienceLevel(body.experience_level)) {
        return NextResponse.json(
          {
            error: 'Invalid experience_level',
            details: 'Must be one of: rookie, intermediate, veteran',
          },
          { status: 400 }
        );
      }
      updateData.experience_level = body.experience_level;
    }

    // Validate and add preferred_role
    if (body.preferred_role !== undefined) {
      if (!isPreferredRole(body.preferred_role)) {
        return NextResponse.json(
          {
            error: 'Invalid preferred_role',
            details: 'Must be one of: match_scouting, pit_scouting, both, or null',
          },
          { status: 400 }
        );
      }
      updateData.preferred_role = body.preferred_role;
    }

    // Validate and add certifications
    if (body.certifications !== undefined) {
      if (!areCertifications(body.certifications)) {
        return NextResponse.json(
          {
            error: 'Invalid certifications',
            details:
              'Must be an array of valid certification types: pit_certified, match_certified, lead_scout, data_reviewer, trainer, super_scout',
          },
          { status: 400 }
        );
      }
      updateData.certifications = body.certifications;
    }

    // Add team_number (with validation)
    if (body.team_number !== undefined) {
      if (body.team_number !== null) {
        // Verify team exists
        const { data: team, error: teamError } = await supabase
          .from('teams')
          .select('team_number')
          .eq('team_number', body.team_number)
          .single();

        if (teamError || !team) {
          return NextResponse.json({ error: 'Team not found' }, { status: 404 });
        }
      }
      updateData.team_number = body.team_number;
    }

    // Add availability_notes
    if (body.availability_notes !== undefined) {
      updateData.availability_notes = body.availability_notes;
    }

    // Add activity counters (typically updated by triggers, but allow manual adjustment)
    if (body.total_matches_scouted !== undefined) {
      if (typeof body.total_matches_scouted !== 'number' || body.total_matches_scouted < 0) {
        return NextResponse.json(
          {
            error: 'Invalid total_matches_scouted',
            details: 'Must be a non-negative number',
          },
          { status: 400 }
        );
      }
      updateData.total_matches_scouted = body.total_matches_scouted;
    }

    if (body.total_events_attended !== undefined) {
      if (typeof body.total_events_attended !== 'number' || body.total_events_attended < 0) {
        return NextResponse.json(
          {
            error: 'Invalid total_events_attended',
            details: 'Must be a non-negative number',
          },
          { status: 400 }
        );
      }
      updateData.total_events_attended = body.total_events_attended;
    }

    // Check if there's anything to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    // Perform update
    const { data, error } = await supabase
      .from('scouters')
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
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
      console.error('Error updating scouter:', error);
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Scouter not found' }, { status: 404 });
      }
      if (error.code === '23503') {
        return NextResponse.json(
          { error: 'Invalid team_number reference' },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to update scouter' },
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

    return NextResponse.json({ success: true, data: scouter });
  } catch (error) {
    console.error('Error in PATCH /api/admin/scouters/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// DELETE /api/admin/scouters/[id] - Delete a scouter
// ============================================================================
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

    // Verify scouter exists
    const { data: existingScouter, error: fetchError } = await supabase
      .from('scouters')
      .select('id')
      .eq('id', id)
      .single();

    if (fetchError || !existingScouter) {
      return NextResponse.json({ error: 'Scouter not found' }, { status: 404 });
    }

    // Delete scouter (CASCADE should handle related records)
    const { error } = await supabase.from('scouters').delete().eq('id', id);

    if (error) {
      console.error('Error deleting scouter:', error);
      if (error.code === '23503') {
        return NextResponse.json(
          {
            error: 'Cannot delete scouter with associated data',
            details:
              'This scouter has match scouting records or other related data. Please delete those first or use soft delete.',
          },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to delete scouter' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: 'Scouter deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /api/admin/scouters/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
