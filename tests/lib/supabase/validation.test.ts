/**
 * Unit Tests for Validation Module
 *
 * Tests validation functions for JSONB data structures
 */

import { describe, it, expect } from 'vitest';
import {
  validateJSONB,
  validateAutoPerformance2025,
  validateTeleopPerformance2025,
  validateEndgamePerformance2025,
  isAutoPerformance2025,
  isTeleopPerformance2025,
  isEndgamePerformance2025,
} from '@/lib/supabase/validation';
import {
  mockAutoPerformance2025,
  mockTeleopPerformance2025,
  mockEndgamePerformance2025,
} from '../../__mocks__/supabase';

describe('validateJSONB', () => {
  it('should validate a simple object with required fields', () => {
    const schema = {
      type: 'object',
      required: ['name', 'age'],
      properties: {
        name: { type: 'string' },
        age: { type: 'number', minimum: 0 },
      },
    };

    const validData = { name: 'John', age: 30 };
    const result = validateJSONB(validData, schema);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject non-object data', () => {
    const schema = {
      type: 'object',
      properties: {},
    };

    const result = validateJSONB('not an object', schema);

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].field).toBe('root');
    expect(result.errors[0].message).toContain('must be an object');
  });

  it('should detect missing required fields', () => {
    const schema = {
      type: 'object',
      required: ['name', 'email'],
      properties: {
        name: { type: 'string' },
        email: { type: 'string' },
      },
    };

    const invalidData = { name: 'John' };
    const result = validateJSONB(invalidData, schema);

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].field).toBe('email');
    expect(result.errors[0].message).toContain('required');
  });

  it('should validate field types correctly', () => {
    const schema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
        age: { type: 'number' },
        active: { type: 'boolean' },
      },
    };

    const invalidData = {
      name: 123, // Should be string
      age: 'thirty', // Should be number
      active: 'yes', // Should be boolean
    };
    const result = validateJSONB(invalidData, schema);

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some((e) => e.field === 'name')).toBe(true);
    expect(result.errors.some((e) => e.field === 'age')).toBe(true);
    expect(result.errors.some((e) => e.field === 'active')).toBe(true);
  });

  it('should validate minimum and maximum constraints', () => {
    const schema = {
      type: 'object',
      properties: {
        score: { type: 'number', minimum: 0, maximum: 100 },
      },
    };

    const tooLow = { score: -10 };
    const tooHigh = { score: 150 };
    const justRight = { score: 50 };

    expect(validateJSONB(tooLow, schema).valid).toBe(false);
    expect(validateJSONB(tooHigh, schema).valid).toBe(false);
    expect(validateJSONB(justRight, schema).valid).toBe(true);
  });

  it('should validate enum constraints', () => {
    const schema = {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['active', 'inactive', 'pending'] },
      },
    };

    const valid = { status: 'active' };
    const invalid = { status: 'deleted' };

    expect(validateJSONB(valid, schema).valid).toBe(true);
    expect(validateJSONB(invalid, schema).valid).toBe(false);
  });

  it('should validate const constraints', () => {
    const schema = {
      type: 'object',
      required: ['version'],
      properties: {
        version: { type: 'string', const: '2025.1' },
      },
    };

    const valid = { version: '2025.1' };
    const invalid = { version: '2024.1' };

    expect(validateJSONB(valid, schema).valid).toBe(true);
    expect(validateJSONB(invalid, schema).valid).toBe(false);
  });
});

describe('validateAutoPerformance2025', () => {
  it('should validate correct auto performance data', () => {
    const result = validateAutoPerformance2025(mockAutoPerformance2025);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject data without schema_version', () => {
    const invalidData = { ...mockAutoPerformance2025 };
    delete (invalidData as Record<string, unknown>).schema_version;

    const result = validateAutoPerformance2025(invalidData);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'schema_version')).toBe(true);
  });

  it('should reject data with wrong schema_version', () => {
    const invalidData = {
      ...mockAutoPerformance2025,
      schema_version: '2024.1', // Wrong version
    };

    const result = validateAutoPerformance2025(invalidData);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'schema_version')).toBe(true);
  });

  it('should reject negative values for counter fields', () => {
    const invalidData = {
      ...mockAutoPerformance2025,
      coral_scored_L1: -5, // Should be >= 0
    };

    const result = validateAutoPerformance2025(invalidData);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'coral_scored_L1')).toBe(true);
  });

  it('should allow optional notes field', () => {
    const dataWithoutNotes = { ...mockAutoPerformance2025 };
    delete (dataWithoutNotes as Record<string, unknown>).notes;

    const result = validateAutoPerformance2025(dataWithoutNotes);

    expect(result.valid).toBe(true);
  });
});

