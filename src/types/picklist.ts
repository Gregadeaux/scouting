/**
 * Pick List Generation Types
 *
 * Defines types for generating ranked pick lists for alliance selection based on
 * OPR, DPR, CCWM, scouting observations, and reliability metrics.
 *
 * Uses Multi-Criteria Decision Analysis (MCDA) with customizable weights.
 */

/**
 * Weights for different metrics in pick list scoring
 * All weights should be between 0 and 1
 * Recommended: weights should sum to approximately 1.0 for interpretability
 */
export interface PickListWeights {
  /** Weight for Offensive Power Rating (OPR) */
  opr: number;

  /** Weight for Defensive Power Rating (DPR) - note: lower DPR is better, will be inverted */
  dpr: number;

  /** Weight for Calculated Contribution to Winning Margin (CCWM = OPR - DPR) */
  ccwm: number;

  /** Weight for reliability metrics (disconnects, disables, tips) */
  reliability: number;

  /** Weight for average autonomous score */
  autoScore: number;

  /** Weight for average teleop score */
  teleopScore: number;

  /** Weight for average endgame score */
  endgameScore: number;

  /** Weight for driver skill rating (qualitative) */
  driverSkill: number;

  /** Weight for defense rating (qualitative) */
  defenseRating: number;

  /** Weight for speed rating (qualitative) */
  speedRating: number;
}

/**
 * Team information and calculated metrics for pick list
 */
export interface PickListTeam {
  /** Team number (e.g., 254, 1678) */
  teamNumber: number;

  /** Team name (e.g., "The Cheesy Poofs") */
  teamName?: string;

  /** Team nickname (e.g., "Cheesy Poofs") */
  teamNickname?: string;

  /** Number of qualification matches played */
  matchesPlayed: number;

  // Calculated metrics
  /** Offensive Power Rating */
  opr: number;

  /** Defensive Power Rating (lower is better) */
  dpr: number;

  /** Calculated Contribution to Winning Margin (OPR - DPR) */
  ccwm: number;

  /** Average total score per match */
  avgTotalScore?: number;

  /** Average autonomous score */
  avgAutoScore?: number;

  /** Average teleop score */
  avgTeleopScore?: number;

  /** Average endgame score */
  avgEndgameScore?: number;

  /** Reliability score (0-100, percentage of matches without issues) */
  reliabilityScore?: number;

  // Qualitative ratings (1-5 scale)
  /** Average defense rating from scouts */
  avgDefenseRating?: number;

  /** Average driver skill rating from scouts */
  avgDriverSkill?: number;

  /** Average speed rating from scouts */
  avgSpeedRating?: number;

  // Pick list specific
  /** Computed composite score based on strategy weights */
  compositeScore: number;

  /** Rank within this pick list (1 = highest) */
  rank: number;

  /** Normalized composite score (0-1 scale) */
  normalizedScore: number;

  /** Identified strengths from scouting data */
  strengths: string[];

  /** Identified weaknesses from scouting data */
  weaknesses: string[];

  /** Has this team been picked in alliance selection? */
  picked: boolean;

  /** Notes from scouts (aggregated) */
  notes?: string;
}

/**
 * Pre-defined pick list strategy with weights
 */
export interface PickListStrategy {
  /** Strategy identifier (e.g., "BALANCED", "OFFENSIVE") */
  id: string;

  /** Human-readable strategy name */
  name: string;

  /** Description of what this strategy optimizes for */
  description: string;

  /** Weight configuration for this strategy */
  weights: PickListWeights;
}

/**
 * Complete pick list for an event
 */
export interface PickList {
  /** Event key (e.g., "2025cafr") */
  eventKey: string;

  /** Event name (e.g., "Fresno Regional") */
  eventName?: string;

  /** Year of the event */
  year: number;

  /** Ranked teams in pick list order */
  teams: PickListTeam[];

  /** Strategy used to generate this pick list */
  strategy: PickListStrategy;

  /** When this pick list was generated */
  generatedAt: Date;

  /** Total number of teams at the event */
  totalTeams: number;

  /** Minimum matches played filter that was applied */
  minMatchesFilter: number;

  /** Statistics about the pick list */
  metadata: PickListMetadata;
}

/**
 * Metadata and statistics about a pick list
 */
export interface PickListMetadata {
  /** Average composite score of all teams */
  avgCompositeScore: number;

  /** Median composite score */
  medianCompositeScore: number;

  /** Standard deviation of composite scores */
  stdDevCompositeScore: number;

  /** Number of teams filtered out (fewer than min matches) */
  teamsFiltered: number;

  /** Average OPR across all teams */
  avgOPR: number;

  /** Average DPR across all teams */
  avgDPR: number;

  /** Average CCWM across all teams */
  avgCCWM: number;

  /** Warnings or notes about data quality */
  warnings: string[];
}

/**
 * Options for pick list generation
 */
export interface PickListOptions {
  /** Minimum matches played to be included (default: 5) */
  minMatches?: number;

  /** Include teams that have been picked in alliance selection */
  includePicked?: boolean;

  /** Use recency weighting (recent matches count more) */
  useRecencyWeighting?: boolean;

  /** Cache results for faster subsequent queries (default: true) */
  useCache?: boolean;

  /** Include detailed scout notes in results */
  includeNotes?: boolean;
}

/**
 * Result of normalizing a metric to 0-1 scale
 */
export interface NormalizedMetric {
  /** Original value */
  original: number;

  /** Normalized value (0-1) */
  normalized: number;

  /** Minimum value in the dataset */
  min: number;

  /** Maximum value in the dataset */
  max: number;

  /** Range (max - min) */
  range: number;
}

/**
 * Complete normalization results for a team
 */
export interface TeamNormalization {
  teamNumber: number;
  opr: NormalizedMetric;
  dpr: NormalizedMetric; // Inverted: lower DPR = higher normalized value
  ccwm: NormalizedMetric;
  autoScore: NormalizedMetric;
  teleopScore: NormalizedMetric;
  endgameScore: NormalizedMetric;
  reliability: NormalizedMetric;
  driverSkill: NormalizedMetric;
  defenseRating: NormalizedMetric;
  speedRating: NormalizedMetric;
}
