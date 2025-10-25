# Phase 3: Service Layer - Quick Start Guide

## Overview

Phase 3 will build the Service layer on top of the completed Repository layer. Services contain business logic, orchestrate multiple repositories, and provide a clean API for the presentation layer.

## Prerequisites (Complete ✅)

- ✅ Phase 1: TBA API Client and Database Schema
- ✅ Phase 2: Repository Layer with Merge Strategies

## Architecture

```
┌─────────────────────────────────────────────────────┐
│  Presentation Layer (UI Components, API Routes)     │
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────┐
│  Service Layer (Business Logic) ← PHASE 3           │
│  - TBAImportService                                 │
│  - EventService                                     │
│  - MatchService                                     │
│  - ScoutingService                                  │
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────┐
│  Repository Layer (Data Access) ← PHASE 2 ✅        │
│  - ImportJobRepository                              │
│  - TeamRepository                                   │
│  - MatchRepository                                  │
│  - EventRepository                                  │
│  - ScoutingDataRepository                           │
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────┐
│  Database (Supabase PostgreSQL)                     │
└─────────────────────────────────────────────────────┘
```

## Services to Implement

### 1. TBAImportService (Priority 1)

**Purpose**: Orchestrate imports from The Blue Alliance

**File**: `src/lib/services/tba-import.service.ts`

**Dependencies**:
- `IImportJobRepository`
- `ITeamRepository`
- `IMatchRepository`
- `IEventRepository`
- `TBAClient` (from Phase 1)
- `MergeStrategies` (from Phase 2)

**Key Methods**:
```typescript
interface ITBAImportService {
  // Import entire event (teams + matches)
  importEventFull(eventKey: string, options?: ImportOptions): Promise<ImportResult>;

  // Import only teams
  importEventTeams(eventKey: string): Promise<ImportResult>;

  // Import only matches
  importEventMatches(eventKey: string): Promise<ImportResult>;

  // Update match results only
  updateMatchResults(eventKey: string): Promise<ImportResult>;

  // Get import job status
  getImportStatus(jobId: string): Promise<ImportJobWithMetadata>;

  // Cancel running job
  cancelImport(jobId: string): Promise<void>;
}
```

**Implementation Pattern**:
```typescript
export class TBAImportService implements ITBAImportService {
  constructor(
    private importJobRepo: IImportJobRepository,
    private teamRepo: ITeamRepository,
    private matchRepo: IMatchRepository,
    private eventRepo: IEventRepository,
    private tbaClient: TBAClient
  ) {}

  async importEventFull(eventKey: string, options?: ImportOptions): Promise<ImportResult> {
    // 1. Create import job
    const job = await this.importJobRepo.create({
      event_key: eventKey,
      job_type: 'full',
    });

    try {
      // 2. Fetch data from TBA
      const [tbaEvent, tbaTeams, tbaMatches] = await Promise.all([
        this.tbaClient.getEvent(eventKey),
        this.tbaClient.getEventTeams(eventKey),
        this.tbaClient.getEventMatches(eventKey),
      ]);

      const totalItems = 1 + tbaTeams.length + tbaMatches.length;
      await this.importJobRepo.updateProgress(job.job_id, {
        total_items: totalItems,
        processed_items: 0,
        progress_percent: 0,
        status: 'processing',
      });

      // 3. Import event
      const event = await this.importEvent(tbaEvent);
      await this.updateJobProgress(job.job_id, 1, totalItems);

      // 4. Import teams
      const teams = await this.importTeams(tbaTeams, job.job_id, 1, totalItems);

      // 5. Import matches
      const matches = await this.importMatches(
        tbaMatches,
        job.job_id,
        1 + tbaTeams.length,
        totalItems
      );

      // 6. Mark complete
      await this.importJobRepo.markCompleted(job.job_id);

      return {
        success: true,
        job_id: job.job_id,
        items_imported: totalItems,
        errors: [],
        warnings: [],
      };
    } catch (error) {
      await this.importJobRepo.markFailed(job.job_id, error.message);
      throw error;
    }
  }

  private async importEvent(tbaEvent: TBAEvent): Promise<Event> {
    const localEvent = await this.eventRepo.findByEventKey(tbaEvent.key);
    const mergedEvent = MergeStrategies.event.merge(localEvent, tbaEvent);
    return await this.eventRepo.upsert(mergedEvent);
  }

  private async importTeams(
    tbaTeams: TBATeam[],
    jobId: string,
    startIndex: number,
    totalItems: number
  ): Promise<Team[]> {
    // Merge all teams
    const mergedTeams = await Promise.all(
      tbaTeams.map(async (tbaTeam, index) => {
        const localTeam = await this.teamRepo.findByTeamNumber(tbaTeam.team_number);
        const merged = MergeStrategies.team.merge(localTeam, tbaTeam);

        // Update progress
        const processed = startIndex + index + 1;
        const progress = Math.round((processed / totalItems) * 100);
        await this.importJobRepo.updateProgress(jobId, {
          processed_items: processed,
          total_items: totalItems,
          progress_percent: progress,
        });

        return merged;
      })
    );

    // Bulk upsert
    return await this.teamRepo.bulkUpsert(mergedTeams);
  }

  // Similar pattern for importMatches...
}
```

