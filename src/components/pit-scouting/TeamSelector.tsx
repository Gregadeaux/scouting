'use client';

import { useEventTeams } from '@/hooks/useEventTeams';
import { Select } from '@/components/ui/Select';
import type { Team } from '@/types';

interface TeamSelectorProps {
  eventKey: string | null;
  value: number | null;
  onChange: (teamNumber: number | null, team: Team | null) => void;
  disabled?: boolean;
}

/**
 * TeamSelector Component
 *
 * Dropdown to select a team from an event roster.
 * Only fetches teams when an event is selected.
 * Automatically resets when event changes.
 *
 * @example
 * ```tsx
 * const [selectedTeam, setSelectedTeam] = useState<number | null>(null);
 * const [team, setTeam] = useState<Team | null>(null);
 *
 * <TeamSelector
 *   eventKey={selectedEvent}
 *   value={selectedTeam}
 *   onChange={(teamNumber, team) => {
 *     setSelectedTeam(teamNumber);
 *     setTeam(team);
 *   }}
 * />
 * ```
 */
export function TeamSelector({
  eventKey,
  value,
  onChange,
  disabled = false,
}: TeamSelectorProps) {
  const { data: teams, isLoading, error } = useEventTeams(eventKey);

  // Handle "no event selected" state
  if (!eventKey) {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-400 dark:text-gray-500">
          Select Team
        </label>
        <select
          disabled
          className="block w-full rounded-lg border border-gray-300 bg-gray-100 px-4 py-2 text-base text-gray-500 shadow-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400"
        >
          <option>Select an event first</option>
        </select>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Choose an event above to see available teams
        </p>
      </div>
    );
  }

  // Handle error state
  if (error) {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Select Team
        </label>
        <div className="rounded-lg border border-red-300 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-sm text-red-600 dark:text-red-400">
            Failed to load teams: {error.message}
          </p>
        </div>
      </div>
    );
  }

  // Handle change event
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const teamNumberStr = e.target.value;

    if (teamNumberStr === '') {
      onChange(null, null);
    } else {
      const teamNumber = parseInt(teamNumberStr, 10);
      const selectedTeam = teams.find((team) => team.team_number === teamNumber);
      onChange(teamNumber, selectedTeam || null);
    }
  };

  // Build options array for Select component
  const options = (teams || []).map((team) => ({
    value: team.team_number,
    label: `${team.team_number} - ${team.team_nickname || team.team_name}`,
  }));

  // Sort teams by team number
  options.sort((a, b) => (a.value as number) - (b.value as number));

  return (
    <div className="space-y-2">
      <Select
        label="Select Team"
        value={value?.toString() || ''}
        onChange={handleChange}
        options={options}
        placeholder="-- Select a team --"
        disabled={disabled || isLoading}
      />

      {/* Loading state */}
      {isLoading && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Loading teams for this event...
        </p>
      )}

      {/* Empty state */}
      {!isLoading && teams.length === 0 && (
        <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-900/20">
          <p className="text-sm text-yellow-700 dark:text-yellow-400">
            No teams found for this event. The roster may not be imported yet.
          </p>
          <p className="mt-1 text-xs text-yellow-600 dark:text-yellow-500">
            Contact an admin to import the team roster from The Blue Alliance.
          </p>
        </div>
      )}

      {/* Success state with team count */}
      {!isLoading && !error && teams.length > 0 && (
        <p className="text-xs text-gray-400 dark:text-gray-500">
          {teams.length} team{teams.length !== 1 ? 's' : ''} at this event
        </p>
      )}
    </div>
  );
}
