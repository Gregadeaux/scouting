# Offline Domain Layer

This directory contains the **pure domain logic** for the offline-first architecture. All code here follows clean architecture principles with **no external dependencies** - only pure TypeScript and domain business rules.

## Architecture Overview

The domain layer is the **heart of the offline system**, implementing:

- **Entities**: Core business objects (Submission)
- **Value Objects**: Immutable types with validation (SubmissionId, TeamNumber)
- **Domain Events**: State transitions and status changes (SyncStatus)
- **Business Rules**: Validation, retry logic, state machines
- **Error Handling**: Comprehensive error hierarchy with Result types

## Files

### `types.ts` - Core Domain Types

Foundational types used throughout the offline system.

**Key Exports:**

```typescript
// Branded types for type safety
type SubmissionId = string & { readonly __brand: 'SubmissionId' };
type TeamNumber = number & { readonly __brand: 'TeamNumber' };

// Domain enums
enum Priority { LOW = 0, NORMAL = 1, HIGH = 2, CRITICAL = 3 }
type ScoutingType = 'match' | 'pit' | 'super';

// Configuration
interface OfflineConfig {
  maxRetries: number;
  baseRetryDelay: number;
  exponentialBackoff: boolean;
  // ... more config options
}

// Result type for functional error handling
type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };
```

**Usage Example:**

```typescript
import { createSubmissionId, createTeamNumber, Result } from './types';

// Create validated IDs
const id = createSubmissionId('sub_12345'); // throws if invalid
const team = createTeamNumber(930); // throws if < 1 or > 99999

// Functional error handling
function divide(a: number, b: number): Result<number, string> {
  if (b === 0) {
    return Result.err('Division by zero');
  }
  return Result.ok(a / b);
}

const result = divide(10, 2);
if (result.ok) {
  console.log(result.value); // 5
} else {
  console.error(result.error);
}
```

---

### `errors.ts` - Error Hierarchy

Comprehensive error types for different failure modes.

**Error Hierarchy:**

```
OfflineError (base)
├── QueueError
│   ├── QueueFullError
│   └── ItemNotFoundError
├── SyncError
│   ├── ServerRejectionError
│   └── SyncTimeoutError
├── NetworkError
│   ├── DeviceOfflineError
│   └── NetworkRequestError
├── ValidationError
│   ├── SchemaValidationError
│   └── MissingFieldError
├── DatabaseError
│   ├── IndexedDBError
│   └── StorageQuotaError
├── MaxRetriesExceededError
└── OperationCancelledError
```

**Key Features:**

- **Structured Context**: All errors include context data
- **Recoverable Flag**: Determines if retry is possible
- **Serialization**: Errors can be JSON serialized for storage
- **Type Guards**: Helper functions for error type checking

**Usage Example:**

```typescript
import {
  NetworkError,
  isRecoverableError,
  toOfflineError
} from './errors';

try {
  await syncData();
} catch (error) {
  const offlineError = toOfflineError(error);

  if (isRecoverableError(offlineError)) {
    // Can retry this operation
    scheduleRetry();
  } else {
    // Permanent failure - log and notify user
    logError(offlineError);
  }
}
```

---

### `sync-status.ts` - Status State Machine

Discriminated union type representing submission sync states.

**State Machine:**

```
┌─────────┐
│ PENDING │ ─────┐
└─────────┘      │
                 ↓
            ┌─────────┐
            │ SYNCING │
            └─────────┘
                 │
        ┌────────┴────────┐
        ↓                 ↓
    ┌─────────┐      ┌────────┐
    │ SUCCESS │      │ FAILED │
    └─────────┘      └────────┘
                          │
                          ↓ (if canRetry)
                     Back to PENDING
```

**Status Types:**

```typescript
type SyncStatus =
  | { type: 'pending'; queuedAt: Date }
  | { type: 'syncing'; startedAt: Date; attempt: number }
  | { type: 'success'; completedAt: Date; response?: Record<string, unknown> }
  | { type: 'failed'; failedAt: Date; error: OfflineError; canRetry: boolean; nextRetryAt?: Date };
```

**Usage Example:**

```typescript
import {
  SyncStatus,
  isPending,
  canStartSync,
  startSync,
  calculateNextRetryTime
} from './sync-status';

// Create initial status
let status = SyncStatus.pending();

// Check if can sync
if (canStartSync(status)) {
  // Transition to syncing
  const newStatus = startSync(status, 1); // attempt #1

  if (newStatus) {
    status = newStatus;
    // Now status.type === 'syncing'
  }
}

// Calculate retry time with exponential backoff
const nextRetry = calculateNextRetryTime(
  3, // attempt number
  1000, // base delay (1s)
  30000, // max delay (30s)
  true // use exponential backoff
);
```

---

### `submission.ts` - Core Entity

The **Submission** entity represents a queued item waiting to be synchronized.

**Design Principles:**

- **Immutability**: All properties are readonly, modifications return new instances
- **Factory Methods**: Use `Submission.create()` instead of `new Submission()`
- **Validation**: All data validated before entity creation
- **State Transitions**: Type-safe methods for status changes

