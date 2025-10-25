/**
 * Merge strategies exports
 * Centralized export for all merge strategy implementations
 */

export * from './merge-strategies';

// Re-export for convenience
export {
  TeamMergeStrategy,
  EventMergeStrategy,
  MatchMergeStrategy,
  MergeStrategies,
  createTeamMergeStrategy,
  createEventMergeStrategy,
  createMatchMergeStrategy,
  type IMergeStrategy,
} from './merge-strategies';
