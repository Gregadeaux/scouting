'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { SeasonConfig, SeasonConfigUpdate } from '@/types';

interface SeasonMetadataFormProps {
  season: SeasonConfig;
  onSubmit: (data: SeasonConfigUpdate) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

/**
 * Form for editing season metadata (non-schema fields)
 */
export function SeasonMetadataForm({
  season,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: SeasonMetadataFormProps) {
  const [formData, setFormData] = useState<SeasonConfigUpdate>({
    game_name: season.game_name || '',
    game_description: season.game_description || '',
    kickoff_date: season.kickoff_date?.split('T')[0] || '',
    championship_start_date: season.championship_start_date?.split('T')[0] || '',
    championship_end_date: season.championship_end_date?.split('T')[0] || '',
    rules_manual_url: season.rules_manual_url || '',
    game_animation_url: season.game_animation_url || '',
    notes: season.notes || '',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof SeasonConfigUpdate, string>>>({});

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof SeasonConfigUpdate, string>> = {};

    // Game name is required
    if (!formData.game_name?.trim()) {
      newErrors.game_name = 'Game name is required';
    }

    // Validate URLs
    if (formData.rules_manual_url?.trim()) {
      try {
        new URL(formData.rules_manual_url);
      } catch {
        newErrors.rules_manual_url = 'Must be a valid URL';
      }
    }

    if (formData.game_animation_url?.trim()) {
      try {
        new URL(formData.game_animation_url);
      } catch {
        newErrors.game_animation_url = 'Must be a valid URL';
      }
    }

    // Validate date range
    if (formData.championship_start_date && formData.championship_end_date) {
      const start = new Date(formData.championship_start_date);
      const end = new Date(formData.championship_end_date);
      if (end < start) {
        newErrors.championship_end_date = 'End date must be after start date';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Clean up empty strings to undefined for optional fields
    const cleanedData: SeasonConfigUpdate = {};
    for (const [key, value] of Object.entries(formData)) {
      if (value && typeof value === 'string' && value.trim()) {
        cleanedData[key as keyof SeasonConfigUpdate] = value.trim();
      } else if (value === '' && key !== 'game_name') {
        // Allow clearing optional fields by sending undefined
        cleanedData[key as keyof SeasonConfigUpdate] = undefined;
      } else if (value) {
        cleanedData[key as keyof SeasonConfigUpdate] = value;
      }
    }

    await onSubmit(cleanedData);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when field is edited
    if (errors[name as keyof SeasonConfigUpdate]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Game Name */}
      <div>
        <label
          htmlFor="game_name"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Game Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="game_name"
          name="game_name"
          value={formData.game_name || ''}
          onChange={handleChange}
          className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 ${
            errors.game_name
              ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
              : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800'
          }`}
          placeholder="e.g., Reefscape"
        />
        {errors.game_name && (
          <p className="mt-1 text-sm text-red-600">{errors.game_name}</p>
        )}
      </div>

      {/* Game Description */}
      <div>
        <label
          htmlFor="game_description"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Game Description
        </label>
        <textarea
          id="game_description"
          name="game_description"
          value={formData.game_description || ''}
          onChange={handleChange}
          rows={3}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800"
          placeholder="Brief description of the game..."
        />
      </div>

      {/* Dates Section */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Important Dates
        </h3>
        <div className="grid gap-4 sm:grid-cols-3">
          {/* Kickoff Date */}
          <div>
            <label
              htmlFor="kickoff_date"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Kickoff Date
            </label>
            <input
              type="date"
              id="kickoff_date"
              name="kickoff_date"
              value={formData.kickoff_date || ''}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800"
            />
          </div>

          {/* Championship Start */}
          <div>
            <label
              htmlFor="championship_start_date"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Championship Start
            </label>
            <input
              type="date"
              id="championship_start_date"
              name="championship_start_date"
              value={formData.championship_start_date || ''}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800"
            />
          </div>

          {/* Championship End */}
          <div>
            <label
              htmlFor="championship_end_date"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Championship End
            </label>
            <input
              type="date"
              id="championship_end_date"
              name="championship_end_date"
              value={formData.championship_end_date || ''}
              onChange={handleChange}
              className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 ${
                errors.championship_end_date
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800'
              }`}
            />
            {errors.championship_end_date && (
              <p className="mt-1 text-sm text-red-600">
                {errors.championship_end_date}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Resources Section */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Resources
        </h3>

        {/* Rules Manual URL */}
        <div>
          <label
            htmlFor="rules_manual_url"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Game Manual URL
          </label>
          <input
            type="url"
            id="rules_manual_url"
            name="rules_manual_url"
            value={formData.rules_manual_url || ''}
            onChange={handleChange}
            className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 ${
              errors.rules_manual_url
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800'
            }`}
            placeholder="https://..."
          />
          {errors.rules_manual_url && (
            <p className="mt-1 text-sm text-red-600">{errors.rules_manual_url}</p>
          )}
        </div>

        {/* Game Animation URL */}
        <div>
          <label
            htmlFor="game_animation_url"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Game Animation URL
          </label>
          <input
            type="url"
            id="game_animation_url"
            name="game_animation_url"
            value={formData.game_animation_url || ''}
            onChange={handleChange}
            className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 ${
              errors.game_animation_url
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800'
            }`}
            placeholder="https://..."
          />
          {errors.game_animation_url && (
            <p className="mt-1 text-sm text-red-600">
              {errors.game_animation_url}
            </p>
          )}
        </div>
      </div>

      {/* Notes */}
      <div>
        <label
          htmlFor="notes"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          value={formData.notes || ''}
          onChange={handleChange}
          rows={3}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800"
          placeholder="Additional notes..."
        />
      </div>

      {/* Form Actions */}
      <div className="flex justify-end gap-3 border-t border-gray-200 pt-4 dark:border-gray-700">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
}
