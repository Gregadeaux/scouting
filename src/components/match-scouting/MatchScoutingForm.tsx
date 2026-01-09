'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import type { Event, MatchSchedule } from '@/types';
import type {
  AutoPerformance2025,
  TeleopPerformance2025,
  EndgamePerformance2025,
} from '@/types/season-2025';
import {
  DEFAULT_AUTO_PERFORMANCE_2025,
  DEFAULT_TELEOP_PERFORMANCE_2025,
  DEFAULT_ENDGAME_PERFORMANCE_2025,
} from '@/types/season-2025';

// Offline hooks
import { useOptimisticSubmission, useOfflineStatus } from '@/lib/offline';

// Selectors
import { EventSelector } from '@/components/pit-scouting/EventSelector';
import { MatchSelector } from './MatchSelector';
import { MatchTeamSelector } from './MatchTeamSelector';

// Form Sections
import { AutoPerformanceSection } from './AutoPerformanceSection';
import { TeleopPerformanceSection } from './TeleopPerformanceSection';
import { EndgamePerformanceSection } from './EndgamePerformanceSection';

// UI Components
import { Button } from '@/components/ui/button';
import { FormSection } from '@/components/ui/FormSection';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface MatchScoutingFormProps {
  /**
   * User ID of the scout submitting the form
   */
  userId: string;
  /**
   * Scout name for display and record keeping
   */
  scoutName: string;
  /**
   * Optional callback when form is successfully submitted
   */
  onSubmitSuccess?: (data: unknown) => void;
}

interface OverallMatchFields {
  fouls: number;
  tech_fouls: number;
  yellow_card: boolean;
  red_card: boolean;
  disconnected: boolean;
  disabled: boolean;
  overall_rating: number;
  driver_skill_rating: number;
  notes: string;
}

interface FormState {
  autoPerformance: Partial<AutoPerformance2025>;
  teleopPerformance: Partial<TeleopPerformance2025>;
  endgamePerformance: Partial<EndgamePerformance2025>;
}

/**
 * MatchScoutingForm Component
 *
 * Main aggregator component for match scouting data collection.
 * Provides a comprehensive form for recording robot performance during FRC matches.
 *
 * Features:
 * - Event and match selection with cascading dropdowns
 * - Team selection showing all 6 teams in a match (red/blue alliance)
 * - Autonomous period performance tracking (15s)
 * - Teleoperated period performance tracking (2:15)
 * - Endgame period performance tracking (last 30s)
 * - Overall match observations (fouls, cards, disconnections, ratings)
 * - Mobile-responsive layout for tablet/phone scouting
 * - Form validation with react-hook-form
 * - Automatic alliance color and position detection
 *
 * Data Structure:
 * - Uses JSONB hybrid architecture for flexible season adaptation
 * - Separate sections for each match period (Auto, Teleop, Endgame)
 * - Schema version tracking for future migrations
 * - Type-safe integration with 2025 Reefscape types
 *
 * @example
 * ```tsx
 * <MatchScoutingForm
 *   userId="user-uuid"
 *   scoutName="John Doe"
 *   onSubmitSuccess={(data) => {
 *     console.log('Match data submitted:', data);
 *     // Navigate to next match or show success message
 *   }}
 * />
 * ```
 */
