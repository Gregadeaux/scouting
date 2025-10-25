# Repository Layer

This directory contains the repository layer for data access abstraction, following SOLID principles and the Repository pattern.

## Overview

The repository layer provides a clean abstraction over database operations, making the codebase more testable, maintainable, and allowing for easier database migration in the future.

## Architecture

```
repositories/
├── base.repository.ts           # Base interfaces and error types
├── import-job.repository.ts     # Import job operations
├── team.repository.ts           # Team CRUD operations
├── match.repository.ts          # Match schedule operations
├── event.repository.ts          # Event operations
├── scouting-data.repository.ts  # Read-only scouting data access
└── index.ts                     # Centralized exports
```

## Repository Pattern Benefits

1. **Separation of Concerns**: Business logic is separated from data access logic
2. **Testability**: Repositories can be easily mocked for unit testing
3. **Single Responsibility**: Each repository handles one entity type
4. **Dependency Inversion**: Services depend on interfaces, not implementations
5. **Flexibility**: Easy to swap database implementations

## Usage Examples

### Import Job Repository

```typescript
import { createImportJobRepository } from '@/lib/repositories';

const importJobRepo = createImportJobRepository();

// Create a new import job
const job = await importJobRepo.create({
  event_key: '2025txaus',
  job_type: 'full',
  created_by: 'user-id',
});

// Update progress
await importJobRepo.updateProgress(job.job_id, {
  processed_items: 50,
  total_items: 100,
  progress_percent: 50,
});

// Mark as completed
await importJobRepo.markCompleted(job.job_id);

// Find jobs by event
const jobs = await importJobRepo.findByEventKey('2025txaus');
```

### Team Repository

```typescript
import { createTeamRepository } from '@/lib/repositories';
import { MergeStrategies } from '@/lib/strategies';

const teamRepo = createTeamRepository();

// Upsert a team
const team = await teamRepo.upsert({
  team_number: 930,
  team_key: 'frc930',
  team_name: 'Mukwonago BEARs',
  city: 'Mukwonago',
  state_province: 'Wisconsin',
  country: 'USA',
});

// Bulk upsert teams from TBA
const tbaTeams = [/* TBA team data */];
const mergeStrategy = MergeStrategies.team;

const teamsToUpsert = tbaTeams.map(tbaTeam => {
  const existingTeam = await teamRepo.findByTeamNumber(tbaTeam.team_number);
  return mergeStrategy.merge(existingTeam, tbaTeam);
});

const upsertedTeams = await teamRepo.bulkUpsert(teamsToUpsert);

// Find teams at an event
const eventTeams = await teamRepo.findByEventKey('2025txaus');
```

### Match Repository

```typescript
import { createMatchRepository } from '@/lib/repositories';

const matchRepo = createMatchRepository();

// Find matches for an event
const matches = await matchRepo.findByEventKey('2025txaus', {
  compLevel: 'qm', // Only qualification matches
  orderBy: 'match_number',
  orderDirection: 'asc',
});

// Update match scores
await matchRepo.updateScores('2025txaus_qm1', 85, 92);

// Get scouting coverage
const coverage = await matchRepo.getScoutingCoverage('2025txaus');
console.log(coverage['2025txaus_qm1']);
// {
//   total_positions: 6,
//   scouted_positions: 4,
//   positions: { red_1: true, red_2: true, ... }
// }
```

### Event Repository

```typescript
import { createEventRepository } from '@/lib/repositories';

const eventRepo = createEventRepository();

// Find event
const event = await eventRepo.findByEventKey('2025txaus');

// Find all 2025 events
const events2025 = await eventRepo.findByYear(2025);

// Update from TBA
const updatedEvent = await eventRepo.updateFromTBA('2025txaus', tbaEventData);
```

### Scouting Data Repository (Read-Only)

```typescript
import { createScoutingDataRepository } from '@/lib/repositories';

const scoutingRepo = createScoutingDataRepository();

// Get match scouting for an event
const matchScouting = await scoutingRepo.getMatchScoutingByEvent('2025txaus');

// Get pit scouting for an event
const pitScouting = await scoutingRepo.getPitScoutingByEvent('2025txaus');

// Count scouting entries
const matchCount = await scoutingRepo.countMatchScoutingByEvent('2025txaus');
const pitCount = await scoutingRepo.countPitScoutingByEvent('2025txaus');
```

## Merge Strategies

The merge strategies in `/lib/strategies/merge-strategies.ts` define how to merge TBA data with local database records.

```typescript
import { MergeStrategies } from '@/lib/strategies';

// Team merge: TBA is source of truth, preserves local customizations
const teamData = MergeStrategies.team.merge(existingTeam, tbaTeam);

// Event merge: TBA is complete source of truth
const eventData = MergeStrategies.event.merge(existingEvent, tbaEvent);

// Match merge: TBA for schedule/scores, preserves scouting data
const matchData = MergeStrategies.match.merge(existingMatch, tbaMatch);
```

## Error Handling

All repositories throw custom error types for better error handling:

```typescript
import {
  RepositoryError,
  EntityNotFoundError,
  DuplicateEntityError,
  DatabaseOperationError,
} from '@/lib/repositories';

try {
  const team = await teamRepo.findByTeamNumber(930);
} catch (error) {
  if (error instanceof EntityNotFoundError) {
    console.log('Team not found');
  } else if (error instanceof DatabaseOperationError) {
    console.error('Database error:', error.details);
  } else if (error instanceof RepositoryError) {
    console.error('Repository error:', error.message);
  }
}
```

## Dependency Injection

All repositories support dependency injection for testing:

```typescript
import { SupabaseClient } from '@supabase/supabase-js';
import { createTeamRepository } from '@/lib/repositories';

// Production: Use default service client
const teamRepo = createTeamRepository();

// Testing: Inject mock client
const mockClient = createMockSupabaseClient();
const testTeamRepo = createTeamRepository(mockClient);
```

## Testing

Example unit test with mocked repository:

```typescript
import { jest } from '@jest/globals';
import { createTeamRepository, type ITeamRepository } from '@/lib/repositories';

describe('TeamService', () => {
  let mockTeamRepo: jest.Mocked<ITeamRepository>;

  beforeEach(() => {
    mockTeamRepo = {
      findByTeamNumber: jest.fn(),
      upsert: jest.fn(),
      bulkUpsert: jest.fn(),
      // ... other methods
    } as jest.Mocked<ITeamRepository>;
  });

  it('should import team from TBA', async () => {
    mockTeamRepo.findByTeamNumber.mockResolvedValue(null);
    mockTeamRepo.upsert.mockResolvedValue(mockTeam);

    const service = new TeamService(mockTeamRepo);
    const result = await service.importFromTBA(930);

    expect(mockTeamRepo.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ team_number: 930 })
    );
  });
});
```

## Best Practices

1. **Always use factory functions**: `createTeamRepository()` instead of `new TeamRepository()`
2. **Handle errors gracefully**: Catch and handle repository errors appropriately
3. **Use transactions**: For bulk operations that should be atomic
4. **Validate inputs**: Check required fields before database operations
5. **Log operations**: Include context in error logs for debugging
6. **Use merge strategies**: When importing from TBA, always use merge strategies

## Next Steps (Phase 3)

The Service layer will be built on top of these repositories:

- `TBAImportService` - Orchestrates TBA imports using repositories
- `EventService` - Business logic for event management
- `MatchService` - Business logic for match operations
- `ScoutingService` - Business logic for scouting operations

Each service will depend on repository interfaces, not implementations, following the Dependency Inversion Principle.
