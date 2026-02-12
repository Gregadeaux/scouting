'use client';

import type {
  StationKey,
  MatchOrchestrationState,
  ScouterPresenceState,
} from '@/types/scouting-session';
import { ALL_STATION_KEYS } from '@/types/scouting-session';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { StationSlot } from './StationSlot';

interface MonitoringViewProps {
  matchNumber: number;
  orchestration: MatchOrchestrationState;
  connectedScouters: ScouterPresenceState[];
  onPrepareNextMatch: () => void;
}

const RED_STATIONS: StationKey[] = ['red_1', 'red_2', 'red_3'];
const BLUE_STATIONS: StationKey[] = ['blue_1', 'blue_2', 'blue_3'];

export function MonitoringView({
  matchNumber,
  orchestration,
  connectedScouters,
  onPrepareNextMatch,
}: MonitoringViewProps) {
  // Build presence lookup
  const presenceMap = new Map<string, ScouterPresenceState['status']>();
  for (const s of connectedScouters) {
    presenceMap.set(s.userId, s.status);
  }

  // Count submissions — check both session_data and presence status
  const assignedStations = ALL_STATION_KEYS.filter(
    (k) => orchestration.assignments[k]?.user_id
  );
  const submittedCount = assignedStations.filter((k) => {
    if (orchestration.submissions[k]?.submitted) return true;
    const uid = orchestration.assignments[k]?.user_id;
    return uid ? presenceMap.get(uid) === 'submitted' : false;
  }).length;
  const totalAssigned = assignedStations.length;
  const allSubmitted = totalAssigned > 0 && submittedCount === totalAssigned;

  function renderStationGroup(label: string, stations: StationKey[], colorClass: string) {
    return (
      <div>
        <h3 className={`text-sm font-bold mb-2 ${colorClass}`}>{label}</h3>
        <div className="space-y-2">
          {stations.map((key) => {
            const assignment = orchestration.assignments[key];
            return (
              <StationSlot
                key={key}
                stationKey={key}
                assignment={assignment}
                submission={orchestration.submissions[key]}
                presenceStatus={
                  assignment?.user_id
                    ? presenceMap.get(assignment.user_id)
                    : undefined
                }
                readOnly
              />
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-200">
          Match {matchNumber} — In Progress
        </h2>
        <span className="flex items-center gap-1.5 text-sm">
          <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-green-400">Live</span>
        </span>
      </div>

      {renderStationGroup('Red Alliance', RED_STATIONS, 'text-red-400')}
      {renderStationGroup('Blue Alliance', BLUE_STATIONS, 'text-blue-400')}

      <div className="text-center text-sm text-slate-400">
        Submitted: {submittedCount}/{totalAssigned}
      </div>

      <Button
        size="lg"
        onClick={onPrepareNextMatch}
        className={cn(
          'w-full py-5 text-lg font-bold',
          allSubmitted
            ? 'bg-cyan-600 hover:bg-cyan-500'
            : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
        )}
      >
        Prepare Match {matchNumber + 1}
      </Button>
    </div>
  );
}
