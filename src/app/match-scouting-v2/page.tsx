'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { MatchScoutingProvider } from '@/contexts/MatchScoutingContext';
import { MatchScoutingInterface } from '@/components/match-scouting-v2/MatchScoutingInterface';

/**
 * Match Scouting V2 Page - Contextual Field-Based Interface
 *
 * Protected page that allows authenticated users to submit match scouting data
 * using a spatial, no-scroll interface where buttons exist at field locations.
 */
export default function MatchScoutingV2Page() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render anything if not authenticated (redirect is in progress)
  if (!user) {
    return null;
  }

  return (
    <MatchScoutingProvider>
      <MatchScoutingInterface />
    </MatchScoutingProvider>
  );
}
