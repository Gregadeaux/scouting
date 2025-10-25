/**
 * Service Layer Exports and Factory Functions
 *
 * This module provides centralized service creation with dependency injection.
 * It follows the Factory pattern to enable:
 * - Easy testing with mock dependencies
 * - Singleton instances for convenience
 * - Clean separation of concerns
 */

// Import service interfaces and implementations
import {
  ImportService,
  createImportService as createImportServiceImpl,
  type IImportService,
  type ImportOptions,
  type ImportJobStatus,
  type ImportProcessResult,
} from './import.service';

import {
  EventService,
  createEventService as createEventServiceImpl,
  type IEventService,
} from './event.service';

import {
  MatchService,
  createMatchService as createMatchServiceImpl,
  type IMatchService,
  type MatchFilters,
  type MatchDetail,
  type ScoutAssignment,
} from './match.service';

import {
  TeamService,
  createTeamService as createTeamServiceImpl,
  type ITeamService,
  type TeamDetail,
  type TeamStatistics,
  type TeamSearchResult,
} from './team.service';

import {
  createTBAApiService,
  getTBAApiService,
  type ITBAApiService,
  type TBAApiConfig,
} from './tba-api.service';

// Import repositories
import {
  createImportJobRepository,
  createTeamRepository,
  createMatchRepository,
  createEventRepository,
  createScoutingDataRepository,
} from '@/lib/repositories';

// Import strategies
import {
  MergeStrategies,
  createTeamMergeStrategy,
  createEventMergeStrategy,
  createMatchMergeStrategy,
} from '@/lib/strategies';

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type {
  // Import Service
  IImportService,
  ImportOptions,
  ImportJobStatus,
  ImportProcessResult,

  // Event Service
  IEventService,

  // Match Service
  IMatchService,
  MatchFilters,
  MatchDetail,
  ScoutAssignment,

  // Team Service
  ITeamService,
  TeamDetail,
  TeamStatistics,
  TeamSearchResult,

  // TBA API Service
  ITBAApiService,
  TBAApiConfig,
};

// ============================================================================
// SINGLETON INSTANCES (Optional convenience, can be disabled for testing)
// ============================================================================

let importServiceInstance: IImportService | null = null;
let eventServiceInstance: IEventService | null = null;
let matchServiceInstance: IMatchService | null = null;
let teamServiceInstance: ITeamService | null = null;

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create Import Service with all dependencies
 */
export function createImportService(tbaApiConfig?: TBAApiConfig): IImportService {
  const tbaApi = createTBAApiService(tbaApiConfig);
  const importJobRepo = createImportJobRepository();
  const teamRepo = createTeamRepository();
  const matchRepo = createMatchRepository();
  const eventRepo = createEventRepository();

  const teamMergeStrategy = createTeamMergeStrategy();
  const matchMergeStrategy = createMatchMergeStrategy();
  const eventMergeStrategy = createEventMergeStrategy();

  return createImportServiceImpl(
    tbaApi,
    importJobRepo,
    teamRepo,
    matchRepo,
    eventRepo,
    teamMergeStrategy,
    matchMergeStrategy,
    eventMergeStrategy
  );
}

/**
 * Get or create singleton Import Service instance
 */
export function getImportService(tbaApiConfig?: TBAApiConfig): IImportService {
  if (!importServiceInstance) {
    importServiceInstance = createImportService(tbaApiConfig);
  }
  return importServiceInstance;
}

/**
 * Create Event Service with all dependencies
 */
export function createEventService(tbaApiConfig?: TBAApiConfig): IEventService {
  const tbaApi = createTBAApiService(tbaApiConfig);
  const eventRepo = createEventRepository();
  const teamRepo = createTeamRepository();
  const matchRepo = createMatchRepository();
  const scoutingDataRepo = createScoutingDataRepository();
  const importJobRepo = createImportJobRepository();

  const eventMergeStrategy = createEventMergeStrategy();

  return createEventServiceImpl(
    tbaApi,
    eventRepo,
    teamRepo,
    matchRepo,
    scoutingDataRepo,
    importJobRepo,
    eventMergeStrategy
  );
}

/**
 * Get or create singleton Event Service instance
 */
export function getEventService(tbaApiConfig?: TBAApiConfig): IEventService {
  if (!eventServiceInstance) {
    eventServiceInstance = createEventService(tbaApiConfig);
  }
  return eventServiceInstance;
}

/**
 * Create Match Service with all dependencies
 */
export function createMatchService(): IMatchService {
  const matchRepo = createMatchRepository();
  const teamRepo = createTeamRepository();
  const scoutingDataRepo = createScoutingDataRepository();

  return createMatchServiceImpl(matchRepo, teamRepo, scoutingDataRepo);
}

/**
 * Get or create singleton Match Service instance
 */
