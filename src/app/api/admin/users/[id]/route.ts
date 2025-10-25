/**
 * Admin API: User Management
 * PATCH /api/admin/users/[id] - Update user role/team
 * DELETE /api/admin/users/[id] - Delete user
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { successResponse, errorResponse } from '@/lib/api/response';
import { requireAdmin } from '@/lib/api/auth-middleware';
import { checkCsrf } from '@/lib/api/withCsrf';
import type { UserRole } from '@/types/auth';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

interface UserProfileUpdate {
  role?: UserRole;
  primary_team_number?: number | null;
  is_active?: boolean;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  // Require admin authentication
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    // Validate CSRF token
    const csrfError = await checkCsrf(request);
    if (csrfError) return csrfError;

    const supabase = await createClient();
    const { user } = authResult;

    // Get the user ID from params (Next.js 15: params are now async)
    const { id: userId } = await params;

    // Prevent admin from modifying their own role
    if (userId === user.auth.id) {
      return errorResponse('Cannot modify your own account', 400);
    }

    // Get request body
    const body = await request.json();
    const { role, primary_team_number, is_active } = body;

    // Build update object
    const updates: UserProfileUpdate = {};

    if (role !== undefined) {
      // Validate role
      const validRoles: UserRole[] = ['admin', 'mentor', 'scouter'];
      if (!validRoles.includes(role)) {
        return errorResponse('Invalid role', 400);
      }
      updates.role = role;
    }

    if (primary_team_number !== undefined) {
      // Validate team exists if provided
      if (primary_team_number !== null) {
        const { data: team } = await supabase
          .from('teams')
          .select('team_number')
          .eq('team_number', primary_team_number)
          .single();

        if (!team) {
          return errorResponse('Team not found', 404);
        }
      }
      updates.primary_team_number = primary_team_number;
    }

    if (is_active !== undefined) {
      updates.is_active = is_active;
    }

    // Update user profile
    const { data: updatedUser, error } = await supabase
      .from('user_profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating user:', error);
      return errorResponse('Failed to update user', 500);
    }

    // Log the action
    await supabase.from('audit_log').insert({
      user_id: user.auth.id,
      action: 'user_update',
      resource_type: 'user_profile',
      resource_id: userId,
      new_values: updates,
      metadata: {
        updated_by: user.auth.email,
        admin_action: true,
      },
    });

    // If team was updated, also update team_members
    if (primary_team_number !== undefined && primary_team_number !== null) {
      // Check if user already has membership for this team
      const { data: existingMembership } = await supabase
        .from('team_members')
        .select('id')
        .eq('user_id', userId)
        .eq('team_number', primary_team_number)
        .single();

      if (!existingMembership) {
        // Create new team membership
        await supabase.from('team_members').insert({
          user_id: userId,
          team_number: primary_team_number,
          team_role: updatedUser.role,
          can_submit_data: true,
          can_view_analytics: updatedUser.role !== 'scouter',
          can_manage_team: updatedUser.role === 'mentor' || updatedUser.role === 'admin',
        });
      }
    }

    return successResponse({
      user: updatedUser,
      message: 'User updated successfully',
    });
  } catch (error) {
    console.error('User update error:', error);
    return errorResponse('Internal server error', 500);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  // Require admin authentication
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    // Validate CSRF token
    const csrfError = await checkCsrf(request);
    if (csrfError) return csrfError;

    const supabase = await createClient();
    const { user } = authResult;

    // Get the user ID from params (Next.js 15: params are now async)
    const { id: userId } = await params;

    // Prevent admin from deleting their own account
    if (userId === user.auth.id) {
      return errorResponse('Cannot delete your own account', 400);
    }

    // Get user info before deletion for logging
    const { data: userToDelete } = await supabase
      .from('user_profiles')
      .select('email, full_name, role')
      .eq('id', userId)
      .single();

    if (!userToDelete) {
      return errorResponse('User not found', 404);
    }

    // We need to use service role client for admin operations
    const serviceClient = createServiceClient();

    // Delete the user from auth (this will cascade to user_profiles)
    const { error: deleteError } = await serviceClient.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error('Error deleting user:', deleteError);
      return errorResponse('Failed to delete user', 500);
    }

    // Log the action
    await supabase.from('audit_log').insert({
      user_id: user.auth.id,
      action: 'user_delete',
      resource_type: 'user_profile',
      resource_id: userId,
      old_values: userToDelete,
      metadata: {
        deleted_by: user.auth.email,
        admin_action: true,
      },
    });

    return successResponse({
      message: 'User deleted successfully',
      deleted_user: {
        id: userId,
        email: userToDelete.email,
      },
    });
  } catch (error) {
    console.error('User delete error:', error);
    return errorResponse('Internal server error', 500);
  }
}