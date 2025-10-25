'use client';

import React from 'react';
import { FormSection } from '@/components/ui/FormSection';
import { FieldRenderer, FieldConfig } from '@/components/ui/FieldRenderer';
import type { AutonomousCapabilities2025 } from '@/types/season-2025';

interface AutonomousCapabilitiesSectionProps {
  /**
   * Current form values for autonomous capabilities
   */
  values: Partial<AutonomousCapabilities2025>;
  /**
   * Handler for field value changes
   * @param key - Field key from AutonomousCapabilities2025 interface
   * @param value - New value for the field (any type to support different field types)
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onChange: (key: keyof AutonomousCapabilities2025, value: any) => void;
  /**
   * Optional validation errors object
   */
  errors?: Record<string, string>;
}

/**
 * Field configuration for Autonomous Capabilities
 * Defines all fields for collecting autonomous mode capabilities and strategy
 */
const AUTONOMOUS_CAPABILITY_FIELDS: FieldConfig[] = [
  // Basic Autonomous Scoring
  {
    key: 'auto_scoring_capability',
    label: 'Has Autonomous Scoring? *',
    type: 'boolean',
    helpText: 'Can the robot score game pieces during autonomous?',
    required: true,
  },
  {
    key: 'auto_max_coral_pieces',
    label: 'Max Coral Pieces in Auto *',
    type: 'counter',
    min: 0,
    max: 12,
    helpText: 'Maximum number of coral pieces robot can score in auto',
    required: true,
  },

  // Starting Position
  {
    key: 'auto_preferred_starting_position',
    label: 'Preferred Starting Position',
    type: 'select',
    options: [
      { value: '', label: 'Select position' },
      { value: 1, label: 'Position 1 (Left)' },
      { value: 2, label: 'Position 2 (Center)' },
      { value: 3, label: 'Position 3 (Right)' },
    ],
    helpText: 'Which starting position does the robot prefer?',
  },

  // Autonomous Features
  {
    key: 'auto_uses_vision',
    label: 'Uses Vision in Auto?',
    type: 'boolean',
    helpText: 'Uses cameras/sensors for autonomous navigation or targeting',
    required: false,
  },
  {
    key: 'auto_path_planning',
    label: 'Has Path Planning?',
    type: 'boolean',
    helpText: 'Uses advanced path planning algorithms (e.g., PathWeaver, PathPlanner)',
    required: false,
  },
  {
    key: 'auto_multi_piece_capable',
    label: 'Can Score Multiple Pieces?',
    type: 'boolean',
    helpText: 'Can score more than one game piece during autonomous',
    required: false,
  },

  // Reliability & Testing
  {
    key: 'auto_success_rate_estimate',
    label: 'Estimated Success Rate (%)',
    type: 'number',
    min: 0,
    max: 100,
    placeholder: '0',
    helpText: 'Estimated percentage of successful autonomous runs (0-100)',
  },
  {
    key: 'auto_tested_at_competitions',
    label: 'Tested at Competitions?',
    type: 'boolean',
    helpText: 'Has the autonomous routine been tested in actual competition?',
    required: false,
  },

  // Strategy & Notes
  {
    key: 'auto_strategy_description',
    label: 'Autonomous Strategy Description',
    type: 'textarea',
    placeholder: 'Describe the autonomous routine, paths taken, game pieces scored, etc.',
    helpText: 'Detailed description of autonomous strategy and routines',
  },
  {
    key: 'notes',
    label: 'Additional Notes',
    type: 'textarea',
    placeholder: 'Any additional observations about autonomous capabilities...',
    helpText: 'Backup strategies, conditional routines, known issues, etc.',
  },
];

/**
 * AutonomousCapabilitiesSection Component
 *
 * Form section for collecting 2025 Reefscape autonomous capabilities data.
 * Uses controlled components pattern for form state management.
 *
 * Features:
 * - 10 fields covering autonomous scoring, strategy, and reliability
 * - Dynamic field rendering via FieldRenderer
 * - Collapsible section with FormSection wrapper
 * - Type-safe integration with AutonomousCapabilities2025 interface
 *
 * Field Types:
 * - 5 boolean checkboxes for capability flags
 * - 2 select/counter for starting position and max pieces
 * - 1 number input for success rate percentage
 * - 2 textareas for strategy description and notes
 *
 * @example
 * ```tsx
 * const [autoCapabilities, setAutoCapabilities] = useState<Partial<AutonomousCapabilities2025>>({
 *   schema_version: '2025.1',
 *   auto_scoring_capability: false,
 *   auto_max_coral_pieces: 0,
 *   // ... other fields
 * });
 *
 * const handleFieldChange = (key: keyof AutonomousCapabilities2025, value: any) => {
 *   setAutoCapabilities(prev => ({ ...prev, [key]: value }));
 * };
 *
 * <AutonomousCapabilitiesSection
 *   values={autoCapabilities}
 *   onChange={handleFieldChange}
 *   errors={validationErrors}
 * />
 * ```
 */
export function AutonomousCapabilitiesSection({
  values,
  onChange,
  errors = {},
}: AutonomousCapabilitiesSectionProps) {
  return (
    <FormSection
      title="Autonomous Capabilities"
      description="Autonomous mode abilities and strategies for 2025 Reefscape"
      collapsible
      defaultOpen
    >
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {AUTONOMOUS_CAPABILITY_FIELDS.map((field) => {
          const fieldKey = field.key as keyof AutonomousCapabilities2025;
          const defaultValue =
            field.type === 'boolean'
              ? false
              : field.type === 'counter' || field.type === 'number'
              ? 0
              : '';

          return (
            <FieldRenderer
              key={field.key}
              field={field}
              value={values[fieldKey] ?? defaultValue}
              onChange={(value) => onChange(fieldKey, value)}
              error={errors[field.key]}
              className={field.type === 'textarea' ? 'md:col-span-2' : ''}
            />
          );
        })}
      </div>
    </FormSection>
  );
}
