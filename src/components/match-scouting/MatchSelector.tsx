'use client';

import { useMatches } from '@/hooks/useMatches';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { MatchSchedule } from '@/types';

interface MatchSelectorProps {
  eventKey: string | null;
  value: string | null;
  onChange: (matchKey: string | null, match: MatchSchedule | null) => void;
  disabled?: boolean;
}

/**
 * MatchSelector Component
 *
 * Dropdown to select a match from an event's match schedule.
 * Only fetches matches when an event is selected.
 * Displays match type (Qualification, Quarterfinal, Semifinal, Final) and number.
 *
 * @example
 * ```tsx
 * const [selectedMatch, setSelectedMatch] = useState<string | null>(null);
 * const [match, setMatch] = useState<MatchSchedule | null>(null);
 *
 * <MatchSelector
 *   eventKey={selectedEventKey}
 *   value={selectedMatch}
 *   onChange={(matchKey, match) => {
 *     setSelectedMatch(matchKey);
 *     setMatch(match);
 *   }}
 * />
 * ```
 */
export function MatchSelector({
  eventKey,
  value,
  onChange,
  disabled = false,
}: MatchSelectorProps) {
  const { data: matches, isLoading, error } = useMatches({ eventKey, limit: 500 });

  // Handle "no event selected" state
  if (!eventKey) {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-400 dark:text-gray-500">
          Select Match
        </label>
        <select
          disabled
          className="block w-full rounded-lg border border-gray-300 bg-gray-100 px-4 py-2 text-base text-gray-500 shadow-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400"
        >
          <option>Select an event first</option>
        </select>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Choose an event above to see available matches
        </p>
      </div>
    );
  }

  // Handle error state
  if (error) {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Select Match
        </label>
        <div className="rounded-lg border border-red-300 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-sm text-red-600 dark:text-red-400">
            Failed to load matches: {error.message}
          </p>
        </div>
      </div>
    );
  }

  // Handle change event
  const handleChange = (matchKey: string) => {
    if (matchKey === '' || matchKey === '__placeholder__') {
      onChange(null, null);
    } else {
      const selectedMatch = matches.find((match) => match.match_key === matchKey);
      onChange(matchKey, selectedMatch || null);
    }
  };

  // Format competition level for display
  const formatCompLevel = (compLevel: string): string => {
    const compLevelMap: Record<string, string> = {
      qm: 'Qual',
      ef: 'Eighths',
      qf: 'Quarters',
      sf: 'Semis',
      f: 'Finals',
    };
    return compLevelMap[compLevel] || compLevel.toUpperCase();
  };

  // Format match display string
  const formatMatchLabel = (match: MatchSchedule): string => {
    const compLevel = formatCompLevel(match.comp_level);
    const matchNum = match.match_number;
    const set = match.set_number ? `Set ${match.set_number} - ` : '';
    return `${compLevel} ${set}Match ${matchNum}`;
  };

  // Sort matches by comp level priority, then match number
  const compLevelPriority: Record<string, number> = {
    qm: 1,
    ef: 2,
    qf: 3,
    sf: 4,
    f: 5,
  };

  const sortedMatches = [...(matches || [])].sort((a, b) => {
    const priorityA = compLevelPriority[a.comp_level] || 0;
    const priorityB = compLevelPriority[b.comp_level] || 0;

    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }

    // Within same comp level, sort by match number
    return a.match_number - b.match_number;
  });

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        Select Match
      </label>
      <Select
        value={value || ''}
        onValueChange={handleChange}
        disabled={disabled || isLoading}
      >
        <SelectTrigger>
          <SelectValue placeholder="-- Select a match --" />
        </SelectTrigger>
        <SelectContent>
          {sortedMatches.map((match) => (
            <SelectItem key={match.match_key} value={match.match_key}>
              {formatMatchLabel(match)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Loading state */}
      {isLoading && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Loading matches for this event...
        </p>
      )}

      {/* Empty state */}
      {!isLoading && matches.length === 0 && (
        <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-900/20">
          <p className="text-sm text-yellow-700 dark:text-yellow-400">
            No matches found for this event. The schedule may not be imported yet.
          </p>
          <p className="mt-1 text-xs text-yellow-600 dark:text-yellow-500">
            Contact an admin to import the match schedule from The Blue Alliance.
          </p>
        </div>
      )}

      {/* Success state with match count */}
      {!isLoading && !error && matches.length > 0 && (
        <p className="text-xs text-gray-400 dark:text-gray-500">
          {matches.length} match{matches.length !== 1 ? 'es' : ''} in schedule
        </p>
      )}
    </div>
  );
}
