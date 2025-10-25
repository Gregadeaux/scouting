'use server';

/**
 * Server Actions for Authentication
 * All authentication operations happen server-side only
 */

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getUserProfile } from '@/lib/supabase/auth';
import { getRedirectPathForRole } from '@/lib/services/redirect.service';

interface LoginResult {
  success: boolean;
  error?: string;
  redirectTo?: string;
}

/**
 * Server Action: Sign in with email and password
 * This runs entirely on the server, ensuring proper cookie handling
 */
export async function loginAction(formData: FormData): Promise<LoginResult> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return {
      success: false,
      error: 'Email and password are required',
    };
  }

  try {
    const supabase = await createClient();

    // Sign in with Supabase - this happens server-side
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      console.error('Sign in error:', signInError);
      return {
        success: false,
        error: signInError.message || 'Failed to sign in',
      };
    }

    if (!data.user) {
      return {
        success: false,
        error: 'Authentication failed',
      };
    }

    // Get user profile to determine redirect
    const profile = await getUserProfile(supabase, data.user.id);

    if (!profile) {
      return {
        success: false,
        error: 'User profile not found',
      };
    }

    if (!profile.is_active) {
      return {
        success: false,
        error: 'Account is inactive. Please contact your administrator.',
      };
    }

    // Revalidate all paths to ensure fresh data
    revalidatePath('/', 'layout');

    // Get role-based redirect path
    const redirectTo = getRedirectPathForRole(profile.role);

    return {
      success: true,
      redirectTo,
    };
  } catch (error) {
    console.error('Login action error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
}

/**
 * Server Action: Sign out
 * Clears session cookies server-side
 */
export async function logoutAction(): Promise<void> {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();

    // Revalidate and redirect
    revalidatePath('/', 'layout');
  } catch (error) {
    console.error('Logout error:', error);
  }

  redirect('/auth/login');
}
