'use client';

import React from 'react';
import { FormSection } from '@/components/ui/FormSection';
import { FieldRenderer } from '@/components/ui/FieldRenderer';
import { AUTO_FIELDS_2025, type FieldDefinition } from '@/lib/config/season-2025';
import type { AutoPerformance2025 } from '@/types/season-2025';

interface AutoPerformanceSectionProps {
  /**
   * Current form values for autonomous performance
   */
  values: Partial<AutoPerformance2025>;
  /**
   * Handler for field value changes
   * @param key - Field key from AutoPerformance2025 interface
   * @param value - New value for the field (any type to support different field types)
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onChange: (key: keyof AutoPerformance2025, value: any) => void;
  /**
   * Optional validation errors object
   */
  errors?: Record<string, string>;
}

/**
 * AutoPerformanceSection Component
 *
 * Form section for collecting 2025 Reefscape autonomous performance data (15s period).
 * Uses controlled components pattern for form state management.
 *
 * Features:
 * - Mobility tracking (left starting zone)
 * - Coral scoring by reef level (L1-L4)
 * - Preloaded piece tracking
 * - Dynamic field rendering via FieldRenderer
 * - Collapsible section with FormSection wrapper
 * - Type-safe integration with AutoPerformance2025 interface
 *
 * Field Types:
 * - boolean: Mobility and preloaded piece scored
 * - counter: Coral scored per level, missed pieces
 * - select: Preloaded piece type
 * - textarea: Notes
 *
 * @example
 * ```tsx
 * const [autoPerformance, setAutoPerformance] = useState<Partial<AutoPerformance2025>>({
 *   schema_version: '2025.1',
 *   left_starting_zone: false,
 *   coral_scored_L1: 0,
 *   coral_scored_L2: 0,
 *   coral_scored_L3: 0,
 *   coral_scored_L4: 0,
 *   coral_missed: 0,
 *   preloaded_piece_scored: false,
 *   notes: '',
 * });
 *
 * const handleFieldChange = (key: keyof AutoPerformance2025, value: any) => {
 *   setAutoPerformance(prev => ({ ...prev, [key]: value }));
 * };
 *
 * <AutoPerformanceSection
 *   values={autoPerformance}
 *   onChange={handleFieldChange}
 *   errors={validationErrors}
 * />
 * ```
 */
export const AutoPerformanceSection = React.memo(function AutoPerformanceSection({
  values,
  onChange,
  errors = {},
}: AutoPerformanceSectionProps) {
  return (
    <FormSection
      title="Autonomous Period"
      description="15 seconds - Track mobility, coral scoring, and preloaded piece"
      collapsible
      defaultOpen
    >
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {AUTO_FIELDS_2025.map((field) => {
          const fieldKey = field.key as keyof AutoPerformance2025;

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
