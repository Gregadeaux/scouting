'use client';

import React from 'react';
import { FormSection } from '@/components/ui/FormSection';
import { FieldRenderer } from '@/components/ui/FieldRenderer';
import { ENDGAME_FIELDS_2025, type FieldDefinition } from '@/lib/config/season-2025';
import type { EndgamePerformance2025 } from '@/types/season-2025';

interface EndgamePerformanceSectionProps {
  /**
   * Current form values for endgame performance
   */
  values: Partial<EndgamePerformance2025>;
  /**
   * Handler for field value changes
   * @param key - Field key from EndgamePerformance2025 interface
   * @param value - New value for the field (any type to support different field types)
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onChange: (key: keyof EndgamePerformance2025, value: any) => void;
  /**
   * Optional validation errors object
   */
  errors?: Record<string, string>;
}

/**
 * EndgamePerformanceSection Component
 *
 * Form section for collecting 2025 Reefscape endgame performance data (last 30 seconds).
 * Uses controlled components pattern for form state management.
 *
 * Features:
 * - Cage climbing tracking (attempted, successful, level achieved)
 * - Timing data (start time, completion time)
 * - Endgame points calculation
 * - Alliance cooperation notes
 * - Dynamic field rendering via FieldRenderer
 * - Collapsible section with FormSection wrapper
 * - Type-safe integration with EndgamePerformance2025 interface
 *
 * Field Types:
 * - boolean: Climb attempted, climb successful
 * - select: Cage level (shallow/deep)
 * - number: Timing data, points
 * - textarea: Cooperation notes, general notes
 *
 * @example
 * ```tsx
 * const [endgamePerformance, setEndgamePerformance] = useState<Partial<EndgamePerformance2025>>({
 *   schema_version: '2025.1',
 *   cage_climb_attempted: false,
 *   cage_climb_successful: false,
 *   endgame_points: 0,
 *   notes: '',
 * });
 *
 * const handleFieldChange = (key: keyof EndgamePerformance2025, value: any) => {
 *   setEndgamePerformance(prev => ({ ...prev, [key]: value }));
 * };
 *
 * <EndgamePerformanceSection
 *   values={endgamePerformance}
 *   onChange={handleFieldChange}
 *   errors={validationErrors}
 * />
 * ```
 */
export const EndgamePerformanceSection = React.memo(function EndgamePerformanceSection({
  values,
  onChange,
  errors = {},
}: EndgamePerformanceSectionProps) {
  return (
    <FormSection
      title="Endgame Period"
      description="Last 30 seconds - Track cage climbing and alliance cooperation"
      collapsible
      defaultOpen
    >
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {ENDGAME_FIELDS_2025.map((field) => {
          const fieldKey = field.key as keyof EndgamePerformance2025;

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
