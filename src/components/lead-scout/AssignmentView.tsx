'use client';

import type {
  StationKey,
  StationAssignment,
  ScouterPresenceState,
  MatchOrchestrationState,
} from '@/types/scouting-session';
import { ALL_STATION_KEYS } from '@/types/scouting-session';
import { Button } from '@/components/ui/button';
import { StationSlot } from './StationSlot';

interface AssignmentViewProps {
  matchNumber: number;
  orchestration: MatchOrchestrationState;
  connectedScouters: ScouterPresenceState[];
  /** Whether team numbers are editable (manual event) */
  isManualEvent: boolean;
  onAssignScouter: (stationKey: StationKey, userId: string, scoutName: string) => void;
  onTeamNumberChange: (stationKey: StationKey, teamNumber: number | null) => void;
  onPrestartMatch: () => void;
  onCancel: () => void;
}

const RED_STATIONS: StationKey[] = ['red_1', 'red_2', 'red_3'];
const BLUE_STATIONS: StationKey[] = ['blue_1', 'blue_2', 'blue_3'];

export function AssignmentView({
  matchNumber,
  orchestration,
  connectedScouters,
  isManualEvent,
  onAssignScouter,
  onTeamNumberChange,
  onPrestartMatch,
  onCancel,
}: AssignmentViewProps) {
  // Scouters already assigned to a station
  const assignedUserIds = new Set(
    ALL_STATION_KEYS
      .map((k) => orchestration.assignments[k]?.user_id)
      .filter(Boolean) as string[]
  );

  // Available scouters = connected, not clocked out, not already assigned
  const availableScouters = connectedScouters.filter(
    (s) =>
      !orchestration.clocked_out.includes(s.userId) &&
      !assignedUserIds.has(s.userId)
  );

  // Can prestart if at least one station has both a team and a scouter
  const hasAnyAssignment = ALL_STATION_KEYS.some((key) => {
    const a = orchestration.assignments[key];
    return a && a.team_number > 0 && a.user_id;
  });

  function renderStationGroup(label: string, stations: StationKey[], colorClass: string) {
    return (
      <div>
        <h3 className={`text-sm font-bold mb-2 ${colorClass}`}>{label}</h3>
        <div className="space-y-2">
          {stations.map((key) => (
            <StationSlot
              key={key}
              stationKey={key}
              assignment={orchestration.assignments[key]}
              teamEditable={isManualEvent}
              availableScouters={[
                // Include the currently assigned scouter so they show in the dropdown
                ...connectedScouters.filter(
                  (s) => s.userId === orchestration.assignments[key]?.user_id
                ),
                ...availableScouters,
              ]}
              onAssignScouter={(userId, scoutName) =>
                onAssignScouter(key, userId, scoutName)
              }
              onTeamNumberChange={(teamNumber) =>
                onTeamNumberChange(key, teamNumber)
              }
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-slate-200">
        Match {matchNumber} — Assigning Stations
      </h2>

      {renderStationGroup('Red Alliance', RED_STATIONS, 'text-red-400')}
      {renderStationGroup('Blue Alliance', BLUE_STATIONS, 'text-blue-400')}

      {availableScouters.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-slate-500 mb-1">
            Available: {availableScouters.map((s) => s.scoutName).join(', ')}
          </h3>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <Button
          size="lg"
          onClick={onPrestartMatch}
          disabled={!hasAnyAssignment}
          className="flex-1 py-5 text-lg font-bold bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40"
        >
          Prestart Match
        </Button>
        <Button
          variant="outline"
          onClick={onCancel}
          className="border-slate-600 text-slate-300"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
