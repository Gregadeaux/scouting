'use client';

import type { ScouterPresenceState } from '@/types/scouting-session';
import { ScouterChip } from './ScouterChip';

interface ScouterPoolProps {
  scouters: ScouterPresenceState[];
  clockedOut: string[];
  onRestoreScouter?: (userId: string) => void;
  onClockOutScouter?: (userId: string) => void;
}

export function ScouterPool({ scouters, clockedOut, onRestoreScouter, onClockOutScouter }: ScouterPoolProps) {
  const activeScouters = scouters.filter((s) => !clockedOut.includes(s.userId));
  const clockedOutScouters = scouters.filter((s) => clockedOut.includes(s.userId));

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium text-slate-400 mb-2">
          Connected: {activeScouters.length} scouter{activeScouters.length !== 1 ? 's' : ''}
        </h3>
        <div className="space-y-1.5">
          {activeScouters.length === 0 && (
            <p className="text-sm text-slate-500 py-2">No scouters connected</p>
          )}
          {activeScouters.map((scouter) => (
            <div key={scouter.userId} className="flex items-center gap-2">
              <ScouterChip
                name={scouter.scoutName}
                status={scouter.status}
                className="flex-1"
              />
              {onClockOutScouter && (
                <button
                  type="button"
                  onClick={() => onClockOutScouter(scouter.userId)}
                  className="text-xs text-slate-500 hover:text-red-400 transition-colors px-2 py-1"
                >
                  Clock Out
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {clockedOutScouters.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-slate-500 mb-2">
            Clocked Out: {clockedOutScouters.length}
          </h3>
          <div className="space-y-1.5">
            {clockedOutScouters.map((scouter) => (
              <div key={scouter.userId} className="flex items-center gap-2">
                <ScouterChip
                  name={scouter.scoutName}
                  status="offline"
                  className="flex-1 opacity-60"
                />
                {onRestoreScouter && (
                  <button
                    type="button"
                    onClick={() => onRestoreScouter(scouter.userId)}
                    className="text-xs text-slate-500 hover:text-cyan-400 transition-colors px-2 py-1"
                  >
                    Restore
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
