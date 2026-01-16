'use client';

/**
 * OAuth Callback Page
 * Handles the redirect from OAuth providers (Google, etc.)
 * Processes the hash fragment tokens and redirects based on user role
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { getRedirectPathForRole } from '@/lib/services/redirect.service';
import type { UserRole } from '@/types/auth';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Supabase client automatically detects and processes hash fragment tokens
        // when detectSessionInUrl is true (which it is in our client config)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('Error getting session:', sessionError);
          setError(sessionError.message);
          return;
        }

        if (session) {
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

          if (userRole) {
            const redirectPath = getRedirectPathForRole(userRole);
            router.replace(redirectPath);
          } else {
            // User has no role - redirect to complete profile
            router.replace('/auth/complete-profile');
          }
        } else {
          // No session - redirect to login
          setError('Authentication failed. Please try again.');
          setTimeout(() => {
            router.replace('/auth/login');
          }, 2000);
        }
      } catch (err) {
        console.error('Callback error:', err);
        setError('An unexpected error occurred. Please try again.');
      }
    };

    handleCallback();
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
