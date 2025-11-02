'use client';

import { Select } from '@/components/ui/Select';
import type { MatchSchedule } from '@/types';

interface MatchTeamSelectorProps {
  match: MatchSchedule | null;
  value: number | null;
  onChange: (teamNumber: number | null, allianceColor: 'red' | 'blue' | null, position: 1 | 2 | 3 | null) => void;
  disabled?: boolean;
}

/**
 * MatchTeamSelector Component
 *
 * Dropdown to select a team from a specific match's roster.
 * Displays all 6 teams (3 red, 3 blue) with alliance color indicators.
 * Automatically determines alliance color and position for selected team.
 *
 * @example
 * ```tsx
 * const [selectedTeam, setSelectedTeam] = useState<number | null>(null);
 * const [allianceColor, setAllianceColor] = useState<'red' | 'blue' | null>(null);
 * const [position, setPosition] = useState<1 | 2 | 3 | null>(null);
 *
 * <MatchTeamSelector
 *   match={selectedMatch}
 *   value={selectedTeam}
 *   onChange={(teamNumber, color, pos) => {
 *     setSelectedTeam(teamNumber);
 *     setAllianceColor(color);
 *     setPosition(pos);
 *   }}
 * />
 * ```
 */
export function MatchTeamSelector({
  match,
  value,
  onChange,
  disabled = false,
}: MatchTeamSelectorProps) {
  // Handle "no match selected" state
  if (!match) {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-400 dark:text-gray-500">
          Select Team to Scout
        </label>
        <select
          disabled
          className="block w-full rounded-lg border border-gray-300 bg-gray-100 px-4 py-2 text-base text-gray-500 shadow-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400"
        >
          <option>Select a match first</option>
        </select>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Choose a match above to see teams in that match
        </p>
      </div>
    );
  }

  // Build team options from match data
  interface TeamOption {
    teamNumber: number;
    allianceColor: 'red' | 'blue';
    position: 1 | 2 | 3;
    label: string;
  }

  const teams: TeamOption[] = [];

  // Red alliance
  if (match.red_1) teams.push({ teamNumber: match.red_1, allianceColor: 'red', position: 1, label: `🔴 Red 1: Team ${match.red_1}` });
  if (match.red_2) teams.push({ teamNumber: match.red_2, allianceColor: 'red', position: 2, label: `🔴 Red 2: Team ${match.red_2}` });
  if (match.red_3) teams.push({ teamNumber: match.red_3, allianceColor: 'red', position: 3, label: `🔴 Red 3: Team ${match.red_3}` });

  // Blue alliance
  if (match.blue_1) teams.push({ teamNumber: match.blue_1, allianceColor: 'blue', position: 1, label: `🔵 Blue 1: Team ${match.blue_1}` });
  if (match.blue_2) teams.push({ teamNumber: match.blue_2, allianceColor: 'blue', position: 2, label: `🔵 Blue 2: Team ${match.blue_2}` });
  if (match.blue_3) teams.push({ teamNumber: match.blue_3, allianceColor: 'blue', position: 3, label: `🔵 Blue 3: Team ${match.blue_3}` });

  // Handle change event
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const teamNumberStr = e.target.value;

    if (teamNumberStr === '') {
      onChange(null, null, null);
    } else {
      const teamNumber = parseInt(teamNumberStr, 10);
      const teamInfo = teams.find((t) => t.teamNumber === teamNumber);

      if (teamInfo) {
        onChange(teamInfo.teamNumber, teamInfo.allianceColor, teamInfo.position);
      } else {
        onChange(null, null, null);
      }
    }
  };

  // Build options array for Select component
  const options = teams.map((team) => ({
    value: team.teamNumber,
    label: team.label,
  }));

  // Handle case where match has no teams assigned
  if (teams.length === 0) {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Select Team to Scout
        </label>
        <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-900/20">
          <p className="text-sm text-yellow-700 dark:text-yellow-400">
            No teams assigned to this match yet.
          </p>
          <p className="mt-1 text-xs text-yellow-600 dark:text-yellow-500">
            The match schedule may be incomplete. Contact an admin to reimport from The Blue Alliance.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Select
        label="Select Team to Scout"
        value={value?.toString() || ''}
        onChange={handleChange}
        options={options}
        placeholder="-- Select a team --"
        disabled={disabled}
      />

      {/* Success state with team count */}
      <p className="text-xs text-gray-400 dark:text-gray-500">
        {teams.length} team{teams.length !== 1 ? 's' : ''} in this match
      </p>
    </div>
  );
}