export function MatchScoutingForm({
  userId,
  scoutName,
  onSubmitSuccess,
}: MatchScoutingFormProps) {
  // Offline hooks
  const { submit, isPending, isQueued } = useOptimisticSubmission();
  const { isOffline } = useOfflineStatus();

  // React Hook Form for overall match fields
  const { register, getValues, reset: resetOverallForm } = useForm<OverallMatchFields>({
    defaultValues: {
      fouls: 0,
      tech_fouls: 0,
      yellow_card: false,
      red_card: false,
      disconnected: false,
      disabled: false,
      overall_rating: 3,
      driver_skill_rating: 3,
      notes: '',
    },
  });

  // Selection state
  const [selectedEventKey, setSelectedEventKey] = useState<string | null>(null);
  const [_selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [selectedMatchKey, setSelectedMatchKey] = useState<string | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<MatchSchedule | null>(null);
  const [selectedTeamNumber, setSelectedTeamNumber] = useState<number | null>(null);
  const [allianceColor, setAllianceColor] = useState<'red' | 'blue' | null>(null);
  const [startingPosition, setStartingPosition] = useState<1 | 2 | 3 | null>(null);

  // Form state for each period
  const [formState, setFormState] = useState<FormState>({
    autoPerformance: { ...DEFAULT_AUTO_PERFORMANCE_2025 },
    teleopPerformance: { ...DEFAULT_TELEOP_PERFORMANCE_2025 },
    endgamePerformance: { ...DEFAULT_ENDGAME_PERFORMANCE_2025 },
  });

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Reset form when selections change
  useEffect(() => {
    setFormState({
      autoPerformance: { ...DEFAULT_AUTO_PERFORMANCE_2025 },
      teleopPerformance: { ...DEFAULT_TELEOP_PERFORMANCE_2025 },
      endgamePerformance: { ...DEFAULT_ENDGAME_PERFORMANCE_2025 },
    });
    resetOverallForm();
    setSuccessMessage(null);
    setError(null);
  }, [selectedMatchKey, selectedTeamNumber, resetOverallForm]);

  // Handle event selection
  const handleEventChange = (eventKey: string | null, event: Event | null) => {
    setSelectedEventKey(eventKey);
    setSelectedEvent(event);
    setSelectedMatchKey(null);
    setSelectedMatch(null);
    setSelectedTeamNumber(null);
    setAllianceColor(null);
    setStartingPosition(null);
    setSuccessMessage(null);
    setError(null);
  };

  // Handle match selection
  const handleMatchChange = (matchKey: string | null, match: MatchSchedule | null) => {
    setSelectedMatchKey(matchKey);
    setSelectedMatch(match);
    setSelectedTeamNumber(null);
    setAllianceColor(null);
    setStartingPosition(null);
    setSuccessMessage(null);
    setError(null);
  };

  // Handle team selection
  const handleTeamChange = (
    teamNumber: number | null,
    color: 'red' | 'blue' | null,
    position: 1 | 2 | 3 | null
  ) => {
    setSelectedTeamNumber(teamNumber);
    setAllianceColor(color);
    setStartingPosition(position);
    setSuccessMessage(null);
    setError(null);
  };

  // Handle autonomous performance change
  const handleAutoChange = (key: string, value: unknown) => {
    setFormState((prev) => ({
      ...prev,
      autoPerformance: { ...prev.autoPerformance, [key]: value },
    }));
  };

  // Handle teleop performance change
  const handleTeleopChange = (key: string, value: unknown) => {
    setFormState((prev) => ({
      ...prev,
      teleopPerformance: { ...prev.teleopPerformance, [key]: value },
    }));
  };

  // Handle endgame performance change
  const handleEndgameChange = (key: string, value: unknown) => {
    setFormState((prev) => ({
      ...prev,
      endgamePerformance: { ...prev.endgamePerformance, [key]: value },
    }));
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!selectedMatchKey || !selectedMatch || !selectedTeamNumber || !allianceColor || !startingPosition) {
      setError('Please select an event, match, and team before submitting.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setIsSubmitting(true);
    setSuccessMessage(null);
    setError(null);

    const overallFields = getValues();

    const payload = {
      match_id: selectedMatch.match_id,
      match_key: selectedMatchKey,
      team_number: selectedTeamNumber,
      scout_name: scoutName,
      scout_id: userId,
      alliance_color: allianceColor,
      starting_position: startingPosition,
      auto_performance: formState.autoPerformance,
      teleop_performance: formState.teleopPerformance,
      endgame_performance: formState.endgamePerformance,
      foul_count: overallFields.fouls,
      tech_foul_count: overallFields.tech_fouls,
      yellow_card: overallFields.yellow_card,
      red_card: overallFields.red_card,
      robot_disconnected: overallFields.disconnected,
      robot_disabled: overallFields.disabled,
      overall_rating: overallFields.overall_rating,
      driver_skill_rating: overallFields.driver_skill_rating,
      notes: overallFields.notes,
    };

    await submit({
      url: '/api/match-scouting',
      method: 'POST',
      data: payload,
      onSuccess: (response) => {
        if (response.queued) {
          setSuccessMessage(
            `📦 Saved offline - will sync when connected. Team ${selectedTeamNumber} match data queued.`
          );
        } else {
          setSuccessMessage(
            `✓ Match scouting data submitted successfully for Team ${selectedTeamNumber}!`
          );
        }

        // Reset form for next submission
        setFormState({
          autoPerformance: { ...DEFAULT_AUTO_PERFORMANCE_2025 },
          teleopPerformance: { ...DEFAULT_TELEOP_PERFORMANCE_2025 },
          endgamePerformance: { ...DEFAULT_ENDGAME_PERFORMANCE_2025 },
        });
        resetOverallForm();

        // Call success callback if provided
        if (onSubmitSuccess) {
          onSubmitSuccess(response.data || payload);
        }

        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
      onError: (error) => {
        // Check if it's a duplicate submission error (409 conflict)
        if (error.message.includes('Duplicate') || error.message.includes('already submitted')) {
          setError(
            `⚠️ Duplicate submission detected: You have already submitted data for Team ${selectedTeamNumber} in this match. ` +
            `If you need to update your submission, please contact an admin or delete the previous entry.`
          );
        } else {
          setError(`❌ Error: ${error.message}`);
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
    });

    setIsSubmitting(false);
  };

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-2 text-3xl font-bold">Match Scouting</h1>
      <p className="mb-8 text-muted-foreground">
        Record robot performance during matches for analysis and strategy
      </p>

      {/* Offline Status Indicator */}
      {isOffline && (
        <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-yellow-800 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293A1 1 0 1112.707 10.707" />
          </svg>
          <span>You are offline. Submissions will be saved and synced automatically when reconnected.</span>
        </div>
      )}

      {/* Success/Error Messages */}
      {successMessage && (
        <div className={`mb-6 rounded-lg border p-4 ${isQueued
            ? 'border-blue-200 bg-blue-50 text-blue-800'
            : 'border-green-200 bg-green-50 text-green-800'
          }`}>
          {successMessage}
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
          {error}
        </div>
      )}

      {/* Event, Match & Team Selection */}
      <div className="mb-8 space-y-4">
        <EventSelector
          value={selectedEventKey}
          onChange={handleEventChange}
          year={2025}
        />

        <MatchSelector
          eventKey={selectedEventKey}
          value={selectedMatchKey}
          onChange={handleMatchChange}
        />

        <MatchTeamSelector
          match={selectedMatch}
          value={selectedTeamNumber}
          onChange={handleTeamChange}
        />

        {selectedTeamNumber && allianceColor && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <p className="text-sm font-medium">
              Scouting: <span className="font-bold">Team {selectedTeamNumber}</span>
              {' - '}
              <span
                className={`font-bold ${allianceColor === 'red' ? 'text-red-600' : 'text-blue-600'}`}
              >
                {allianceColor.toUpperCase()} Alliance
              </span>
              {' - '}
              <span>Position {startingPosition}</span>
            </p>
            <p className="mt-1 text-xs text-blue-700">
              Match: {selectedMatch?.match_key || 'Unknown'}
            </p>
          </div>
        )}
      </div>

      {/* Form Sections (only show when team is selected) */}
      {selectedTeamNumber && allianceColor && (
        <div className="space-y-6">
          <AutoPerformanceSection
            values={formState.autoPerformance}
            onChange={handleAutoChange}
          />

          <TeleopPerformanceSection
            values={formState.teleopPerformance}
            onChange={handleTeleopChange}
          />

          <EndgamePerformanceSection
            values={formState.endgamePerformance}
            onChange={handleEndgameChange}
          />

          {/* Overall Match Observations */}
          <FormSection
            title="Overall Match Observations"
            description="Penalties, cards, disconnections, and ratings"
            collapsible
            defaultOpen
          >
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Fouls */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Fouls</label>
                <Input
                  type="number"
                  min={0}
                  {...register('fouls')}
                />
                <p className="text-xs text-muted-foreground">Number of regular fouls committed</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Technical Fouls</label>
                <Input
                  type="number"
                  min={0}
                  {...register('tech_fouls')}
                />
                <p className="text-xs text-muted-foreground">Number of technical fouls committed</p>
              </div>

              {/* Cards and Disconnections */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="yellow_card"
                  {...register('yellow_card')}
                  className="h-4 w-4 rounded border-gray-300 text-frc-blue focus:ring-frc-blue"
                />
                <label htmlFor="yellow_card" className="text-sm font-medium">
                  Yellow Card
                </label>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="red_card"
                  {...register('red_card')}
                  className="h-4 w-4 rounded border-gray-300 text-frc-blue focus:ring-frc-blue"
                />
                <label htmlFor="red_card" className="text-sm font-medium">
                  Red Card
                </label>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="disconnected"
                  {...register('disconnected')}
                  className="h-4 w-4 rounded border-gray-300 text-frc-blue focus:ring-frc-blue"
                />
                <label htmlFor="disconnected" className="text-sm font-medium">
                  Robot Disconnected
                </label>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="disabled"
                  {...register('disabled')}
                  className="h-4 w-4 rounded border-gray-300 text-frc-blue focus:ring-frc-blue"
                />
                <label htmlFor="disabled" className="text-sm font-medium">
                  Robot Disabled/Broken
                </label>
              </div>

              {/* Ratings */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Overall Performance Rating</label>
                <Select
                  value={String(getValues('overall_rating'))}
                  onValueChange={(value) => {
                    const numValue = parseInt(value, 10);
                    resetOverallForm({
                      ...getValues(),
                      overall_rating: numValue,
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select rating" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 - Poor</SelectItem>
                    <SelectItem value="2">2 - Below Average</SelectItem>
                    <SelectItem value="3">3 - Average</SelectItem>
                    <SelectItem value="4">4 - Good</SelectItem>
                    <SelectItem value="5">5 - Excellent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Driver Skill Rating</label>
                <Select
                  value={String(getValues('driver_skill_rating'))}
                  onValueChange={(value) => {
                    const numValue = parseInt(value, 10);
                    resetOverallForm({
                      ...getValues(),
                      driver_skill_rating: numValue,
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select rating" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 - Poor</SelectItem>
                    <SelectItem value="2">2 - Below Average</SelectItem>
                    <SelectItem value="3">3 - Average</SelectItem>
                    <SelectItem value="4">4 - Good</SelectItem>
                    <SelectItem value="5">5 - Excellent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* General Notes */}
              <div className="md:col-span-2">
                <label
                  htmlFor="notes"
                  className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  General Notes
                </label>
                <textarea
                  id="notes"
                  {...register('notes')}
                  rows={4}
                  placeholder="Overall observations, strategy notes, notable moments..."
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:border-frc-blue focus:outline-none focus:ring-2 focus:ring-frc-blue dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                />
              </div>
            </div>
          </FormSection>

          {/* Submit Button */}
          <div className="flex justify-end gap-4 pt-4">
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || isPending || !selectedTeamNumber}
              size="lg"
            >
              {isPending ? 'Saving...' : isSubmitting ? 'Submitting...' : 'Submit Match Data'}
            </Button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!selectedTeamNumber && (
        <div className="py-12 text-center text-muted-foreground">
          <p>Select an event, match, and team to begin match scouting</p>
        </div>
      )}
    </div>
  );
}
