/**
 * Pit Scouting Mapper
 *
 * Handles bidirectional mapping between DTOs (client-facing) and database entities.
 * Encapsulates field name mapping logic to maintain clean separation of concerns.
 *
 * Field Mappings:
 * - scout_id (DTO) ↔ scouted_by (DB)
 * - physical_description (DTO) ↔ robot_features (DB)
 * - photos (DTO) ↔ photo_urls (DB)
 * - notes (DTO) ↔ scouting_notes (DB)
 */

import type { PitScouting, JSONBData, RobotCapabilities2025, AutonomousCapabilities2025 } from '@/types';
import type {
  CreatePitScoutingDTO,
  UpdatePitScoutingDTO,
  PitScoutingDTO,
} from '@/lib/services/types/pit-scouting-dto';

/**
 * Pit Scouting Mapper
 * Provides static methods for converting between DTOs and database entities
 */
export class PitScoutingMapper {
  /**
   * Convert CreatePitScoutingDTO to database entity format
   * Maps client-friendly field names to database column names
   *
   * @param dto - The DTO from the client
   * @returns Database entity ready for insertion (without id, created_at, updated_at)
   */
  static toCreateEntity(
    dto: CreatePitScoutingDTO
  ): Omit<PitScouting, 'id' | 'created_at' | 'updated_at'> {
    return {
      // Core fields
      event_key: dto.event_key,
      team_number: dto.team_number,
      scouted_by: dto.scout_id, // DTO → DB mapping

      // Season-specific JSONB capabilities (cast to JSONBData for database storage)
      robot_capabilities: dto.robot_capabilities as unknown as JSONBData,
      autonomous_capabilities: dto.autonomous_capabilities as unknown as JSONBData,

      // Physical robot characteristics
      drive_train: dto.drive_train,
      drive_motors: dto.drive_motors,
      programming_language: dto.programming_language,
      robot_weight_lbs: dto.robot_weight_lbs,
      height_inches: dto.height_inches,
      width_inches: dto.width_inches,
      length_inches: dto.length_inches,

      // Descriptive fields with mapping
      robot_features: dto.physical_description, // DTO → DB mapping
      photo_urls: dto.photos, // DTO → DB mapping
      scouting_notes: dto.notes, // DTO → DB mapping

      // Strategic information
      team_strategy: dto.team_strategy,
      preferred_starting_position: dto.preferred_starting_position,
      team_goals: dto.team_goals,
      team_comments: dto.team_comments,
    };
  }

  /**
   * Convert UpdatePitScoutingDTO to partial database entity format
   * Only includes fields that are defined in the DTO
   *
   * @param dto - The update DTO from the client
   * @returns Partial database entity for updates
   */
  static toUpdateEntity(dto: UpdatePitScoutingDTO): Partial<PitScouting> {
    const entity: Partial<PitScouting> = {};

    // Core fields (if present)
    if (dto.event_key !== undefined) entity.event_key = dto.event_key;
    if (dto.team_number !== undefined) entity.team_number = dto.team_number;
    if (dto.scout_id !== undefined) entity.scouted_by = dto.scout_id; // DTO → DB mapping

    // Season-specific JSONB capabilities (cast to JSONBData for database storage)
    if (dto.robot_capabilities !== undefined) {
      entity.robot_capabilities = dto.robot_capabilities as unknown as JSONBData;
    }
    if (dto.autonomous_capabilities !== undefined) {
      entity.autonomous_capabilities = dto.autonomous_capabilities as unknown as JSONBData;
    }

    // Physical robot characteristics
    if (dto.drive_train !== undefined) entity.drive_train = dto.drive_train;
    if (dto.drive_motors !== undefined) entity.drive_motors = dto.drive_motors;
    if (dto.programming_language !== undefined) {
      entity.programming_language = dto.programming_language;
    }
    if (dto.robot_weight_lbs !== undefined) entity.robot_weight_lbs = dto.robot_weight_lbs;
    if (dto.height_inches !== undefined) entity.height_inches = dto.height_inches;
    if (dto.width_inches !== undefined) entity.width_inches = dto.width_inches;
    if (dto.length_inches !== undefined) entity.length_inches = dto.length_inches;

    // Descriptive fields with mapping
    if (dto.physical_description !== undefined) {
      entity.robot_features = dto.physical_description; // DTO → DB mapping
    }
    if (dto.photos !== undefined) {
      entity.photo_urls = dto.photos; // DTO → DB mapping
    }
    if (dto.notes !== undefined) {
      entity.scouting_notes = dto.notes; // DTO → DB mapping
    }

    // Strategic information
    if (dto.team_strategy !== undefined) entity.team_strategy = dto.team_strategy;
    if (dto.preferred_starting_position !== undefined) {
      entity.preferred_starting_position = dto.preferred_starting_position;
    }
    if (dto.team_goals !== undefined) entity.team_goals = dto.team_goals;
    if (dto.team_comments !== undefined) entity.team_comments = dto.team_comments;

    // Always update timestamp on updates
    entity.updated_at = new Date().toISOString();

    return entity;
  }

  /**
   * Convert database entity to client-facing DTO
   * Maps database column names to client-friendly field names
   *
   * @param entity - The database entity
   * @returns DTO for API responses
   */
  static toDTO(entity: PitScouting): PitScoutingDTO {
    return {
      // Core fields
      id: entity.id,
      event_key: entity.event_key,
      team_number: entity.team_number,
      scout_id: entity.scouted_by, // DB → DTO mapping

      // Season-specific JSONB capabilities (cast from JSONBData to specific types)
      robot_capabilities: entity.robot_capabilities as unknown as RobotCapabilities2025 | undefined,
      autonomous_capabilities: entity.autonomous_capabilities as unknown as AutonomousCapabilities2025 | undefined,

      // Physical robot characteristics
      drive_train: entity.drive_train,
      drive_motors: entity.drive_motors,
      programming_language: entity.programming_language,
      robot_weight_lbs: entity.robot_weight_lbs,
      height_inches: entity.height_inches,
      width_inches: entity.width_inches,
      length_inches: entity.length_inches,

      // Descriptive fields with mapping
      physical_description: entity.robot_features, // DB → DTO mapping
      photos: entity.photo_urls, // DB → DTO mapping
      notes: entity.scouting_notes, // DB → DTO mapping

      // Strategic information
      team_strategy: entity.team_strategy,
      preferred_starting_position: entity.preferred_starting_position,
      team_goals: entity.team_goals,
      team_comments: entity.team_comments,

      // Metadata
      scouted_at: entity.scouted_at,
      created_at: entity.created_at,
      updated_at: entity.updated_at,
    };
  }

  /**
   * Convert array of database entities to array of DTOs
   * Convenience method for bulk conversions
   *
   * @param entities - Array of database entities
   * @returns Array of DTOs
   */
  static toDTOArray(entities: PitScouting[]): PitScoutingDTO[] {
    return entities.map((entity) => this.toDTO(entity));
  }

  /**
   * Validate field mappings consistency
   * Development helper to ensure mappings are bidirectional
   *
   * @returns Object containing mapped field names
   */
  static getFieldMappings(): Record<string, { dto: string; db: string }> {
    return {
      scout: { dto: 'scout_id', db: 'scouted_by' },
      description: { dto: 'physical_description', db: 'robot_features' },
      photos: { dto: 'photos', db: 'photo_urls' },
      notes: { dto: 'notes', db: 'scouting_notes' },
    };
  }
}
