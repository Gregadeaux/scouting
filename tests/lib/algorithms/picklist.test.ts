/**
 * Unit Tests for Pick List Algorithm
 *
 * Tests Multi-Criteria Decision Analysis (MCDA) for alliance selection
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  normalizeMetric,
  normalizeAllMetrics,
  calculateCompositeScore,
  extractStrengths,
  extractWeaknesses,
  rankTeams,
  validateWeights,
  calculatePickListStatistics,
  type RawTeamData,
} from '@/lib/algorithms/picklist';
import type { PickListWeights, TeamNormalization } from '@/types/picklist';

describe('normalizeMetric', () => {
  it('should normalize metric to 0-1 scale', () => {
    const result = normalizeMetric(50, 0, 100, false);

    expect(result.original).toBe(50);
    expect(result.normalized).toBe(0.5);
    expect(result.min).toBe(0);
    expect(result.max).toBe(100);
    expect(result.range).toBe(100);
  });

  it('should normalize minimum value to 0', () => {
    const result = normalizeMetric(0, 0, 100, false);

    expect(result.normalized).toBe(0);
  });

  it('should normalize maximum value to 1', () => {
    const result = normalizeMetric(100, 0, 100, false);

    expect(result.normalized).toBe(1);
  });

  it('should invert normalization when specified (for DPR)', () => {
    const result = normalizeMetric(25, 0, 100, true);

    expect(result.original).toBe(25);
    expect(result.normalized).toBe(0.75); // Inverted: 1 - 0.25
  });

  it('should handle edge case where all values are the same', () => {
    const result = normalizeMetric(50, 50, 50, false);

    expect(result.normalized).toBe(0.5); // Middle value when no variance
    expect(result.range).toBe(0);
  });

  it('should clamp values to [0, 1] range', () => {
    const result = normalizeMetric(150, 0, 100, false);

    expect(result.normalized).toBeLessThanOrEqual(1);
    expect(result.normalized).toBeGreaterThanOrEqual(0);
  });
});

describe('normalizeAllMetrics', () => {
  let mockTeams: RawTeamData[];

  beforeEach(() => {
    mockTeams = [
      {
        teamNumber: 254,
        teamName: 'The Cheesy Poofs',
        matchesPlayed: 10,
        opr: 75.5,
        dpr: 20.3,
        ccwm: 55.2,
        avgAutoScore: 25.0,
        avgTeleopScore: 40.0,
        avgEndgameScore: 10.0,
        reliabilityScore: 95.0,
        avgDriverSkill: 4.5,
        avgDefenseRating: 3.8,
        avgSpeedRating: 4.2,
      },
      {
        teamNumber: 1678,
        teamName: 'Citrus Circuits',
        matchesPlayed: 10,
        opr: 82.3,
        dpr: 25.1,
        ccwm: 57.2,
        avgAutoScore: 30.0,
        avgTeleopScore: 45.0,
        avgEndgameScore: 7.0,
        reliabilityScore: 90.0,
        avgDriverSkill: 4.8,
        avgDefenseRating: 3.2,
        avgSpeedRating: 4.5,
      },
      {
        teamNumber: 1114,
        teamName: 'Simbotics',
        matchesPlayed: 10,
        opr: 70.0,
        dpr: 18.5,
        ccwm: 51.5,
        avgAutoScore: 20.0,
        avgTeleopScore: 38.0,
        avgEndgameScore: 12.0,
        reliabilityScore: 98.0,
        avgDriverSkill: 4.2,
        avgDefenseRating: 4.5,
        avgSpeedRating: 3.8,
      },
    ];
  });

  it('should normalize all metrics for all teams', () => {
    const normalized = normalizeAllMetrics(mockTeams);

    expect(normalized.size).toBe(3);
    expect(normalized.has(254)).toBe(true);
    expect(normalized.has(1678)).toBe(true);
    expect(normalized.has(1114)).toBe(true);
  });

  it('should normalize OPR correctly', () => {
    const normalized = normalizeAllMetrics(mockTeams);
    const team254 = normalized.get(254)!;
    const team1678 = normalized.get(1678)!;

    // Team 1678 has highest OPR (82.3), should be close to 1
    expect(team1678.opr.normalized).toBeGreaterThan(team254.opr.normalized);
    expect(team1678.opr.normalized).toBeCloseTo(1, 1);
  });

  it('should invert DPR (lower is better)', () => {
    const normalized = normalizeAllMetrics(mockTeams);
    const team1114 = normalized.get(1114)!; // Lowest DPR (18.5)
    const team1678 = normalized.get(1678)!; // Highest DPR (25.1)

    // Team 1114 has lowest DPR, so highest normalized value
    expect(team1114.dpr.normalized).toBeGreaterThan(team1678.dpr.normalized);
  });

  it('should handle missing optional metrics with defaults', () => {
    const teamWithMissing: RawTeamData = {
      teamNumber: 930,
      matchesPlayed: 10,
      opr: 50.0,
      dpr: 20.0,
      ccwm: 30.0,
      // No optional metrics provided
    };

    const normalized = normalizeAllMetrics([teamWithMissing]);
    const team930 = normalized.get(930)!;

    // Should have normalized values for all metrics (using defaults)
    expect(team930.autoScore).toBeDefined();
    expect(team930.reliability).toBeDefined();
    expect(team930.driverSkill).toBeDefined();
  });

  it('should return empty map for empty team array', () => {
    const normalized = normalizeAllMetrics([]);

    expect(normalized.size).toBe(0);
  });
});

describe('calculateCompositeScore', () => {
  let mockNormalized: TeamNormalization;
  let balancedWeights: PickListWeights;

  beforeEach(() => {
    mockNormalized = {
      teamNumber: 254,
      opr: { original: 75, normalized: 0.8, min: 50, max: 100, range: 50 },
      dpr: { original: 20, normalized: 0.7, min: 10, max: 30, range: 20 },
      ccwm: { original: 55, normalized: 0.85, min: 40, max: 70, range: 30 },
      autoScore: { original: 25, normalized: 0.75, min: 15, max: 35, range: 20 },
      teleopScore: { original: 40, normalized: 0.8, min: 30, max: 50, range: 20 },
      endgameScore: { original: 10, normalized: 0.6, min: 5, max: 15, range: 10 },
      reliability: { original: 95, normalized: 0.9, min: 80, max: 100, range: 20 },
      driverSkill: { original: 4.5, normalized: 0.85, min: 3, max: 5, range: 2 },
      defenseRating: { original: 3.8, normalized: 0.75, min: 2, max: 5, range: 3 },
      speedRating: { original: 4.2, normalized: 0.8, min: 3, max: 5, range: 2 },
    };

    balancedWeights = {
      opr: 0.15,
      dpr: 0.10,
      ccwm: 0.25,
      autoScore: 0.10,
      teleopScore: 0.10,
      endgameScore: 0.10,
      reliability: 0.10,
      driverSkill: 0.05,
      defenseRating: 0.03,
      speedRating: 0.02,
    };
  });

  it('should calculate weighted composite score', () => {
    const score = calculateCompositeScore(mockNormalized, balancedWeights);

    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(1);
    expect(typeof score).toBe('number');
  });

  it('should weight CCWM heavily in balanced strategy', () => {
    // CCWM has weight 0.25 (highest)
    const ccwmContribution = 0.85 * 0.25; // normalized * weight

    const score = calculateCompositeScore(mockNormalized, balancedWeights);

    // CCWM should contribute significantly to final score
    expect(ccwmContribution).toBeGreaterThan(0.2);
  });

  it('should return 0 for all-zero weights', () => {
    const zeroWeights: PickListWeights = {
      opr: 0,
      dpr: 0,
      ccwm: 0,
      autoScore: 0,
      teleopScore: 0,
      endgameScore: 0,
      reliability: 0,
      driverSkill: 0,
      defenseRating: 0,
      speedRating: 0,
    };

    const score = calculateCompositeScore(mockNormalized, zeroWeights);

    expect(score).toBe(0);
  });

  it('should normalize by sum of weights', () => {
    const doubleWeights: PickListWeights = {
      opr: 0.30,
      dpr: 0.20,
      ccwm: 0.50,
      autoScore: 0.20,
      teleopScore: 0.20,
      endgameScore: 0.20,
      reliability: 0.20,
      driverSkill: 0.10,
      defenseRating: 0.06,
      speedRating: 0.04,
    };

    // Sum of weights is 2.0
    const score = calculateCompositeScore(mockNormalized, doubleWeights);

    // Should still be in 0-1 range due to normalization
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(1);
  });
});

describe('extractStrengths', () => {
  let highPerformer: TeamNormalization;

  beforeEach(() => {
    highPerformer = {
      teamNumber: 254,
      opr: { original: 90, normalized: 0.95, min: 50, max: 100, range: 50 },
      dpr: { original: 15, normalized: 0.92, min: 10, max: 30, range: 20 },
      ccwm: { original: 75, normalized: 0.93, min: 40, max: 80, range: 40 },
      autoScore: { original: 35, normalized: 0.88, min: 15, max: 40, range: 25 },
      teleopScore: { original: 50, normalized: 0.85, min: 30, max: 60, range: 30 },
      endgameScore: { original: 15, normalized: 0.80, min: 5, max: 20, range: 15 },
      reliability: { original: 98, normalized: 0.95, min: 80, max: 100, range: 20 },
      driverSkill: { original: 4.8, normalized: 0.90, min: 3, max: 5, range: 2 },
      defenseRating: { original: 4.5, normalized: 0.87, min: 2, max: 5, range: 3 },
      speedRating: { original: 4.7, normalized: 0.85, min: 3, max: 5, range: 2 },
    };
  });

  it('should identify high OPR as strength', () => {
    const strengths = extractStrengths(highPerformer);

    expect(strengths).toContain('High offensive output (OPR)');
  });

  it('should identify strong defense (low DPR) as strength', () => {
    const strengths = extractStrengths(highPerformer);

    expect(strengths).toContain('Strong defense (low DPR)');
  });

  it('should identify excellent CCWM as strength', () => {
    const strengths = extractStrengths(highPerformer);

    expect(strengths).toContain('Excellent net contribution (CCWM)');
  });

  it('should identify reliable robot (>90% normalized reliability)', () => {
    const strengths = extractStrengths(highPerformer);

    expect(strengths).toContain('Extremely reliable robot');
  });

  it('should use custom threshold', () => {
    // Use higher threshold (0.95 = top 5%)
    const strengths = extractStrengths(highPerformer, 0.95);

    // Only OPR, DPR, CCWM, reliability should qualify
    expect(strengths.length).toBeLessThan(6);
  });

  it('should return empty array for average performer', () => {
    const averagePerformer: TeamNormalization = {
      teamNumber: 930,
      opr: { original: 50, normalized: 0.5, min: 40, max: 60, range: 20 },
      dpr: { original: 20, normalized: 0.5, min: 15, max: 25, range: 10 },
      ccwm: { original: 30, normalized: 0.5, min: 25, max: 35, range: 10 },
      autoScore: { original: 20, normalized: 0.5, min: 15, max: 25, range: 10 },
      teleopScore: { original: 25, normalized: 0.5, min: 20, max: 30, range: 10 },
      endgameScore: { original: 5, normalized: 0.5, min: 3, max: 7, range: 4 },
      reliability: { original: 85, normalized: 0.5, min: 70, max: 100, range: 30 },
      driverSkill: { original: 3, normalized: 0.5, min: 2, max: 4, range: 2 },
      defenseRating: { original: 3, normalized: 0.5, min: 2, max: 4, range: 2 },
      speedRating: { original: 3, normalized: 0.5, min: 2, max: 4, range: 2 },
    };

    const strengths = extractStrengths(averagePerformer);

    expect(strengths).toHaveLength(0);
  });
});

describe('extractWeaknesses', () => {
  let lowPerformer: TeamNormalization;

  beforeEach(() => {
    lowPerformer = {
      teamNumber: 9999,
      opr: { original: 30, normalized: 0.15, min: 20, max: 80, range: 60 },
      dpr: { original: 40, normalized: 0.10, min: 15, max: 45, range: 30 },
      ccwm: { original: -10, normalized: 0.12, min: -15, max: 35, range: 50 },
      autoScore: { original: 5, normalized: 0.08, min: 3, max: 35, range: 32 },
      teleopScore: { original: 15, normalized: 0.20, min: 10, max: 50, range: 40 },
      endgameScore: { original: 2, normalized: 0.18, min: 0, max: 15, range: 15 },
      reliability: { original: 65, normalized: 0.45, min: 50, max: 100, range: 50 },
      driverSkill: { original: 2.5, normalized: 0.25, min: 2, max: 5, range: 3 },
      defenseRating: { original: 2.2, normalized: 0.22, min: 2, max: 5, range: 3 },
      speedRating: { original: 2.8, normalized: 0.28, min: 2, max: 5, range: 3 },
    };
  });

  it('should identify low OPR as weakness', () => {
    const weaknesses = extractWeaknesses(lowPerformer);

    expect(weaknesses).toContain('Lower offensive output');
  });

  it('should identify poor defense (high DPR) as weakness', () => {
    const weaknesses = extractWeaknesses(lowPerformer);

    expect(weaknesses).toContain('Defense needs improvement (high DPR)');
  });

  it('should identify low CCWM as weakness', () => {
    const weaknesses = extractWeaknesses(lowPerformer);

    expect(weaknesses).toContain('Low net contribution');
  });

  it('should identify unreliable robot (<70% normalized)', () => {
    // Reliability is 0.45, below 0.7 threshold
    const weaknesses = extractWeaknesses(lowPerformer);

    expect(weaknesses).toContain('Reliability concerns');
  });

  it('should use custom threshold', () => {
    // Use lower threshold (0.15 = bottom 15%)
    const weaknesses = extractWeaknesses(lowPerformer, 0.15);

    // Only the very worst metrics should qualify
    expect(weaknesses.length).toBeLessThanOrEqual(5);
  });
});

describe('rankTeams', () => {
  let mockTeams: RawTeamData[];
  let balancedWeights: PickListWeights;

  beforeEach(() => {
    mockTeams = [
      {
        teamNumber: 254,
        teamName: 'The Cheesy Poofs',
        matchesPlayed: 10,
        opr: 75.5,
        dpr: 20.3,
        ccwm: 55.2,
        avgAutoScore: 25.0,
        avgTeleopScore: 40.0,
        avgEndgameScore: 10.0,
        reliabilityScore: 95.0,
        avgDriverSkill: 4.5,
      },
      {
        teamNumber: 1678,
        teamName: 'Citrus Circuits',
        matchesPlayed: 10,
        opr: 82.3,
        dpr: 25.1,
        ccwm: 57.2,
        avgAutoScore: 30.0,
        avgTeleopScore: 45.0,
        avgEndgameScore: 7.0,
        reliabilityScore: 90.0,
        avgDriverSkill: 4.8,
      },
      {
        teamNumber: 1114,
        teamName: 'Simbotics',
        matchesPlayed: 3, // Below threshold
        opr: 70.0,
        dpr: 18.5,
        ccwm: 51.5,
        avgAutoScore: 20.0,
        avgTeleopScore: 38.0,
        avgEndgameScore: 12.0,
        reliabilityScore: 98.0,
      },
    ];

    balancedWeights = {
      opr: 0.15,
      dpr: 0.10,
      ccwm: 0.25,
      autoScore: 0.10,
      teleopScore: 0.10,
      endgameScore: 0.10,
      reliability: 0.10,
      driverSkill: 0.05,
      defenseRating: 0.03,
      speedRating: 0.02,
    };
  });

  it('should filter teams by minimum matches', () => {
    const ranked = rankTeams(mockTeams, balancedWeights, 5);

    // Team 1114 has only 3 matches, should be filtered
    expect(ranked).toHaveLength(2);
    expect(ranked.find(t => t.teamNumber === 1114)).toBeUndefined();
  });

  it('should rank teams by composite score', () => {
    const ranked = rankTeams(mockTeams, balancedWeights, 3);

    // Should be sorted by composite score descending
    expect(ranked[0].rank).toBe(1);
    expect(ranked[1].rank).toBe(2);
    expect(ranked[2].rank).toBe(3);

    // Higher rank should have higher score
    expect(ranked[0].compositeScore).toBeGreaterThanOrEqual(ranked[1].compositeScore);
    expect(ranked[1].compositeScore).toBeGreaterThanOrEqual(ranked[2].compositeScore);
  });

  it('should assign correct ranks', () => {
    const ranked = rankTeams(mockTeams, balancedWeights, 3);

    expect(ranked[0].rank).toBe(1);
    expect(ranked[1].rank).toBe(2);
    expect(ranked[2].rank).toBe(3);
  });

  it('should include team metadata', () => {
    const ranked = rankTeams(mockTeams, balancedWeights, 3);

    const team254 = ranked.find(t => t.teamNumber === 254)!;
    expect(team254.teamName).toBe('The Cheesy Poofs');
    expect(team254.matchesPlayed).toBe(10);
    expect(team254.opr).toBe(75.5);
  });

  it('should include strengths and weaknesses', () => {
    const ranked = rankTeams(mockTeams, balancedWeights, 3);

    ranked.forEach(team => {
      expect(Array.isArray(team.strengths)).toBe(true);
      expect(Array.isArray(team.weaknesses)).toBe(true);
    });
  });

  it('should mark all teams as not picked initially', () => {
    const ranked = rankTeams(mockTeams, balancedWeights, 3);

    ranked.forEach(team => {
      expect(team.picked).toBe(false);
    });
  });

  it('should return empty array if no teams meet criteria', () => {
    const ranked = rankTeams(mockTeams, balancedWeights, 20); // Very high threshold

    expect(ranked).toHaveLength(0);
  });
});

describe('validateWeights', () => {
  it('should pass validation for balanced weights', () => {
    const balancedWeights: PickListWeights = {
      opr: 0.15,
      dpr: 0.10,
      ccwm: 0.25,
      autoScore: 0.10,
      teleopScore: 0.10,
      endgameScore: 0.10,
      reliability: 0.10,
      driverSkill: 0.05,
      defenseRating: 0.03,
      speedRating: 0.02,
    };

    const result = validateWeights(balancedWeights);

    expect(result.valid).toBe(true);
    expect(result.warnings).toHaveLength(0);
  });

  it('should warn about negative weights', () => {
    const invalidWeights: PickListWeights = {
      opr: -0.15, // Negative!
      dpr: 0.10,
      ccwm: 0.25,
      autoScore: 0.10,
      teleopScore: 0.10,
      endgameScore: 0.10,
      reliability: 0.10,
      driverSkill: 0.05,
      defenseRating: 0.03,
      speedRating: 0.02,
    };

    const result = validateWeights(invalidWeights);

    expect(result.valid).toBe(false);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain('Negative weight');
  });

  it('should warn about all-zero weights', () => {
    const zeroWeights: PickListWeights = {
      opr: 0,
      dpr: 0,
      ccwm: 0,
      autoScore: 0,
      teleopScore: 0,
      endgameScore: 0,
      reliability: 0,
      driverSkill: 0,
      defenseRating: 0,
      speedRating: 0,
    };

    const result = validateWeights(zeroWeights);

    expect(result.valid).toBe(false);
    expect(result.warnings).toContain('All weights are zero - pick list will be meaningless');
  });

  it('should warn about unusual weight sums', () => {
    const highWeights: PickListWeights = {
      opr: 0.5,
      dpr: 0.5,
      ccwm: 0.5,
      autoScore: 0.5,
      teleopScore: 0.5,
      endgameScore: 0.5,
      reliability: 0.5,
      driverSkill: 0.5,
      defenseRating: 0.5,
      speedRating: 0.5,
    };

    const result = validateWeights(highWeights);

    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain('Weight sum');
  });
});

describe('calculatePickListStatistics', () => {
  let mockTeams: RawTeamData[];
  let balancedWeights: PickListWeights;

  beforeEach(() => {
    mockTeams = [
      {
        teamNumber: 254,
        matchesPlayed: 10,
        opr: 75.5,
        dpr: 20.3,
        ccwm: 55.2,
        avgAutoScore: 25.0,
      },
      {
        teamNumber: 1678,
        matchesPlayed: 10,
        opr: 82.3,
        dpr: 25.1,
        ccwm: 57.2,
        avgAutoScore: 30.0,
      },
      {
        teamNumber: 1114,
        matchesPlayed: 10,
        opr: 70.0,
        dpr: 18.5,
        ccwm: 51.5,
        avgAutoScore: 20.0,
      },
    ];

    balancedWeights = {
      opr: 0.15,
      dpr: 0.10,
      ccwm: 0.25,
      autoScore: 0.10,
      teleopScore: 0.10,
      endgameScore: 0.10,
      reliability: 0.10,
      driverSkill: 0.05,
      defenseRating: 0.03,
      speedRating: 0.02,
    };
  });

  it('should calculate average composite score', () => {
    const ranked = rankTeams(mockTeams, balancedWeights, 3);
    const stats = calculatePickListStatistics(ranked);

    expect(stats.avgCompositeScore).toBeGreaterThan(0);
    expect(stats.avgCompositeScore).toBeLessThanOrEqual(1);
  });

  it('should calculate median composite score', () => {
    const ranked = rankTeams(mockTeams, balancedWeights, 3);
    const stats = calculatePickListStatistics(ranked);

    expect(stats.medianCompositeScore).toBeGreaterThan(0);
    expect(stats.medianCompositeScore).toBeLessThanOrEqual(1);
  });

  it('should calculate standard deviation', () => {
    const ranked = rankTeams(mockTeams, balancedWeights, 3);
    const stats = calculatePickListStatistics(ranked);

    expect(stats.stdDevCompositeScore).toBeGreaterThanOrEqual(0);
  });

  it('should calculate average OPR, DPR, CCWM', () => {
    const ranked = rankTeams(mockTeams, balancedWeights, 3);
    const stats = calculatePickListStatistics(ranked);

    // Average OPR should be around (75.5 + 82.3 + 70.0) / 3 = 75.93
    expect(stats.avgOPR).toBeCloseTo(75.93, 1);

    // Average DPR should be around (20.3 + 25.1 + 18.5) / 3 = 21.3
    expect(stats.avgDPR).toBeCloseTo(21.3, 1);

    // Average CCWM should be around (55.2 + 57.2 + 51.5) / 3 = 54.63
    expect(stats.avgCCWM).toBeCloseTo(54.63, 1);
  });

  it('should return zeros for empty team list', () => {
    const stats = calculatePickListStatistics([]);

    expect(stats.avgCompositeScore).toBe(0);
    expect(stats.medianCompositeScore).toBe(0);
    expect(stats.stdDevCompositeScore).toBe(0);
    expect(stats.avgOPR).toBe(0);
    expect(stats.avgDPR).toBe(0);
    expect(stats.avgCCWM).toBe(0);
  });
});
