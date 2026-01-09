'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar, FileText, Link2, MessageSquare } from 'lucide-react';
import type { SeasonConfig, SeasonConfigUpdate } from '@/types';

interface SeasonMetadataFormProps {
  season: SeasonConfig;
  onSubmit: (data: SeasonConfigUpdate) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

/**
 * Section wrapper component for visual grouping
 */
function FormSection({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50/50 dark:border-gray-700 dark:bg-gray-800/50">
      <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-3 dark:border-gray-700">
        <Icon className="h-4 w-4 text-blue-500" />
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when field is edited
    if (errors[name as keyof SeasonConfigUpdate]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const inputBaseClass =
    'block w-full rounded-md border px-3 py-2 text-sm shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1';
  const inputNormalClass =
    'border-gray-300 bg-white focus:border-blue-500 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-900 dark:focus:border-blue-400';
  const inputErrorClass =
    'border-red-400 bg-red-50 focus:border-red-500 focus:ring-red-500/20 dark:border-red-500 dark:bg-red-900/20';
  const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5';

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Two-column grid on desktop */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Left Column */}
        <div className="space-y-5">
          {/* Basic Info Section */}
          <FormSection title="Basic Information" icon={FileText}>
            <div className="space-y-4">
              {/* Game Name */}
              <div>
                <label htmlFor="game_name" className={labelClass}>
                  Game Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="game_name"
                  name="game_name"
                  value={formData.game_name || ''}
                  onChange={handleChange}
                  className={`${inputBaseClass} ${errors.game_name ? inputErrorClass : inputNormalClass}`}
                  placeholder="e.g., Reefscape"
                />
                {errors.game_name && (
                  <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{errors.game_name}</p>
                )}
              </div>

              {/* Game Description */}
              <div>
                <label htmlFor="game_description" className={labelClass}>
                  Game Description
                </label>
                <textarea
                  id="game_description"
                  name="game_description"
                  value={formData.game_description || ''}
                  onChange={handleChange}
                  rows={4}
                  className={`${inputBaseClass} ${inputNormalClass} resize-none`}
                  placeholder="Brief description of the game mechanics and objectives..."
                />
              </div>
            </div>
          </FormSection>

          {/* Important Dates Section */}
          <FormSection title="Important Dates" icon={Calendar}>
            <div className="space-y-4">
              {/* Kickoff Date */}
              <div>
                <label htmlFor="kickoff_date" className={labelClass}>
                  Kickoff Date
                </label>
                <input
                  type="date"
                  id="kickoff_date"
                  name="kickoff_date"
                  value={formData.kickoff_date || ''}
                  onChange={handleChange}
                  className={`${inputBaseClass} ${inputNormalClass}`}
                />
              </div>

              {/* Championship dates in a row */}
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Championship Start */}
                <div>
                  <label htmlFor="championship_start_date" className={labelClass}>
                    Championship Start
                  </label>
                  <input
                    type="date"
                    id="championship_start_date"
                    name="championship_start_date"
                    value={formData.championship_start_date || ''}
                    onChange={handleChange}
                    className={`${inputBaseClass} ${inputNormalClass}`}
                  />
                </div>

                {/* Championship End */}
                <div>
                  <label htmlFor="championship_end_date" className={labelClass}>
                    Championship End
                  </label>
                  <input
                    type="date"
                    id="championship_end_date"
                    name="championship_end_date"
                    value={formData.championship_end_date || ''}
                    onChange={handleChange}
                    className={`${inputBaseClass} ${errors.championship_end_date ? inputErrorClass : inputNormalClass}`}
                  />
                  {errors.championship_end_date && (
                    <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">
                      {errors.championship_end_date}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </FormSection>
        </div>

        {/* Right Column */}
        <div className="space-y-5">
          {/* Resources Section */}
          <FormSection title="External Resources" icon={Link2}>
            <div className="space-y-4">
              {/* Rules Manual URL */}
              <div>
                <label htmlFor="rules_manual_url" className={labelClass}>
                  Game Manual URL
                </label>
                <input
                  type="url"
                  id="rules_manual_url"
                  name="rules_manual_url"
                  value={formData.rules_manual_url || ''}
                  onChange={handleChange}
                  className={`${inputBaseClass} ${errors.rules_manual_url ? inputErrorClass : inputNormalClass}`}
                  placeholder="https://firstfrc.blob.core.windows.net/frc2026/Manual/..."
                />
                {errors.rules_manual_url && (
                  <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">
                    {errors.rules_manual_url}
                  </p>
                )}
              </div>

              {/* Game Animation URL */}
              <div>
                <label htmlFor="game_animation_url" className={labelClass}>
                  Game Animation URL
                </label>
                <input
                  type="url"
                  id="game_animation_url"
                  name="game_animation_url"
                  value={formData.game_animation_url || ''}
                  onChange={handleChange}
                  className={`${inputBaseClass} ${errors.game_animation_url ? inputErrorClass : inputNormalClass}`}
                  placeholder="https://youtube.com/watch?v=..."
                />
                {errors.game_animation_url && (
                  <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">
                    {errors.game_animation_url}
                  </p>
                )}
              </div>
            </div>
          </FormSection>

          {/* Notes Section */}
          <FormSection title="Notes" icon={MessageSquare}>
            <div>
              <label htmlFor="notes" className="sr-only">
                Notes
              </label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes || ''}
                onChange={handleChange}
                rows={6}
                className={`${inputBaseClass} ${inputNormalClass} resize-none`}
                placeholder="Additional notes, reminders, or configuration details..."
              />
            </div>
          </FormSection>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-5 dark:border-gray-700">
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