export function getMatchService(): IMatchService {
  if (!matchServiceInstance) {
    matchServiceInstance = createMatchService();
  }
  return matchServiceInstance;
}

/**
 * Create Team Service with all dependencies
 */
export function createTeamService(tbaApiConfig?: TBAApiConfig): ITeamService {
  const tbaApi = createTBAApiService(tbaApiConfig);
  const teamRepo = createTeamRepository();
  const eventRepo = createEventRepository();
  const matchRepo = createMatchRepository();
  const scoutingDataRepo = createScoutingDataRepository();

  const teamMergeStrategy = createTeamMergeStrategy();

  return createTeamServiceImpl(
    tbaApi,
    teamRepo,
    eventRepo,
    matchRepo,
    scoutingDataRepo,
    teamMergeStrategy
  );
}

/**
 * Get or create singleton Team Service instance
 */
export function getTeamService(tbaApiConfig?: TBAApiConfig): ITeamService {
  if (!teamServiceInstance) {
    teamServiceInstance = createTeamService(tbaApiConfig);
  }
  return teamServiceInstance;
}

/**
 * Reset all singleton instances (useful for testing)
 */
export function resetServiceInstances(): void {
  importServiceInstance = null;
  eventServiceInstance = null;
  matchServiceInstance = null;
  teamServiceInstance = null;
}

/**
 * Create all services at once (useful for server initialization)
 */
export function createAllServices(tbaApiConfig?: TBAApiConfig) {
  return {
    importService: createImportService(tbaApiConfig),
    eventService: createEventService(tbaApiConfig),
    matchService: createMatchService(),
    teamService: createTeamService(tbaApiConfig),
  };
}

/**
 * Get all singleton service instances
 */
export function getAllServices(tbaApiConfig?: TBAApiConfig) {
  return {
    importService: getImportService(tbaApiConfig),
    eventService: getEventService(tbaApiConfig),
    matchService: getMatchService(),
    teamService: getTeamService(tbaApiConfig),
  };
}

// ============================================================================
// DIRECT EXPORTS (for convenience)
// ============================================================================

export {
  ImportService,
  EventService,
  MatchService,
  TeamService,
  createTBAApiService,
  getTBAApiService,
};

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

/**
 * Example 1: Using factory functions (recommended for testing)
 *
 * ```typescript
 * import { createImportService } from '@/lib/services';
 *
 * const importService = createImportService();
 * const job = await importService.startImport('2025txaus', {
 *   importTeams: true,
 *   importMatches: true,
 *   importResults: false,
 * });
 * ```
 */

/**
 * Example 2: Using singleton instances (recommended for production)
 *
 * ```typescript
 * import { getImportService } from '@/lib/services';
 *
 * const importService = getImportService();
 * const status = await importService.getImportStatus(jobId);
 * ```
 */

/**
 * Example 3: Creating all services at once
 *
 * ```typescript
 * import { createAllServices } from '@/lib/services';
 *
 * const services = createAllServices({ apiKey: process.env.TBA_API_KEY });
 *
 * // Use services
 * const event = await services.eventService.getEventDetail('2025txaus');
 * const matches = await services.matchService.getMatchesForEvent('2025txaus');
 * ```
 */

/**
 * Example 4: Dependency injection for testing
 *
 * ```typescript
 * import { ImportService } from '@/lib/services';
 *
 * // Create mock dependencies
 * const mockTbaApi = createMockTBAApi();
 * const mockRepos = createMockRepositories();
 *
 * // Inject mocks
 * const importService = new ImportService(
 *   mockTbaApi,
 *   mockRepos.importJob,
 *   mockRepos.team,
 *   mockRepos.match,
 *   mockRepos.event,
 *   mockStrategies.team,
 *   mockStrategies.match,
 *   mockStrategies.event
 * );
 *
 * // Test with mocks
 * await importService.startImport('2025txaus', options);
 * expect(mockTbaApi.getEvent).toHaveBeenCalled();
 * ```
 */

/**
 * Example 5: Using in API routes
 *
 * ```typescript
 * // app/api/events/[eventKey]/route.ts
 * import { getEventService } from '@/lib/services';
 *
 * export async function GET(
 *   request: Request,
 *   { params }: { params: { eventKey: string } }
 * ) {
 *   const eventService = getEventService();
 *   const eventDetail = await eventService.getEventDetail(params.eventKey);
 *   return Response.json(eventDetail);
 * }
 * ```
 */

/**
 * Example 6: Background job processing
 *
 * ```typescript
 * // Background worker (e.g., Vercel cron job or queue processor)
 * import { getImportService } from '@/lib/services';
 *
 * export async function processImportJob(jobId: string) {
 *   const importService = getImportService();
 *   const result = await importService.processImportJob(jobId);
 *
 *   if (result.success) {
 *     console.log('Import completed:', result);
 *   } else {
 *     console.error('Import failed:', result.errors);
 *   }
 * }
 * ```
 */
