/**
 * 2025 Reefscape Season Configuration
 *
 * This configuration file defines the structure for data collection forms,
 * validation rules, and season-specific settings.
 *
 * NON-PROGRAMMERS: This file can be edited to adapt to new seasons!
 * Update field definitions, labels, and validation rules without touching code.
 *
 * Corrected Game Mechanics:
 * 1. Coral scored on reef levels (L1-L4) - NOT in processor
 * 2. Coral picked from ground or station
 * 3. Algae scored in barge or processor during TELEOP only
 * 4. Algae picked from ground, reef, or lollipops
 * 5. Endgame is ONLY cage climbing (shallow or deep)
 * 6. No cycle time tracking needed
 */

import type {
  AutoPerformance2025,
  TeleopPerformance2025,
  EndgamePerformance2025,
  RobotCapabilities2025,
  AutonomousCapabilities2025,
  ReefLevel,
  CageLevel,
  GamePieceType,
} from '@/types/season-2025';

// ============================================================================
// SEASON METADATA
// ============================================================================

export const SEASON_2025_CONFIG = {
  year: 2025,
  gameName: 'Reefscape',
  gameDescription:
    'Robots score Coral (PVC pipes) on Reef levels L1-L4, and Algae (inflatable balls) in Barges or Processors during teleop. Endgame features Cage climbing with shallow or deep options.',

  // Duration (seconds)
  matchDuration: 150,
  autoDuration: 15,
  teleopDuration: 135,

  // Important dates
  kickoffDate: '2025-01-04',
  championshipStartDate: '2025-04-16',
  championshipEndDate: '2025-04-19',

  // Documentation
  rulesManualUrl: 'https://firstfrc.blob.core.windows.net/frc2025/Manual/2025GameManual.pdf',
  gameAnimationUrl: 'https://www.youtube.com/watch?v=PLACEHOLDER',
} as const;

// ============================================================================
// FIELD DEFINITIONS FOR FORM GENERATION
// ============================================================================

/**
 * Field Types supported in scouting forms
 */
export type FieldType =
  | 'counter' // +/- buttons for incrementing/decrementing
  | 'boolean' // Checkbox or toggle
  | 'select' // Dropdown select
  | 'text' // Text input
  | 'textarea' // Multi-line text
  | 'number' // Numeric input
  | 'rating' // 1-5 star rating
  | 'timer'; // Stopwatch/timer component

export interface FieldDefinition {
  key: string;
  label: string;
  type: FieldType;
  defaultValue: any;
  required?: boolean;
  min?: number;
  max?: number;
  options?: Array<{ value: string | number; label: string }>;
  helpText?: string;
  section?: string; // Group fields into sections
  order?: number; // Display order
}

// ============================================================================
// AUTONOMOUS PERIOD FIELDS
// ============================================================================

export const AUTO_FIELDS_2025: FieldDefinition[] = [
  // Mobility
  {
    key: 'left_starting_zone',
    label: 'Left Starting Zone?',
    type: 'boolean',
    defaultValue: false,
    required: true,
    section: 'Mobility',
    order: 1,
    helpText: 'Did the robot completely leave the starting zone?',
  },

  // Coral Scoring by Level
  {
    key: 'coral_scored_L1',
    label: 'Coral Scored - Level 1',
    type: 'counter',
    defaultValue: 0,
    min: 0,
    max: 20,
    section: 'Coral Scoring',
    order: 10,
  },
  {
    key: 'coral_scored_L2',
    label: 'Coral Scored - Level 2',
    type: 'counter',
    defaultValue: 0,
    min: 0,
    max: 20,
    section: 'Coral Scoring',
    order: 11,
  },
  {
    key: 'coral_scored_L3',
    label: 'Coral Scored - Level 3',
    type: 'counter',
    defaultValue: 0,
    min: 0,
    max: 20,
    section: 'Coral Scoring',
    order: 12,
  },
  {
    key: 'coral_scored_L4',
    label: 'Coral Scored - Level 4',
    type: 'counter',
    defaultValue: 0,
    min: 0,
    max: 20,
    section: 'Coral Scoring',
    order: 13,
  },
  {
    key: 'coral_missed',
    label: 'Coral Missed',
    type: 'counter',
    defaultValue: 0,
    min: 0,
    max: 20,
    section: 'Coral Scoring',
    order: 14,
  },

  // Preloaded Piece
  {
    key: 'preloaded_piece_type',
    label: 'Preloaded Piece Type',
    type: 'select',
    defaultValue: null,
    options: [
      { value: 'coral', label: 'Coral' },
      { value: 'algae', label: 'Algae' },
    ],
    section: 'Preloaded',
    order: 20,
  },
  {
    key: 'preloaded_piece_scored',
    label: 'Preloaded Piece Scored?',
    type: 'boolean',
    defaultValue: false,
    section: 'Preloaded',
    order: 21,
  },

  // Notes
  {
    key: 'notes',
    label: 'Auto Notes',
    type: 'textarea',
    defaultValue: '',
    section: 'Notes',
    order: 100,
    helpText: 'Describe the autonomous routine, consistency, issues, etc.',
  },
];

