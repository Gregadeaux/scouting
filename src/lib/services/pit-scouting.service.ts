/**
 * Pit Scouting Service
 *
 * Centralized business logic for pit scouting operations.
 * Follows SOLID principles with dependency injection and single responsibility.
 *
 * Responsibilities:
 * - Validate pit scouting data (JSONB schema validation)
 * - Detect schema versions from JSONB data
 * - Detect duplicate submissions
 * - Orchestrate repository operations
 * - Transform data between DTOs and entities via mapper
 *
 * Dependencies (injected):
 * - IScoutingDataRepository: Database access layer
 * - PitScoutingMapper: DTO ↔ Entity transformations
 */

import type { PitScouting, ValidationResult } from '@/types';
import type { IScoutingDataRepository } from '@/lib/repositories/scouting-data.repository';
import type {
  CreatePitScoutingDTO,
  UpdatePitScoutingDTO,
  PitScoutingDTO,

} from './types/pit-scouting-dto';
import { PitScoutingMapper } from '@/lib/mappers/pit-scouting.mapper';
import { validatePitScoutingData2025 } from '@/lib/supabase/validation';

/**
 * Custom error classes for pit scouting service
 */
export class PitScoutingValidationError extends Error {
  constructor(
    message: string,
    public errors: ValidationResult['errors']
  ) {
    super(message);
    this.name = 'PitScoutingValidationError';
  }
}

export class DuplicatePitScoutingError extends Error {
  constructor(
    message: string,
    public existingEntry: PitScouting
  ) {
    super(message);
    this.name = 'DuplicatePitScoutingError';
  }
}

export class PitScoutingNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PitScoutingNotFoundError';
  }
}

export class UnsupportedSchemaVersionError extends Error {
  constructor(
    message: string,
    public version: string,
    public supportedVersions: string[]
  ) {
    super(message);
    this.name = 'UnsupportedSchemaVersionError';
  }
}

/**
 * Supported schema versions for validation routing
 */
const SUPPORTED_SCHEMA_VERSIONS = ['2025.1'] as const;
type SupportedSchemaVersion = (typeof SUPPORTED_SCHEMA_VERSIONS)[number];

/**
 * Pit Scouting Service Interface
 * Defines the contract for pit scouting business logic
 */
export interface IPitScoutingService {
  /**
   * Get pit scouting entry by team and event
   * @param eventKey - Event key
   * @param teamNumber - Team number
   * @returns Pit scouting DTO or null if not found
   */
  getPitScoutingByTeam(eventKey: string, teamNumber: number): Promise<PitScoutingDTO | null>;

  /**
   * Get all pit scouting entries for an event
   * @param eventKey - Event key
   * @returns Array of pit scouting DTOs
   */
  getPitScoutingByEvent(eventKey: string): Promise<PitScoutingDTO[]>;

  /**
   * Create a new pit scouting entry
   * Validates data, checks for duplicates, and saves to database
   *
   * @param data - Create DTO with pit scouting data
   * @returns Created pit scouting DTO
   * @throws PitScoutingValidationError if validation fails
   * @throws DuplicatePitScoutingError if entry already exists for team/event
   * @throws UnsupportedSchemaVersionError if schema version is not supported
   */
  createPitScouting(data: CreatePitScoutingDTO): Promise<PitScoutingDTO>;

  /**
   * Update an existing pit scouting entry
   * Validates data and updates database
   *
   * @param id - Pit scouting entry ID
   * @param data - Update DTO with fields to update
   * @returns Updated pit scouting DTO
   * @throws PitScoutingValidationError if validation fails
   * @throws PitScoutingNotFoundError if entry not found
   * @throws UnsupportedSchemaVersionError if schema version is not supported
   */
  updatePitScouting(id: string, data: UpdatePitScoutingDTO): Promise<PitScoutingDTO>;

  /**
   * Validate pit scouting data against schema
   * Detects schema version and routes to appropriate validator
   *
   * @param data - Data to validate (must include robot_capabilities and autonomous_capabilities)
   * @returns ValidationResult with valid flag and any errors
   */
  validatePitScoutingData(data: {
    robot_capabilities: unknown;
    autonomous_capabilities: unknown;
  }): ValidationResult;

  /**
   * Detect if a pit scouting entry already exists for team/event
   *
   * @param eventKey - Event key
   * @param teamNumber - Team number
   * @returns Existing pit scouting entry or null
   */
  detectDuplicate(eventKey: string, teamNumber: number): Promise<PitScouting | null>;
}

/**
 * Pit Scouting Service Implementation
 */
export class PitScoutingService implements IPitScoutingService {
  /**
   * Constructor with dependency injection
   *
   * @param repository - Scouting data repository for database access
   */
  constructor(private readonly repository: IScoutingDataRepository) { }

  /**
   * Get pit scouting entry by team and event
   */
  async getPitScoutingByTeam(
    eventKey: string,
    teamNumber: number
  ): Promise<PitScoutingDTO | null> {
    const entity = await this.repository.findPitScoutingByTeamAndEvent(teamNumber, eventKey);

    if (!entity) {
      return null;
    }

    return PitScoutingMapper.toDTO(entity);
  }

  /**
   * Get all pit scouting entries for an event
   */
  async getPitScoutingByEvent(eventKey: string): Promise<PitScoutingDTO[]> {
    const entities = await this.repository.getPitScoutingByEvent(eventKey);
    return PitScoutingMapper.toDTOArray(entities);
  }

