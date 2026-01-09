'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  pitScoutingService,
  type PitScoutingFormData,
  type LoadPitDataResult,
  type SavePitDataResult,
} from '@/services/PitScoutingService';

interface UsePitScoutingLoadOptions {
  eventKey: string | null;
  teamNumber: number | null;
  enabled?: boolean;
}

interface UsePitScoutingReturn {
  // Data loading
  loadData: LoadPitDataResult | null;
  isLoading: boolean;

  // Data saving
  savePitData: (formData: PitScoutingFormData) => Promise<SavePitDataResult>;
  isSaving: boolean;

  // Error handling
  error: Error | null;
  clearError: () => void;
}

/**
 * usePitScouting Hook
 *
 * Enhanced hook for pit scouting operations with service layer integration.
 * Handles data loading, saving, and state management.
 *
 * Features:
 * - Automatic data loading when event/team selected
 * - Unified save operation (create or update)
 * - Loading and error states
 * - Type-safe API
 *
 * @example
 * ```tsx
 * const { loadData, savePitData, isLoading, isSaving, error } = usePitScouting({
 *   eventKey: selectedEventKey,
 *   teamNumber: selectedTeamNumber,
 * });
 *
 * // loadData contains existing pit data (or null if none exists)
 * useEffect(() => {
 *   if (loadData?.existingData) {
 *     // Populate form with existing data
 *     const transformed = pitScoutingService.transformToFormState(loadData.existingData);
 *     setFormData(transformed);
 *   }
 * }, [loadData]);
 *
 * // Save data
 * const handleSubmit = async (formData) => {
 *   try {
 *     const result = await savePitData(formData);
 *     console.log('Saved:', result.isUpdate ? 'Updated' : 'Created');
 *   } catch (err) {
 *     console.error('Error:', err);
 *   }
 * };
 * ```
 */
export function usePitScouting(
  options?: UsePitScoutingLoadOptions
): UsePitScoutingReturn {
  const [loadData, setLoadData] = useState<LoadPitDataResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Auto-load data when event/team changes
  useEffect(() => {
    const shouldLoad =
      options &&
      options.eventKey &&
      options.teamNumber &&
      options.enabled !== false;

    if (!shouldLoad) {
      setLoadData(null);
      return;
    }

    const loadExistingData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await pitScoutingService.loadPitData(
          options.eventKey!,
          options.teamNumber!
        );
        setLoadData(result);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to load pit data';
        const newError = new Error(errorMessage);
        setError(newError);
        setLoadData(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadExistingData();
  }, [options, options?.eventKey, options?.teamNumber, options?.enabled]);

  const savePitData = useCallback(
    async (formData: PitScoutingFormData): Promise<SavePitDataResult> => {
      try {
        setIsSaving(true);
        setError(null);

        const result = await pitScoutingService.savePitData(formData);

        // Update loadData to reflect the saved state
        setLoadData({
          existingData: result.data,
          isExisting: true,
        });

        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to save pit data';
        const newError = new Error(errorMessage);
        setError(newError);
        throw newError;
      } finally {
        setIsSaving(false);
      }
    },
    []
  );

  return {
    loadData,
    isLoading,
    savePitData,
    isSaving,
    error,
    clearError,
  };
}
