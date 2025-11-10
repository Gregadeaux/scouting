/**
 * Auth API: Signup
 * POST /api/auth/signup - Register new user
 *
 * SECURITY: Rate limited to 3 attempts per hour per IP
 */

import { NextRequest } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { signUp, getCurrentUser } from '@/lib/supabase/auth';
import { successResponse, errorResponse } from '@/lib/api/auth-middleware';
import type { SignupFormData } from '@/types/auth';
import { applyRateLimit, signupRateLimit } from '@/lib/middleware/rate-limit';

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
  // SECURITY: Apply rate limiting (3 attempts per hour per IP)
  const rateLimitResult = await applyRateLimit(request, signupRateLimit);
  if (rateLimitResult) return rateLimitResult;

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

    const supabase = await createClient();

    // Sign up with Supabase Auth
    // Note: User metadata (full_name, team_number) is stored in auth.users.raw_user_meta_data
    // The user_profiles table should be automatically populated via database trigger
    const { user: authUser, error: signUpError, isDuplicateEmail } = await signUp(supabase, formData);

    console.log('Supabase signUp result:', {
      success: !!authUser,
      error: signUpError?.message,
      errorDetails: signUpError,
      userId: authUser?.id,
      isDuplicateEmail
    });

    if (signUpError || !authUser) {
      console.error('Signup failed:', signUpError);

      // Check for duplicate email error (409 Conflict)
      if (isDuplicateEmail) {
        return errorResponse('An account with this email already exists', 409);
      }

      // Check for password validation errors (400 Bad Request)
      if (signUpError?.message?.includes('password')) {
        return errorResponse('Password does not meet requirements', 400);
      }

      // Check for email validation errors (400 Bad Request)
      if (signUpError?.message?.includes('email') || signUpError?.message?.includes('invalid')) {
        return errorResponse('Invalid email format', 400);
      }

      // Generic fallback - 500 Internal Server Error for unexpected auth errors
      return errorResponse('An error occurred during signup. Please try again.', 500);
    }

    // Check if profile was created by the trigger
    // Wait a moment for trigger to complete
    await new Promise(resolve => setTimeout(resolve, 100));

    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', authUser.id)
      .single();

    if (!existingProfile) {
      console.log('Profile not created by trigger, creating manually with service role client');

      // Use service role client to bypass RLS policies
      const serviceClient = createServiceClient();

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

    // Get full user object with profile and permissions
    const currentUser = await getCurrentUser(supabase);

    console.log('User profile lookup:', {
      profileFound: !!currentUser,
      userId: authUser.id
    });

    if (!currentUser) {
      // Profile should exist now, this shouldn't happen
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
    console.error('Error in POST /api/auth/signup:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');

    const errorMessage = error instanceof Error ? error.message : 'Failed to create account';
    return errorResponse(errorMessage, 500);
  }
}
