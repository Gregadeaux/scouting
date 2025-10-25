/**
 * OAuth Callback Route
 * Handles the redirect from OAuth providers (Google, Apple)
 * Exchanges the authorization code for a session and redirects based on user role
 *
 * Uses RedirectService for consistent role-based routing
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getRedirectPathForRole } from '@/lib/services/redirect.service';
import type { UserRole } from '@/types/auth';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const origin = requestUrl.origin;

  if (code) {
    const supabase = await createClient();

    // Exchange the code for a session
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('Error exchanging code for session:', error);
      // Redirect to login with error
      return NextResponse.redirect(
        `${origin}/auth/login?error=${encodeURIComponent(error.message)}`
      );
    }

    if (data.session) {
      // Get user profile to determine redirect
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', data.session.user.id)
        .single();

      // Use RedirectService for consistent role-based routing
      if (profile?.role) {
        const redirectPath = getRedirectPathForRole(profile.role as UserRole);
        return NextResponse.redirect(`${origin}${redirectPath}`);
      }
    }
  }

  // If no code or session, redirect to login
  return NextResponse.redirect(`${origin}/auth/login`);
}
