'use client';

import type { ScouterPresenceState } from '@/types/scouting-session';
import { Button } from '@/components/ui/button';
import { ScouterPool } from './ScouterPool';

interface PrepareMatchViewProps {
  nextMatchNumber: number;
  connectedScouters: ScouterPresenceState[];
  clockedOut: string[];
  onPrepareMatch: () => void;
  onClockOutScouter: (userId: string) => void;
  onRestoreScouter: (userId: string) => void;
}

export function PrepareMatchView({
  nextMatchNumber,
  connectedScouters,
  clockedOut,
  onPrepareMatch,
  onClockOutScouter,
  onRestoreScouter,
}: PrepareMatchViewProps) {
  return (
    <div className="space-y-6">
      <div className="flex justify-center py-4">
        <Button
          size="lg"
          onClick={onPrepareMatch}
          className="px-8 py-6 text-lg font-bold bg-cyan-600 hover:bg-cyan-500"
        >
          Prepare Match {nextMatchNumber}
        </Button>
      </div>

      <ScouterPool
        scouters={connectedScouters}
        clockedOut={clockedOut}
        onClockOutScouter={onClockOutScouter}
        onRestoreScouter={onRestoreScouter}
      />
    </div>
  );
}