  /**
   * Create a new pit scouting entry
   * Implements full business logic: validation, duplicate detection, persistence
   */
  async createPitScouting(data: CreatePitScoutingDTO): Promise<PitScoutingDTO> {
    // 1. Detect schema version from robot_capabilities
    const schemaVersion = this.detectSchemaVersion(data.robot_capabilities);

    // 2. Validate JSONB data based on schema version
    const validationResult = this.validatePitScoutingDataWithVersion(
      {
        robot_capabilities: data.robot_capabilities,
        autonomous_capabilities: data.autonomous_capabilities,
      },
      schemaVersion
    );

    if (!validationResult.valid) {
      throw new PitScoutingValidationError('Pit scouting data validation failed', validationResult.errors);
    }

    // 3. Check for duplicate submissions (same team + event)
    const duplicate = await this.detectDuplicate(data.event_key, data.team_number);

    if (duplicate) {
      throw new DuplicatePitScoutingError(
        `A pit scouting observation already exists for team ${data.team_number} at event ${data.event_key}. Use update instead.`,
        duplicate
      );
    }

    // 4. Map DTO to database entity
    const entity = PitScoutingMapper.toCreateEntity(data);

    // 5. Persist to database
    const created = await this.repository.createPitScouting(entity);

    // 6. Map back to DTO and return
    return PitScoutingMapper.toDTO(created);
  }

  /**
   * Update an existing pit scouting entry
   */
  async updatePitScouting(id: string, data: UpdatePitScoutingDTO): Promise<PitScoutingDTO> {
    // 1. Verify entry exists
    const existing = await this.repository.getPitScoutingById(id);

    if (!existing) {
      throw new PitScoutingNotFoundError(`Pit scouting entry with id ${id} not found`);
    }

    // 2. If JSONB data is being updated, validate it
    if (data.robot_capabilities || data.autonomous_capabilities) {
      // Use existing values if not provided in update
      const robotCapabilities = data.robot_capabilities || existing.robot_capabilities;
      const autonomousCapabilities =
        data.autonomous_capabilities || existing.autonomous_capabilities;

      if (robotCapabilities && autonomousCapabilities) {
        const schemaVersion = this.detectSchemaVersion(robotCapabilities);

        const validationResult = this.validatePitScoutingDataWithVersion(
          {
            robot_capabilities: robotCapabilities,
            autonomous_capabilities: autonomousCapabilities,
          },
          schemaVersion
        );

        if (!validationResult.valid) {
          throw new PitScoutingValidationError(
            'Pit scouting data validation failed',
            validationResult.errors
          );
        }
      }
    }

    // 3. Map DTO to partial entity
    const entityUpdates = PitScoutingMapper.toUpdateEntity(data);

    // 4. Persist updates to database
    const updated = await this.repository.updatePitScouting(id, entityUpdates);

    // 5. Map back to DTO and return
    return PitScoutingMapper.toDTO(updated);
  }

  /**
   * Validate pit scouting data
   * Public method for standalone validation (e.g., in forms)
   */
  validatePitScoutingData(data: {
    robot_capabilities: unknown;
    autonomous_capabilities: unknown;
  }): ValidationResult {
    const schemaVersion = this.detectSchemaVersion(data.robot_capabilities);
    return this.validatePitScoutingDataWithVersion(data, schemaVersion);
  }

  /**
   * Detect duplicate pit scouting entry
   */
  async detectDuplicate(eventKey: string, teamNumber: number): Promise<PitScouting | null> {
    return this.repository.findPitScoutingByTeamAndEvent(teamNumber, eventKey);
  }

  /**
   * Detect schema version from robot_capabilities JSONB
   * @private
   */
  private detectSchemaVersion(robotCapabilities: unknown): SupportedSchemaVersion {
    // Type guard to check if robotCapabilities has schema_version property
    if (
      !robotCapabilities ||
      typeof robotCapabilities !== 'object' ||
      !('schema_version' in robotCapabilities)
    ) {
      throw new UnsupportedSchemaVersionError(
        'Schema version is required in robot_capabilities',
        'unknown',
        [...SUPPORTED_SCHEMA_VERSIONS]
      );
    }

    const version = (robotCapabilities as { schema_version: unknown }).schema_version;

    if (!version) {
      throw new UnsupportedSchemaVersionError(
        'Schema version is required in robot_capabilities',
        'unknown',
        [...SUPPORTED_SCHEMA_VERSIONS]
      );
    }

    if (!SUPPORTED_SCHEMA_VERSIONS.includes(version as SupportedSchemaVersion)) {
      throw new UnsupportedSchemaVersionError(
        `Unsupported schema version: ${version}`,
        String(version),
        [...SUPPORTED_SCHEMA_VERSIONS]
      );
    }

    return version as SupportedSchemaVersion;
  }

  /**
   * Validate pit scouting data with specific schema version
   * Routes to appropriate validator based on version
   * @private
   */
  private validatePitScoutingDataWithVersion(
    data: {
      robot_capabilities: unknown;
      autonomous_capabilities: unknown;
    },
    schemaVersion: SupportedSchemaVersion
  ): ValidationResult {
    // Route to appropriate validator based on schema version
    switch (schemaVersion) {
      case '2025.1':
        return validatePitScoutingData2025(data);

      default:
        // This should never happen due to detectSchemaVersion check,
        // but TypeScript exhaustiveness checking requires it
        throw new UnsupportedSchemaVersionError(
          `No validator found for schema version: ${schemaVersion}`,
          schemaVersion,
          [...SUPPORTED_SCHEMA_VERSIONS]
        );
    }
  }

  /**
   * Logging utility
   * @private
   */
  private log(message: string, data?: unknown): void {
    console.log(`[PitScoutingService] ${message}`, data || '');
  }
}

/**
 * Factory function to create Pit Scouting Service
 * Enables dependency injection and testing
 *
 * @param repository - Scouting data repository instance
 * @returns Configured pit scouting service
 */
export function createPitScoutingService(
  repository: IScoutingDataRepository
): IPitScoutingService {
  return new PitScoutingService(repository);
}
