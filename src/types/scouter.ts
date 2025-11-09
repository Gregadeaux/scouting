/**
 * Scouter Management Type Definitions
 * Tracks scouter experience, roles, certifications, and availability
 */

// ============================================================================
// SCOUTER ENUMS & CONSTANTS
// ============================================================================

/**
 * Experience level of a scouter
 * - rookie: First season, learning the system
 * - intermediate: 1-2 seasons of experience, comfortable with basics
 * - veteran: 3+ seasons, can mentor others and handle complex scenarios
 */
export type ExperienceLevel = 'rookie' | 'intermediate' | 'veteran';

/**
 * Preferred scouting role
 * - match_scouting: Observes matches from stands, records robot performance
 * - pit_scouting: Interviews teams in pit area, documents robot capabilities
 * - both: Flexible, can do either role as needed
 * - null: No preference specified
 */
export type PreferredRole = 'match_scouting' | 'pit_scouting' | 'both' | null;

/**
 * Certification types for scouters
 * Certifications validate that a scouter has completed training and demonstrated competency
 */
export type Certification =
  | 'pit_certified' // Completed pit scouting training
  | 'match_certified' // Completed match scouting training
  | 'lead_scout' // Qualified to coordinate other scouts
  | 'data_reviewer' // Can review and consolidate scouting data
  | 'trainer' // Can train new scouts
  | 'super_scout'; // Can perform advanced strategic scouting

/**
 * Array of all available certifications (for validation and UI)
 */
export const AVAILABLE_CERTIFICATIONS: readonly Certification[] = [
  'pit_certified',
  'match_certified',
  'lead_scout',
  'data_reviewer',
  'trainer',
  'super_scout',
] as const;

/**
 * Display names for certifications
 */
export const CERTIFICATION_LABELS: Record<Certification, string> = {
  pit_certified: 'Pit Certified',
  match_certified: 'Match Certified',
  lead_scout: 'Lead Scout',
  data_reviewer: 'Data Reviewer',
  trainer: 'Trainer',
  super_scout: 'Super Scout',
};

/**
 * Display names for experience levels
 */
export const EXPERIENCE_LEVEL_LABELS: Record<ExperienceLevel, string> = {
  rookie: 'Rookie',
  intermediate: 'Intermediate',
  veteran: 'Veteran',
};

/**
 * Display names for preferred roles
 */
export const PREFERRED_ROLE_LABELS: Record<NonNullable<PreferredRole>, string> = {
  match_scouting: 'Match Scouting',
  pit_scouting: 'Pit Scouting',
  both: 'Both',
};

// ============================================================================
// SCOUTER ENTITY
// ============================================================================

/**
 * Scouter profile and tracking information
 * Extends user profile with scouting-specific metadata
 */
export interface Scouter {
  // Primary Key
  id: string; // UUID

  // Relationships
  /** References users.id - The user account associated with this scouter */
  user_id: string;

  /** References teams.team_number - Optional team affiliation */
  team_number: number | null;

  // Scouter Classification
  /** Experience level determines training requirements and responsibilities */
  experience_level: ExperienceLevel;

  /** Role preference for match assignments */
  preferred_role: PreferredRole;

  // Activity Metrics
  /** Total number of match observations completed (all seasons) */
  total_matches_scouted: number;

  /** Total number of events attended as a scouter */
  total_events_attended: number;

  // Qualifications
  /** Array of certifications earned by this scouter */
  certifications: Certification[];

  // Scheduling & Availability
  /** Free-form notes about availability, time constraints, physical limitations */
  availability_notes: string | null;

  // Timestamps
  created_at: string; // ISO 8601 timestamp
  updated_at: string; // ISO 8601 timestamp
}

// ============================================================================
// EXTENDED SCOUTER VIEWS
// ============================================================================

/**
 * Scouter with user profile information
 * Used in list views and detail pages
 */
export interface ScouterWithUser extends Scouter {
  // User profile fields (from join)
  email: string;
  full_name: string | null;
  display_name: string | null;

  // Team information (from join, if team_number is set)
  team_name?: string;
  team_nickname?: string;
}

/**
 * Scouter with performance statistics
 * Used in analytics and lead scout dashboards
 */
export interface ScouterWithStats extends ScouterWithUser {
  // Current season statistics
  current_season_matches: number;
  current_season_events: number;

  // Data quality metrics
  avg_confidence_level?: number; // Average of confidence_level from match_scouting
  data_accuracy_score?: number; // Calculated based on agreement with other scouts

  // Activity timeline
  last_scouting_date?: string; // Most recent match_scouting.created_at
  first_scouting_date?: string; // Earliest match_scouting.created_at
}

// ============================================================================
// INPUT/SUBMISSION TYPES
// ============================================================================

/**
 * Data required to create a new scouter record
 * Omits auto-generated fields (id, timestamps, counters)
 */
