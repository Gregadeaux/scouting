/**
 * Validation Utilities for JSONB Data
 *
 * Validates season-specific JSONB structures against schemas
 * Provides type guards and validation functions
 */

import type { ValidationResult, ValidationError } from '@/types';
import type {
  AutoPerformance2025,
  TeleopPerformance2025,
  EndgamePerformance2025,
  RobotCapabilities2025,
  AutonomousCapabilities2025,
} from '@/types/season-2025';
import type {
  AutoPerformance2026,
  TeleopPerformance2026,
  EndgamePerformance2026,
  RobotCapabilities2026,
  AutonomousCapabilities2026,
} from '@/types/season-2026';
import {
  AUTO_SCHEMA_2025,
  TELEOP_SCHEMA_2025,
  ENDGAME_SCHEMA_2025,
  ROBOT_CAPABILITIES_SCHEMA_2025,
  AUTONOMOUS_CAPABILITIES_SCHEMA_2025,
} from '@/lib/config/season-2025';
import {
  AUTO_SCHEMA_2026,
  TELEOP_SCHEMA_2026,
  ENDGAME_SCHEMA_2026,
  ROBOT_CAPABILITIES_SCHEMA_2026,
  AUTONOMOUS_CAPABILITIES_SCHEMA_2026,
} from '@/lib/config/season-2026';

// ============================================================================
// JSON SCHEMA TYPE
// ============================================================================

interface JsonSchemaProperty {
  type?: string;
  minimum?: number;
  maximum?: number;
  enum?: unknown[];
  const?: unknown;
}

interface JsonSchema {
  type: string;
  required?: string[];
  properties?: Record<string, JsonSchemaProperty>;
}

// ============================================================================
// GENERIC JSONB VALIDATION
// ============================================================================

/**
 * Simple JSON Schema validator
 * For production, consider using a library like Ajv for full JSON Schema support
 */