**Entity Structure:**

```typescript
class Submission {
  readonly id: SubmissionId;
  readonly data: SubmissionData;
  readonly metadata: SubmissionMetadata;
  readonly syncStatus: SyncStatus;

  // Factory methods
  static create(data: SubmissionData, priority?: Priority): Result<Submission, ValidationError>
  static fromSerialized(json: SerializedSubmission): Result<Submission, ValidationError>

  // State transitions
  markAsSyncing(config: OfflineConfig): Result<Submission, OfflineError>
  markAsSuccess(response?: Record<string, unknown>): Result<Submission, OfflineError>
  markAsFailed(error: OfflineError, config: OfflineConfig): Result<Submission, OfflineError>

  // Queries
  canSyncNow(): boolean
  isTerminal(): boolean
  isSyncing(): boolean
  getAge(): number

  // Serialization
  toJSON(): SerializedSubmission
  toString(): string
}
```

**Usage Example:**

```typescript
import { Submission, Priority, createTeamNumber } from './index';

// Create a new submission
const result = Submission.create({
  type: 'match',
  teamNumber: createTeamNumber(930),
  eventKey: '2025arc',
  matchKey: '2025arc_qm1',
  data: {
    auto_performance: { /* ... */ },
    teleop_performance: { /* ... */ },
    endgame_performance: { /* ... */ }
  }
}, Priority.HIGH);

if (!result.ok) {
  console.error('Validation failed:', result.error);
  return;
}

const submission = result.value;

// Check if ready to sync
if (submission.canSyncNow()) {
  // Mark as syncing
  const syncingResult = submission.markAsSyncing({
    maxRetries: 3,
    baseRetryDelay: 1000,
    maxRetryDelay: 30000,
    exponentialBackoff: true
  });

  if (syncingResult.ok) {
    const syncingSubmission = syncingResult.value;

    try {
      // Perform sync...
      const response = await api.submit(syncingSubmission.data);

      // Mark as success
      const successResult = syncingSubmission.markAsSuccess(response);
      if (successResult.ok) {
        console.log('Synced successfully!');
      }
    } catch (error) {
      // Mark as failed
      const failedResult = syncingSubmission.markAsFailed(
        toOfflineError(error),
        config
      );

      if (failedResult.ok) {
        const failedSubmission = failedResult.value;
        // Check if can retry
        if (failedSubmission.canSyncNow()) {
          scheduleRetry(failedSubmission);
        }
      }
    }
  }
}

// Serialize for storage
const json = submission.toJSON();
localStorage.setItem(`submission-${submission.id}`, JSON.stringify(json));

// Restore from storage
const restored = Submission.fromSerialized(json);
if (restored.ok) {
  console.log('Restored:', restored.value.toString());
}
```

---

### `index.ts` - Public API

Barrel export file providing the public API for the domain layer.

**Import Examples:**

```typescript
// Import everything
import * as Domain from '@/core/offline/domain';

// Import specific items
import {
  Submission,
  SubmissionData,
  Priority,
  SyncStatus,
  OfflineError,
  Result,
  createSubmissionId,
  isPending,
  isRecoverableError
} from '@/core/offline/domain';
```

---

## Design Patterns

### 1. Immutability

All domain objects are **immutable**. Modifications return new instances:

```typescript
const submission1 = Submission.create(data);
const submission2 = submission1.updatePriority(Priority.HIGH);

// submission1 !== submission2
// submission1.metadata.priority === Priority.NORMAL
// submission2.metadata.priority === Priority.HIGH
```

### 2. Factory Methods

Use static factory methods instead of constructors:

```typescript
// ✅ Good - uses factory with validation
const result = Submission.create(data);
if (result.ok) {
  const submission = result.value;
}

// ❌ Bad - private constructor
const submission = new Submission(...); // Compilation error
```

### 3. Result Type (Railway-Oriented Programming)

Errors are values, not exceptions:

```typescript
// ✅ Good - explicit error handling
const result = Submission.create(data);
if (!result.ok) {
  handleError(result.error);
  return;
}
const submission = result.value;

// ❌ Bad - hidden error paths
try {
  const submission = Submission.create(data);
} catch (error) {
  // Which errors can be thrown? Unknown!
}
```

### 4. Discriminated Unions

Type-safe state representation:

```typescript
function handleStatus(status: SyncStatus) {
  switch (status.type) {
    case 'pending':
      console.log('Queued at', status.queuedAt);
      break;
    case 'syncing':
      console.log('Attempt', status.attempt);
      break;
    case 'success':
      console.log('Completed at', status.completedAt);
      break;
    case 'failed':
      console.log('Error:', status.error.message);
      if (status.canRetry) {
        console.log('Retry at', status.nextRetryAt);
      }
      break;
    default:
      // TypeScript ensures exhaustiveness
      const _exhaustive: never = status;
  }
}
```

### 5. Branded Types

Prevent primitive obsession:

