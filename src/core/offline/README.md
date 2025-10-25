# Core Offline Module - Clean Architecture Implementation

This module implements the core business logic for the offline-first submission queue using **Clean Architecture** and **SOLID principles**.

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Application Layer                       │
│  (React Components, UI State Management, Event Handlers)   │
└─────────────────────┬───────────────────────────────────────┘
                      │ depends on
┌─────────────────────▼───────────────────────────────────────┐
│                   Services Layer                            │
│  • SubmissionService (queue management)                     │
│  • SyncService (background sync)                            │
└─────────────────────┬───────────────────────────────────────┘
                      │ depends on (interfaces only!)
┌─────────────────────▼───────────────────────────────────────┐
│                    Ports Layer                              │
│  • ISubmissionRepository (storage contract)                 │
│  • ISyncCoordinator (sync contract)                         │
│  • IEventBus (event contract)                               │
└─────────────────────┬───────────────────────────────────────┘
                      │ implements
┌─────────────────────▼───────────────────────────────────────┐
│                Infrastructure Layer                         │
│  • IndexedDBRepository (storage implementation)             │
│  • HttpSyncCoordinator (sync implementation)                │
│  • InMemoryEventBus (event implementation)                  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                     Domain Layer                            │
│  • Submission Entity (business logic)                       │
│  • SubmissionId Value Object                                │
│  • Result<T, E> (functional error handling)                 │
│  • Domain Errors (typed error hierarchy)                    │
└─────────────────────────────────────────────────────────────┘
```

## 📁 Directory Structure

```
src/core/offline/
├── domain/                 # Domain layer - pure business logic
│   ├── submission.ts       # Submission entity and value objects
│   ├── result.ts          # Result type for functional error handling
│   └── errors.ts          # Domain error types
│
├── ports/                 # Port interfaces (dependency inversion)
│   ├── submission-repository.ts  # Storage port
│   ├── sync-coordinator.ts       # Sync port
│   └── event-bus.ts             # Event port
│
├── services/              # Application services (business logic orchestration)
│   ├── submission-service.ts    # Queue management service
│   └── sync-service.ts          # Sync orchestration service
│
├── infrastructure/        # Infrastructure adapters (to be implemented)
│   ├── indexeddb-repository.ts  # IndexedDB adapter
│   ├── http-sync-coordinator.ts # HTTP sync adapter
│   └── in-memory-event-bus.ts   # Event bus implementation
│
└── index.ts              # Public API exports
```

## 🎯 Key Principles

### 1. **Dependency Inversion Principle (DIP)**

Services depend on **interfaces** (ports), not concrete implementations:

```typescript
// ✅ Good: Service depends on interface
class SubmissionService {
  constructor(
    private repository: ISubmissionRepository,  // Interface, not IndexedDB!
    private syncCoordinator: ISyncCoordinator,  // Interface, not HTTP!
    private eventBus: IEventBus                 // Interface, not InMemory!
  ) {}
}

// ✅ Good: Infrastructure implements interface
class IndexedDBRepository implements ISubmissionRepository {
  // Concrete implementation
}
```

### 2. **Single Responsibility Principle (SRP)**

Each class has one reason to change:

- **Submission**: Manages submission state and behavior
- **SubmissionService**: Orchestrates queue operations
- **SyncService**: Orchestrates sync operations
- **Repository**: Handles storage persistence
- **SyncCoordinator**: Handles network communication

### 3. **Open/Closed Principle (OCP)**

Open for extension, closed for modification:

```typescript
// Want to switch from IndexedDB to SQLite? Just create a new adapter!
class SQLiteRepository implements ISubmissionRepository {
  // New implementation without changing services
}

// Want to add event analytics? Just subscribe to events!
eventBus.subscribe('submission.queued', (event) => {
  analytics.track('submission_queued', event);
});
```

### 4. **Functional Error Handling**

Use `Result<T, E>` instead of throwing exceptions:

```typescript
// ❌ Bad: Throwing exceptions
async function queueSubmission(data: SubmissionData): Promise<SubmissionId> {
  if (queueFull) throw new Error('Queue full');
  return submissionId;
}

// ✅ Good: Result type
async function queueSubmission(data: SubmissionData): Promise<Result<SubmissionId, OfflineError>> {
  if (queueFull) return err(new QueueFullError(current, max));
  return ok(submissionId);
}
```

## 🚀 Usage Examples

### Creating the Application

```typescript
import {
  SubmissionService,
  SyncService,
} from '@/core/offline';

// Infrastructure implementations (adapters)
import { IndexedDBRepository } from '@/core/offline/infrastructure/indexeddb-repository';
import { HttpSyncCoordinator } from '@/core/offline/infrastructure/http-sync-coordinator';
import { InMemoryEventBus } from '@/core/offline/infrastructure/in-memory-event-bus';

// Create infrastructure instances
const repository = new IndexedDBRepository();
const syncCoordinator = new HttpSyncCoordinator({
  maxRetries: 5,
  baseDelayMs: 1000,
  maxDelayMs: 60000,
});
const eventBus = new InMemoryEventBus();