// ============================================================================
// TELEOPERATED PERIOD FIELDS
// ============================================================================

export const TELEOP_FIELDS_2025: FieldDefinition[] = [
  // Coral Scoring by Level
  {
    key: 'coral_scored_L1',
    label: 'Coral Scored - Level 1',
    type: 'counter',
    defaultValue: 0,
    min: 0,
    section: 'Coral Scoring',
    order: 10,
  },
  {
    key: 'coral_scored_L2',
    label: 'Coral Scored - Level 2',
    type: 'counter',
    defaultValue: 0,
    min: 0,
    section: 'Coral Scoring',
    order: 11,
  },
  {
    key: 'coral_scored_L3',
    label: 'Coral Scored - Level 3',
    type: 'counter',
    defaultValue: 0,
    min: 0,
    section: 'Coral Scoring',
    order: 12,
  },
  {
    key: 'coral_scored_L4',
    label: 'Coral Scored - Level 4',
    type: 'counter',
    defaultValue: 0,
    min: 0,
    section: 'Coral Scoring',
    order: 13,
  },
  {
    key: 'coral_missed',
    label: 'Coral Missed',
    type: 'counter',
    defaultValue: 0,
    min: 0,
    section: 'Coral Scoring',
    order: 14,
  },

  // Algae Scoring (Teleop Only)
  {
    key: 'algae_scored_barge',
    label: 'Algae Scored in Barge',
    type: 'counter',
    defaultValue: 0,
    min: 0,
    section: 'Algae Scoring',
    order: 20,
  },
  {
    key: 'algae_scored_processor',
    label: 'Algae Scored in Processor',
    type: 'counter',
    defaultValue: 0,
    min: 0,
    section: 'Algae Scoring',
    order: 21,
  },
  {
    key: 'algae_missed',
    label: 'Algae Missed',
    type: 'counter',
    defaultValue: 0,
    min: 0,
    section: 'Algae Scoring',
    order: 22,
  },

  // Cycle Tracking
  {
    key: 'cycles_completed',
    label: 'Cycles Completed',
    type: 'counter',
    defaultValue: 0,
    min: 0,
    section: 'Cycle Tracking',
    order: 30,
    helpText: 'How many complete scoring cycles did the robot finish?',
  },

  // Pickup Locations - Coral
  {
    key: 'ground_pickup_coral',
    label: 'Coral Picked from Ground',
    type: 'counter',
    defaultValue: 0,
    min: 0,
    section: 'Pickup - Coral',
    order: 40,
  },
  {
    key: 'station_pickup_coral',
    label: 'Coral Picked from Station',
    type: 'counter',
    defaultValue: 0,
    min: 0,
    section: 'Pickup - Coral',
    order: 41,
  },

  // Pickup Locations - Algae (can be picked from ground, reef, or lollipops)
  {
    key: 'ground_pickup_algae',
    label: 'Algae Picked from Ground',
    type: 'counter',
    defaultValue: 0,
    min: 0,
    section: 'Pickup - Algae',
    order: 50,
  },
  {
    key: 'reef_pickup_algae',
    label: 'Algae Picked from Reef',
    type: 'counter',
    defaultValue: 0,
    min: 0,
    section: 'Pickup - Algae',
    order: 51,
  },
  {
    key: 'lollipop_pickup_algae',
    label: 'Algae Picked from Lollipops',
    type: 'counter',
    defaultValue: 0,
    min: 0,
    section: 'Pickup - Algae',
    order: 52,
  },

  // Defense
  {
    key: 'defense_time_seconds',
    label: 'Time Spent on Defense (seconds)',
    type: 'number',
    defaultValue: 0,
    min: 0,
    max: 135,
    section: 'Defense',
    order: 60,
  },
  {
    key: 'defense_effectiveness',
    label: 'Defense Effectiveness',
    type: 'select',
    defaultValue: null,
    options: [
      { value: 'none', label: 'None' },
      { value: 'minimal', label: 'Minimal' },
      { value: 'moderate', label: 'Moderate' },
      { value: 'effective', label: 'Effective' },
      { value: 'dominant', label: 'Dominant' },
    ],
    section: 'Defense',
    order: 61,
  },
  {
    key: 'defended_by_opponent_seconds',
    label: 'Time Defended by Opponent (seconds)',
    type: 'number',
    defaultValue: 0,
    min: 0,
    max: 135,
    section: 'Defense',
    order: 62,
  },

  // Penalties
  {
    key: 'penalties_caused',
    label: 'Penalties Caused',
    type: 'counter',
    defaultValue: 0,
    min: 0,
    section: 'Penalties',
    order: 70,
  },

  // Notes
  {
    key: 'notes',
    label: 'Teleop Notes',
    type: 'textarea',
    defaultValue: '',
    section: 'Notes',
    order: 100,
  },
];

