'use server';

/**
 * Server Actions for Authentication
 * All authentication operations happen server-side only
 *
 * SECURITY: Rate limited to 5 attempts per minute per IP
 */

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { getUserProfile } from '@/lib/supabase/auth';
import { getRedirectPathForRole } from '@/lib/services/redirect.service';
import { loginRateLimit } from '@/lib/middleware/rate-limit';

interface LoginResult {
  success: boolean;
  error?: string;
  redirectTo?: string;
}

/**
 * Extract client IP from request headers in a server action context.
 */
async function getClientIpFromHeaders(): Promise<string> {
  const headersList = await headers();
  const forwardedFor = headersList.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  const realIp = headersList.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }
  return 'unknown';
}

/**
 * Validate that a redirect path is a safe relative URL.
 * Must start with / and must not start with // (protocol-relative URL).
 */
function isValidRedirectPath(path: string): boolean {
  return path.startsWith('/') && !path.startsWith('//');
}

/**
 * Server Action: Sign in with email and password
 * This runs entirely on the server, ensuring proper cookie handling
 */
export async function loginAction(formData: FormData): Promise<LoginResult> {
  // SECURITY: Apply rate limiting (5 attempts per minute per IP)
  if (loginRateLimit) {
    try {
      const ip = await getClientIpFromHeaders();
      const { success: allowed } = await loginRateLimit.limit(ip);
      if (!allowed) {
        return {
          success: false,
          error: 'Too many login attempts. Please try again later.',
        };
      }
    } catch (error) {
      // Log rate limiting errors but don't block requests
      console.error('Rate limiting error in login action:', error);
    }
  }

  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const redirectToParam = formData.get('redirectTo') as string | null;

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
        error: 'Invalid email or password',
      };
    }

    if (!data.user) {
      return {
        success: false,
        error: 'Invalid email or password',
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

    // Honor the redirect parameter if it's a valid relative path,
    // otherwise fall back to role-based redirect
    let redirectTo: string;
    if (redirectToParam && isValidRedirectPath(redirectToParam)) {
      redirectTo = redirectToParam;
    } else {
      redirectTo = getRedirectPathForRole(profile.role);
    }

    return {
      success: true,
      redirectTo,
    };
  } catch (error) {
    console.error('Login action error:', error);
    return {
      success: false,
      error: 'An unexpected error occurred',
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