export function validateJSONB(data: unknown, schema: JsonSchema): ValidationResult {
  const errors: ValidationError[] = [];

  // Type guard: ensure data is an object
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    errors.push({
      field: 'root',
      message: 'Data must be an object',
      value: data,
    });
    return { valid: false, errors };
  }

  const dataObj = data as Record<string, unknown>;

  // Check required fields
  if (schema.required) {
    for (const field of schema.required) {
      if (dataObj[field] === undefined || dataObj[field] === null) {
        errors.push({
          field,
          message: `Field '${field}' is required`,
          value: dataObj[field],
        });
      }
    }
  }

  // Validate properties
  if (schema.properties) {
    for (const [key, propSchema] of Object.entries(schema.properties)) {
      const value = dataObj[key];

      // Skip if value is undefined and not required
      if (value === undefined || value === null) {
        continue;
      }

      // Type validation
      if (propSchema.type) {
        const actualType = typeof value;
        const expectedType = propSchema.type;

        if (expectedType === 'number' && actualType !== 'number') {
          errors.push({
            field: key,
            message: `Field '${key}' must be a number`,
            value,
          });
        } else if (expectedType === 'string' && actualType !== 'string') {
          errors.push({
            field: key,
            message: `Field '${key}' must be a string`,
            value,
          });
        } else if (expectedType === 'boolean' && actualType !== 'boolean') {
          errors.push({
            field: key,
            message: `Field '${key}' must be a boolean`,
            value,
          });
        }
      }

      // Minimum/Maximum validation
      if (typeof value === 'number') {
        if (propSchema.minimum !== undefined && value < propSchema.minimum) {
          errors.push({
            field: key,
            message: `Field '${key}' must be >= ${propSchema.minimum}`,
            value,
          });
        }
        if (propSchema.maximum !== undefined && value > propSchema.maximum) {
          errors.push({
            field: key,
            message: `Field '${key}' must be <= ${propSchema.maximum}`,
            value,
          });
        }
      }

      // Enum validation
      if (propSchema.enum && !propSchema.enum.includes(value)) {
        errors.push({
          field: key,
          message: `Field '${key}' must be one of: ${propSchema.enum.join(', ')}`,
          value,
        });
      }

      // Const validation
      if (propSchema.const !== undefined && value !== propSchema.const) {
        errors.push({
          field: key,
          message: `Field '${key}' must be '${propSchema.const}'`,
          value,
        });
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// 2025 SEASON-SPECIFIC VALIDATION
// ============================================================================

export function validateAutoPerformance2025(
  data: unknown
): ValidationResult {
  return validateJSONB(data, AUTO_SCHEMA_2025 as JsonSchema);
}

export function validateTeleopPerformance2025(
  data: unknown
): ValidationResult {
  return validateJSONB(data, TELEOP_SCHEMA_2025 as JsonSchema);
}

export function validateEndgamePerformance2025(
  data: unknown
): ValidationResult {
  return validateJSONB(data, ENDGAME_SCHEMA_2025 as JsonSchema);
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

export function isAutoPerformance2025(data: unknown): data is AutoPerformance2025 {
  const result = validateAutoPerformance2025(data);
  return result.valid;
}

export function isTeleopPerformance2025(data: unknown): data is TeleopPerformance2025 {
  const result = validateTeleopPerformance2025(data);
  return result.valid;
}

export function isEndgamePerformance2025(data: unknown): data is EndgamePerformance2025 {
  const result = validateEndgamePerformance2025(data);
  return result.valid;
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validates all three performance JSONB fields for a match scouting submission
 */
export function validateMatchScoutingData2025(data: {
  auto_performance: unknown;
  teleop_performance: unknown;
  endgame_performance: unknown;
}): ValidationResult {
  const errors: ValidationError[] = [];

  // Validate auto
  const autoResult = validateAutoPerformance2025(data.auto_performance);
  if (!autoResult.valid) {
    errors.push(
      ...autoResult.errors.map((e) => ({
        ...e,
        field: `auto_performance.${e.field}`,
      }))
    );
  }

  // Validate teleop
  const teleopResult = validateTeleopPerformance2025(data.teleop_performance);
  if (!teleopResult.valid) {
    errors.push(
      ...teleopResult.errors.map((e) => ({
        ...e,
        field: `teleop_performance.${e.field}`,
      }))
    );
  }

  // Validate endgame
  const endgameResult = validateEndgamePerformance2025(data.endgame_performance);
  if (!endgameResult.valid) {
    errors.push(
      ...endgameResult.errors.map((e) => ({
        ...e,
        field: `endgame_performance.${e.field}`,
      }))
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Sanitizes JSONB data by removing undefined values and ensuring schema_version
 */
export function sanitizeJSONBData<T extends Record<string, unknown>>(
  data: T,
  schemaVersion: string
): T & { schema_version: string } {
  const sanitized = { schema_version: schemaVersion } as T & { schema_version: string };

  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined && value !== null) {
      (sanitized as Record<string, unknown>)[key] = value;
    }
  }

  return sanitized;
}

// ============================================================================
// PIT SCOUTING VALIDATION
// ============================================================================

export function validateRobotCapabilities2025(
  data: unknown
): ValidationResult {
  return validateJSONB(data, ROBOT_CAPABILITIES_SCHEMA_2025 as JsonSchema);
}

export function validateAutonomousCapabilities2025(
  data: unknown
): ValidationResult {
  return validateJSONB(data, AUTONOMOUS_CAPABILITIES_SCHEMA_2025 as JsonSchema);
}

// Type guards
export function isRobotCapabilities2025(data: unknown): data is RobotCapabilities2025 {
  const result = validateRobotCapabilities2025(data);
  return result.valid;
}

export function isAutonomousCapabilities2025(data: unknown): data is AutonomousCapabilities2025 {
  const result = validateAutonomousCapabilities2025(data);
  return result.valid;
}

/**
 * Validates both robot and autonomous capabilities for a pit scouting submission
 */
export function validatePitScoutingData2025(data: {
  robot_capabilities: unknown;
  autonomous_capabilities: unknown;
}): ValidationResult {
  const errors: ValidationError[] = [];

  // Validate robot capabilities
  const robotResult = validateRobotCapabilities2025(data.robot_capabilities);
  if (!robotResult.valid) {
    errors.push(
      ...robotResult.errors.map((e) => ({
        ...e,
        field: `robot_capabilities.${e.field}`,
      }))
    );
  }

  // Validate autonomous capabilities
  const autoResult = validateAutonomousCapabilities2025(data.autonomous_capabilities);
  if (!autoResult.valid) {
    errors.push(
      ...autoResult.errors.map((e) => ({
        ...e,
        field: `autonomous_capabilities.${e.field}`,
      }))
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// 2026 SEASON-SPECIFIC VALIDATION (PLACEHOLDER - UPDATE AFTER GAME REVEAL)
// ============================================================================

export function validateAutoPerformance2026(
  data: unknown
): ValidationResult {
  return validateJSONB(data, AUTO_SCHEMA_2026 as JsonSchema);
}

export function validateTeleopPerformance2026(
  data: unknown
): ValidationResult {
  return validateJSONB(data, TELEOP_SCHEMA_2026 as JsonSchema);
}

export function validateEndgamePerformance2026(
  data: unknown
): ValidationResult {
  return validateJSONB(data, ENDGAME_SCHEMA_2026 as JsonSchema);
}

// ============================================================================
// 2026 TYPE GUARDS
// ============================================================================

export function isAutoPerformance2026(data: unknown): data is AutoPerformance2026 {
  const result = validateAutoPerformance2026(data);
  return result.valid;
}

export function isTeleopPerformance2026(data: unknown): data is TeleopPerformance2026 {
  const result = validateTeleopPerformance2026(data);
  return result.valid;
}

export function isEndgamePerformance2026(data: unknown): data is EndgamePerformance2026 {
  const result = validateEndgamePerformance2026(data);
  return result.valid;
}

// ============================================================================
// 2026 MATCH SCOUTING VALIDATION
// ============================================================================

/**
 * Validates all three performance JSONB fields for a 2026 match scouting submission
 */
export function validateMatchScoutingData2026(data: {
  auto_performance: unknown;
  teleop_performance: unknown;
  endgame_performance: unknown;
}): ValidationResult {
  const errors: ValidationError[] = [];

  // Validate auto
  const autoResult = validateAutoPerformance2026(data.auto_performance);
  if (!autoResult.valid) {
    errors.push(
      ...autoResult.errors.map((e) => ({
        ...e,
        field: `auto_performance.${e.field}`,
      }))
    );
  }

  // Validate teleop
  const teleopResult = validateTeleopPerformance2026(data.teleop_performance);
  if (!teleopResult.valid) {
    errors.push(
      ...teleopResult.errors.map((e) => ({
        ...e,
        field: `teleop_performance.${e.field}`,
      }))
    );
  }

  // Validate endgame
  const endgameResult = validateEndgamePerformance2026(data.endgame_performance);
  if (!endgameResult.valid) {
    errors.push(
      ...endgameResult.errors.map((e) => ({
        ...e,
        field: `endgame_performance.${e.field}`,
      }))
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// 2026 PIT SCOUTING VALIDATION
// ============================================================================

export function validateRobotCapabilities2026(
  data: unknown
): ValidationResult {
  return validateJSONB(data, ROBOT_CAPABILITIES_SCHEMA_2026 as JsonSchema);
}

export function validateAutonomousCapabilities2026(
  data: unknown
): ValidationResult {
  return validateJSONB(data, AUTONOMOUS_CAPABILITIES_SCHEMA_2026 as JsonSchema);
}

// Type guards
export function isRobotCapabilities2026(data: unknown): data is RobotCapabilities2026 {
  const result = validateRobotCapabilities2026(data);
  return result.valid;
}

export function isAutonomousCapabilities2026(data: unknown): data is AutonomousCapabilities2026 {
  const result = validateAutonomousCapabilities2026(data);
  return result.valid;
}

/**
 * Validates both robot and autonomous capabilities for a 2026 pit scouting submission
 */
export function validatePitScoutingData2026(data: {
  robot_capabilities: unknown;
  autonomous_capabilities: unknown;
}): ValidationResult {
  const errors: ValidationError[] = [];

  // Validate robot capabilities
  const robotResult = validateRobotCapabilities2026(data.robot_capabilities);
  if (!robotResult.valid) {
    errors.push(
      ...robotResult.errors.map((e) => ({
        ...e,
        field: `robot_capabilities.${e.field}`,
      }))
    );
  }

  // Validate autonomous capabilities
  const autoResult = validateAutonomousCapabilities2026(data.autonomous_capabilities);
  if (!autoResult.valid) {
    errors.push(
      ...autoResult.errors.map((e) => ({
        ...e,
        field: `autonomous_capabilities.${e.field}`,
      }))
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
