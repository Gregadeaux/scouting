'use client';

import React from 'react';
import { FormSection } from '@/components/ui/FormSection';
import { FieldRenderer, FieldConfig } from '@/components/ui/FieldRenderer';
import type { RobotCapabilities2025 } from '@/types/season-2025';

interface RobotCapabilitiesSectionProps {
  /**
   * Current form values for robot capabilities
   */
  values: Partial<RobotCapabilities2025>;
  /**
   * Handler for field value changes
   * @param key - Field key from RobotCapabilities2025 interface
   * @param value - New value for the field (any type to support different field types)
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onChange: (key: keyof RobotCapabilities2025, value: any) => void;
  /**
   * Optional validation errors object
   */
  errors?: Record<string, string>;
}

/**
 * Field configuration for Robot Capabilities
 * Defines all fields for collecting robot mechanism and performance data
 */
const ROBOT_CAPABILITY_FIELDS: FieldConfig[] = [
  // Game Piece Handling
  {
    key: 'can_handle_coral',
    label: 'Can Handle Coral?',
    type: 'boolean',
    helpText: 'Can the robot pick up and manipulate coral game pieces?',
    required: false,
  },
  {
    key: 'can_handle_algae',
    label: 'Can Handle Algae?',
    type: 'boolean',
    helpText: 'Can the robot pick up and manipulate algae game pieces?',
    required: false,
  },
  {
    key: 'can_handle_both_simultaneously',
    label: 'Can Handle Both Simultaneously?',
    type: 'boolean',
    helpText: 'Can the robot hold coral and algae at the same time?',
    required: false,
  },
  {
    key: 'preferred_game_piece',
    label: 'Preferred Game Piece',
    type: 'select',
    options: [
      { value: '', label: 'Select preference' },
      { value: 'coral', label: 'Coral' },
      { value: 'algae', label: 'Algae' },
    ],
    helpText: 'Which game piece does the robot handle best?',
  },

  // Coral Scoring Capabilities
  {
    key: 'can_score_coral',
    label: 'Can Score Coral?',
    type: 'boolean',
    helpText: 'Can the robot score coral on the reef?',
    required: false,
  },
  {
    key: 'can_score_L1',
    label: 'Can Score Reef Level 1?',
    type: 'boolean',
    helpText: 'Can score on the lowest reef level',
    required: false,
  },
  {
    key: 'can_score_L2',
    label: 'Can Score Reef Level 2?',
    type: 'boolean',
    helpText: 'Can score on reef level 2',
    required: false,
  },
  {
    key: 'can_score_L3',
    label: 'Can Score Reef Level 3?',
    type: 'boolean',
    helpText: 'Can score on reef level 3',
    required: false,
  },
  {
    key: 'can_score_L4',
    label: 'Can Score Reef Level 4?',
    type: 'boolean',
    helpText: 'Can score on the highest reef level',
    required: false,
  },
  {
    key: 'max_reef_level',
    label: 'Maximum Reef Level',
    type: 'select',
    options: [
      { value: '', label: 'Select max level' },
      { value: 'L1', label: 'Level 1 (Lowest)' },
      { value: 'L2', label: 'Level 2' },
      { value: 'L3', label: 'Level 3' },
      { value: 'L4', label: 'Level 4 (Highest)' },
    ],
    helpText: 'Highest reef level the robot can consistently score on',
  },

  // Algae Scoring Capabilities
  {
    key: 'can_score_algae',
    label: 'Can Score Algae?',
    type: 'boolean',
    helpText: 'Can the robot score algae game pieces?',
    required: false,
  },
  {
    key: 'can_score_algae_barge',
    label: 'Can Score Algae in Barge?',
    type: 'boolean',
    helpText: 'Can score algae in the barge',
    required: false,
  },
  {
    key: 'can_score_algae_processor',
    label: 'Can Score Algae in Processor?',
    type: 'boolean',
    helpText: 'Can score algae in the processor',
    required: false,
  },

  // Pickup Capabilities
  {
    key: 'can_pickup_from_ground',
    label: 'Can Pickup From Ground?',
    type: 'boolean',
    helpText: 'Can pick up game pieces from the ground',
    required: false,
  },
  {
    key: 'can_pickup_from_station',
    label: 'Can Pickup From Station?',
    type: 'boolean',
    helpText: 'Can pick up game pieces from the human player station',
    required: false,
  },
  {
    key: 'pickup_mechanism_type',
    label: 'Pickup Mechanism Type',
    type: 'text',
    placeholder: 'e.g., roller intake, claw, vacuum, etc.',
    helpText: 'Describe the type of intake mechanism',
  },

  // Cycle Performance
  {
    key: 'estimated_cycle_time_seconds',
    label: 'Estimated Cycle Time (seconds)',
    type: 'number',
    min: 0,
    max: 150,
    placeholder: '0',
    helpText: 'Average time to complete one scoring cycle (pickup + score)',
  },
  {
    key: 'scoring_consistency',
    label: 'Scoring Consistency',
    type: 'select',
    options: [
      { value: '', label: 'Select consistency' },
      { value: 'low', label: 'Low - Inconsistent' },
      { value: 'medium', label: 'Medium - Somewhat Consistent' },
      { value: 'high', label: 'High - Very Consistent' },
    ],
    helpText: 'How reliably does the robot score game pieces?',
  },

  // Special Features
  {
    key: 'has_vision_targeting',
    label: 'Has Vision Targeting?',
    type: 'boolean',
    helpText: 'Uses cameras/sensors for target tracking',
    required: false,
  },
  {
    key: 'has_automated_scoring',
    label: 'Has Automated Scoring?',
    type: 'boolean',
    helpText: 'Can automatically align and score without driver input',
    required: false,
  },

  // Notes
  {
    key: 'notes',
    label: 'Additional Notes',
    type: 'textarea',
    placeholder: 'Any additional observations about robot capabilities...',
    helpText: 'Mechanism details, special features, limitations, etc.',
  },
];

