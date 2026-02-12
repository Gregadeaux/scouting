/**
 * 2026 Season Configuration
 *
 * SIMPLIFIED SCOUTING APPROACH:
 * - Ball scoring is too fast to scout manually - TBA provides this data
 * - Scouts focus on: Climbs (auto/endgame), qualitative ratings, disabled tracking
 * - Target: <60 seconds per robot to complete scouting form
 *
 * This configuration file defines the structure for data collection forms,
 * validation rules, and season-specific settings.
 */

import type { FieldDefinition, FieldType } from './season-2025';

// Re-export the types for convenience
export type { FieldDefinition, FieldType };

// ============================================================================
// SEASON METADATA
// ============================================================================

export const SEASON_2026_CONFIG = {
  year: 2026,
  gameName: '[GAME NAME]', // Update after official reveal
  gameDescription:
    'Auto climb (L1 only), massive ball scoring (tracked via TBA), endgame climb (L1/L2/L3). Scouts record climbs, qualitative ratings, and disabled status.',

  // Duration (seconds)
  matchDuration: 150,
  autoDuration: 15,
  teleopDuration: 135,

  // Important dates
  kickoffDate: '2026-01-10',
  championshipStartDate: '2026-04-15', // Estimate - update when announced
  championshipEndDate: '2026-04-18', // Estimate - update when announced

  // Documentation
  rulesManualUrl: '', // Update after release
  gameAnimationUrl: '', // Update after release
} as const;

// ============================================================================
// AUTONOMOUS PERIOD FIELDS (~3 fields, ~15 seconds to fill)
// ============================================================================

export const AUTO_FIELDS_2026: FieldDefinition[] = [
  {
    key: 'auto_climb_attempted',
    label: 'Attempted Auto Climb?',
    type: 'boolean',
    defaultValue: false,
    required: true,
    section: 'Auto Climb',
    order: 1,
    helpText: 'Did the robot attempt to climb during autonomous?',
  },
  {
    key: 'auto_climb_success',
    label: 'Auto Climb Successful?',
    type: 'boolean',
    defaultValue: false,
    section: 'Auto Climb',
    order: 2,
    helpText: 'Did they successfully complete the auto climb?',
    // Note: Only show if auto_climb_attempted is true
  },
  {
    key: 'auto_climb_position',
    label: 'Climb Position',
    type: 'select',
    defaultValue: null,
    options: [
      { value: 'left', label: 'Left' },
      { value: 'center', label: 'Center' },
      { value: 'right', label: 'Right' },
    ],
    section: 'Auto Climb',
    order: 3,
    helpText: 'Which position did they climb from?',
    // Note: Only show if auto_climb_success is true
  },
  {
    key: 'notes',
    label: 'Auto Notes',
    type: 'textarea',
    defaultValue: '',
    section: 'Notes',
    order: 100,
    helpText: 'Any notable observations about autonomous?',
  },
];

// ============================================================================
// TELEOPERATED PERIOD FIELDS (~4 ratings, ~20 seconds to fill)
// ============================================================================

export const TELEOP_FIELDS_2026: FieldDefinition[] = [
  {
    key: 'scoring_rating',
    label: 'Scoring Ability',
    type: 'rating',
    defaultValue: 3,
    required: true,
    min: 1,
    max: 5,
    section: 'Performance Ratings',
    order: 1,
    helpText: 'How well did they score? (1=Poor, 5=Excellent)',
  },
  {
    key: 'feeding_rating',
    label: 'Feeding Ability',
    type: 'rating',
    defaultValue: 3,
    required: true,
    min: 1,
    max: 5,
    section: 'Performance Ratings',
    order: 2,
    helpText: 'How well did they feed balls to alliance partners?',
  },
  {
    key: 'defense_rating',
    label: 'Defense Effectiveness',
    type: 'rating',
    defaultValue: 3,
    required: true,
    min: 1,
    max: 5,
    section: 'Performance Ratings',
    order: 3,
    helpText: 'How effective was their defense? (1=None/Poor, 5=Dominant)',
  },
  {
    key: 'reliability_rating',
    label: 'Robot Reliability',
    type: 'rating',
    defaultValue: 3,
    required: true,
    min: 1,
    max: 5,
    section: 'Performance Ratings',
    order: 4,
    helpText: 'How reliable/consistent was the robot overall?',
  },
  {
    key: 'notes',
    label: 'Teleop Notes',
    type: 'textarea',
    defaultValue: '',
    section: 'Notes',
    order: 100,
    helpText: 'Notable plays, strategies, or issues during teleop?',
  },
];

// ============================================================================
// ENDGAME PERIOD FIELDS (~8 fields, ~25 seconds to fill)
// ============================================================================

