'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MatchScoutingForm } from '@/components/match-scouting/MatchScoutingForm';
import { OfflineBanner } from '@/components/offline/OfflineBanner';
import { SyncStatusIndicator } from '@/components/offline/SyncStatusIndicator';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Match Scouting Page
 *
 * Protected page that allows authenticated users to submit match scouting data.
 * Redirects to login if user is not authenticated.
 *
 * Features:
 * - Auth protection with automatic redirect
 * - Loads MatchScoutingForm with current user data
 * - Shows loading state during auth check
 * - Extracts scout name from user profile (name or email)
 */
export default function MatchScoutingPage() {
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
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-frc-blue border-t-transparent mx-auto"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render anything if not authenticated (redirect is in progress)
  if (!user) {
    return null;
  }

  // Extract scout name from user profile (prefer preferred_scout_name, then display_name, then full_name, then email)
  const scoutName =
    user.profile?.preferred_scout_name ||
    user.profile?.display_name ||
    user.profile?.full_name ||
    user.auth?.email ||
    'Unknown Scout';

  return (
    <div className="min-h-screen bg-background">
      <OfflineBanner />
      <div className="container mx-auto">
        <div className="flex justify-end items-center p-4">
          <SyncStatusIndicator />
        </div>
        <MatchScoutingForm
          userId={user.auth.id}
          scoutName={scoutName}
          onSubmitSuccess={() => {
            // Success is already handled by the form (shows success message)
            // Could add additional behavior here if needed (e.g., toast notification)
          }}
        />
      </div>
    </div>
  );
}
