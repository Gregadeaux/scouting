/**
 * 2026 Season Configuration
 *
 * PLACEHOLDER FILE - UPDATE AFTER GAME REVEAL (January 10, 2026)
 *
 * This configuration file defines the structure for data collection forms,
 * validation rules, and season-specific settings.
 *
 * NON-PROGRAMMERS: This file can be edited to adapt to new seasons!
 * Update field definitions, labels, and validation rules without touching code.
 */

import type { FieldDefinition, FieldType } from './season-2025';

// Re-export the types for convenience
export type { FieldDefinition, FieldType };

// ============================================================================
// SEASON METADATA
// ============================================================================

export const SEASON_2026_CONFIG = {
  year: 2026,
  gameName: 'TBD', // Update after game reveal
  gameDescription:
    'PLACEHOLDER: Update with game description after the January 10, 2026 reveal.',

  // Duration (seconds) - typically consistent across years
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
// AUTONOMOUS PERIOD FIELDS (PLACEHOLDER)
// ============================================================================

export const AUTO_FIELDS_2026: FieldDefinition[] = [
  // Mobility (common across most FRC games)
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

  // PLACEHOLDER: Scoring fields - update after reveal
  {
    key: 'pieces_scored_low',
    label: 'Pieces Scored - Low',
    type: 'counter',
    defaultValue: 0,
    min: 0,
    max: 20,
    section: 'Scoring',
    order: 10,
  },
  {
    key: 'pieces_scored_mid',
    label: 'Pieces Scored - Mid',
    type: 'counter',
    defaultValue: 0,
    min: 0,
    max: 20,
    section: 'Scoring',
    order: 11,
  },
  {
    key: 'pieces_scored_high',
    label: 'Pieces Scored - High',
    type: 'counter',
    defaultValue: 0,
    min: 0,
    max: 20,
    section: 'Scoring',
    order: 12,
  },
  {
    key: 'pieces_missed',
    label: 'Pieces Missed',
    type: 'counter',
    defaultValue: 0,
    min: 0,
    max: 20,
    section: 'Scoring',
    order: 13,
  },

  // Preloaded Piece (common pattern)
  {
    key: 'preloaded_piece_type',
    label: 'Preloaded Piece Type',
    type: 'select',
    defaultValue: null,
    options: [
      { value: 'piece_a', label: 'Piece A' },
      { value: 'piece_b', label: 'Piece B' },
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
// TELEOPERATED PERIOD FIELDS (PLACEHOLDER)
// ============================================================================

export const TELEOP_FIELDS_2026: FieldDefinition[] = [
  // Scoring fields - PLACEHOLDER
  {
    key: 'pieces_scored_low',
    label: 'Pieces Scored - Low',
    type: 'counter',
    defaultValue: 0,
    min: 0,
    section: 'Scoring',
    order: 10,
  },
  {
    key: 'pieces_scored_mid',
    label: 'Pieces Scored - Mid',
    type: 'counter',
    defaultValue: 0,
    min: 0,
    section: 'Scoring',
    order: 11,
  },
  {
    key: 'pieces_scored_high',
    label: 'Pieces Scored - High',
    type: 'counter',
    defaultValue: 0,
    min: 0,
    section: 'Scoring',
    order: 12,
  },
  {
    key: 'pieces_missed',
    label: 'Pieces Missed',
    type: 'counter',
    defaultValue: 0,
    min: 0,
    section: 'Scoring',
    order: 13,
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

  // Pickup Locations - PLACEHOLDER
  {
    key: 'ground_pickups',
    label: 'Ground Pickups',
    type: 'counter',
    defaultValue: 0,
    min: 0,
    section: 'Pickup',
    order: 40,
  },
  {
    key: 'station_pickups',
    label: 'Station Pickups',
    type: 'counter',
    defaultValue: 0,
    min: 0,
    section: 'Pickup',
    order: 41,
  },

  // Defense (common fields)
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
// ENDGAME PERIOD FIELDS (PLACEHOLDER)
// ============================================================================

export const ENDGAME_FIELDS_2026: FieldDefinition[] = [
  // Endgame Action - PLACEHOLDER
  {
    key: 'endgame_attempted',
    label: 'Endgame Attempted?',
    type: 'boolean',
    defaultValue: false,
    section: 'Endgame Action',
    order: 10,
  },
  {
    key: 'endgame_successful',
    label: 'Endgame Successful?',
    type: 'boolean',
    defaultValue: false,
    section: 'Endgame Action',
    order: 11,
  },
  {
    key: 'endgame_action_achieved',
    label: 'Endgame Action Achieved',
    type: 'select',
    defaultValue: null,
    options: [
      { value: 'action_1', label: 'Action 1' },
      { value: 'action_2', label: 'Action 2' },
      { value: 'action_3', label: 'Action 3' },
    ],
    section: 'Endgame Action',
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
// VALIDATION SCHEMAS (JSON Schema format) - PLACEHOLDER
// ============================================================================

export const AUTO_SCHEMA_2026 = {
  type: 'object',
  required: ['schema_version', 'left_starting_zone'],
  properties: {
    schema_version: { type: 'string', const: '2026.1' },
    left_starting_zone: { type: 'boolean' },
    pieces_scored_low: { type: 'number', minimum: 0 },
    pieces_scored_mid: { type: 'number', minimum: 0 },
    pieces_scored_high: { type: 'number', minimum: 0 },
    pieces_missed: { type: 'number', minimum: 0 },
    preloaded_piece_type: { type: 'string', enum: ['piece_a', 'piece_b'] },
    preloaded_piece_scored: { type: 'boolean' },
    notes: { type: 'string' },
  },
};

export const TELEOP_SCHEMA_2026 = {
  type: 'object',
  required: ['schema_version', 'cycles_completed'],
  properties: {
    schema_version: { type: 'string', const: '2026.1' },
    pieces_scored_low: { type: 'number', minimum: 0 },
    pieces_scored_mid: { type: 'number', minimum: 0 },
    pieces_scored_high: { type: 'number', minimum: 0 },
    pieces_missed: { type: 'number', minimum: 0 },
    cycles_completed: { type: 'number', minimum: 0 },
    ground_pickups: { type: 'number', minimum: 0 },
    station_pickups: { type: 'number', minimum: 0 },
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

export const ENDGAME_SCHEMA_2026 = {
  type: 'object',
  required: ['schema_version', 'endgame_points'],
  properties: {
    schema_version: { type: 'string', const: '2026.1' },
    endgame_attempted: { type: 'boolean' },
    endgame_successful: { type: 'boolean' },
    endgame_action_achieved: { type: 'string', enum: ['action_1', 'action_2', 'action_3'] },
    endgame_start_time_seconds: { type: 'number', minimum: 120, maximum: 150 },
    endgame_completion_time_seconds: { type: 'number', minimum: 0, maximum: 30 },
    endgame_points: { type: 'number', minimum: 0 },
    cooperation_with_alliance: { type: 'string' },
    notes: { type: 'string' },
  },
};

export const ROBOT_CAPABILITIES_SCHEMA_2026 = {
  type: 'object',
  required: ['schema_version'],
  properties: {
    schema_version: { type: 'string', const: '2026.1' },
    can_handle_piece_a: { type: 'boolean' },
    can_handle_piece_b: { type: 'boolean' },
    can_handle_both_simultaneously: { type: 'boolean' },
    preferred_game_piece: { type: 'string', enum: ['piece_a', 'piece_b'] },
    can_score: { type: 'boolean' },
    can_score_low: { type: 'boolean' },
    can_score_mid: { type: 'boolean' },
    can_score_high: { type: 'boolean' },
    max_scoring_location: { type: 'string', enum: ['low', 'mid', 'high'] },
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

export const AUTONOMOUS_CAPABILITIES_SCHEMA_2026 = {
  type: 'object',
  required: ['schema_version', 'auto_scoring_capability', 'auto_max_pieces'],
  properties: {
    schema_version: { type: 'string', const: '2026.1' },
    auto_scoring_capability: { type: 'boolean' },
    auto_max_pieces: { type: 'number', minimum: 0 },
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
} as const;