export const ENDGAME_FIELDS_2026: FieldDefinition[] = [
  // Climb tracking
  {
    key: 'endgame_climb_attempted',
    label: 'Attempted Endgame Climb?',
    type: 'boolean',
    defaultValue: false,
    required: true,
    section: 'Endgame Climb',
    order: 1,
    helpText: 'Did the robot attempt to climb during endgame?',
  },
  {
    key: 'endgame_climb_level',
    label: 'Climb Level',
    type: 'select',
    defaultValue: 'none',
    required: true,
    options: [
      { value: 'none', label: 'None' },
      { value: 'L1', label: 'Level 1' },
      { value: 'L2', label: 'Level 2' },
      { value: 'L3', label: 'Level 3' },
    ],
    section: 'Endgame Climb',
    order: 2,
    helpText: 'What level did they attempt/achieve?',
    // Note: Only show if endgame_climb_attempted is true
  },
  {
    key: 'endgame_climb_success',
    label: 'Climb Successful?',
    type: 'boolean',
    defaultValue: false,
    section: 'Endgame Climb',
    order: 3,
    helpText: 'Did they successfully complete the climb?',
    // Note: Only show if endgame_climb_level is not 'none'
  },
  {
    key: 'endgame_climb_position',
    label: 'Climb Position',
    type: 'select',
    defaultValue: null,
    options: [
      { value: 'left', label: 'Left' },
      { value: 'center', label: 'Center' },
      { value: 'right', label: 'Right' },
    ],
    section: 'Endgame Climb',
    order: 4,
    helpText: 'Which position did they climb from? (for coordination)',
    // Note: Only show if endgame_climb_success is true
  },

  // Disabled tracking
  {
    key: 'was_disabled',
    label: 'Robot Disabled?',
    type: 'boolean',
    defaultValue: false,
    required: true,
    section: 'Robot Issues',
    order: 10,
    helpText: 'Was the robot disabled at any point during the match?',
  },
  {
    key: 'disabled_reason',
    label: 'Disabled Reason',
    type: 'select',
    defaultValue: null,
    options: [
      { value: 'robot_died', label: 'Robot Died' },
      { value: 'stuck_on_bump', label: 'Stuck on Bump' },
      { value: 'stuck_on_balls', label: 'Stuck on Balls' },
      { value: 'stuck_in_trench', label: 'Stuck in Trench' },
      { value: 'disabled_by_refs', label: 'Disabled by Refs' },
      { value: 'other', label: 'Other' },
    ],
    section: 'Robot Issues',
    order: 11,
    helpText: 'Why was the robot disabled?',
    // Note: Only show if was_disabled is true
  },
  {
    key: 'disabled_notes',
    label: 'Disabled Details',
    type: 'text',
    defaultValue: '',
    section: 'Robot Issues',
    order: 12,
    helpText: 'Additional details about the disability',
    // Note: Only show if was_disabled is true
  },

  // General notes
  {
    key: 'notes',
    label: 'Endgame Notes',
    type: 'textarea',
    defaultValue: '',
    section: 'Notes',
    order: 100,
    helpText: 'Any other observations about endgame?',
  },
];

// ============================================================================
// VALIDATION SCHEMAS (JSON Schema format)
// ============================================================================

export const AUTO_SCHEMA_2026 = {
  type: 'object',
  required: ['schema_version', 'auto_climb_attempted', 'auto_climb_success'],
  properties: {
    schema_version: { type: 'string', const: '2026.1' },
    auto_climb_attempted: { type: 'boolean' },
    auto_climb_success: { type: 'boolean' },
    auto_climb_position: {
      type: 'string',
      enum: ['left', 'center', 'right'],
    },
    notes: { type: 'string' },
  },
};

export const TELEOP_SCHEMA_2026 = {
  type: 'object',
  required: [
    'schema_version',
    'scoring_rating',
    'feeding_rating',
    'defense_rating',
    'reliability_rating',
  ],
  properties: {
    schema_version: { type: 'string', const: '2026.1' },
    scoring_rating: { type: 'number', minimum: 1, maximum: 5 },
    feeding_rating: { type: 'number', minimum: 1, maximum: 5 },
    defense_rating: { type: 'number', minimum: 1, maximum: 5 },
    reliability_rating: { type: 'number', minimum: 1, maximum: 5 },
    notes: { type: 'string' },
  },
};

