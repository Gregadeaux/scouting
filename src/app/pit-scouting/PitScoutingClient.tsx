'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import type { Team } from '@/types';
import type {
  RobotCapabilities2025,
  AutonomousCapabilities2025,
} from '@/types/season-2025';

// Service layer
import { usePitScouting } from '@/hooks/usePitScouting';
import { pitScoutingService } from '@/services/PitScoutingService';

// Selectors
import { EventSelector } from '@/components/pit-scouting/EventSelector';
import { TeamSelector } from '@/components/pit-scouting/TeamSelector';

// Form Sections
import { RobotCapabilitiesSection } from '@/components/pit-scouting/RobotCapabilitiesSection';
import { AutonomousCapabilitiesSection } from '@/components/pit-scouting/AutonomousCapabilitiesSection';
import { PhysicalSpecsSection } from '@/components/pit-scouting/PhysicalSpecsSection';
import { ImageUploadSection } from '@/components/pit-scouting/ImageUploadSection';

// UI
import { Button } from '@/components/ui/Button';

interface Props {
  userId: string;
}

interface PhysicalSpecsFormData {
  drive_train: string;
  drive_motors: string;
  programming_language: string;
  robot_weight_lbs?: number;
  height_inches?: number;
  width_inches?: number;
  length_inches?: number;
  physical_description?: string;
  team_strategy?: string;
  preferred_starting_position?: number;
  team_goals?: string;
  team_comments?: string;
}

interface FormState {
  robotCapabilities: Partial<RobotCapabilities2025>;
  autonomousCapabilities: Partial<AutonomousCapabilities2025>;
  photos: string[];
  existingId: string | null;
}

export function PitScoutingClient({ userId }: Props) {
  // React Hook Form for physical specs
  const { register, getValues, reset: resetPhysicalForm } = useForm<PhysicalSpecsFormData>({
    defaultValues: {
      drive_train: '',
      drive_motors: '',
      programming_language: '',
    },
  });

  // Selection state
  const [selectedEventKey, setSelectedEventKey] = useState<string | null>(null);
  const [selectedTeamNumber, setSelectedTeamNumber] = useState<number | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);

  // Consolidated form state
  const [formState, setFormState] = useState<FormState>({
    robotCapabilities: { schema_version: '2025.1' },
    autonomousCapabilities: { schema_version: '2025.1' },
    photos: [],
    existingId: null,
  });

  // UI state
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Service layer hook - auto-loads data when event/team selected
  const { loadData, isLoading, savePitData, isSaving, error, clearError } = usePitScouting({
    eventKey: selectedEventKey,
    teamNumber: selectedTeamNumber,
  });

  // Load existing data into form when data is fetched
  useEffect(() => {
    if (!loadData) return;

    const transformed = pitScoutingService.transformToFormState(loadData.existingData);

    setFormState({
      robotCapabilities: transformed.robotCapabilities,
      autonomousCapabilities: transformed.autonomousCapabilities,
      photos: transformed.photos,
      existingId: transformed.existingId,
    });

    resetPhysicalForm(transformed.physicalSpecs);
  }, [loadData, resetPhysicalForm]);

  // Handle form submission
  const handleSubmit = async () => {
    if (!selectedEventKey || !selectedTeamNumber) {
      return;
    }

    setSuccessMessage(null);
    clearError();

    try {
      const physicalSpecs = getValues();

      const result = await savePitData({
        event_key: selectedEventKey,
        team_number: selectedTeamNumber,
        scout_id: userId,
        robot_capabilities: formState.robotCapabilities,
        autonomous_capabilities: formState.autonomousCapabilities,
        ...physicalSpecs,
        photos: formState.photos,
        id: formState.existingId || undefined,
      });

      // Update existingId after save
      setFormState((prev) => ({ ...prev, existingId: result.id }));

      setSuccessMessage(
        result.isUpdate
          ? 'Pit scouting data updated successfully!'
          : 'Pit scouting data submitted successfully!'
      );

      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      // Error is already set by hook
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Handle event selection
  const handleEventChange = (eventKey: string | null) => {
    setSelectedEventKey(eventKey);
    setSelectedTeamNumber(null);
    setSelectedTeam(null);
    setSuccessMessage(null);
    clearError();
  };

  // Handle team selection
  const handleTeamChange = (teamNumber: number | null, team: Team | null) => {
    setSelectedTeamNumber(teamNumber);
    setSelectedTeam(team);
    setSuccessMessage(null);
    clearError();
  };

  // Handle robot capabilities change
  const handleRobotCapabilitiesChange = (key: string, value: unknown) => {
    setFormState((prev) => ({
      ...prev,
      robotCapabilities: { ...prev.robotCapabilities, [key]: value },
    }));
  };

  // Handle autonomous capabilities change
  const handleAutonomousCapabilitiesChange = (key: string, value: unknown) => {
    setFormState((prev) => ({
      ...prev,
      autonomousCapabilities: { ...prev.autonomousCapabilities, [key]: value },
    }));
  };

  // Handle photos change
  const handlePhotosChange = (photos: string[]) => {
    setFormState((prev) => ({ ...prev, photos }));
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <h1 className="text-3xl font-bold mb-2">Pit Scouting</h1>
      <p className="text-muted-foreground mb-8">
        Collect robot capabilities and team information during pit scouting
      </p>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
          {successMessage}
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          {error.message}
        </div>
      )}

      {/* Event & Team Selection */}
      <div className="mb-8 space-y-4">
        <EventSelector
          value={selectedEventKey}
          onChange={handleEventChange}
          year={2025}
        />

        <TeamSelector
          eventKey={selectedEventKey}
          value={selectedTeamNumber}
          onChange={handleTeamChange}
        />

        {selectedTeam && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm font-medium">
              Scouting: <span className="font-bold">Team {selectedTeam.team_number}</span>
              {selectedTeam.team_nickname && ` - ${selectedTeam.team_nickname}`}
            </p>
            {formState.existingId && (
              <p className="text-sm text-blue-700 mt-1">
                Existing pit data found. You are editing previously submitted data.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">Loading pit data...</p>
        </div>
      )}

      {/* Form Sections (only show when team is selected) */}
      {selectedTeamNumber && !isLoading && (
        <div className="space-y-6">
          <RobotCapabilitiesSection
            values={formState.robotCapabilities}
            onChange={handleRobotCapabilitiesChange}
          />

          <AutonomousCapabilitiesSection
            values={formState.autonomousCapabilities}
            onChange={handleAutonomousCapabilitiesChange}
          />

          <PhysicalSpecsSection register={register} />

          <ImageUploadSection
            photos={formState.photos}
            onPhotosChange={handlePhotosChange}
          />

          {/* Submit Button */}
          <div className="flex justify-end gap-4 pt-4">
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSaving || !selectedEventKey || !selectedTeamNumber}
              size="lg"
            >
              {isSaving
                ? 'Saving...'
                : formState.existingId
                ? 'Update Pit Data'
                : 'Save Pit Data'}
            </Button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!selectedTeamNumber && !isLoading && (
        <div className="text-center py-12 text-muted-foreground">
          <p>Select an event and team to begin pit scouting</p>
        </div>
      )}
    </div>
  );
}
