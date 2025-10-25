/**
 * USAGE EXAMPLE - EventSelector and TeamSelector
 *
 * This file demonstrates how to use the EventSelector and TeamSelector
 * components together in a pit scouting form.
 *
 * Copy this pattern into your actual pit scouting form component.
 */

'use client';

import { useState } from 'react';
import { EventSelector } from './EventSelector';
import { TeamSelector } from './TeamSelector';
import type { Event, Team } from '@/types';

export default function PitScoutingFormExample() {
  // State for event selection
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [event, setEvent] = useState<Event | null>(null);

  // State for team selection
  const [selectedTeam, setSelectedTeam] = useState<number | null>(null);
  const [team, setTeam] = useState<Team | null>(null);

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Pit Scouting Form
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Select an event and team to begin collecting pit scouting data
        </p>
      </div>

      {/* Event and Team Selection */}
      <div className="space-y-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          Event & Team Selection
        </h2>

        {/* Event Selector */}
        <EventSelector
          value={selectedEvent}
          onChange={(eventKey, eventData) => {
            setSelectedEvent(eventKey);
            setEvent(eventData);
            // Reset team selection when event changes
            setSelectedTeam(null);
            setTeam(null);
          }}
          year={2025}
        />

        {/* Team Selector */}
        <TeamSelector
          eventKey={selectedEvent}
          value={selectedTeam}
          onChange={(teamNumber, teamData) => {
            setSelectedTeam(teamNumber);
            setTeam(teamData);
          }}
        />
      </div>

      {/* Display Selected Information */}
      {event && team && (
        <div className="rounded-lg border border-green-300 bg-green-50 p-6 dark:border-green-800 dark:bg-green-900/20">
          <h3 className="text-lg font-semibold text-green-800 dark:text-green-300">
            Ready to Scout
          </h3>

          <div className="mt-4 space-y-2">
            <div>
              <span className="text-sm font-medium text-green-700 dark:text-green-400">
                Event:
              </span>
              <p className="text-base text-green-900 dark:text-green-200">
                {event.event_name} ({event.event_key})
              </p>
              <p className="text-sm text-green-700 dark:text-green-400">
                {event.city}, {event.state_province}
                {' • '}
                {new Date(event.start_date).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            </div>

            <div className="mt-4">
              <span className="text-sm font-medium text-green-700 dark:text-green-400">
                Team:
              </span>
              <p className="text-base text-green-900 dark:text-green-200">
                {team.team_number} - {team.team_nickname || team.team_name}
              </p>
              <p className="text-sm text-green-700 dark:text-green-400">
                {team.city}, {team.state_province}, {team.country}
                {team.rookie_year && ` • Rookie Year: ${team.rookie_year}`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Placeholder for Pit Scouting Form Fields */}
      {selectedEvent && selectedTeam && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-100">
            Robot Information
          </h2>

          <p className="text-gray-600 dark:text-gray-400">
            Pit scouting form fields would go here...
          </p>

          {/* Example: Add your pit scouting sections here */}
          {/*
          <RobotCapabilitiesSection ... />
          <AutonomousCapabilitiesSection ... />
          <PhysicalSpecsSection ... />
          <ImageUploadSection ... />
          */}
        </div>
      )}

      {/* Action Buttons */}
      {selectedEvent && selectedTeam && (
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            onClick={() => {
              setSelectedEvent(null);
              setEvent(null);
              setSelectedTeam(null);
              setTeam(null);
            }}
          >
            Reset
          </button>
          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            Submit Pit Scouting Report
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * KEY POINTS:
 *
 * 1. State Management:
 *    - Store both the ID (event_key, team_number) AND the full object
 *    - This gives you immediate access to details without re-fetching
 *
 * 2. Event Change Handling:
 *    - When event changes, reset team selection
 *    - TeamSelector automatically handles this via useEventTeams hook
 *
 * 3. Conditional Rendering:
 *    - Show form sections only when both event and team are selected
 *    - Provide clear feedback about what's selected
 *
 * 4. Type Safety:
 *    - All state is fully typed with Event and Team interfaces
 *    - No need for type assertions or 'any' types
 *
 * 5. User Experience:
 *    - Display full event and team details after selection
 *    - Provide reset functionality
 *    - Show clear state transitions
 */
