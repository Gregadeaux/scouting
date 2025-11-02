'use client';

import React from 'react';
import { FormSection } from '@/components/ui/FormSection';
import { FieldRenderer } from '@/components/ui/FieldRenderer';
import { TELEOP_FIELDS_2025, type FieldDefinition } from '@/lib/config/season-2025';
import type { TeleopPerformance2025 } from '@/types/season-2025';

interface TeleopPerformanceSectionProps {
  /**
   * Current form values for teleoperated performance
   */
  values: Partial<TeleopPerformance2025>;
  /**
   * Handler for field value changes
   * @param key - Field key from TeleopPerformance2025 interface
   * @param value - New value for the field (any type to support different field types)
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onChange: (key: keyof TeleopPerformance2025, value: any) => void;
  /**
   * Optional validation errors object
   */
  errors?: Record<string, string>;
}

/**
 * TeleopPerformanceSection Component
 *
 * Form section for collecting 2025 Reefscape teleoperated performance data (2:15 period).
 * Uses controlled components pattern for form state management.
 *
 * Features:
 * - Coral scoring by reef level (L1-L4)
 * - Algae scoring (barge and processor - teleop only)
 * - Pickup location tracking for coral and algae
 * - Cycle counting
 * - Defense tracking (time, effectiveness, defended by opponent)
 * - Penalty tracking
 * - Dynamic field rendering via FieldRenderer
 * - Collapsible section with FormSection wrapper
 * - Type-safe integration with TeleopPerformance2025 interface
 *
 * Field Types:
 * - counter: Scoring, pickups, cycles, penalties
 * - number: Defense time (seconds)
 * - select: Defense effectiveness
 * - textarea: Notes
 *
 * @example
 * ```tsx
 * const [teleopPerformance, setTeleopPerformance] = useState<Partial<TeleopPerformance2025>>({
 *   schema_version: '2025.1',
 *   coral_scored_L1: 0,
 *   coral_scored_L2: 0,
 *   coral_scored_L3: 0,
 *   coral_scored_L4: 0,
 *   coral_missed: 0,
 *   algae_scored_barge: 0,
 *   algae_scored_processor: 0,
 *   algae_missed: 0,
 *   cycles_completed: 0,
 *   ground_pickup_coral: 0,
 *   station_pickup_coral: 0,
 *   ground_pickup_algae: 0,
 *   reef_pickup_algae: 0,
 *   lollipop_pickup_algae: 0,
 *   defense_time_seconds: 0,
 *   defended_by_opponent_seconds: 0,
 *   penalties_caused: 0,
 *   notes: '',
 * });
 *
 * const handleFieldChange = (key: keyof TeleopPerformance2025, value: any) => {
 *   setTeleopPerformance(prev => ({ ...prev, [key]: value }));
 * };
 *
 * <TeleopPerformanceSection
 *   values={teleopPerformance}
 *   onChange={handleFieldChange}
 *   errors={validationErrors}
 * />
 * ```
 */
export const TeleopPerformanceSection = React.memo(function TeleopPerformanceSection({
  values,
  onChange,
  errors = {},
}: TeleopPerformanceSectionProps) {
  return (
    <FormSection
      title="Teleoperated Period"
      description="2:15 minutes - Track coral/algae scoring, pickups, defense, and cycles"
      collapsible
      defaultOpen
    >
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {TELEOP_FIELDS_2025.map((field) => {
          const fieldKey = field.key as keyof TeleopPerformance2025;

          // Determine default value based on field type
          const getDefaultValue = (fieldConfig: FieldDefinition): unknown => {
            if (fieldConfig.defaultValue !== undefined) {
              return fieldConfig.defaultValue;
            }
            switch (fieldConfig.type) {
              case 'boolean':
                return false;
              case 'counter':
              case 'number':
              case 'rating':
                return 0;
              case 'select':
                return null;
              default:
                return '';
            }
          };

          // Cast to FieldRenderer's expected type (FieldDefinition is compatible)
          const fieldForRenderer = field as {
            key: string;
            label: string;
            type: 'boolean' | 'select' | 'number' | 'text' | 'textarea' | 'counter';
            options?: Array<{ value: string | number; label: string }>;
            min?: number;
            max?: number;
            step?: number;
            required?: boolean;
            helpText?: string;
            placeholder?: string;
            disabled?: boolean;
          };

          // Skip fields with types not supported by FieldRenderer
          if (field.type === 'rating' || field.type === 'timer') {
            return null;
          }

          return (
            <FieldRenderer
              key={field.key}
              field={fieldForRenderer}
              value={values[fieldKey] ?? getDefaultValue(field)}
              onChange={(value) => onChange(fieldKey, value)}
              error={errors[field.key]}
              className={field.type === 'textarea' ? 'md:col-span-2' : ''}
            />
          );
        })}
      </div>
    </FormSection>
  );
});