// ============================================================================
// ENDGAME PERIOD FIELDS
// ============================================================================

export const ENDGAME_FIELDS_2025: FieldDefinition[] = [
  // Cage Climbing (Only Endgame Activity)
  {
    key: 'cage_climb_attempted',
    label: 'Cage Climb Attempted?',
    type: 'boolean',
    defaultValue: false,
    section: 'Cage Climbing',
    order: 10,
  },
  {
    key: 'cage_climb_successful',
    label: 'Cage Climb Successful?',
    type: 'boolean',
    defaultValue: false,
    section: 'Cage Climbing',
    order: 11,
  },
  {
    key: 'cage_level_achieved',
    label: 'Cage Level Achieved',
    type: 'select',
    defaultValue: null,
    options: [
      { value: 'shallow', label: 'Shallow' },
      { value: 'deep', label: 'Deep' },
    ],
    section: 'Cage Climbing',
    order: 12,
  },

  // Timing
  {
    key: 'endgame_start_time_seconds',
    label: 'Endgame Start Time (seconds)',
    type: 'number',
    defaultValue: null,
    min: 120,
    max: 150,
    section: 'Timing',
    order: 20,
    helpText: 'When did they start their endgame? (120-150)',
  },
  {
    key: 'endgame_completion_time_seconds',
    label: 'Time to Complete Endgame (seconds)',
    type: 'number',
    defaultValue: null,
    min: 0,
    max: 30,
    section: 'Timing',
    order: 21,
  },

  // Points
  {
    key: 'endgame_points',
    label: 'Endgame Points',
    type: 'number',
    defaultValue: 0,
    min: 0,
    section: 'Points',
    order: 30,
    helpText: 'Calculated endgame points',
  },

  // Cooperation
  {
    key: 'cooperation_with_alliance',
    label: 'Alliance Cooperation Notes',
    type: 'textarea',
    defaultValue: '',
    section: 'Cooperation',
    order: 40,
    helpText: 'How did they coordinate with alliance partners?',
  },

  // Notes
  {
    key: 'notes',
    label: 'Endgame Notes',
    type: 'textarea',
    defaultValue: '',
    section: 'Notes',
    order: 100,
  },
];

// ============================================================================
// VALIDATION SCHEMAS (JSON Schema format)
// ============================================================================

export const AUTO_SCHEMA_2025 = {
  type: 'object',
  required: ['schema_version', 'left_starting_zone'],
  properties: {
    schema_version: { type: 'string', const: '2025.1' },
    left_starting_zone: { type: 'boolean' },
    coral_scored_L1: { type: 'number', minimum: 0 },
    coral_scored_L2: { type: 'number', minimum: 0 },
    coral_scored_L3: { type: 'number', minimum: 0 },
    coral_scored_L4: { type: 'number', minimum: 0 },
    coral_missed: { type: 'number', minimum: 0 },
    preloaded_piece_type: { type: 'string', enum: ['coral', 'algae'] },
    preloaded_piece_scored: { type: 'boolean' },
    notes: { type: 'string' },
  },
};

export const TELEOP_SCHEMA_2025 = {
  type: 'object',
  required: ['schema_version', 'cycles_completed'],
  properties: {
    schema_version: { type: 'string', const: '2025.1' },
    coral_scored_L1: { type: 'number', minimum: 0 },
    coral_scored_L2: { type: 'number', minimum: 0 },
    coral_scored_L3: { type: 'number', minimum: 0 },
    coral_scored_L4: { type: 'number', minimum: 0 },
    coral_missed: { type: 'number', minimum: 0 },
    algae_scored_barge: { type: 'number', minimum: 0 },
    algae_scored_processor: { type: 'number', minimum: 0 },
    algae_missed: { type: 'number', minimum: 0 },
    cycles_completed: { type: 'number', minimum: 0 },
    ground_pickup_coral: { type: 'number', minimum: 0 },
    station_pickup_coral: { type: 'number', minimum: 0 },
    ground_pickup_algae: { type: 'number', minimum: 0 },
    reef_pickup_algae: { type: 'number', minimum: 0 },
    lollipop_pickup_algae: { type: 'number', minimum: 0 },
    defense_time_seconds: { type: 'number', minimum: 0, maximum: 135 },
    defense_effectiveness: {
      type: 'string',
      enum: ['none', 'minimal', 'moderate', 'effective', 'dominant'],
    },
    defended_by_opponent_seconds: { type: 'number', minimum: 0, maximum: 135 },
    penalties_caused: { type: 'number', minimum: 0 },
    notes: { type: 'string' },
  },
};