### 2. EventService (Priority 2)

**Purpose**: Business logic for event management

**File**: `src/lib/services/event.service.ts`

**Dependencies**:
- `IEventRepository`
- `ITeamRepository`
- `IMatchRepository`
- `IScoutingDataRepository`

**Key Methods**:
```typescript
interface IEventService {
  // Get event details
  getEventDetails(eventKey: string): Promise<EventDetails>;

  // Get event teams
  getEventTeams(eventKey: string): Promise<Team[]>;

  // Get event matches
  getEventMatches(eventKey: string, options?: MatchQueryOptions): Promise<MatchSchedule[]>;

  // Get scouting statistics
  getScoutingStats(eventKey: string): Promise<EventScoutingStats>;

  // Get event by year
  getEventsByYear(year: number): Promise<Event[]>;
}

interface EventDetails extends Event {
  team_count: number;
  match_count: number;
  scouting_coverage: number; // Percentage
}

interface EventScoutingStats {
  total_matches: number;
  total_positions: number; // matches * 6
  scouted_positions: number;
  coverage_percent: number;
  match_scouting_count: number;
  pit_scouting_count: number;
  coverage_by_match: ScoutingCoverageByMatch;
}
```

### 3. MatchService (Priority 3)

**Purpose**: Match scheduling and scouting assignment

**File**: `src/lib/services/match.service.ts`

**Dependencies**:
- `IMatchRepository`
- `IScoutingDataRepository`

**Key Methods**:
```typescript
interface IMatchService {
  // Get match details
  getMatchDetails(matchKey: string): Promise<MatchDetails>;

  // Get matches for a team
  getTeamMatches(eventKey: string, teamNumber: number): Promise<MatchSchedule[]>;

  // Get upcoming matches
  getUpcomingMatches(eventKey: string, limit?: number): Promise<MatchSchedule[]>;

  // Get match scouting status
  getMatchScoutingStatus(matchKey: string): Promise<MatchScoutingStatus>;
}

interface MatchDetails extends MatchSchedule {
  scouting_entries: MatchScouting[];
  scouted_teams: number[];
  missing_teams: number[];
}

interface MatchScoutingStatus {
  match: MatchSchedule;
  positions: {
    red_1: ScoutingPosition;
    red_2: ScoutingPosition;
    red_3: ScoutingPosition;
    blue_1: ScoutingPosition;
    blue_2: ScoutingPosition;
    blue_3: ScoutingPosition;
  };
}

interface ScoutingPosition {
  team_number: number;
  scouted: boolean;
  scouting_entries: number; // Could be multiple scouts
}
```

### 4. ScoutingService (Priority 4)

**Purpose**: Scouting data management and validation

**File**: `src/lib/services/scouting.service.ts`

**Dependencies**:
- `IScoutingDataRepository`
- Validation functions from Phase 2