export const ENDGAME_SCHEMA_2026 = {
  type: 'object',
  required: [
    'schema_version',
    'endgame_climb_attempted',
    'endgame_climb_level',
    'endgame_climb_success',
    'was_disabled',
  ],
  properties: {
    schema_version: { type: 'string', const: '2026.1' },
    endgame_climb_attempted: { type: 'boolean' },
    endgame_climb_level: {
      type: 'string',
      enum: ['none', 'L1', 'L2', 'L3'],
    },
    endgame_climb_success: { type: 'boolean' },
    endgame_climb_position: {
      type: 'string',
      enum: ['left', 'center', 'right'],
    },
    was_disabled: { type: 'boolean' },
    disabled_reason: {
      type: 'string',
      enum: [
        'robot_died',
        'stuck_on_bump',
        'stuck_on_balls',
        'stuck_in_trench',
        'disabled_by_refs',
        'other',
      ],
    },
    disabled_notes: { type: 'string' },
    notes: { type: 'string' },
  },
};

// ============================================================================
// PIT SCOUTING SCHEMAS (Simplified for 2026)
// ============================================================================

export const ROBOT_CAPABILITIES_SCHEMA_2026 = {
  type: 'object',
  required: ['schema_version'],
  properties: {
    schema_version: { type: 'string', const: '2026.1' },
    can_auto_climb: { type: 'boolean' },
    can_endgame_climb: { type: 'boolean' },
    max_climb_level: { type: 'string', enum: ['none', 'L1', 'L2', 'L3'] },
    preferred_climb_position: { type: 'string', enum: ['left', 'center', 'right'] },
    estimated_climb_time_seconds: { type: 'number', minimum: 0 },
    can_feed: { type: 'boolean' },
    plays_defense: { type: 'boolean' },
    drive_train_type: { type: 'string' },
    special_features: { type: 'string' },
    notes: { type: 'string' },
  },
};

export const AUTONOMOUS_CAPABILITIES_SCHEMA_2026 = {
  type: 'object',
  required: ['schema_version'],
  properties: {
    schema_version: { type: 'string', const: '2026.1' },
    has_auto_routine: { type: 'boolean' },
    auto_climb_capable: { type: 'boolean' },
    preferred_starting_position: { type: 'number', enum: [1, 2, 3] },
    auto_success_rate_estimate: { type: 'number', minimum: 0, maximum: 100 },
    auto_strategy_description: { type: 'string' },
    notes: { type: 'string' },
  },
};

// ============================================================================
// CONDITIONAL FIELD VISIBILITY RULES
// ============================================================================

/**
 * Defines when fields should be shown/hidden based on other field values
 * Used by the form renderer to conditionally display fields
 */
export const FIELD_VISIBILITY_RULES_2026 = {
  // Auto section
  auto_climb_success: {
    dependsOn: 'auto_climb_attempted',
    showWhen: (value: boolean) => value === true,
  },
  auto_climb_position: {
    dependsOn: 'auto_climb_success',
    showWhen: (value: boolean) => value === true,
  },

  // Endgame climb section
  endgame_climb_level: {
    dependsOn: 'endgame_climb_attempted',
    showWhen: (value: boolean) => value === true,
  },
  endgame_climb_success: {
    dependsOn: 'endgame_climb_level',
    showWhen: (value: string) => value !== 'none',
  },
  endgame_climb_position: {
    dependsOn: 'endgame_climb_success',
    showWhen: (value: boolean) => value === true,
  },

  // Disabled section
  disabled_reason: {
    dependsOn: 'was_disabled',
    showWhen: (value: boolean) => value === true,
  },
  disabled_notes: {
    dependsOn: 'was_disabled',
    showWhen: (value: boolean) => value === true,
  },
} as const;

// ============================================================================
// RATING SCALE LABELS (for UI display)
// ============================================================================

export const RATING_LABELS_2026 = {
  1: 'Poor',
  2: 'Below Average',
  3: 'Average',
  4: 'Good',
  5: 'Excellent',
} as const;

// ============================================================================
// EXPORT ALL CONFIGURATION
// ============================================================================

export const SEASON_2026_FULL_CONFIG = {
  ...SEASON_2026_CONFIG,
  autoFields: AUTO_FIELDS_2026,
  teleopFields: TELEOP_FIELDS_2026,
  endgameFields: ENDGAME_FIELDS_2026,
  autoSchema: AUTO_SCHEMA_2026,
  teleopSchema: TELEOP_SCHEMA_2026,
  endgameSchema: ENDGAME_SCHEMA_2026,
  robotCapabilitiesSchema: ROBOT_CAPABILITIES_SCHEMA_2026,
  autonomousCapabilitiesSchema: AUTONOMOUS_CAPABILITIES_SCHEMA_2026,
  fieldVisibilityRules: FIELD_VISIBILITY_RULES_2026,
  ratingLabels: RATING_LABELS_2026,
} as const;
