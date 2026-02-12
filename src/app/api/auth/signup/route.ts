/**
 * Auth API: Signup
 * POST /api/auth/signup - Register new user
 *
 * SECURITY: Rate limited to 3 attempts per hour per IP
 */

import { NextRequest } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { signUp, validatePasswordStrength } from '@/lib/supabase/auth';
import { successResponse, errorResponse } from '@/lib/api/auth-middleware';
import type { SignupFormData } from '@/types/auth';
import { applyRateLimit, signupRateLimit } from '@/lib/middleware/rate-limit';

/**
 * Check if an error message indicates a duplicate key violation
 * This means the database trigger already created the profile - a success case
 */
function isDuplicateKeyError(message: string): boolean {
  return message.includes('duplicate key') || message.includes('already exists');
}

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

    // Validate password strength (400 Bad Request)
    const passwordValidation = validatePasswordStrength(body.password);
    if (!passwordValidation.valid) {
      return errorResponse(
        `Password does not meet requirements: ${passwordValidation.errors.join('; ')}`,
        400
      );
    }

    // Sanitize inputs
    const sanitizedEmail = body.email.trim().toLowerCase();
    const sanitizedFullName = body.full_name?.trim() || undefined;

    const formData: SignupFormData = {
      email: sanitizedEmail,
      password: body.password,
      full_name: sanitizedFullName,
      team_number: body.team_number,
    };

    const supabase = await createClient();
    // Create service client once for use throughout the function
    const serviceClient = createServiceClient();

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
    // Use retry logic since the trigger runs asynchronously
    let existingProfile = null;
    const maxRetries = 5;
    const retryDelay = 200; // ms between retries

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      await new Promise(resolve => setTimeout(resolve, retryDelay));

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (profile) {
        existingProfile = profile;
        console.log(`Profile found on attempt ${attempt}`);
        break;
      }

      console.log(`Profile check attempt ${attempt}/${maxRetries}: not found yet`);
    }

    if (!existingProfile) {
      console.log('Profile not created by trigger after retries, creating atomically with service role client');

      try {
        // Call atomic profile creation function
        // This ensures profile and team_members are created together or not at all
        const { data: result, error: rpcError } = await serviceClient.rpc(
          'create_user_profile_atomic',
          {
            p_user_id: authUser.id,
            p_email: authUser.email!,
            p_full_name: formData.full_name || null,
            p_display_name: formData.full_name || authUser.email!.split('@')[0],
            p_team_number: formData.team_number || null,
            p_team_role: 'scouter',
          }
        );

        if (rpcError || !result?.success) {
          const errorMessage = rpcError?.message || 'Unknown error during profile creation';

          // Check if this is a duplicate key error - means trigger did create the profile
          // This is actually a success case!
          if (isDuplicateKeyError(errorMessage)) {
            console.log('Profile was created by trigger (detected via duplicate key error)');
            // Profile exists, continue normally
          } else {
            console.error('Failed to create user profile atomically:', errorMessage);

            // This is a critical error - rollback the auth user
            // Note: This is a compensating transaction since Auth and DB are separate services
            try {
              await serviceClient.auth.admin.deleteUser(authUser.id);
              console.log('Rolled back auth user due to atomic profile creation failure');
            } catch (rollbackError) {
              console.error('Failed to rollback auth user:', rollbackError);
            }

            return errorResponse(
              'Failed to create user profile. Please try again or contact support.',
              500
            );
          }
        } else {
          console.log('User profile and team membership created atomically');
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        // Check if this is a duplicate key error - means trigger did create the profile
        if (isDuplicateKeyError(errorMessage)) {
          console.log('Profile was created by trigger (detected via exception duplicate key)');
          // Profile exists, continue normally
        } else {
          console.error('Exception during atomic profile creation:', error);

          // Rollback auth user on any exception
          try {
            await serviceClient.auth.admin.deleteUser(authUser.id);
            console.log('Rolled back auth user due to exception during profile creation');
          } catch (rollbackError) {
            console.error('Failed to rollback auth user:', rollbackError);
          }

          return errorResponse(
            'Failed to create user profile. Please try again or contact support.',
            500
          );
        }
      }
    } else {
      console.log('Profile already exists from trigger');
    }

    // Get user profile using service client (bypasses RLS since user has no session yet)
    // The user won't have an active session until they verify their email
    const { data: userProfile, error: profileError } = await serviceClient
      .from('user_profiles')
      .select('*')
      .eq('id', authUser.id)
      .single();

    console.log('User profile lookup with service client:', {
      profileFound: !!userProfile,
      profileError: profileError?.message,
      userId: authUser.id
    });

    if (!userProfile || profileError) {
      // Profile should exist now, this shouldn't happen
      console.error('Profile still not found after creation:', profileError);
      return errorResponse(
        'Account created but profile setup incomplete. Please contact support.',
        500
      );
    }

    // Construct the user response (simplified since no session yet)
    const userResponse = {
      id: authUser.id,
      email: authUser.email!,
      full_name: userProfile.full_name,
      display_name: userProfile.display_name,
      role: userProfile.role,
      primary_team_number: userProfile.primary_team_number,
      created_at: userProfile.created_at,
    };

    // Return the properly structured response with user and session
    return successResponse(
      {
        user: userResponse,
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
