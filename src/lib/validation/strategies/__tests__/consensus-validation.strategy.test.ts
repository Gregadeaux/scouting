/**
 * Unit tests for ConsensusValidationStrategy
 *
 * Tests the consensus validation strategy implementation including:
 * - Field comparison logic
 * - Consensus calculation
 * - Validation outcome determination
 * - Insufficient scouts handling
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConsensusValidationStrategy } from '../consensus-validation.strategy';
import { ScoutingDataRepository } from '@/lib/repositories/scouting-data.repository';
import { ELORatingCalculator } from '@/lib/algorithms/elo-calculator';
import type { ValidationContext, ValidationResult } from '@/types/validation';
import type { MatchScouting } from '@/types';

// Mock the repository
vi.mock('@/lib/repositories/scouting-data.repository');

describe('ConsensusValidationStrategy', () => {
  let strategy: ConsensusValidationStrategy;
  let mockRepository: ScoutingDataRepository;
  let mockCalculator: ELORatingCalculator;

  beforeEach(() => {
    mockRepository = new ScoutingDataRepository();
    mockCalculator = new ELORatingCalculator();
    strategy = new ConsensusValidationStrategy(mockRepository, mockCalculator);
  });

  describe('canValidate', () => {
    it('should return false if matchKey is missing', async () => {
      const context: ValidationContext = {
        eventKey: '2025casj',
        teamNumber: 254,
        seasonYear: 2025,
      };

      const result = await strategy.canValidate(context);
      expect(result).toBe(false);
    });

    it('should return false if teamNumber is missing', async () => {
      const context: ValidationContext = {
        eventKey: '2025casj',
        matchKey: '2025casj_qm1',
        seasonYear: 2025,
      };

      const result = await strategy.canValidate(context);
      expect(result).toBe(false);
    });

    it('should return false if insufficient scouts', async () => {
      const context: ValidationContext = {
        eventKey: '2025casj',
        matchKey: '2025casj_qm1',
        teamNumber: 254,
        seasonYear: 2025,
        minScoutsRequired: 3,
      };

      // Mock repository to return only 2 scouts
      vi.spyOn(mockRepository, 'getMatchScoutingByMatch').mockResolvedValue([
        { team_number: 254, scout_name: 'Scout1' } as unknown as MatchScouting,
        { team_number: 254, scout_name: 'Scout2' } as unknown as MatchScouting,
      ]);

      const result = await strategy.canValidate(context);
      expect(result).toBe(false);
    });

    it('should return true if minimum scouts met', async () => {
      const context: ValidationContext = {
        eventKey: '2025casj',
        matchKey: '2025casj_qm1',
        teamNumber: 254,
        seasonYear: 2025,
        minScoutsRequired: 3,
      };

      // Mock repository to return 3 scouts
      vi.spyOn(mockRepository, 'getMatchScoutingByMatch').mockResolvedValue([
        { team_number: 254, scout_name: 'Scout1' } as unknown as MatchScouting,
        { team_number: 254, scout_name: 'Scout2' } as unknown as MatchScouting,
        { team_number: 254, scout_name: 'Scout3' } as unknown as MatchScouting,
      ]);

      const result = await strategy.canValidate(context);
      expect(result).toBe(true);
    });
  });

  describe('Field comparison', () => {
    it('should return 1.0 for exact numeric match', () => {
      // Access private method via type assertion
      const compareFunc = (strategy as any).compareNumericField.bind(strategy);
      expect(compareFunc(5, 5)).toBe(1.0);
    });

    it('should return 0.8 for off-by-1 numeric', () => {
      const compareFunc = (strategy as any).compareNumericField.bind(strategy);
      expect(compareFunc(5, 6)).toBe(0.8);
      expect(compareFunc(5, 4)).toBe(0.8);
    });

    it('should return 0.6 for off-by-2 numeric', () => {
      const compareFunc = (strategy as any).compareNumericField.bind(strategy);
      expect(compareFunc(5, 7)).toBe(0.6);
      expect(compareFunc(5, 3)).toBe(0.6);
    });

    it('should return 1.0 for exact boolean match', () => {
      const compareFunc = (strategy as any).compareBooleanField.bind(strategy);
      expect(compareFunc(true, true)).toBe(1.0);
      expect(compareFunc(false, false)).toBe(1.0);
    });

    it('should return 0.0 for boolean mismatch', () => {
      const compareFunc = (strategy as any).compareBooleanField.bind(strategy);
      expect(compareFunc(true, false)).toBe(0.0);
      expect(compareFunc(false, true)).toBe(0.0);
    });

    it('should return 1.0 for exact category match', () => {
      const compareFunc = (strategy as any).compareCategoryField.bind(strategy);
      expect(compareFunc('shallow', 'shallow')).toBe(1.0);
      expect(compareFunc('deep', 'deep')).toBe(1.0);
    });

    it('should return 0.0 for category mismatch', () => {
      const compareFunc = (strategy as any).compareCategoryField.bind(strategy);
      expect(compareFunc('shallow', 'deep')).toBe(0.0);
    });
  });

  describe('Outcome determination', () => {
    it('should return exact_match for 1.0 accuracy', () => {
      const determineFunc = (strategy as any).determineOutcome.bind(strategy);
      expect(determineFunc(1.0)).toBe('exact_match');
    });

    it('should return close_match for 0.7-0.99 accuracy', () => {
      const determineFunc = (strategy as any).determineOutcome.bind(strategy);
      expect(determineFunc(0.8)).toBe('close_match');
      expect(determineFunc(0.7)).toBe('close_match');
      expect(determineFunc(0.99)).toBe('close_match');
    });

    it('should return mismatch for <0.7 accuracy', () => {
      const determineFunc = (strategy as any).determineOutcome.bind(strategy);
      expect(determineFunc(0.5)).toBe('mismatch');
      expect(determineFunc(0.0)).toBe('mismatch');
      expect(determineFunc(0.69)).toBe('mismatch');
    });
  });

  describe('validate', () => {
    it('should throw error if matchKey missing', async () => {
      const context: ValidationContext = {
        eventKey: '2025casj',
        teamNumber: 254,
        seasonYear: 2025,
      };

      await expect(strategy.validate(context)).rejects.toThrow('matchKey is required');
    });

    it('should throw error if insufficient scouts', async () => {
      const context: ValidationContext = {
        eventKey: '2025casj',
        matchKey: '2025casj_qm1',
        teamNumber: 254,
        seasonYear: 2025,
        minScoutsRequired: 3,
      };

      // Mock repository to return only 2 scouts
      vi.spyOn(mockRepository, 'getMatchScoutingByMatch').mockResolvedValue([
        {
          team_number: 254,
          scout_name: 'Scout1',
          auto_performance: { coral_scored_L1: 2 },
          teleop_performance: { coral_scored_L1: 5 },
          endgame_performance: { cage_climb_successful: true },
        } as unknown as MatchScouting,
        {
          team_number: 254,
          scout_name: 'Scout2',
          auto_performance: { coral_scored_L1: 3 },
          teleop_performance: { coral_scored_L1: 4 },
          endgame_performance: { cage_climb_successful: true },
        } as unknown as MatchScouting,
      ]);

      await expect(strategy.validate(context)).rejects.toThrow('Insufficient scouts');
    });

    it('should generate validation results for each field', async () => {
      const context: ValidationContext = {
        eventKey: '2025casj',
        matchKey: '2025casj_qm1',
        teamNumber: 254,
        seasonYear: 2025,
        minScoutsRequired: 3,
        executionId: 'test-execution-id',
      };

      // Mock repository to return 3 scouts with similar observations
      vi.spyOn(mockRepository, 'getMatchScoutingByMatch').mockResolvedValue([
        {
          id: 'obs1',
          team_number: 254,
          scout_name: 'Scout1',
          auto_performance: { schema_version: '2025.1', coral_scored_L1: 2 },
          teleop_performance: { schema_version: '2025.1', coral_scored_L1: 5 },
          endgame_performance: {
            schema_version: '2025.1',
            cage_climb_successful: true,
          },
        } as unknown as MatchScouting,
        {
          id: 'obs2',
          team_number: 254,
          scout_name: 'Scout2',
          auto_performance: { schema_version: '2025.1', coral_scored_L1: 2 },
          teleop_performance: { schema_version: '2025.1', coral_scored_L1: 6 },
          endgame_performance: {
            schema_version: '2025.1',
            cage_climb_successful: true,
          },
        } as unknown as MatchScouting,
        {
          id: 'obs3',
          team_number: 254,
          scout_name: 'Scout3',
          auto_performance: { schema_version: '2025.1', coral_scored_L1: 2 },
          teleop_performance: { schema_version: '2025.1', coral_scored_L1: 5 },
          endgame_performance: {
            schema_version: '2025.1',
            cage_climb_successful: false,
          },
        } as unknown as MatchScouting,
      ]);

      const results = await strategy.validate(context);

      // Should generate results for all fields across all scouts
      expect(results).toBeDefined();
      expect(results.length).toBeGreaterThan(0);

      // Check structure of first result
      const firstResult = results[0];
      expect(firstResult).toHaveProperty('validationId');
      expect(firstResult).toHaveProperty('scouterId');
      expect(firstResult).toHaveProperty('matchKey');
      expect(firstResult).toHaveProperty('teamNumber');
      expect(firstResult).toHaveProperty('fieldPath');
      expect(firstResult).toHaveProperty('expectedValue');
      expect(firstResult).toHaveProperty('actualValue');
      expect(firstResult).toHaveProperty('accuracyScore');
      expect(firstResult).toHaveProperty('outcome');
      expect(firstResult.validationType).toBe('consensus');
      expect(firstResult.validationMethod).toBe('ConsensusValidationStrategy');
    });
  });
});
