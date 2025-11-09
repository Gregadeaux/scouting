/**
 * Auth API: Signup
 * POST /api/auth/signup - Register new user
 */

import { NextRequest } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { signUp, getCurrentUser, getPermissionsForRole } from '@/lib/supabase/auth';
import { successResponse, errorResponse } from '@/lib/api/auth-middleware';
import type { SignupFormData, AuthenticatedUser } from '@/types/auth';

/**
 * POST /api/auth/signup
 * Body: { email: string, password: string, full_name?: string, team_number?: number }
 * Returns: { success: true, data: { user: AuthenticatedUser } }
 *
 * Status Codes:
 * - 201 Created: User successfully created with complete profile
 * - 400 Bad Request: Validation errors (missing fields, invalid format)
 * - 409 Conflict: Duplicate email/username
 * - 500 Internal Server Error: Unexpected server errors
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log('Signup request received:', {
      email: body.email,
      hasPassword: !!body.password,
      hasFullName: !!body.full_name,
      teamNumber: body.team_number
    });

    // Validate required fields (400 Bad Request)
    if (!body.email || !body.password) {
      return errorResponse('Email and password are required', 400);
    }

    const formData: SignupFormData = {
      email: body.email,
      password: body.password,
      full_name: body.full_name,
      team_number: body.team_number,
    };

    // Use service role client for admin operations
    const serviceClient = createServiceClient();

    // Try using admin.createUser instead of signUp to bypass potential issues
    try {
      const { data: authData, error: authError } = await serviceClient.auth.admin.createUser({
        email: formData.email,
        password: formData.password,
        email_confirm: true, // Auto-confirm email for now
        user_metadata: {
          full_name: formData.full_name,
          team_number: formData.team_number,
          role: 'scouter', // Default role
        }
      });

      if (authError) {
        console.error('Admin createUser error:', authError);

        // Check for duplicate email
        // Type guard for error objects with code property
        const hasCode = (err: unknown): err is { code: string } => {
          return typeof err === 'object' && err !== null && 'code' in err;
        };

        const isDuplicateEmail =
          authError.message?.toLowerCase().includes('already registered') ||
          authError.message?.toLowerCase().includes('duplicate') ||
          (hasCode(authError) && authError.code === '23505');

        if (isDuplicateEmail) {
          return errorResponse('An account with this email already exists', 409);
        }

        return errorResponse(authError.message || 'Failed to create account', 500);
      }

      const authUser = authData?.user;
      if (!authUser) {
        return errorResponse('Failed to create account - no user returned', 500);
      }

      console.log('User created via admin API:', {
        userId: authUser.id,
        email: authUser.email
      });

      // Check if profile was created by the trigger
      // Wait a moment for trigger to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      const { data: existingProfile } = await serviceClient
        .from('user_profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (!existingProfile) {
        console.log('Profile not created by trigger, creating manually with service role client');

      const { error: profileError } = await serviceClient
        .from('user_profiles')
        .insert({
          id: authUser.id,
          email: authUser.email!,
          full_name: formData.full_name || null,
          display_name: formData.full_name || authUser.email!.split('@')[0],
          role: 'scouter',
          primary_team_number: formData.team_number || null,
          is_active: true,
          email_verified: false,
          onboarding_completed: false,
          preferred_scout_name: formData.full_name || authUser.email!.split('@')[0]
        });

      if (profileError) {
        console.error('Failed to create user profile:', profileError);

        // This is a critical error - rollback the auth user
        try {
          await serviceClient.auth.admin.deleteUser(authUser.id);
          console.log('Rolled back auth user due to profile creation failure');
        } catch (rollbackError) {
          console.error('Failed to rollback auth user:', rollbackError);
        }

        return errorResponse(
          'Failed to create user profile. Please try again or contact support.',
          500
        );
      }

      console.log('User profile created manually via service role client');

      // Also create team_members entry if team_number provided
      if (formData.team_number) {
        const { error: teamMemberError } = await serviceClient
          .from('team_members')
          .insert({
            user_id: authUser.id,
            team_number: formData.team_number,
            team_role: 'scouter',
            can_submit_data: true,
            can_view_analytics: false,
            can_manage_team: false,
            is_active: true
          });

        if (teamMemberError) {
          console.error('Failed to create team_members entry:', teamMemberError);
          // Don't fail the signup for this, can be added later
        } else {
          console.log('Team member entry created');
        }
      }
    } else {
      console.log('Profile already exists from trigger');
    }

      // Get full user object with profile and permissions using regular client
      const supabase = await createClient();
      const currentUser = await getCurrentUser(supabase);

      console.log('User profile lookup:', {
        profileFound: !!currentUser,
        userId: authUser.id
      });

      if (!currentUser) {
        // Try to get the profile directly with service client
        const { data: profile } = await serviceClient
          .from('user_profiles')
          .select('*')
          .eq('id', authUser.id)
          .single();

        if (profile) {
          // Profile exists, construct the user object manually
          const permissions = getPermissionsForRole(profile.role);
          const authenticatedUser: AuthenticatedUser = {
            auth: authUser,
            profile,
            permissions
          };

          return successResponse(
            {
              user: authenticatedUser,
              session: null // No session until email is verified
            },
            201
          );
        }

        // Profile still doesn't exist
        console.error('Profile still not found after manual creation');
        return errorResponse(
          'Account created but profile setup incomplete. Please contact support.',
          500
        );
      }

      // Return the properly structured response with user and session
      return successResponse(
        {
          user: currentUser,
          session: null // No session until email is verified
        },
        201
      );
    } catch (error) {
      console.error('Error in signup process:', error);
      return errorResponse('An error occurred during signup. Please try again.', 500);
    }
  } catch (error) {
    console.error('Error in POST /api/auth/signup:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');

    const errorMessage = error instanceof Error ? error.message : 'Failed to create account';
    return errorResponse(errorMessage, 500);
  }
}
