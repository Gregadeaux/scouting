/**
 * Test page for SCOUT-38 and SCOUT-39 components
 * Access at /test-scouting-components
 */

'use client';

import React from 'react';
import { TeamScoutingHistory } from '@/components/admin/teams/TeamScoutingHistory';
import { MatchScoutingSection } from '@/components/admin/matches/MatchScoutingSection';

export default function TestScoutingComponentsPage() {
  return (
    <div className="container mx-auto p-8 space-y-12">
      <h1 className="text-3xl font-bold mb-8">Scouting Components Test Page</h1>

      {/* SCOUT-39: TeamScoutingHistory */}
      <section className="border-t pt-8">
        <h2 className="text-2xl font-bold mb-4">SCOUT-39: Team Scouting History</h2>
        <p className="text-gray-600 mb-6">
          Testing with Team 930 at event 2025wimu (should show ~11 entries)
        </p>
        <TeamScoutingHistory
          teamNumber={930}
          eventKey="2025wimu"
          showAggregates={true}
        />
      </section>

      {/* SCOUT-38: MatchScoutingSection */}
      <section className="border-t pt-8">
        <h2 className="text-2xl font-bold mb-4">SCOUT-38: Match Scouting Section</h2>
        <p className="text-gray-600 mb-6">
          Testing with Match 2025wimu_qm10 (should show 100% coverage, 3 red + 3 blue teams)
        </p>
        <MatchScoutingSection
          matchKey="2025wimu_qm10"
          eventKey="2025wimu"
        />
      </section>
    </div>
  );
}
