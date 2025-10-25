/**
 * Data Transfer Objects (DTOs) for Pit Scouting
 *
 * DTOs define the shape of data flowing in/out of the service layer.
 * They differ from database entities by using client-friendly field names
 * and providing a clean API contract.
 */

import type {
  RobotCapabilities2025,
  AutonomousCapabilities2025,
} from '@/types/season-2025';

/**
 * DTO for creating a new pit scouting entry
 * Uses client-friendly field names that will be mapped to database schema
 */
export interface CreatePitScoutingDTO {
  // Required fields
  event_key: string;
  team_number: number;
  scout_id: string; // Will be mapped to 'scouted_by' in database

  // Season-specific JSONB capabilities (required)
  robot_capabilities: RobotCapabilities2025;
  autonomous_capabilities: AutonomousCapabilities2025;

  // Optional physical robot characteristics
  drive_train?: string;
  drive_motors?: string;
  programming_language?: string;
  robot_weight_lbs?: number;
  height_inches?: number;
  width_inches?: number;
  length_inches?: number;

  // Optional descriptive fields (client-friendly names)
  physical_description?: string; // Maps to 'robot_features'
  photos?: string[]; // Maps to 'photo_urls'
  notes?: string; // Maps to 'scouting_notes'

  // Optional strategic information
  team_strategy?: string;
  preferred_starting_position?: number;
  team_goals?: string;
  team_comments?: string;
}

/**
 * DTO for updating an existing pit scouting entry
 * All fields optional except ID
 */
export interface UpdatePitScoutingDTO {
  id: string; // Required for updates

  // Core fields (optional for updates)
  event_key?: string;
  team_number?: number;
  scout_id?: string; // Will be mapped to 'scouted_by'

  // Season-specific JSONB capabilities
  robot_capabilities?: RobotCapabilities2025;
  autonomous_capabilities?: AutonomousCapabilities2025;

  // Optional physical robot characteristics
  drive_train?: string;
  drive_motors?: string;
  programming_language?: string;
  robot_weight_lbs?: number;
  height_inches?: number;
  width_inches?: number;
  length_inches?: number;

  // Optional descriptive fields (client-friendly names)
  physical_description?: string; // Maps to 'robot_features'
  photos?: string[]; // Maps to 'photo_urls'
  notes?: string; // Maps to 'scouting_notes'

  // Optional strategic information
  team_strategy?: string;
  preferred_starting_position?: number;
  team_goals?: string;
  team_comments?: string;
}

/**
 * DTO for pit scouting data returned from service
 * Uses client-friendly field names for API responses
 */
export interface PitScoutingDTO {
  id: string;
  event_key: string;
  team_number: number;
  scout_id: string; // Mapped from 'scouted_by'

  // Season-specific JSONB capabilities
  robot_capabilities?: RobotCapabilities2025;
  autonomous_capabilities?: AutonomousCapabilities2025;

  // Physical robot characteristics
  drive_train?: string;
  drive_motors?: string;
  programming_language?: string;
  robot_weight_lbs?: number;
  height_inches?: number;
  width_inches?: number;
  length_inches?: number;

  // Descriptive fields (client-friendly names)
  physical_description?: string; // Mapped from 'robot_features'
  photos?: string[]; // Mapped from 'photo_urls'
  notes?: string; // Mapped from 'scouting_notes'

  // Strategic information
  team_strategy?: string;
  preferred_starting_position?: number;
  team_goals?: string;
  team_comments?: string;

  // Metadata
  scouted_at?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Query parameters for filtering pit scouting data
 */
export interface PitScoutingQueryParams {
  team_number?: number;
  event_key?: string;
  scout_id?: string;
  limit?: number;
  offset?: number;
}

/**
 * Paginated response for pit scouting queries
 */
export interface PaginatedPitScoutingResponse {
  data: PitScoutingDTO[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
}
