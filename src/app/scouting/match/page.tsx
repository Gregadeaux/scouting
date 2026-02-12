'use client';

import { useAuth } from '@/contexts/AuthContext';
import { MatchScoutingForm2026 } from '@/components/match-scouting/2026/MatchScoutingForm2026';

/**
 * Match Scouting 2026 Page
 *
 * Auth is handled by the scouting layout.
 * Event selection is handled by ScouterEventContext.
 */
export default function MatchScouting2026Page() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const scoutName = user.profile?.full_name || user.profile?.preferred_scout_name || user.auth?.email?.split('@')[0] || 'Unknown Scout';

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950">
      <MatchScoutingForm2026
        userId={user.auth.id}
        scoutName={scoutName}
        onSubmitSuccess={(data) => {
          console.log('Match scouting submitted:', data);
        }}
      />
    </div>
  );
}
