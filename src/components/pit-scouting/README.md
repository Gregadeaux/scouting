# Pit Scouting Components

React components for FRC pit scouting data collection.

## Components

### EventSelector

Dropdown component to select an FRC event, filtered by year.

**Props:**
- `value: string | null` - Currently selected event key
- `onChange: (eventKey: string | null, event: Event | null) => void` - Callback when selection changes
- `year?: number` - Year to filter events (default: 2025)
- `disabled?: boolean` - Disable the selector

**Features:**
- Loads events using `useEvents` hook
- Formats dates nicely (e.g., "Jan 15")
- Shows loading, error, and empty states
- Displays event count
- Returns both event key and full Event object

**Example:**
```tsx
import { EventSelector } from '@/components/pit-scouting';

const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
const [event, setEvent] = useState<Event | null>(null);

<EventSelector
  value={selectedEvent}
  onChange={(eventKey, event) => {
    setSelectedEvent(eventKey);
    setEvent(event);
  }}
  year={2025}
/>
```

---

### TeamSelector

Dropdown component to select a team from an event roster.

**Props:**
- `eventKey: string | null` - The selected event (required to load teams)
- `value: number | null` - Currently selected team number
- `onChange: (teamNumber: number | null, team: Team | null) => void` - Callback when selection changes
- `disabled?: boolean` - Disable the selector

**Features:**
- Loads teams using `useEventTeams` hook
- Only fetches when event is selected
- Automatically resets when event changes
- Shows "select event first" message when no event
- Shows loading, error, and empty states
- Sorts teams by number
- Returns both team number and full Team object

**Example:**
```tsx
import { TeamSelector } from '@/components/pit-scouting';

const [selectedTeam, setSelectedTeam] = useState<number | null>(null);
const [team, setTeam] = useState<Team | null>(null);

<TeamSelector
  eventKey={selectedEvent}
  value={selectedTeam}
  onChange={(teamNumber, team) => {
    setSelectedTeam(teamNumber);
    setTeam(team);
  }}
/>
```

---

## Complete Example: Pit Scouting Form

```tsx
'use client';

import { useState } from 'react';
import { EventSelector, TeamSelector } from '@/components/pit-scouting';
import type { Event, Team } from '@/types';

export default function PitScoutingPage() {
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [event, setEvent] = useState<Event | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<number | null>(null);
  const [team, setTeam] = useState<Team | null>(null);

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="mb-6 text-3xl font-bold">Pit Scouting</h1>

      <div className="space-y-6">
        {/* Event Selection */}
        <EventSelector
          value={selectedEvent}
          onChange={(eventKey, event) => {
            setSelectedEvent(eventKey);
            setEvent(event);
            // Reset team when event changes
            setSelectedTeam(null);
            setTeam(null);
          }}
          year={2025}
        />

        {/* Team Selection */}
        <TeamSelector
          eventKey={selectedEvent}
          value={selectedTeam}
          onChange={(teamNumber, team) => {
            setSelectedTeam(teamNumber);
            setTeam(team);
          }}
        />

        {/* Show selected info */}
        {event && team && (
          <div className="rounded-lg border border-green-300 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
            <h2 className="text-lg font-semibold text-green-800 dark:text-green-300">
              Ready to Scout
            </h2>
            <p className="mt-2 text-sm text-green-700 dark:text-green-400">
              Event: {event.event_name}
            </p>
            <p className="text-sm text-green-700 dark:text-green-400">
              Team: {team.team_number} - {team.team_nickname || team.team_name}
            </p>
          </div>
        )}

        {/* Pit scouting form fields would go here */}
      </div>
    </div>
  );
}
```

---

## State Management Pattern

Both components follow the same pattern:
1. Accept a `value` prop for controlled component behavior
2. Call `onChange` with **both** the ID (event_key/team_number) **and** the full object
3. This allows parent components to:
   - Store just the ID for form submission
   - Access full object details for display/validation

**Why return both?**
- **ID**: Needed for database operations and API calls
- **Full Object**: Provides immediate access to name, location, etc. without additional lookups

---

## Accessibility

Both components include:
- Proper `<label>` elements with semantic HTML
- Disabled states with appropriate styling
- Error messaging with clear contrast
- Loading indicators for better UX
- Keyboard navigation support (native `<select>`)

---

## Testing Checklist

- [ ] Events load correctly for specified year
- [ ] Teams load when event is selected
- [ ] Team selector resets when event changes
- [ ] Error states display properly
- [ ] Empty states show helpful messages
- [ ] Loading states appear during fetch
- [ ] Keyboard navigation works
- [ ] Dark mode styling looks good
- [ ] Mobile responsive layout works

---

## Dependencies

- `@/hooks/useEvents` - Fetches events from API
- `@/hooks/useEventTeams` - Fetches teams for an event
- `@/components/ui/Select` - Styled select component
- `@/types` - TypeScript interfaces for Event and Team

---

## Future Enhancements

Potential improvements:
- Search/filter functionality for large event lists
- Autocomplete for team selection
- Recently selected events/teams
- Favorite events
- Team info preview on hover
- Validation messages
- Required field indicators
