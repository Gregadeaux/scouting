/**
 * Auth API: Login
 * POST /api/auth/login - Sign in with email and password
 *
 * SECURITY: Rate limited to 5 attempts per minute per IP
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { signIn, getCurrentUser } from '@/lib/supabase/auth';
import { successResponse, errorResponse } from '@/lib/api/auth-middleware';
import type { LoginFormData } from '@/types/auth';
import { applyRateLimit, loginRateLimit } from '@/lib/middleware/rate-limit';

/**
 * POST /api/auth/login
 * Body: { email: string, password: string }
 * Returns: { success: true, data: { user: AuthenticatedUser } }
 */
export async function POST(request: NextRequest) {
  // SECURITY: Apply rate limiting (5 attempts per minute per IP)
  const rateLimitResult = await applyRateLimit(request, loginRateLimit);
  if (rateLimitResult) return rateLimitResult;

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
      return errorResponse('Invalid email or password', 401);
    }

    // Get full user object with profile and permissions
    let currentUser = await getCurrentUser(supabase);

    // If profile doesn't exist, create it from auth user metadata
    if (!currentUser) {
      console.log('No profile found for user, creating one...');

      // Check if profile exists first
      const { data: existingProfile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (!existingProfile) {
        // Create profile from auth metadata
        const metadata = authUser.user_metadata || {};
        const { error: profileError } = await supabase
          .from('user_profiles')
          .insert({
            id: authUser.id,
            email: authUser.email!,
            full_name: metadata.full_name || metadata.name || null,
            display_name: metadata.full_name || metadata.name || authUser.email!.split('@')[0],
            role: metadata.role || 'scouter',
            primary_team_number: metadata.team_number || null,
            is_active: true,
            email_verified: authUser.email_confirmed_at !== null,
            onboarding_completed: false,
            preferred_scout_name: metadata.full_name || metadata.name || authUser.email!.split('@')[0]
          });

        if (profileError) {
          console.error('Failed to create user profile during login:', profileError);
          return errorResponse('Failed to create user profile', 500);
        }
      }

      // Try to get user again
      currentUser = await getCurrentUser(supabase);

      if (!currentUser) {
        return errorResponse('Failed to fetch user profile', 500);
      }
    }

    return successResponse({ user: currentUser }, 200);
  } catch (error) {
    console.error('Error in POST /api/auth/login:', error);
    return errorResponse('Failed to log in', 500);
  }
}
