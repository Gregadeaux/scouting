'use client';

import { MatchScoutingForm2026 } from '@/components/match-scouting/2026/MatchScoutingForm2026';

/**
 * Match Scouting 2026 Demo Page - No Authentication Required
 *
 * This page allows testing the 2026 match scouting form without logging in.
 * Click "Try Demo" in the form to use demo mode with mock data.
 */
export default function MatchScouting2026DemoPage() {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950">
      <MatchScoutingForm2026
        userId="demo-user-id"
        scoutName="Demo Scout"
        onSubmitSuccess={(data) => {
          console.log('Demo submission:', data);
        }}
      />
    </div>
  );
}