**Key Methods**:
```typescript
interface IScoutingService {
  // Get scouting data for a team at an event
  getTeamScouting(eventKey: string, teamNumber: number): Promise<TeamScoutingData>;

  // Get scouting coverage report
  getCoverageReport(eventKey: string): Promise<CoverageReport>;

  // Validate scouting data before submission
  validateMatchScouting(data: any, year: number): Promise<ValidationResult>;

  // Get pit scouting status
  getPitScoutingStatus(eventKey: string): Promise<PitScoutingStatus>;
}

interface TeamScoutingData {
  team: Team;
  match_scouting: MatchScouting[];
  pit_scouting: PitScouting[];
  average_performance: {
    auto_points: number;
    teleop_points: number;
    endgame_points: number;
    total_points: number;
  };
}

interface CoverageReport {
  event_key: string;
  total_matches: number;
  total_teams: number;
  match_scouting: {
    total_positions: number;
    scouted_positions: number;
    coverage_percent: number;
    by_match: ScoutingCoverageByMatch;
  };
  pit_scouting: {
    total_teams: number;
    scouted_teams: number;
    coverage_percent: number;
  };
}
```

## Implementation Steps

### Step 1: Create Service Directory
```bash
mkdir -p src/lib/services
```

### Step 2: Implement TBAImportService First
This is the highest priority for the Event Detail Screen.

**Why First?**
- Enables TBA import functionality
- Uses all repositories
- Exercises merge strategies
- Provides foundation for other services

### Step 3: Add Error Handling
Create custom service errors:
```typescript
// src/lib/services/errors.ts
export class ServiceError extends Error {
  constructor(message: string, public code?: string, public details?: any) {
    super(message);
    this.name = 'ServiceError';
  }
}

export class ImportFailedError extends ServiceError {
  constructor(message: string, details?: any) {
    super(message, 'IMPORT_FAILED', details);
    this.name = 'ImportFailedError';
  }
}

export class EventNotFoundError extends ServiceError {
  constructor(eventKey: string) {
    super(`Event ${eventKey} not found`, 'EVENT_NOT_FOUND', { eventKey });
    this.name = 'EventNotFoundError';
  }
}
```

### Step 4: Add Service Factories
```typescript
// src/lib/services/index.ts
export function createTBAImportService(): TBAImportService {
  return new TBAImportService(
    createImportJobRepository(),
    createTeamRepository(),
    createMatchRepository(),
    createEventRepository(),
    createTBAClient()
  );
}

export function createEventService(): EventService {
  return new EventService(
    createEventRepository(),
    createTeamRepository(),
    createMatchRepository(),
    createScoutingDataRepository()
  );
}
```

### Step 5: Create API Routes
Once services are implemented, create API routes:

**`src/app/api/import/route.ts`**:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createTBAImportService } from '@/lib/services';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { event_key, job_type } = body;

    const importService = createTBAImportService();

    if (job_type === 'full') {
      const result = await importService.importEventFull(event_key);
      return NextResponse.json(result);
    }

    // Handle other job types...
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

### Step 6: Build UI Components
Create React components that use the services via API routes:

**`src/components/events/ImportButton.tsx`**:
```typescript
export function ImportButton({ eventKey }: { eventKey: string }) {
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleImport = async () => {
    setImporting(true);

    const response = await fetch('/api/import', {
      method: 'POST',
      body: JSON.stringify({ event_key: eventKey, job_type: 'full' }),
    });

    const result = await response.json();

    // Poll for progress...
    const jobId = result.job_id;
    const interval = setInterval(async () => {
      const statusRes = await fetch(`/api/import/${jobId}`);
      const status = await statusRes.json();
      setProgress(status.progress_percent);

      if (status.status === 'completed') {
        clearInterval(interval);
        setImporting(false);
      }
    }, 1000);
  };

  return (
    <button onClick={handleImport} disabled={importing}>
      {importing ? `Importing... ${progress}%` : 'Import from TBA'}
    </button>
  );
}
```

## Testing Strategy

### Unit Tests
```typescript
// src/lib/services/__tests__/tba-import.service.test.ts
import { jest } from '@jest/globals';
import { TBAImportService } from '../tba-import.service';

describe('TBAImportService', () => {
  let service: TBAImportService;
  let mockImportJobRepo: jest.Mocked<IImportJobRepository>;
  let mockTeamRepo: jest.Mocked<ITeamRepository>;
  // ... other mocks

  beforeEach(() => {
    mockImportJobRepo = {
      create: jest.fn(),
      markCompleted: jest.fn(),
      // ... other methods
    };

    service = new TBAImportService(
      mockImportJobRepo,
      mockTeamRepo,
      mockMatchRepo,
      mockEventRepo,
      mockTBAClient
    );
  });

  it('should create import job on start', async () => {
    mockImportJobRepo.create.mockResolvedValue(mockJob);

    await service.importEventFull('2025txaus');

    expect(mockImportJobRepo.create).toHaveBeenCalledWith({
      event_key: '2025txaus',
      job_type: 'full',
    });
  });

  it('should mark job as failed on error', async () => {
    mockTBAClient.getEvent.mockRejectedValue(new Error('API error'));

    await expect(service.importEventFull('2025txaus')).rejects.toThrow();

    expect(mockImportJobRepo.markFailed).toHaveBeenCalled();
  });
});
```

