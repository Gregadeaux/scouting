'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import type { RobotCapabilities2026 } from '@/types/season-2026';
import { DEFAULT_ROBOT_CAPABILITIES_2026 } from '@/types/season-2026';
import { usePitScouting } from '@/hooks/usePitScouting';
import { useScouterEvent } from '@/contexts/ScouterEventContext';
import { TeamSelector } from '@/components/pit-scouting/TeamSelector';
import { ImageUploadSection } from '@/components/pit-scouting/ImageUploadSection';
import { cn } from '@/lib/utils';

interface Props {
  userId: string;
}

interface FormState {
  robotCapabilities: RobotCapabilities2026;
  photos: string[];
  existingId: string | null;
}

export function PitScoutingClient({ userId }: Props) {
  const { selectedEventKey } = useScouterEvent();

  const [selectedTeamNumber, setSelectedTeamNumber] = useState<number | null>(null);

  const [formState, setFormState] = useState<FormState>({
    robotCapabilities: { ...DEFAULT_ROBOT_CAPABILITIES_2026 },
    photos: [],
    existingId: null,
  });

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Track whether a formState change came from loading data vs user interaction
  const skipNextAutoSave = useRef(true);

  const { loadData, isLoading, savePitData, error, clearError } = usePitScouting({
    eventKey: selectedEventKey,
    teamNumber: selectedTeamNumber,
  });

  // Load existing data into form when data is fetched
  useEffect(() => {
    if (!loadData) return;

    skipNextAutoSave.current = true;
    const existing = loadData.existingData;
    if (existing) {
      setFormState({
        robotCapabilities: {
          ...DEFAULT_ROBOT_CAPABILITIES_2026,
          ...(existing.robot_capabilities as Partial<RobotCapabilities2026>),
        },
        photos: existing.photos || [],
        existingId: existing.id || null,
      });
    } else {
      setFormState({
        robotCapabilities: { ...DEFAULT_ROBOT_CAPABILITIES_2026 },
        photos: [],
        existingId: null,
      });
    }
  }, [loadData]);

  // Auto-save whenever formState changes from user interaction
  useEffect(() => {
    if (skipNextAutoSave.current) {
      skipNextAutoSave.current = false;
      return;
    }
    if (!selectedEventKey || !selectedTeamNumber) return;

    clearError();
    setSaveStatus('saving');

    savePitData({
      event_key: selectedEventKey,
      team_number: selectedTeamNumber,
      scout_id: userId,
      robot_capabilities: formState.robotCapabilities,
      autonomous_capabilities: { schema_version: '2026.1' },
      photos: formState.photos,
      id: formState.existingId || undefined,
    })
      .then((result) => {
        setFormState((prev) => ({ ...prev, existingId: result.id }));
        setSaveStatus('saved');
      })
      .catch(() => {
        setSaveStatus('error');
      });
  }, [formState.robotCapabilities, formState.photos]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset team when event changes
  useEffect(() => {
    setSelectedTeamNumber(null);
    setSaveStatus('idle');
  }, [selectedEventKey]);

  function handleTeamChange(teamNumber: number | null, _team: unknown): void {
    setSelectedTeamNumber(teamNumber);
    setSaveStatus('idle');
    skipNextAutoSave.current = true;
    clearError();
  }

  function handlePhotosChange(photos: string[]): void {
    setFormState((prev) => ({ ...prev, photos }));
  }

  return (
    <div className="container mx-auto px-4 py-4 max-w-5xl">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-2xl font-bold text-gray-100">Pit Scouting</h1>
        {saveStatus === 'saving' && (
          <span className="text-xs text-slate-400">Saving...</span>
        )}
        {saveStatus === 'saved' && (
          <span className="text-xs text-green-400">Saved</span>
        )}
      </div>

      {error && (
        <div className="mb-3 p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-300 text-sm">
          {error.message}
        </div>
      )}

      {/* Event & Team Selection */}
      <div className="mb-4">
        {!selectedEventKey ? (
          <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4 text-center">
            <p className="text-sm text-slate-300">
              No event selected.{' '}
              <Link href="/scouting/settings" className="text-cyan-400 underline underline-offset-2 hover:text-cyan-300">
                Go to Settings
              </Link>{' '}
              to choose an event.
            </p>
          </div>
        ) : (
          <TeamSelector
            eventKey={selectedEventKey}
            value={selectedTeamNumber}
            onChange={handleTeamChange}
          />
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-4">
          <p className="text-slate-400">Loading pit data...</p>
        </div>
      )}

      {/* Form (only show when team is selected) */}
      {selectedTeamNumber && !isLoading && (
        <div className="space-y-4">
          {/* Trench Capability */}
          <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
            <h2 className="text-base font-semibold text-gray-100 mb-3">Robot Capabilities</h2>
            <button
              type="button"
              onClick={() =>
                setFormState((prev) => ({
                  ...prev,
                  robotCapabilities: {
                    ...prev.robotCapabilities,
                    can_fit_through_trench: !prev.robotCapabilities.can_fit_through_trench,
                  },
                }))
              }
              className={cn(
                'w-full min-h-[56px] rounded-lg border-2 px-4 py-3 text-left font-medium transition-all',
                'focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-slate-950',
                formState.robotCapabilities.can_fit_through_trench
                  ? 'border-cyan-500 bg-cyan-900/30 text-cyan-300'
                  : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-600'
              )}
            >
              <span className="flex items-center justify-between">
                <span>Can fit through the trench</span>
                <span className="text-sm">
                  {formState.robotCapabilities.can_fit_through_trench ? 'Yes' : 'No'}
                </span>
              </span>
            </button>
          </div>

          {/* Photos */}
          <ImageUploadSection
            photos={formState.photos}
            onPhotosChange={handlePhotosChange}
          />
        </div>
      )}

      {/* Empty State */}
      {!selectedTeamNumber && !isLoading && (
        <div className="text-center py-6 text-slate-400">
          <p>Select a team to begin pit scouting</p>
        </div>
      )}
    </div>
  );
}