export const ENDGAME_SCHEMA_2025 = {
  type: 'object',
  required: ['schema_version', 'endgame_points'],
  properties: {
    schema_version: { type: 'string', const: '2025.1' },
    cage_climb_attempted: { type: 'boolean' },
    cage_climb_successful: { type: 'boolean' },
    cage_level_achieved: { type: 'string', enum: ['shallow', 'deep'] },
    endgame_start_time_seconds: { type: 'number', minimum: 120, maximum: 150 },
    endgame_completion_time_seconds: { type: 'number', minimum: 0, maximum: 30 },
    endgame_points: { type: 'number', minimum: 0 },
    cooperation_with_alliance: { type: 'string' },
    notes: { type: 'string' },
  },
};

export const ROBOT_CAPABILITIES_SCHEMA_2025 = {
  type: 'object',
  required: ['schema_version'],
  properties: {
    schema_version: { type: 'string', const: '2025.1' },
    can_handle_coral: { type: 'boolean' },
    can_handle_algae: { type: 'boolean' },
    can_handle_both_simultaneously: { type: 'boolean' },
    preferred_game_piece: { type: 'string', enum: ['coral', 'algae'] },
    can_score_coral: { type: 'boolean' },
    can_score_L1: { type: 'boolean' },
    can_score_L2: { type: 'boolean' },
    can_score_L3: { type: 'boolean' },
    can_score_L4: { type: 'boolean' },
    max_reef_level: { type: 'string', enum: ['L1', 'L2', 'L3', 'L4'] },
    can_score_algae: { type: 'boolean' },
    can_score_algae_barge: { type: 'boolean' },
    can_score_algae_processor: { type: 'boolean' },
    can_pickup_from_ground: { type: 'boolean' },
    can_pickup_from_station: { type: 'boolean' },
    pickup_mechanism_type: { type: 'string' },
    estimated_cycle_time_seconds: { type: 'number', minimum: 0 },
    scoring_consistency: { type: 'string', enum: ['low', 'medium', 'high'] },
    has_vision_targeting: { type: 'boolean' },
    has_automated_scoring: { type: 'boolean' },
    programming_features: { type: 'array', items: { type: 'string' } },
    notes: { type: 'string' },
  },
};

export const AUTONOMOUS_CAPABILITIES_SCHEMA_2025 = {
  type: 'object',
  required: ['schema_version', 'auto_scoring_capability', 'auto_max_coral_pieces'],
  properties: {
    schema_version: { type: 'string', const: '2025.1' },
    auto_scoring_capability: { type: 'boolean' },
    auto_max_coral_pieces: { type: 'number', minimum: 0 },
    auto_preferred_starting_position: { type: 'number', enum: [1, 2, 3] },
    auto_uses_vision: { type: 'boolean' },
    auto_path_planning: { type: 'boolean' },
    auto_multi_piece_capable: { type: 'boolean' },
    auto_success_rate_estimate: { type: 'number', minimum: 0, maximum: 100 },
    auto_tested_at_competitions: { type: 'boolean' },
    auto_strategy_description: { type: 'string' },
    notes: { type: 'string' },
  },
};

// ============================================================================
// EXPORT ALL CONFIGURATION
// ============================================================================

export const REEFSCAPE_CONFIG = {
  ...SEASON_2025_CONFIG,
  autoFields: AUTO_FIELDS_2025,
  teleopFields: TELEOP_FIELDS_2025,
  endgameFields: ENDGAME_FIELDS_2025,
  autoSchema: AUTO_SCHEMA_2025,
  teleopSchema: TELEOP_SCHEMA_2025,
  endgameSchema: ENDGAME_SCHEMA_2025,
  robotCapabilitiesSchema: ROBOT_CAPABILITIES_SCHEMA_2025,
  autonomousCapabilitiesSchema: AUTONOMOUS_CAPABILITIES_SCHEMA_2025,
} as const;