### Integration Tests
```typescript
// Test with real Supabase test database
describe('TBAImportService Integration', () => {
  let service: TBAImportService;
  let testDB: SupabaseClient; // Test database

  beforeEach(async () => {
    testDB = createTestDatabase();
    service = createTBAImportService(testDB);
    await seedTestData(testDB);
  });

  afterEach(async () => {
    await cleanupTestData(testDB);
  });

  it('should import full event', async () => {
    const result = await service.importEventFull('2025txaus');

    expect(result.success).toBe(true);
    expect(result.items_imported).toBeGreaterThan(0);

    // Verify data in database
    const teams = await testDB.from('teams').select('*');
    expect(teams.data.length).toBeGreaterThan(0);
  });
});
```

## Performance Considerations

### Batch Processing
```typescript
// Import in batches to avoid memory issues
const BATCH_SIZE = 50;

for (let i = 0; i < tbaTeams.length; i += BATCH_SIZE) {
  const batch = tbaTeams.slice(i, i + BATCH_SIZE);
  await this.teamRepo.bulkUpsert(batch);
}
```

### Progress Updates
```typescript
// Update progress every 10 items to reduce database calls
if ((index + 1) % 10 === 0) {
  await this.updateProgress(jobId, index + 1, total);
}
```

### Concurrent Imports
```typescript
// Prevent concurrent imports for same event
const existingJobs = await this.importJobRepo.findByEventKey(eventKey);
const hasRunningJob = existingJobs.some(j =>
  j.status === 'pending' || j.status === 'processing'
);

if (hasRunningJob) {
  throw new ImportFailedError('Import already in progress for this event');
}
```

## Files to Create

| File | Purpose | LOC (est) |
|------|---------|-----------|
| `services/errors.ts` | Custom service errors | 50 |
| `services/tba-import.service.ts` | TBA import orchestration | 400 |
| `services/event.service.ts` | Event business logic | 250 |
| `services/match.service.ts` | Match business logic | 200 |
| `services/scouting.service.ts` | Scouting data logic | 200 |
| `services/index.ts` | Service exports | 50 |
| `app/api/import/route.ts` | Import API endpoint | 100 |
| `app/api/import/[jobId]/route.ts` | Job status endpoint | 50 |
| `app/api/events/[eventKey]/route.ts` | Event details API | 100 |
| **Total** | | **~1,400** |

## Success Criteria

Phase 3 is complete when:
- ✅ All 4 services are implemented
- ✅ Services use repositories via interfaces
- ✅ Unit tests cover all services (80%+ coverage)
- ✅ Integration tests verify end-to-end flow
- ✅ API routes expose service functionality
- ✅ Error handling is comprehensive
- ✅ Documentation includes usage examples

## Timeline Estimate

- **Week 1**: TBAImportService + unit tests
- **Week 2**: EventService + MatchService + unit tests
- **Week 3**: ScoutingService + integration tests
- **Week 4**: API routes + UI integration

## Questions to Resolve

1. **Background Processing**: Run imports in background worker or inline?
2. **Job Queue**: Use database polling or external queue (BullMQ)?
3. **Real-time Updates**: WebSocket, Server-Sent Events, or polling?
4. **Retry Logic**: How many retries for TBA API failures?
5. **Transaction Scope**: Should full import be one transaction?

## Resources

- [Phase 2 Repository Documentation](src/lib/repositories/README.md)
- [Phase 2 Strategy Documentation](src/lib/strategies/README.md)
- [TBA API Documentation](https://www.thebluealliance.com/apidocs/v3)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)

---

**Ready to start Phase 3?** Begin with implementing `TBAImportService` and build from there!
