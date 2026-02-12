'use client';

/**
 * OAuth Callback Page
 * Handles the redirect from OAuth providers (Google, etc.)
 * Processes the hash fragment tokens and redirects based on user role
 */

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { getRedirectPathForRole } from '@/lib/services/redirect.service';
import type { UserRole } from '@/types/auth';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const hasRedirected = useRef(false);

  useEffect(() => {
    // Listen for auth state changes - this will fire when Supabase
    // processes the hash fragment tokens from the OAuth redirect
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session?.user?.email);

        if (event === 'SIGNED_IN' && session) {
          // Get user role from metadata or profile
          let userRole: UserRole | undefined =
            (session.user.user_metadata?.role || session.user.app_metadata?.role) as UserRole | undefined;

          if (!userRole) {
            // Fallback: Query database for role
            const { data: profile } = await supabase
              .from('user_profiles')
              .select('role')
              .eq('id', session.user.id)
              .single();

            userRole = profile?.role as UserRole | undefined;
          }

          if (hasRedirected.current) return;
          hasRedirected.current = true;

          if (userRole) {
            const redirectPath = getRedirectPathForRole(userRole);
            // Use hard navigation to ensure cookies are sent with request
            window.location.href = redirectPath;
          } else {
            // User has no role - redirect to complete profile
            window.location.href = '/auth/complete-profile';
          }
        } else if (event === 'SIGNED_OUT') {
          setError('Authentication failed. Please try again.');
          setTimeout(() => {
            router.replace('/auth/login');
          }, 2000);
        }
      }
    );

    // Also check if there's already a session (in case the event already fired)
    const checkExistingSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        let userRole: UserRole | undefined =
          (session.user.user_metadata?.role || session.user.app_metadata?.role) as UserRole | undefined;

        if (!userRole) {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();

          userRole = profile?.role as UserRole | undefined;
        }

        if (hasRedirected.current) return;
        hasRedirected.current = true;

        if (userRole) {
          const redirectPath = getRedirectPathForRole(userRole);
          window.location.href = redirectPath;
        } else {
          window.location.href = '/auth/complete-profile';
        }
      }
    };

    // Small delay to allow Supabase to process hash fragment
    const timeout = setTimeout(checkExistingSession, 100);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [router]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="text-red-600 dark:text-red-400 mb-4">{error}</div>
          <p className="text-gray-600 dark:text-gray-400">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-frc-blue mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">Completing sign in...</p>
      </div>
    </div>
  );
}