// Create services (dependency injection)
const submissionService = new SubmissionService(
  repository,
  syncCoordinator,
  eventBus,
  { maxQueueSize: 1000 }
);

const syncService = new SyncService(
  repository,
  syncCoordinator,
  eventBus,
  { periodicSyncIntervalMs: 30000 }
);

// Start periodic sync
syncService.startPeriodicSync();
```

### Queueing a Submission

```typescript
import { ok, err, type Result } from '@/core/offline';

async function submitMatchScouting(matchData: MatchScoutingData) {
  const result = await submissionService.queueSubmission({
    url: '/api/scouting',
    method: 'POST',
    body: matchData,
    headers: { 'Content-Type': 'application/json' },
  });

  // Functional error handling with pattern matching
  return result.match({
    ok: (submissionId) => {
      console.log('Queued submission:', submissionId.value);
      return submissionId;
    },
    err: (error) => {
      console.error('Failed to queue:', error.message);
      throw error;
    },
  });
}
```

### Subscribing to Events

```typescript
// Listen for sync events
eventBus.subscribe('sync.completed', (event) => {
  console.log(`Sync completed: ${event.succeeded} succeeded, ${event.failed} failed`);
  updateUI(event);
});

// Listen for submission success
eventBus.subscribe('submission.success', (event) => {
  toast.success(`Submission ${event.submissionId} synced!`);
});

// Listen for submission failure
eventBus.subscribe('submission.failed', (event) => {
  if (event.willRetry) {
    toast.warning(`Submission failed, will retry (attempt ${event.attempt})`);
  } else {
    toast.error(`Submission permanently failed: ${event.error}`);
  }
});
```

### Getting Queue State

```typescript
async function displayQueue() {
  const result = await submissionService.getQueue();

  if (result.isErr) {
    console.error('Failed to get queue:', result.error);
    return;
  }

  const queue = result.value;
  console.log(`Queue: ${queue.pending} pending, ${queue.failed} failed`);

  // Display submissions
  queue.submissions.forEach((submission) => {
    console.log(`- ${submission.id}: ${submission.status}`);
  });
}
```

### Manual Retry

```typescript
import { SubmissionId } from '@/core/offline';

async function retryFailedSubmission(submissionIdString: string) {
  const submissionId = SubmissionId.fromString(submissionIdString);

  const result = await submissionService.retrySubmission(submissionId);

  if (result.isErr) {
    toast.error(`Retry failed: ${result.error.message}`);
    return;
  }

  toast.success('Submission queued for retry');
}
```

## 🧪 Testing

The clean architecture makes testing easy:

```typescript
import { SubmissionService } from '@/core/offline';
import { MockRepository } from '@/core/offline/__mocks__/mock-repository';
import { MockSyncCoordinator } from '@/core/offline/__mocks__/mock-sync-coordinator';
import { MockEventBus } from '@/core/offline/__mocks__/mock-event-bus';

describe('SubmissionService', () => {
  it('should queue a submission', async () => {
    // Create mocks (no real database/network!)
    const repository = new MockRepository();
    const syncCoordinator = new MockSyncCoordinator();
    const eventBus = new MockEventBus();

    // Create service with mocks
    const service = new SubmissionService(repository, syncCoordinator, eventBus);

    // Test
    const result = await service.queueSubmission({
      url: '/api/test',
      method: 'POST',
      body: { test: true },
    });

    expect(result.isOk).toBe(true);
    expect(repository.saved).toHaveLength(1);
    expect(eventBus.events).toContainEqual(
      expect.objectContaining({ type: 'submission.queued' })
    );
  });
});
```

## 🔌 Implementing Adapters

When implementing infrastructure adapters, follow the port interface:

```typescript
// Example: IndexedDB Repository Adapter
export class IndexedDBRepository implements ISubmissionRepository {
  async save(submission: Submission): Promise<Result<void, RepositoryError>> {
    try {
      const db = await this.openDB();
      const tx = db.transaction(['submissions'], 'readwrite');
      const store = tx.objectStore('submissions');

      await new Promise((resolve, reject) => {
        const request = store.add(submission.toObject());
        request.onsuccess = () => resolve(undefined);
        request.onerror = () => reject(request.error);
      });

      return ok(undefined);
    } catch (error) {
      return err(new RepositoryError('Failed to save submission', error));
    }
  }

  // ... implement all other methods
}
```

## 📚 Further Reading

- [Clean Architecture by Robert C. Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Hexagonal Architecture](https://alistair.cockburn.us/hexagonal-architecture/)
- [SOLID Principles](https://en.wikipedia.org/wiki/SOLID)
- [Railway Oriented Programming](https://fsharpforfunandprofit.com/rop/)

## 🤝 Contributing

When adding new features:

1. **Add domain logic** to entities (if needed)
2. **Define port interfaces** for new dependencies
3. **Implement services** using dependency injection
4. **Create infrastructure adapters** separately
5. **Emit events** for state changes
6. **Write tests** using mocks
