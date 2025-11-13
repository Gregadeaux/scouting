/**
 * Repository layer exports
 * Centralized export for all repository interfaces and implementations
 */

// Base repository types
export * from './base.repository';

// Import Job Repository
export * from './import-job.repository';

// Team Repository
export * from './team.repository';

// Match Repository
export * from './match.repository';

// Event Repository
export * from './event.repository';

// Scouting Data Repository
export * from './scouting-data.repository';

// Scouter Repository
export * from './scouter.repository';

// Statistics Repository
export * from './statistics.repository';

// Scouter Repository
export * from './scouter.repository';

// Re-export for convenience
export {
  createImportJobRepository,
  ImportJobRepository,
  type IImportJobRepository,
} from './import-job.repository';

export {
  createTeamRepository,
  TeamRepository,
  type ITeamRepository,
} from './team.repository';

export {
  createMatchRepository,
  MatchRepository,
  type IMatchRepository,
} from './match.repository';

export {
  createEventRepository,
  EventRepository,
  type IEventRepository,
} from './event.repository';

export {
  createScoutingDataRepository,
  ScoutingDataRepository,
  type IScoutingDataRepository,
} from './scouting-data.repository';

export {
  createScouterRepository,
  ScouterRepository,
  type IScouterRepository,
} from './scouter.repository';

export {
  createStatisticsRepository,
  statisticsRepository,
  StatisticsRepository,
  type IStatisticsRepository,
} from './statistics.repository';

export {
  createScouterRepository,
  ScouterRepository,
  type IScouterRepository,
} from './scouter.repository';
