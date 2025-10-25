/**
 * Auth API: Signup
 * POST /api/auth/signup - Register new user
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { signUp, getCurrentUser } from '@/lib/supabase/auth';
import { successResponse, errorResponse } from '@/lib/api/auth-middleware';
import type { SignupFormData } from '@/types/auth';

/**
 * POST /api/auth/signup
 * Body: { email: string, password: string, full_name?: string, team_number?: number }
 * Returns: { success: true, data: { user: AuthenticatedUser } }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
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
    // The user_profiles table will be automatically populated via database trigger
    const { user: authUser, error: signUpError } = await signUp(supabase, formData);

    if (signUpError || !authUser) {
      return errorResponse(
        signUpError?.message || 'Failed to create account',
        400
      );
    }

    // Get full user object with profile and permissions
    // Note: This may return null if the database trigger hasn't completed yet
    // In production, you may want to add retry logic or handle this asynchronously
    const currentUser = await getCurrentUser(supabase);

    if (!currentUser) {
      // User was created but profile not yet available
      // This is acceptable - user can still proceed and profile will be available on next login
      return successResponse(
        {
          user: null,
          message: 'Account created successfully. Please check your email to verify your account.',
        },
        201
      );
    }

    return successResponse({ user: currentUser }, 201);
  } catch (error) {
    console.error('Error in POST /api/auth/signup:', error);
    return errorResponse('Failed to create account', 500);
  }
}