/**
 * RobotCapabilitiesSection Component
 *
 * Form section for collecting 2025 Reefscape robot capabilities data.
 * Uses controlled components pattern for form state management.
 *
 * Features:
 * - 22 fields covering game piece handling, scoring, and special features
 * - Dynamic field rendering via FieldRenderer
 * - Collapsible section with FormSection wrapper
 * - Type-safe integration with RobotCapabilities2025 interface
 *
 * Field Types:
 * - 12 boolean checkboxes for capability flags
 * - 3 select dropdowns for preferences and consistency
 * - 2 text/number inputs for cycle time and mechanism type
 * - 1 textarea for detailed notes
 *
 * @example
 * ```tsx
 * const [robotCapabilities, setRobotCapabilities] = useState<Partial<RobotCapabilities2025>>({
 *   schema_version: '2025.1',
 *   can_handle_coral: false,
 *   can_handle_algae: false,
 *   // ... other fields
 * });
 *
 * const handleFieldChange = (key: keyof RobotCapabilities2025, value: any) => {
 *   setRobotCapabilities(prev => ({ ...prev, [key]: value }));
 * };
 *
 * <RobotCapabilitiesSection
 *   values={robotCapabilities}
 *   onChange={handleFieldChange}
 *   errors={validationErrors}
 * />
 * ```
 */
export function RobotCapabilitiesSection({
  values,
  onChange,
  errors = {},
}: RobotCapabilitiesSectionProps) {
  return (
    <FormSection
      title="Robot Capabilities"
      description="Core robot abilities and mechanisms for 2025 Reefscape game"
      collapsible
      defaultOpen
    >
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {ROBOT_CAPABILITY_FIELDS.map((field) => {
          const fieldKey = field.key as keyof RobotCapabilities2025;
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
