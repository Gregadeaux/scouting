/**
 * Auth API: Login
 * POST /api/auth/login - Sign in with email and password
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { signIn, getCurrentUser } from '@/lib/supabase/auth';
import { successResponse, errorResponse } from '@/lib/api/auth-middleware';
import type { LoginFormData } from '@/types/auth';

/**
 * POST /api/auth/login
 * Body: { email: string, password: string }
 * Returns: { success: true, data: { user: AuthenticatedUser } }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.email || !body.password) {
      return errorResponse('Email and password are required', 400);
    }

    const formData: LoginFormData = {
      email: body.email,
      password: body.password,
    };

    const supabase = await createClient();

    // Sign in with Supabase Auth
    const { user: authUser, error: signInError } = await signIn(supabase, formData);

    if (signInError || !authUser) {
      return errorResponse(
        signInError?.message || 'Invalid email or password',
        401
      );
    }

    // Get full user object with profile and permissions
    const currentUser = await getCurrentUser(supabase);

    if (!currentUser) {
      return errorResponse('Failed to fetch user profile', 500);
    }

    return successResponse({ user: currentUser }, 200);
  } catch (error) {
    console.error('Error in POST /api/auth/login:', error);
    return errorResponse('Failed to log in', 500);
  }
}
