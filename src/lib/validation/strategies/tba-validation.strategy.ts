/**
 * TBA Validation Strategy
 *
 * Validates scouting data by comparing aggregated alliance totals against
 * The Blue Alliance (TBA) official match data. Since TBA provides alliance-level
 * scores (not per-team), this strategy:
 *
 * 1. Aggregates all 3 teams on each alliance
 * 2. Compares totals against TBA score_breakdown
 * 3. Distributes discrepancies proportionally across teams
 *
 * Confidence Level: 0.6 (lower than consensus due to alliance-level comparison)
 */

import type {
  IValidationStrategy,
  ValidationContext,
  ValidationResult,
  ValidationOutcome,
} from '@/types/validation';
import type { TBAMatch } from '@/types/tba';
import type { MatchScouting } from '@/types';
import { createMatchRepository, type IMatchRepository } from '@/lib/repositories/match.repository';
import { createScoutingDataRepository, type IScoutingDataRepository } from '@/lib/repositories/scouting-data.repository';

/**
 * Mapping of TBA score_breakdown fields to our scouting field paths
 * For 2025 Reefscape game
 */
interface TBAFieldMapping {
  tbaField: string;
  scoutingPaths: string[];
  aggregationMethod: 'sum' | 'boolean_count';
}

/**
 * 2025 Reefscape TBA field mappings
 * These map TBA's score_breakdown fields to our auto/teleop/endgame JSONB paths
 *
 * NOTE: TBA provides row-based counts (botRow/midRow/topRow) which roughly map to:
 * - L1 (bottom) = botRow
 * - L2 (middle) = midRow
 * - L3/L4 (top rows) = topRow
 *
 * For simplicity, we validate total coral counts rather than per-level
 */
const FIELD_MAPPINGS_2025: TBAFieldMapping[] = [
  // Auto coral - total count from auto period
  {
    tbaField: 'autoCoralCount',
    scoutingPaths: [
      'auto_performance.coral_scored_L1',
      'auto_performance.coral_scored_L2',
      'auto_performance.coral_scored_L3',
      'auto_performance.coral_scored_L4',
    ],
    aggregationMethod: 'sum',
  },

  // Teleop coral - total count from teleop period
  {
    tbaField: 'teleopCoralCount',
    scoutingPaths: [
      'teleop_performance.coral_scored_L1',
      'teleop_performance.coral_scored_L2',
      'teleop_performance.coral_scored_L3',
      'teleop_performance.coral_scored_L4',
    ],
    aggregationMethod: 'sum',
  },

  // Algae scoring - net (barge) and wall (processor) combined
  // TBA: netAlgaeCount + wallAlgaeCount
  {
    tbaField: 'netAlgaeCount',
    scoutingPaths: ['teleop_performance.algae_scored_barge'],
    aggregationMethod: 'sum',
  },
  {
    tbaField: 'wallAlgaeCount',
    scoutingPaths: ['teleop_performance.algae_scored_processor'],
    aggregationMethod: 'sum',
  },

  // Auto mobility - count number of robots that left starting zone
  // TBA tracks this via autoLineRobot1/2/3 = "Yes"
  {
    tbaField: 'autoMobilityCount',
    scoutingPaths: ['auto_performance.left_starting_zone'],
    aggregationMethod: 'boolean_count',
  },
];

/**
 * Alliance composition from match schedule
 */
interface AllianceComposition {
  red: number[];
  blue: number[];
}

/**
 * Aggregated scouting data for an alliance
 */
interface AllianceScoutingData {
  teamNumber: number;
  scoutingData: MatchScouting | null;
  fieldValues: Map<string, number>; // fieldPath -> value
}

/**
 * TBA Validation Strategy Implementation
 */
export class TBAValidationStrategy implements IValidationStrategy {
  readonly name = 'TBA Validation';
  readonly type = 'tba' as const;

  // Fixed confidence level for TBA validation
  private readonly CONFIDENCE_LEVEL = 0.6;

  // Minimum number of teams that must have scouting data for validation
  private readonly MIN_TEAMS_REQUIRED = 3;