```typescript
// ✅ Good - type-safe
const id: SubmissionId = createSubmissionId('sub_123');
const team: TeamNumber = createTeamNumber(930);

// ❌ Bad - won't compile
const id: SubmissionId = 'just-a-string'; // Error!
const team: TeamNumber = 123; // Error!

// Prevents mixing up similar types
function getSubmission(id: SubmissionId): Submission { /* ... */ }
function getTeam(num: TeamNumber): Team { /* ... */ }

// Can't accidentally pass team number as submission ID
getSubmission(team); // Compilation error!
```

---

## Testing Guidelines

The domain layer is **easy to test** because it has no external dependencies:

```typescript
import { describe, it, expect } from 'vitest';
import { Submission, Priority, createTeamNumber } from './index';

describe('Submission', () => {
  it('should create a valid submission', () => {
    const result = Submission.create({
      type: 'match',
      teamNumber: createTeamNumber(930),
      eventKey: '2025arc',
      matchKey: '2025arc_qm1',
      data: { foo: 'bar' }
    }, Priority.HIGH);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.metadata.priority).toBe(Priority.HIGH);
      expect(result.value.canSyncNow()).toBe(true);
    }
  });

  it('should reject invalid team numbers', () => {
    const result = Submission.create({
      type: 'match',
      teamNumber: createTeamNumber(-1), // Will throw before reaching here
      // ...
    });

    // createTeamNumber throws, so this test would need try/catch
  });

  it('should transition states correctly', () => {
    const createResult = Submission.create(validData);
    expect(createResult.ok).toBe(true);

    const submission = createResult.value;
    const syncingResult = submission.markAsSyncing(config);
    expect(syncingResult.ok).toBe(true);

    const syncing = syncingResult.value;
    expect(syncing.isSyncing()).toBe(true);
    expect(syncing.metadata.retryCount).toBe(1);
  });
});
```

---

## Common Patterns

### Creating a Submission

```typescript
import { Submission, Priority, createTeamNumber, Result } from './index';

const data = {
  type: 'match' as const,
  teamNumber: createTeamNumber(930),
  eventKey: '2025arc',
  matchKey: '2025arc_qm1',
  data: {
    auto_performance: { /* ... */ },
    teleop_performance: { /* ... */ },
    endgame_performance: { /* ... */ }
  }
};

const result = Submission.create(data, Priority.NORMAL);

// Always check result
if (!result.ok) {
  console.error('Validation failed:', result.error.invalidFields);
  return;
}

const submission = result.value;
```

### Handling State Transitions

```typescript
async function syncSubmission(submission: Submission, config: OfflineConfig) {
  // Transition to syncing
  const syncingResult = submission.markAsSyncing(config);
  if (!syncingResult.ok) {
    // Can't sync (maybe max retries exceeded)
    return syncingResult;
  }

  const syncing = syncingResult.value;

  try {
    const response = await api.post('/submit', syncing.data);
    return syncing.markAsSuccess(response);
  } catch (error) {
    const offlineError = toOfflineError(error);
    return syncing.markAsFailed(offlineError, config);
  }
}
```

### Checking Retry Logic

```typescript
function shouldRetryNow(submission: Submission): boolean {
  // Check if submission can be synced
  if (!submission.canSyncNow()) {
    return false;
  }

  // Check if it's failed and retryable
  if (isFailed(submission.syncStatus)) {
    if (!submission.syncStatus.canRetry) {
      return false; // Permanent failure
    }

    // Check if retry time has passed
    if (submission.syncStatus.nextRetryAt) {
      return new Date() >= submission.syncStatus.nextRetryAt;
    }
  }

  return true;
}
```

### Sorting Submissions

```typescript
import { SubmissionComparators } from './index';

const submissions: Submission[] = [ /* ... */ ];

// Sort by priority (high first), then age (old first)
submissions.sort(SubmissionComparators.byPriorityAndAge);

// Sort by event and match (chronological)
submissions.sort(SubmissionComparators.byEventAndMatch);

// Sort by retry count (fewer retries first)
submissions.sort(SubmissionComparators.byRetryCount);
```

---

## Key Principles

1. **Pure Functions**: No side effects, same input → same output
2. **Immutability**: Objects never change, modifications create new instances
3. **Type Safety**: Branded types prevent primitive obsession
4. **Explicit Errors**: Result type makes error paths visible
5. **Single Responsibility**: Each file has one clear purpose
6. **No External Dependencies**: Domain logic is framework-agnostic

---

## Next Steps

After implementing the domain layer:

1. **Infrastructure Layer** (`src/core/offline/infrastructure/`):
   - IndexedDB repository
   - LocalStorage persistence
   - Network detection

2. **Application Layer** (`src/core/offline/application/`):
   - Queue service
   - Sync orchestrator
   - Retry scheduler

3. **Presentation Layer** (`src/components/offline/`):
   - Queue status UI
   - Sync progress indicator
   - Offline indicator

---

## References

- [Clean Architecture by Robert C. Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Domain-Driven Design](https://martinfowler.com/bliki/DomainDrivenDesign.html)
- [Railway Oriented Programming](https://fsharpforfunandprofit.com/rop/)
- [Branded Types in TypeScript](https://egghead.io/blog/using-branded-types-in-typescript)
