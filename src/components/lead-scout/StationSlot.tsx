'use client';

import type { StationKey, StationAssignment, MatchSubmissionStatus, ScouterPresenceState } from '@/types/scouting-session';
import { stationLabel, parseStationKey } from '@/types/scouting-session';
import { cn } from '@/lib/utils';

interface StationSlotProps {
  stationKey: StationKey;
  assignment: StationAssignment | null;
  submission?: MatchSubmissionStatus;
  presenceStatus?: ScouterPresenceState['status'];
  /** Whether team number field is editable (manual events) */
  teamEditable?: boolean;
  /** Available scouters for assignment dropdown */
  availableScouters?: ScouterPresenceState[];
  /** Called when scouter is assigned to this station */
  onAssignScouter?: (userId: string, scoutName: string) => void;
  /** Called when team number is entered (manual events) */
  onTeamNumberChange?: (teamNumber: number | null) => void;
  /** Whether the slot is in read-only mode (monitoring) */
  readOnly?: boolean;
}

export function StationSlot({
  stationKey,
  assignment,
  submission,
  presenceStatus,
  teamEditable = false,
  availableScouters = [],
  onAssignScouter,
  onTeamNumberChange,
  readOnly = false,
}: StationSlotProps) {
  const { alliance, position } = parseStationKey(stationKey);
  const label = stationLabel(stationKey);
  const isRed = alliance === 'red';

  // Monitoring mode display
  if (readOnly) {
    return (
      <div className={cn(
        'rounded-lg border p-3',
        isRed ? 'border-red-800 bg-red-950/30' : 'border-blue-800 bg-blue-950/30'
      )}>
        <div className="flex items-center justify-between mb-1">
          <span className={cn(
            'text-sm font-bold',
            isRed ? 'text-red-400' : 'text-blue-400'
          )}>
            {label}: Team {assignment?.team_number ?? '—'}
          </span>
          <span className="text-sm text-slate-400">
            {assignment?.scout_name ?? 'Unassigned'}
          </span>
        </div>
        {assignment && (
          <div className="flex items-center gap-1.5">
            {(submission?.submitted || presenceStatus === 'submitted') ? (
              <>
                <span className="h-2 w-2 rounded-full bg-cyan-500" />
                <span className="text-xs text-cyan-400">
                  Submitted{submission?.submitted_at
                    ? ` (${getTimeAgo(submission.submitted_at)})`
                    : ''}
                </span>
              </>
            ) : (
              <>
                <span className={cn(
                  'h-2 w-2 rounded-full',
                  presenceStatus === 'scouting' ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'
                )} />
                <span className="text-xs text-slate-400">
                  {presenceStatus === 'scouting' ? 'Scouting' : 'Connected'}
                </span>
              </>
            )}
          </div>
        )}
        {!assignment && (
          <span className="text-xs text-slate-600">No scouter assigned</span>
        )}
      </div>
    );
  }

  // Assignment mode
  return (
    <div className={cn(
      'rounded-lg border p-3',
      isRed ? 'border-red-800 bg-red-950/30' : 'border-blue-800 bg-blue-950/30'
    )}>
      <div className="flex items-center gap-3">
        {/* Station label */}
        <span className={cn(
          'text-sm font-bold w-8 shrink-0',
          isRed ? 'text-red-400' : 'text-blue-400'
        )}>
          {label}:
        </span>

        {/* Team number */}
        {teamEditable ? (
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={99999}
            value={assignment?.team_number ?? ''}
            onChange={(e) => {
              const val = e.target.value;
              onTeamNumberChange?.(val ? Number(val) : null);
            }}
            placeholder="Team #"
            className="w-20 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-sm text-slate-200 text-center tabular-nums focus:border-cyan-500 focus:outline-none"
          />
        ) : (
          <span className="w-20 text-sm text-slate-200 text-center tabular-nums">
            {assignment?.team_number ?? '—'}
          </span>
        )}

        {/* Scouter dropdown */}
        <select
          value={assignment?.user_id ?? ''}
          onChange={(e) => {
            const selected = availableScouters.find((s) => s.userId === e.target.value);
            if (selected) {
              onAssignScouter?.(selected.userId, selected.scoutName);
            } else if (e.target.value === '') {
              onAssignScouter?.('', '');
            }
          }}
          className="flex-1 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-sm text-slate-200 focus:border-cyan-500 focus:outline-none"
        >
          <option value="">— Select —</option>
          {availableScouters.map((s) => (
            <option key={s.userId} value={s.userId}>{s.scoutName}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

function getTimeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ago`;
}