  // Cache to store validation results per match per execution
  // Key: `${executionId}:${matchKey}`, Value: ValidationResult[]
  private matchValidationCache = new Map<string, ValidationResult[]>();

  constructor(
    private matchRepository: IMatchRepository = createMatchRepository(),
    private scoutingRepository: IScoutingDataRepository = createScoutingDataRepository()
  ) {}

  /**
   * Check if TBA validation can be performed for this context
   *
   * Requirements:
   * 1. Match key must be provided
   * 2. TBA match data must exist with score_breakdown
   * 3. Match must have been played (post_result_time exists)
   */
  async canValidate(context: ValidationContext): Promise<boolean> {
    try {
      // Must have match key
      if (!context.matchKey) {
        return false;
      }

      // Try to fetch TBA match data from database
      const tbaMatch = await this.getTBAMatchData(context.matchKey);
      if (!tbaMatch) {
        return false;
      }

      // Must have score breakdown
      if (!tbaMatch.score_breakdown) {
        return false;
      }

      // Must have been played (results posted)
      if (!tbaMatch.post_result_time) {
        return false;
      }

      return true;
    } catch (error) {
      console.error(`[TBAValidationStrategy] Error checking if can validate: ${error}`);
      return false;
    }
  }

  /**
   * Execute TBA validation for the given context
   *
   * Process:
   * 1. Get TBA match data with score_breakdown
   * 2. Get alliance composition from match_schedule
   * 3. Get scouting data for all teams
   * 4. Aggregate scouting data by alliance
   * 5. Compare alliance totals against TBA
   * 6. Distribute discrepancies proportionally
   *
   * NOTE: TBA validation is match-level (validates all 6 teams at once) but
   * the service calls this once per team. We cache all results but only return
   * results for the specific team in the context to avoid duplication.
   */
  async validate(context: ValidationContext): Promise<ValidationResult[]> {
    try {
      // Validate context
      if (!context.matchKey) {
        throw new Error('Match key is required for TBA validation');
      }

      // Extract execution ID
      const executionId = context.executionId || crypto.randomUUID();
      const cacheKey = `${executionId}:${context.matchKey}`;

      // Check cache first - TBA validation is match-level, not team-level
      // If we've already validated this match in this execution, return cached results
      // filtered for the specific team in context
      if (this.matchValidationCache.has(cacheKey)) {
        console.log(`[TBAValidationStrategy] validate: Returning cached results for ${context.matchKey} team ${context.teamNumber}`);
        const allResults = this.matchValidationCache.get(cacheKey)!;
        // Filter to only return results for the requested team
        const teamResults = allResults.filter(r => r.teamNumber === context.teamNumber);
        console.log(`[TBAValidationStrategy] validate: Filtered to ${teamResults.length} results for team ${context.teamNumber}`);
        return teamResults;
      }

      console.log(`[TBAValidationStrategy] validate: Starting validation for ${context.matchKey}`);

      // Get TBA match data
      const tbaMatch = await this.getTBAMatchData(context.matchKey);
      if (!tbaMatch || !tbaMatch.score_breakdown) {
        console.log(`[TBAValidationStrategy] validate: No TBA match data or score breakdown for ${context.matchKey}`);
        throw new Error('TBA match data not available');
      }

      // Get alliance composition
      const alliances = await this.getAllianceComposition(context.matchKey);
      console.log(`[TBAValidationStrategy] validate: Red alliance: ${alliances.red.join(',')}, Blue alliance: ${alliances.blue.join(',')}`);

      // Get scouting data for all teams (fetch once per match, not per team)
      const redScoutingData = await this.getAllianceScoutingData(
        alliances.red,
        context.matchKey
      );
      const blueScoutingData = await this.getAllianceScoutingData(
        alliances.blue,
        context.matchKey
      );

      console.log(`[TBAValidationStrategy] validate: Red scouting data count: ${redScoutingData.length}, Blue scouting data count: ${blueScoutingData.length}`);

      // Validate each field mapping for red alliance
      const redResults = await this.validateAlliance(
        'red',
        redScoutingData,
        (tbaMatch.score_breakdown.red || {}) as Record<string, unknown>,
        context,
        executionId
      );
      console.log(`[TBAValidationStrategy] validate: Red alliance generated ${redResults.length} results`);

      // Validate each field mapping for blue alliance
      const blueResults = await this.validateAlliance(
        'blue',
        blueScoutingData,
        (tbaMatch.score_breakdown.blue || {}) as Record<string, unknown>,
        context,
        executionId
      );
      console.log(`[TBAValidationStrategy] validate: Blue alliance generated ${blueResults.length} results`);

      // Combine all results and cache them
      const allResults = [...redResults, ...blueResults];
      console.log(`[TBAValidationStrategy] validate: Total results for ${context.matchKey}: ${allResults.length}`);

      // Cache ALL results for this match in this execution
      this.matchValidationCache.set(cacheKey, allResults);

      // Return only results for the requested team to avoid duplication
      // (since the service calls validate() once per team)
      const teamResults = allResults.filter(r => r.teamNumber === context.teamNumber);
      console.log(`[TBAValidationStrategy] validate: Returning ${teamResults.length} results for team ${context.teamNumber}`);

      return teamResults;
    } catch (error) {
      console.error(`[TBAValidationStrategy] Validation error: ${error}`);
      return [];
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Get TBA match data for a match key from local database
   *
   * We store TBA data in match_schedule.score_breakdown during imports,
   * so we don't need to hit the TBA API during validation.
   */
  private async getTBAMatchData(matchKey: string): Promise<TBAMatch | null> {
    try {
      const match = await this.matchRepository.findByMatchKey(matchKey);
      if (!match || !match.score_breakdown) {
        return null;
      }

      // Construct TBAMatch from database match
      // We only need the fields used by validation
      return {
        key: match.match_key,
        comp_level: match.comp_level,
        set_number: match.set_number,
        match_number: match.match_number,
        score_breakdown: match.score_breakdown,
        post_result_time: match.post_result_time,
        event_key: match.event_key,
        alliances: {
          red: {
            team_keys: [
              `frc${match.red_1}`,
              `frc${match.red_2}`,
              `frc${match.red_3}`
            ].filter(Boolean),
          },
          blue: {
            team_keys: [
              `frc${match.blue_1}`,
              `frc${match.blue_2}`,
              `frc${match.blue_3}`
            ].filter(Boolean),
          },
        },
      } as TBAMatch;
    } catch (error) {
      console.error(`[TBAValidationStrategy] Error fetching match data from database: ${error}`);
      return null;
    }
  }

  /**
   * Get alliance composition from match schedule
   */
  private async getAllianceComposition(matchKey: string): Promise<AllianceComposition> {
    const match = await this.matchRepository.findByMatchKey(matchKey);
    if (!match) {
      throw new Error(`Match not found: ${matchKey}`);
    }

    const red = [match.red_1, match.red_2, match.red_3].filter((t): t is number => t != null);
    const blue = [match.blue_1, match.blue_2, match.blue_3].filter((t): t is number => t != null);

    return { red, blue };
  }

  /**
   * Get scouting data for all teams in an alliance
   *
   * Optimized to fetch match data once per match, not once per team
   */
  private async getAllianceScoutingData(
    teamNumbers: number[],
    matchKey: string
  ): Promise<AllianceScoutingData[]> {
    // Fetch all scouting data for the match ONCE
    const scoutingEntries = await this.scoutingRepository.getMatchScoutingByMatch(matchKey);

    // Build a map for quick lookup
    const scoutingByTeam = new Map<number, MatchScouting>();
    for (const entry of scoutingEntries) {
      scoutingByTeam.set(entry.team_number, entry);
    }

    // Build results for each team in the alliance
    const results: AllianceScoutingData[] = [];

    for (const teamNumber of teamNumbers) {
      const teamScoutingData = scoutingByTeam.get(teamNumber) || null;

      // Extract field values from scouting data
      const fieldValues = new Map<string, number>();
      if (teamScoutingData) {
        this.extractFieldValues(teamScoutingData, fieldValues);
      }

      results.push({
        teamNumber,
        scoutingData: teamScoutingData,
        fieldValues,
      });
    }

    return results;
  }

  /**
   * Extract field values from scouting data into a flat map
   */
  private extractFieldValues(
    scoutingData: MatchScouting,
    fieldValues: Map<string, number>
  ): void {
    // Extract values using dot notation paths
    for (const mapping of FIELD_MAPPINGS_2025) {
      for (const path of mapping.scoutingPaths) {
        const value = this.getValueAtPath(scoutingData as unknown as Record<string, unknown>, path);
        if (value !== undefined && value !== null) {
          fieldValues.set(path, Number(value));
        }
      }
    }
  }

  /**
   * Get value at a dot-notation path in an object
   */
  private getValueAtPath(obj: Record<string, unknown>, path: string): unknown {
    const parts = path.split('.');
    let current: unknown = obj;

    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = (current as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }

    return current;
  }

  /**
   * Validate all fields for an alliance
   */
  private async validateAlliance(
    allianceColor: 'red' | 'blue',
    allianceData: AllianceScoutingData[],
    tbaScoreBreakdown: Record<string, unknown>,
    context: ValidationContext,
    executionId: string
  ): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    console.log(`[TBAValidationStrategy] validateAlliance: ${allianceColor} alliance, ${allianceData.length} teams`);

    // Check if we have enough scouting data
    const teamsWithData = allianceData.filter(t => t.scoutingData !== null);
    console.log(`[TBAValidationStrategy] validateAlliance: ${teamsWithData.length} teams with data (need ${this.MIN_TEAMS_REQUIRED})`);

    if (teamsWithData.length < this.MIN_TEAMS_REQUIRED) {
      // Not enough data to validate
      console.log(`[TBAValidationStrategy] validateAlliance: Not enough teams with data, skipping ${allianceColor} alliance`);
      return results;
    }

    // Validate each field mapping
    for (const mapping of FIELD_MAPPINGS_2025) {
      let tbaValue = tbaScoreBreakdown[mapping.tbaField];

      // Special handling for autoMobilityCount - TBA stores as autoLineRobot1/2/3
      if (mapping.tbaField === 'autoMobilityCount') {
        tbaValue = this.countAutoMobility(tbaScoreBreakdown);
      }

      // Skip if TBA doesn't have this field
      if (tbaValue === undefined || tbaValue === null) {
        continue;
      }

      // Aggregate scouting data for this field across the alliance
      const { total: scoutedTotal, contributions } = this.aggregateField(
        allianceData,
        mapping
      );

      // Compare and create validation results
      const fieldResults = this.compareAndDistribute(
        mapping,
        Number(tbaValue),
        scoutedTotal,
        contributions,
        allianceData,
        context,
        executionId
      );

      results.push(...fieldResults);
    }

    return results;
  }

  /**
   * Aggregate a field across all teams in an alliance
   */
  private aggregateField(
    allianceData: AllianceScoutingData[],
    mapping: TBAFieldMapping
  ): { total: number; contributions: Map<number, number> } {
    const contributions = new Map<number, number>();
    let total = 0;

    for (const teamData of allianceData) {
      let teamContribution = 0;

      for (const path of mapping.scoutingPaths) {
        const value = teamData.fieldValues.get(path);
        if (value !== undefined && value !== null) {
          if (mapping.aggregationMethod === 'sum') {
            teamContribution += Number(value);
          } else if (mapping.aggregationMethod === 'boolean_count') {
            // Count as 1 if true, 0 if false
            teamContribution += value ? 1 : 0;
          }
        }
      }

      contributions.set(teamData.teamNumber, teamContribution);
      total += teamContribution;
    }

    return { total, contributions };
  }

  /**
   * Compare TBA and scouted values, distribute error proportionally
   */
  private compareAndDistribute(
    mapping: TBAFieldMapping,
    tbaValue: number,
    scoutedTotal: number,
    contributions: Map<number, number>,
    allianceData: AllianceScoutingData[],
    context: ValidationContext,
    executionId: string
  ): ValidationResult[] {
    const results: ValidationResult[] = [];

    // Calculate alliance-level discrepancy
    const allianceError = Math.abs(tbaValue - scoutedTotal);

    // For each team, calculate proportional error
    for (const teamData of allianceData) {
      if (!teamData.scoutingData) continue;

      // Skip if no scouter_id (can't create validation without it)
      if (!teamData.scoutingData.scouter_id) {
        console.warn(`[TBAValidationStrategy] Skipping validation for match ${context.matchKey} team ${teamData.teamNumber} - no scouter_id`);
        continue;
      }

      const teamContribution = contributions.get(teamData.teamNumber) || 0;

      // Calculate error for this team
      // Since TBA only gives alliance totals (not individual team breakdowns),
      // we distribute the alliance error EQUALLY across all teams.
      // This is fair because we can't determine which scouter was more wrong.
      let teamError = 0;
      const teamsWithData = allianceData.filter(t => t.scoutingData !== null).length;

      if (teamsWithData > 0) {
        teamError = allianceError / teamsWithData;
      }

      // Calculate accuracy score
      const accuracyScore = this.calculateAccuracyScore(
        tbaValue,
        scoutedTotal,
        teamContribution,
        teamError
      );

      // Determine outcome
      const outcome = this.determineOutcome(accuracyScore);

      // Create a single validation result for the aggregated field
      // Use the TBA field name as the field path since we're validating the aggregate
      const fieldPath = mapping.scoutingPaths.length === 1
        ? mapping.scoutingPaths[0]
        : `tba.${mapping.tbaField}`;

      results.push({
        validationId: crypto.randomUUID(),
        scouterId: teamData.scoutingData.scouter_id,
        matchScoutingId: teamData.scoutingData.id,
        matchKey: context.matchKey!,
        teamNumber: teamData.teamNumber,
        eventKey: context.eventKey,
        seasonYear: context.seasonYear,
        fieldPath,
        expectedValue: tbaValue, // TBA's alliance total
        actualValue: teamContribution, // This team's contribution to the aggregate
        outcome,
        accuracyScore,
        confidenceLevel: this.CONFIDENCE_LEVEL,
        validationType: 'tba',
        validationMethod: 'TBAValidationStrategy',
        executionId,
        notes: `Alliance total from TBA: ${tbaValue}, Scouted total: ${scoutedTotal}, Team contribution: ${teamContribution}, Equal error distribution: ${teamError.toFixed(2)} (${allianceError} ÷ ${teamsWithData} teams)`,
      });
    }

    return results;
  }

  /**
   * Calculate accuracy score based on proportional error
   */
  private calculateAccuracyScore(
    tbaTotal: number,
    _scoutedTotal: number,
    _teamContribution: number,
    teamError: number
  ): number {
    // Perfect match
    if (teamError === 0) {
      return 1.0;
    }

    // Calculate relative error
    const relativeError = teamError / Math.max(tbaTotal, 1);

    // Score inversely proportional to relative error
    // Cap at 0.0 minimum
    const score = Math.max(0, 1 - relativeError);

    return score;
  }

  /**
   * Determine validation outcome from accuracy score
   */
  private determineOutcome(accuracyScore: number): ValidationOutcome {
    if (accuracyScore >= 0.95) {
      return 'exact_match';
    } else if (accuracyScore >= 0.75) {
      return 'close_match';
    } else {
      return 'mismatch';
    }
  }

  /**
   * Count auto mobility from TBA's autoLineRobot1/2/3 fields
   * TBA stores these as "Yes"/"No" strings
   */
  private countAutoMobility(tbaScoreBreakdown: Record<string, unknown>): number {
    let count = 0;
    if (tbaScoreBreakdown['autoLineRobot1'] === 'Yes') count++;
    if (tbaScoreBreakdown['autoLineRobot2'] === 'Yes') count++;
    if (tbaScoreBreakdown['autoLineRobot3'] === 'Yes') count++;
    return count;
  }
}

/**
 * Factory function to create TBA validation strategy
 */
export function createTBAValidationStrategy(): IValidationStrategy {
  return new TBAValidationStrategy();
}
