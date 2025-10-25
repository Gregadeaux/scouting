'use client';

import { useEvents } from '@/hooks/useEvents';
import { Select } from '@/components/ui/Select';
import type { Event } from '@/types';

interface EventSelectorProps {
  value: string | null;
  onChange: (eventKey: string | null, event: Event | null) => void;
  year?: number;
  disabled?: boolean;
}

/**
 * EventSelector Component
 *
 * Dropdown to select an FRC event, filtered by year.
 * Loads events using useEvents hook and displays them with formatted dates.
 *
 * @example
 * ```tsx
 * const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
 * const [event, setEvent] = useState<Event | null>(null);
 *
 * <EventSelector
 *   value={selectedEvent}
 *   onChange={(eventKey, event) => {
 *     setSelectedEvent(eventKey);
 *     setEvent(event);
 *   }}
 *   year={2025}
 * />
 * ```
 */
export function EventSelector({
  value,
  onChange,
  year = 2025,
  disabled = false,
}: EventSelectorProps) {
  const { data: events, isLoading, error } = useEvents({ year, limit: 100 });

  // Handle error state
  if (error) {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Select Event
        </label>
        <div className="rounded-lg border border-red-300 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-sm text-red-600 dark:text-red-400">
            Failed to load events: {error.message}
          </p>
        </div>
      </div>
    );
  }

  // Handle change event
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const eventKey = e.target.value;

    if (eventKey === '') {
      onChange(null, null);
    } else {
      const selectedEvent = events.find((event) => event.event_key === eventKey);
      onChange(eventKey, selectedEvent || null);
    }
  };

  // Format date for display (e.g., "Jan 15")
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  // Build options array for Select component
  const options = (events || []).map((event) => ({
    value: event.event_key,
    label: `${event.event_name} (${event.event_key}) - ${formatDate(event.start_date)}`,
  }));

  return (
    <div className="space-y-2">
      <Select
        label="Select Event"
        value={value || ''}
        onChange={handleChange}
        options={options}
        placeholder="-- Select an event --"
        disabled={disabled || isLoading}
      />

      {/* Loading state */}
      {isLoading && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Loading events for {year}...
        </p>
      )}

      {/* Empty state */}
      {!isLoading && events.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No events found for {year}. Check back later or contact an admin to import event data.
        </p>
      )}

      {/* Success state with event count */}
      {!isLoading && !error && events.length > 0 && (
        <p className="text-xs text-gray-400 dark:text-gray-500">
          {events.length} event{events.length !== 1 ? 's' : ''} available
        </p>
      )}
    </div>
  );
}