export interface CreateScouterInput {
  // Required fields
  user_id: string;
  experience_level: ExperienceLevel;

  // Optional fields
  team_number?: number | null;
  preferred_role?: PreferredRole;
  certifications?: Certification[];
  availability_notes?: string | null;
}

/**
 * Data for updating an existing scouter record
 * All fields optional - only provided fields will be updated
 */
export interface UpdateScouterInput {
  team_number?: number | null;
  experience_level?: ExperienceLevel;
  preferred_role?: PreferredRole;
  certifications?: Certification[];
  availability_notes?: string | null;

  // Activity counters (typically updated by triggers, but can be manually adjusted)
  total_matches_scouted?: number;
  total_events_attended?: number;
}

/**
 * Form data for scouter registration/onboarding
 * Simplified interface for initial setup
 */
export interface ScouterRegistrationData {
  experience_level: ExperienceLevel;
  preferred_role?: PreferredRole;
  team_number?: number;
  availability_notes?: string;
}

// ============================================================================
// QUERY & FILTER TYPES
// ============================================================================

/**
 * Filters for querying scouters
 */
export interface ScouterFilters {
  // Relationship filters
  user_id?: string;
  team_number?: number;

  // Classification filters
  experience_level?: ExperienceLevel;
  preferred_role?: PreferredRole;
  has_certification?: Certification; // Has at least this certification

  // Activity filters
  min_matches_scouted?: number;
  min_events_attended?: number;
  is_active?: boolean; // Has scouted in current season

  // Search
  search?: string; // Search by name or email

  // Pagination
  limit?: number;
  offset?: number;

  // Sorting
  sort_by?: 'name' | 'experience' | 'matches' | 'events' | 'created_at';
  sort_order?: 'asc' | 'desc';
}

/**
 * Scouter assignment preferences for match scheduling
 */
export interface ScouterAssignmentPreferences {
  scouter_id: string;
  available_times?: string[]; // ISO timestamps when scouter is available
  preferred_positions?: ('red_1' | 'red_2' | 'red_3' | 'blue_1' | 'blue_2' | 'blue_3')[];
  avoid_teams?: number[]; // Team numbers to avoid (e.g., home team)
  max_consecutive_matches?: number; // Maximum matches in a row before break
}

// ============================================================================
// VALIDATION & CONSTRAINTS
// ============================================================================

/**
 * Validation rules for scouter fields
 */
export const SCOUTER_VALIDATION = {
  experience_level: {
    required: true,
    values: ['rookie', 'intermediate', 'veteran'] as const,
  },
  preferred_role: {
    required: false,
    values: ['match_scouting', 'pit_scouting', 'both', null] as const,
  },
  certifications: {
    required: false,
    maxLength: 10,
    validValues: AVAILABLE_CERTIFICATIONS,
  },
  availability_notes: {
    required: false,
    maxLength: 1000,
  },
  team_number: {
    required: false,
    min: 1,
    max: 99999,
  },
} as const;

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

/**
 * Response for scouter list endpoint
 */
export interface ScouterListResponse {
  success: boolean;
  data: ScouterWithUser[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

/**
 * Response for single scouter endpoint
 */
export interface ScouterResponse {
  success: boolean;
  data?: Scouter | ScouterWithUser | ScouterWithStats;
  error?: string;
}

/**
 * Response for scouter statistics endpoint
 */
export interface ScouterStatsResponse {
  success: boolean;
  data?: {
    total_scouters: number;
    by_experience: Record<ExperienceLevel, number>;
    by_role: Record<NonNullable<PreferredRole>, number>;
    by_certification: Record<Certification, number>;
    active_this_season: number;
    avg_matches_per_scouter: number;
    avg_events_per_scouter: number;
  };
  error?: string;
}

// ============================================================================
// HELPER TYPES
// ============================================================================

/**
 * Type guard to check if a value is a valid ExperienceLevel
 */
export function isExperienceLevel(value: unknown): value is ExperienceLevel {
  return (
    typeof value === 'string' &&
    ['rookie', 'intermediate', 'veteran'].includes(value)
  );
}

/**
 * Type guard to check if a value is a valid PreferredRole
 */
export function isPreferredRole(value: unknown): value is PreferredRole {
  return (
    value === null ||
    (typeof value === 'string' &&
      ['match_scouting', 'pit_scouting', 'both'].includes(value))
  );
}

/**
 * Type guard to check if a value is a valid Certification
 */
export function isCertification(value: unknown): value is Certification {
  return (
    typeof value === 'string' &&
    AVAILABLE_CERTIFICATIONS.includes(value as Certification)
  );
}

/**
 * Type guard to check if an array contains only valid certifications
 */
export function areCertifications(value: unknown): value is Certification[] {
  return Array.isArray(value) && value.every(isCertification);
}