describe('validateTeleopPerformance2025', () => {
  it('should validate correct teleop performance data', () => {
    const result = validateTeleopPerformance2025(mockTeleopPerformance2025);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject invalid defense_effectiveness values', () => {
    const invalidData = {
      ...mockTeleopPerformance2025,
      defense_effectiveness: 'excellent', // Not a valid enum value (should be: none, minimal, moderate, effective, dominant)
    };

    const result = validateTeleopPerformance2025(invalidData);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'defense_effectiveness')).toBe(true);
  });

  it('should validate cycles_completed as required', () => {
    const invalidData = { ...mockTeleopPerformance2025 };
    delete (invalidData as Record<string, unknown>).cycles_completed;

    const result = validateTeleopPerformance2025(invalidData);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'cycles_completed')).toBe(true);
  });
});

describe('validateEndgamePerformance2025', () => {
  it('should validate correct endgame performance data', () => {
    const result = validateEndgamePerformance2025(mockEndgamePerformance2025);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should validate boolean fields', () => {
    const invalidData = {
      ...mockEndgamePerformance2025,
      cage_climb_attempted: 'yes', // Should be boolean
    };

    const result = validateEndgamePerformance2025(invalidData);

    expect(result.valid).toBe(false);
  });

  it('should validate cage_level_achieved enum', () => {
    const validLevels = ['shallow', 'deep'];

    for (const level of validLevels) {
      const data = { ...mockEndgamePerformance2025, cage_level_achieved: level };
      const result = validateEndgamePerformance2025(data);
      expect(result.valid).toBe(true);
    }

    const invalidData = {
      ...mockEndgamePerformance2025,
      cage_level_achieved: 'ultra-deep',
    };
    const result = validateEndgamePerformance2025(invalidData);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'cage_level_achieved')).toBe(true);
  });
});

describe('Type Guards', () => {
  describe('isAutoPerformance2025', () => {
    it('should return true for valid data', () => {
      expect(isAutoPerformance2025(mockAutoPerformance2025)).toBe(true);
    });

    it('should return false for invalid data', () => {
      expect(isAutoPerformance2025({ invalid: 'data' })).toBe(false);
      expect(isAutoPerformance2025(null)).toBe(false);
      expect(isAutoPerformance2025(undefined)).toBe(false);
      expect(isAutoPerformance2025('string')).toBe(false);
    });
  });

  describe('isTeleopPerformance2025', () => {
    it('should return true for valid data', () => {
      expect(isTeleopPerformance2025(mockTeleopPerformance2025)).toBe(true);
    });

    it('should return false for invalid data', () => {
      expect(isTeleopPerformance2025({ invalid: 'data' })).toBe(false);
      expect(isTeleopPerformance2025(null)).toBe(false);
    });
  });

  describe('isEndgamePerformance2025', () => {
    it('should return true for valid data', () => {
      expect(isEndgamePerformance2025(mockEndgamePerformance2025)).toBe(true);
    });

    it('should return false for invalid data', () => {
      expect(isEndgamePerformance2025({ invalid: 'data' })).toBe(false);
      expect(isEndgamePerformance2025(null)).toBe(false);
    });
  });
});

describe('Edge Cases', () => {
  it('should handle null values in optional fields', () => {
    const dataWithNull = {
      ...mockAutoPerformance2025,
      notes: null,
    };

    const result = validateAutoPerformance2025(dataWithNull);
    // Null should be treated as missing, which is valid for optional fields
    expect(result.valid).toBe(true);
  });

  it('should handle extra fields not in schema', () => {
    const dataWithExtra = {
      ...mockAutoPerformance2025,
      extraField: 'should be ignored',
    };

    const result = validateAutoPerformance2025(dataWithExtra);
    // Extra fields should not cause validation to fail
    expect(result.valid).toBe(true);
  });

  it('should handle undefined values in optional fields', () => {
    const dataWithUndefined = {
      ...mockAutoPerformance2025,
      notes: undefined,
    };

    const result = validateAutoPerformance2025(dataWithUndefined);
    expect(result.valid).toBe(true);
  });
});
