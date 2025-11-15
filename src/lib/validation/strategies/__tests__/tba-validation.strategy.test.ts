/**
 * Unit tests for TBAValidationStrategy
 *
 * Tests the alliance-level validation logic that compares aggregated scouting
 * data against The Blue Alliance official match data.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TBAValidationStrategy } from '../tba-validation.strategy';
import type {
  ValidationContext,
  ValidationResult,
} from '@/types/validation';
import type { TBAMatch } from '@/types/tba';
import type { MatchScouting, MatchSchedule } from '@/types';

// Mock dependencies
vi.mock('@/lib/services/tba-api.service', () => ({
  getTBAApiService: vi.fn(() => mockTBAService),
}));

vi.mock('@/lib/repositories/match.repository', () => ({
  createMatchRepository: vi.fn(() => mockMatchRepository),
}));

vi.mock('@/lib/repositories/scouting-data.repository', () => ({
  createScoutingDataRepository: vi.fn(() => mockScoutingRepository),
}));

// Mock service instances
const mockTBAService = {
  getEventMatches: vi.fn(),
};

const mockMatchRepository = {
  findByMatchKey: vi.fn(),
};

const mockScoutingRepository = {
  getMatchScoutingByMatch: vi.fn(),
};

// Test data helpers
function createMockTBAMatch(
  matchKey: string,
  scoreBreakdown: Record<string, unknown>
): TBAMatch {
  return {
    key: matchKey,
    comp_level: 'qm',
    set_number: 1,
    match_number: 1,
    event_key: matchKey.split('_')[0],
    alliances: {
      red: {
        score: 100,
        team_keys: ['frc930', 'frc148', 'frc1477'],
      },
      blue: {
        score: 95,
        team_keys: ['frc254', 'frc1678', 'frc973'],
      },
    },
    post_result_time: 1234567890,
    score_breakdown: scoreBreakdown,
  };
}

function createMockMatchSchedule(matchKey: string): MatchSchedule {
  return {
    match_id: 1,
    match_key: matchKey,
    event_key: matchKey.split('_')[0],
    comp_level: 'qm',
    set_number: 1,
    match_number: 1,
    red_1: 930,
    red_2: 148,
    red_3: 1477,
    blue_1: 254,
    blue_2: 1678,
    blue_3: 973,
    scheduled_time: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function createMockScoutingEntry(
  teamNumber: number,
  matchKey: string,
  autoCoralL1: number,
  teleopCoralL1: number
): MatchScouting {
  return {
    id: `scouting-${teamNumber}`,
    match_id: 1,
    match_key: matchKey,
    team_number: teamNumber,
    scout_name: `Scout${teamNumber}`,
    alliance_color: teamNumber < 2000 ? 'red' : 'blue',
    robot_disconnected: false,
    robot_disabled: false,
    robot_tipped: false,
    foul_count: 0,
    tech_foul_count: 0,
    yellow_card: false,
    red_card: false,
    auto_performance: {
      schema_version: '2025.1',
      left_starting_zone: true,
      coral_scored_L1: autoCoralL1,
      coral_scored_L2: 0,
      coral_scored_L3: 0,
      coral_scored_L4: 0,
      coral_missed: 0,
      preloaded_piece_scored: true,
    },
    teleop_performance: {
      schema_version: '2025.1',
      coral_scored_L1: teleopCoralL1,
      coral_scored_L2: 0,
      coral_scored_L3: 0,
      coral_scored_L4: 0,
      coral_missed: 0,
      algae_scored_barge: 0,
      algae_scored_processor: 0,
      algae_missed: 0,
      cycles_completed: 0,
      ground_pickup_coral: 0,
      station_pickup_coral: 0,
      ground_pickup_algae: 0,
      reef_pickup_algae: 0,
      lollipop_pickup_algae: 0,
      defense_time_seconds: 0,
      defended_by_opponent_seconds: 0,
      penalties_caused: 0,
    },
    endgame_performance: {
      schema_version: '2025.1',
      cage_climb_attempted: false,
      cage_climb_successful: false,
      endgame_points: 0,
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

describe('TBAValidationStrategy', () => {
  let strategy: TBAValidationStrategy;
  let context: ValidationContext;

  beforeEach(() => {
    strategy = new TBAValidationStrategy(
      mockMatchRepository as never,
      mockScoutingRepository as never
    );

    context = {
      eventKey: '2025casj',
      matchKey: '2025casj_qm1',
      seasonYear: 2025,
      executionId: 'test-execution-id',
    };

    // Reset mocks
    vi.clearAllMocks();
  });

  describe('canValidate', () => {
    it('should return true when TBA data is complete', async () => {
      const tbaMatch = createMockTBAMatch('2025casj_qm1', {
        red: { coralL1Total: 10 },
        blue: { coralL1Total: 8 },
      });

      mockTBAService.getEventMatches.mockResolvedValue([tbaMatch]);

      const result = await strategy.canValidate(context);

      expect(result).toBe(true);
      expect(mockTBAService.getEventMatches).toHaveBeenCalledWith('2025casj');
    });

    it('should return false when match key is missing', async () => {
      const contextWithoutMatch = { ...context, matchKey: undefined };

      const result = await strategy.canValidate(contextWithoutMatch);

      expect(result).toBe(false);
      expect(mockTBAService.getEventMatches).not.toHaveBeenCalled();
    });

    it('should return false when TBA data is missing', async () => {
      mockTBAService.getEventMatches.mockResolvedValue([]);

      const result = await strategy.canValidate(context);

      expect(result).toBe(false);
    });

    it('should return false when score_breakdown is missing', async () => {
      const tbaMatch = createMockTBAMatch('2025casj_qm1', {
        red: {},
        blue: {},
      });
      tbaMatch.score_breakdown = undefined;

      mockTBAService.getEventMatches.mockResolvedValue([tbaMatch]);

      const result = await strategy.canValidate(context);

      expect(result).toBe(false);
    });

    it('should return false when match has not been played', async () => {
      const tbaMatch = createMockTBAMatch('2025casj_qm1', {
        red: { coralL1Total: 10 },
        blue: { coralL1Total: 8 },
      });
      tbaMatch.post_result_time = undefined;

      mockTBAService.getEventMatches.mockResolvedValue([tbaMatch]);

      const result = await strategy.canValidate(context);

      expect(result).toBe(false);
    });
  });

  describe('validate', () => {
    it('should aggregate alliance totals correctly', async () => {
      // Setup: TBA says red alliance scored 10 coral L1
      const tbaMatch = createMockTBAMatch('2025casj_qm1', {
        red: { coralL1Total: 10 },
        blue: { coralL1Total: 8 },
      });

      const matchSchedule = createMockMatchSchedule('2025casj_qm1');

      // Red alliance scouting: 4 + 3 + 3 = 10 (perfect match)
      const scoutingData = [
        createMockScoutingEntry(930, '2025casj_qm1', 2, 2),  // 4 total
        createMockScoutingEntry(148, '2025casj_qm1', 1, 2),  // 3 total
        createMockScoutingEntry(1477, '2025casj_qm1', 1, 2), // 3 total
      ];

      mockTBAService.getEventMatches.mockResolvedValue([tbaMatch]);
      mockMatchRepository.findByMatchKey.mockResolvedValue(matchSchedule);
      mockScoutingRepository.getMatchScoutingByMatch.mockResolvedValue(scoutingData);

      const results = await strategy.validate(context);

      // Should have results for each team and field
      expect(results.length).toBeGreaterThan(0);

      // Check that results are for red alliance teams
      const teamNumbers = results.map(r => r.teamNumber);
      expect(teamNumbers).toContain(930);
      expect(teamNumbers).toContain(148);
      expect(teamNumbers).toContain(1477);

      // All should have high accuracy (exact match)
      const accuracyScores = results.map(r => r.accuracyScore);
      expect(Math.min(...accuracyScores)).toBeGreaterThanOrEqual(0.95);
    });

    it('should distribute errors proportionally', async () => {
      // Setup: TBA says 10, we scouted 8 (2 piece discrepancy)
      const tbaMatch = createMockTBAMatch('2025casj_qm1', {
        red: { coralL1Total: 10 },
        blue: { coralL1Total: 10 },
      });

      const matchSchedule = createMockMatchSchedule('2025casj_qm1');

      // Red alliance: 4 + 3 + 1 = 8 (2 short)
      const scoutingData = [
        createMockScoutingEntry(930, '2025casj_qm1', 2, 2),  // 4 total (4/8 = 50%)
        createMockScoutingEntry(148, '2025casj_qm1', 1, 2),  // 3 total (3/8 = 37.5%)
        createMockScoutingEntry(1477, '2025casj_qm1', 0, 1), // 1 total (1/8 = 12.5%)
      ];

      mockTBAService.getEventMatches.mockResolvedValue([tbaMatch]);
      mockMatchRepository.findByMatchKey.mockResolvedValue(matchSchedule);
      mockScoutingRepository.getMatchScoutingByMatch.mockResolvedValue(scoutingData);

      const results = await strategy.validate(context);

      // Find results for coral_scored_L1 field (combining auto and teleop)
      const coralL1Results = results.filter(r =>
        r.fieldPath.includes('coral_scored_L1')
      );

      expect(coralL1Results.length).toBeGreaterThan(0);

      // Team 930 should have lowest accuracy (largest contributor to error)
      // Team 1477 should have highest accuracy (smallest contributor)
      const team930Results = coralL1Results.filter(r => r.teamNumber === 930);
      const team1477Results = coralL1Results.filter(r => r.teamNumber === 1477);

      if (team930Results.length > 0 && team1477Results.length > 0) {
        const avg930Accuracy = team930Results.reduce((sum, r) => sum + r.accuracyScore, 0) / team930Results.length;
        const avg1477Accuracy = team1477Results.reduce((sum, r) => sum + r.accuracyScore, 0) / team1477Results.length;

        expect(avg1477Accuracy).toBeGreaterThan(avg930Accuracy);
      }
    });

    it('should handle missing scouting data gracefully', async () => {
      const tbaMatch = createMockTBAMatch('2025casj_qm1', {
        red: { coralL1Total: 10 },
        blue: { coralL1Total: 8 },
      });

      const matchSchedule = createMockMatchSchedule('2025casj_qm1');

      // Only one team has scouting data (below MIN_TEAMS_REQUIRED = 2)
      const scoutingData = [
        createMockScoutingEntry(930, '2025casj_qm1', 2, 2),
      ];

      mockTBAService.getEventMatches.mockResolvedValue([tbaMatch]);
      mockMatchRepository.findByMatchKey.mockResolvedValue(matchSchedule);
      mockScoutingRepository.getMatchScoutingByMatch.mockResolvedValue(scoutingData);

      const results = await strategy.validate(context);

      // Should return empty or minimal results (not enough data)
      expect(results.length).toBe(0);
    });

    it('should set correct confidence level', async () => {
      const tbaMatch = createMockTBAMatch('2025casj_qm1', {
        red: { coralL1Total: 10 },
        blue: { coralL1Total: 8 },
      });

      const matchSchedule = createMockMatchSchedule('2025casj_qm1');

      const scoutingData = [
        createMockScoutingEntry(930, '2025casj_qm1', 2, 2),
        createMockScoutingEntry(148, '2025casj_qm1', 1, 2),
        createMockScoutingEntry(1477, '2025casj_qm1', 1, 2),
      ];

      mockTBAService.getEventMatches.mockResolvedValue([tbaMatch]);
      mockMatchRepository.findByMatchKey.mockResolvedValue(matchSchedule);
      mockScoutingRepository.getMatchScoutingByMatch.mockResolvedValue(scoutingData);

      const results = await strategy.validate(context);

      // All results should have confidence level of 0.6
      results.forEach(result => {
        expect(result.confidenceLevel).toBe(0.6);
        expect(result.validationType).toBe('tba');
        expect(result.validationMethod).toBe('TBAValidationStrategy');
      });
    });

    it('should include helpful notes in results', async () => {
      const tbaMatch = createMockTBAMatch('2025casj_qm1', {
        red: { coralL1Total: 10 },
        blue: { coralL1Total: 8 },
      });

      const matchSchedule = createMockMatchSchedule('2025casj_qm1');

      const scoutingData = [
        createMockScoutingEntry(930, '2025casj_qm1', 2, 2),
        createMockScoutingEntry(148, '2025casj_qm1', 1, 2),
        createMockScoutingEntry(1477, '2025casj_qm1', 1, 2),
      ];

      mockTBAService.getEventMatches.mockResolvedValue([tbaMatch]);
      mockMatchRepository.findByMatchKey.mockResolvedValue(matchSchedule);
      mockScoutingRepository.getMatchScoutingByMatch.mockResolvedValue(scoutingData);

      const results = await strategy.validate(context);

      // Notes should include TBA total, scouted total, and proportional error
      results.forEach(result => {
        expect(result.notes).toBeDefined();
        expect(result.notes).toContain('Alliance total from TBA');
        expect(result.notes).toContain('Scouted total');
        expect(result.notes).toContain('Team contribution');
      });
    });
  });

  describe('accuracy calculation', () => {
    it('should give perfect score for exact match', async () => {
      const tbaMatch = createMockTBAMatch('2025casj_qm1', {
        red: { coralL1Total: 10 },
        blue: { coralL1Total: 10 },
      });

      const matchSchedule = createMockMatchSchedule('2025casj_qm1');

      // Exactly 10 total
      const scoutingData = [
        createMockScoutingEntry(930, '2025casj_qm1', 3, 1), // 4
        createMockScoutingEntry(148, '2025casj_qm1', 3, 0), // 3
        createMockScoutingEntry(1477, '2025casj_qm1', 2, 1), // 3
      ];

      mockTBAService.getEventMatches.mockResolvedValue([tbaMatch]);
      mockMatchRepository.findByMatchKey.mockResolvedValue(matchSchedule);
      mockScoutingRepository.getMatchScoutingByMatch.mockResolvedValue(scoutingData);

      const results = await strategy.validate(context);

      // All accuracy scores should be >= 0.95 (exact_match threshold)
      results.forEach(result => {
        expect(result.accuracyScore).toBeGreaterThanOrEqual(0.95);
        expect(result.outcome).toBe('exact_match');
      });
    });

    it('should penalize large errors', async () => {
      const tbaMatch = createMockTBAMatch('2025casj_qm1', {
        red: { coralL1Total: 10 },
        blue: { coralL1Total: 10 },
      });

      const matchSchedule = createMockMatchSchedule('2025casj_qm1');

      // Only 5 total (50% error)
      const scoutingData = [
        createMockScoutingEntry(930, '2025casj_qm1', 1, 1), // 2
        createMockScoutingEntry(148, '2025casj_qm1', 1, 1), // 2
        createMockScoutingEntry(1477, '2025casj_qm1', 0, 1), // 1
      ];

      mockTBAService.getEventMatches.mockResolvedValue([tbaMatch]);
      mockMatchRepository.findByMatchKey.mockResolvedValue(matchSchedule);
      mockScoutingRepository.getMatchScoutingByMatch.mockResolvedValue(scoutingData);

      const results = await strategy.validate(context);

      // Should have low accuracy scores
      results.forEach(result => {
        expect(result.accuracyScore).toBeLessThan(0.75);
        expect(result.outcome).toBe('mismatch');
      });
    });
  });
});
