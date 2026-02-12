/**
 * Root Page - Authentication Router
 *
 * This page serves as the entry point and redirects users based on authentication state:
 * - Scouters → /scouting/pit
 * - Admins → /admin
 * - Mentors → /dashboard
 * - Unauthenticated → /auth/login
 *
 * Note: Middleware handles the redirect, so this page should never actually render.
 * If it does render, it shows a loading state while redirect happens.
 */

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getRedirectPathForRole } from '@/lib/services/redirect.service';
import type { UserRole } from '@/types/auth';

export default async function RootPage() {
  const supabase = await createClient();

  // Check authentication status
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If not authenticated, redirect to login
  if (!user) {
    redirect('/auth/login');
  }

  // Get user profile to determine role
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  // If no profile found, redirect to login
  if (!profile) {
    redirect('/auth/login');
  }

  // Redirect based on role
  const redirectPath = getRedirectPathForRole(profile.role as UserRole);
  redirect(redirectPath);
}
