# Infrastructure Layer

This layer contains the concrete implementations of the port interfaces defined in the core layer. It handles all external dependencies like IndexedDB, network requests, and browser APIs.

## Architecture

The infrastructure layer implements the **Hexagonal Architecture (Ports & Adapters)** pattern:

- **Core Layer** defines interfaces (ports)
- **Infrastructure Layer** implements those interfaces (adapters)
- Dependencies point inward (infrastructure → core, never core → infrastructure)

## Directory Structure

```
infrastructure/
├── offline/
│   ├── indexeddb/          # IndexedDB persistence
│   │   ├── database.ts     # Database connection management
│   │   ├── submission-repository.ts  # Repository implementation
│   │   └── migrations.ts   # Schema migrations
│   ├── sync/               # Background synchronization
│   │   ├── background-sync.ts  # Sync coordinator
│   │   └── retry-strategy.ts   # Retry logic with exponential backoff
│   ├── events/             # Event system
│   │   └── event-emitter.ts    # Event bus implementation
│   ├── factory.ts          # Dependency injection factory
│   └── index.ts            # Public API exports
└── README.md
```

## Components

### IndexedDB

#### `IndexedDBManager`
Manages database lifecycle, connections, and schema.

**Responsibilities:**
- Opening/closing database connections
- Creating object stores and indexes
- Version management
- Storage quota monitoring

**Usage:**
```typescript
import { getDatabaseManager } from '@/infrastructure/offline';

const dbManager = getDatabaseManager({
  databaseName: 'frc-scouting-offline',
  version: 1
});

await dbManager.openDatabase();
```

#### `IndexedDBSubmissionRepository`
Implements `ISubmissionRepository` interface for persistent storage.

**Methods:**
- `save(submission)` - Saves/updates submission
- `findById(id)` - Retrieves by ID
- `findPending()` - Gets all pending submissions
- `findByStatus(status)` - Queries by status
- `findByTeam(teamNumber)` - Queries by team
- `delete(id)` - Removes submission
- `count()` - Counts total submissions
- `clear()` - Removes all submissions

**Error Handling:**
- Wraps IndexedDB errors in `DatabaseError`
- Detects quota exceeded errors
- Provides meaningful error messages

**Usage:**
```typescript
import { IndexedDBSubmissionRepository } from '@/infrastructure/offline';

const repository = new IndexedDBSubmissionRepository(dbManager);

// Save submission
await repository.save(submission);

// Find pending
const pending = await repository.findPending();
```

#### `MigrationRunner`
Handles schema changes between database versions.

**Features:**
- Sequential migration execution
- Migration validation
- Rollback support (optional)
- Error handling

**Usage:**
```typescript
import { createMigrationRunner } from '@/infrastructure/offline';

const runner = createMigrationRunner();
const result = runner.applyMigrations(db, transaction, oldVersion, newVersion);
```

### Synchronization

#### `BackgroundSyncCoordinator`
Implements `ISyncCoordinator` for syncing offline data to the server.

**Features:**
- Automatic background sync on interval
- Manual sync triggers
- Batch processing for efficiency
- Retry logic with exponential backoff
- Network error detection
- Event emission for sync status

**Methods:**
- `start()` - Starts automatic sync
- `stop()` - Stops automatic sync
- `syncPending()` - Syncs all pending submissions
- `syncOne(id)` - Syncs single submission
- `forceSync()` - Forces immediate sync

**Usage:**
```typescript
import { BackgroundSyncCoordinator } from '@/infrastructure/offline';

const syncCoordinator = new BackgroundSyncCoordinator(
  repository,
  eventBus,
  {
    apiBaseUrl: 'http://localhost:3000',
    autoSyncInterval: 30000,
    batchSize: 10
  }
);

await syncCoordinator.start();
```

#### `RetryStrategy`
Implements exponential backoff retry logic.

**Features:**
- Configurable max retries
- Exponential delay calculation
- Jitter to prevent thundering herd
- Helper to determine retryable errors

**Configuration:**
```typescript
{
  maxRetries: 5,
  initialDelayMs: 1000,      // 1 second
  maxDelayMs: 60000,         // 1 minute
  backoffMultiplier: 2,
  jitterMs: 500
}
```

**Usage:**
```typescript
import { createRetryStrategy } from '@/infrastructure/offline';

const strategy = createRetryStrategy({
  maxRetries: 3,
  initialDelayMs: 2000
});

await strategy.executeWithRetry(
  async () => {
    // Your async operation
  },
  (attempt) => {
    console.log(`Retry attempt ${attempt.attemptNumber}`);
  }
);
```

### Events

#### `EventBus`
Implements `IEventBus` for type-safe event emission.

**Features:**
- Type-safe subscriptions
- One-time listeners (`once`)
- Event history
- Promise-based waiting (`waitFor`)
- Cleanup on unsubscribe

**Usage:**
```typescript
import { getGlobalEventBus } from '@/infrastructure/offline';

const eventBus = getGlobalEventBus();

// Subscribe
const unsubscribe = eventBus.on('sync:completed', (data) => {
  console.log(`Synced ${data.successful} submissions`);
});

// Emit
eventBus.emit('sync:completed', {
  totalAttempted: 10,
  successful: 8,
  failed: 2
});

// Cleanup
unsubscribe();
```

#### `TypedEventBus`
Provides compile-time type safety for events.

**Usage:**
```typescript
import { createOfflineEventBus } from '@/infrastructure/offline';

const eventBus = createOfflineEventBus();

// TypeScript will enforce correct event names and data shapes
eventBus.on('sync:completed', (data) => {
  // data is typed as { totalAttempted: number; successful: number; failed: number }
});
```

### Factory

#### `createOfflineServices()`
Factory function that wires up all dependencies.

**Features:**
- Dependency injection
- Singleton management
- Configuration validation
- Environment-specific defaults

**Usage:**
```typescript
import { initializeOfflineServices, getDefaultConfig } from '@/infrastructure/offline';

// Initialize with default config
const services = await initializeOfflineServices(getDefaultConfig());

// Use services
await services.repository.save(submission);
await services.syncCoordinator.forceSync();
services.eventBus.emit('custom:event', {});
```

**Configuration:**
```typescript
interface OfflineConfig {
  database?: {
    name?: string;
    version?: number;
  };
  sync?: {
    apiBaseUrl: string;
    autoSyncInterval?: number;
    batchSize?: number;
    enableBackgroundSync?: boolean;
  };
  events?: {
    useGlobalBus?: boolean;
    maxHistorySize?: number;
  };
}
```

## Integration Guide

### 1. Initialize Services

```typescript
import { initializeOfflineServices } from '@/infrastructure/offline';

// In your app startup (e.g., _app.tsx or layout.tsx)
const services = await initializeOfflineServices({
  sync: {
    apiBaseUrl: process.env.NEXT_PUBLIC_API_URL!,
    autoSyncInterval: 30000,
    enableBackgroundSync: true
  }
});
```

### 2. Use in Components

```typescript
import { getOfflineServices } from '@/infrastructure/offline';

function MyComponent() {
  const services = getOfflineServices();

  const handleSubmit = async (data) => {
    const submission = Submission.create({
      type: 'match',
      teamNumber: 930,
      eventCode: 'CAFR',
      scouterId: 'user-123',
      data: formData
    });

    await services.repository.save(submission);

    // Trigger immediate sync
    await services.syncCoordinator.forceSync();
  };

  return <form onSubmit={handleSubmit}>...</form>;
}
```

### 3. Listen to Events

```typescript
import { getOfflineServices } from '@/infrastructure/offline';

function SyncStatusComponent() {
  const [status, setStatus] = useState('idle');
  const services = getOfflineServices();

  useEffect(() => {
    const unsubscribe = services.eventBus.on('sync:completed', (data) => {
      setStatus(`Synced ${data.successful}/${data.totalAttempted}`);
    });

    return unsubscribe;
  }, []);

  return <div>Status: {status}</div>;
}
```

### 4. Cleanup on Unmount

```typescript
import { shutdownOfflineServices } from '@/infrastructure/offline';

// In your app cleanup (e.g., component unmount or route change)
await shutdownOfflineServices();
```

## Testing

### Mock Services

```typescript
import { createTestOfflineServices } from '@/infrastructure/offline';

describe('MyComponent', () => {
  let services;

  beforeEach(() => {
    services = createTestOfflineServices({
      repository: mockRepository,
      syncCoordinator: mockSyncCoordinator
    });
  });

  it('should save submission', async () => {
    // Test with mocked services
  });
});
```

### In-Memory Repository Mock

```typescript
class MockSubmissionRepository implements ISubmissionRepository {
  private submissions = new Map<string, Submission>();

  async save(submission: Submission): Promise<void> {
    this.submissions.set(submission.id, submission);
  }

  async findById(id: string): Promise<Submission | null> {
    return this.submissions.get(id) || null;
  }

  // ... implement other methods
}
```

## Error Handling

All infrastructure components wrap errors in domain-specific error types:

- **DatabaseError** - IndexedDB operations
- **SyncError** - Network/API operations

**Example:**
```typescript
import { DatabaseError, ErrorCode } from '@/core/domain/errors';

try {
  await repository.save(submission);
} catch (error) {
  if (error instanceof DatabaseError) {
    if (error.code === ErrorCode.QUOTA_EXCEEDED) {
      // Handle storage quota
      showStorageWarning();
    } else {
      // Handle other database errors
      logError(error);
    }
  }
}
```

## Performance Considerations

### IndexedDB
- **Indexes** are created on frequently queried fields (status, type, team)
- **Compound indexes** for complex queries (status + type)
- **Batch operations** minimize transaction overhead

### Sync
- **Batching** - Processes multiple submissions per transaction
- **Concurrency** - Syncs up to 3 submissions in parallel
- **Throttling** - Respects server rate limits

### Storage
- **Quota monitoring** - Warns at 90% usage
- **Cleanup** - Old synced submissions can be purged
- **Compression** - Consider compressing large JSONB data

## Browser Compatibility

- **IndexedDB**: All modern browsers (IE 10+)
- **Promises**: Polyfill required for IE
- **Fetch API**: Polyfill required for IE

## Security

### Data Storage
- IndexedDB data is origin-scoped (same-origin policy)
- Data persists until explicitly cleared
- No encryption at rest (browser limitation)

### Network
- HTTPS recommended for production
- Authentication tokens should be stored securely
- Validate all server responses

## Debugging

### Enable Logging

```typescript
// In browser console
localStorage.setItem('debug', 'offline:*');
```

### Inspect IndexedDB

1. Open Chrome DevTools
2. Go to Application tab
3. Expand IndexedDB
4. View stores and data

### Monitor Events

```typescript
const eventBus = getGlobalEventBus();

// Log all events
eventBus.on('*', (data) => {
  console.log('Event:', data);
});

// View event history
console.log(eventBus.getHistory());
```

## Migration Guide

When updating database schema:

1. Create new migration in `migrations.ts`
2. Increment database version in config
3. Test migration with existing data
4. Deploy with version bump

**Example:**
```typescript
{
  version: 2,
  description: 'Add scouterId index',
  up: (db, transaction) => {
    const store = transaction.objectStore('submissions');
    store.createIndex('by-scouter', 'scouterId', { unique: false });
  }
}
```

## Future Enhancements

- [ ] Service Worker integration for true background sync
- [ ] Conflict resolution for concurrent edits
- [ ] Data compression for large submissions
- [ ] Partial sync for large datasets
- [ ] Offline-first API client
- [ ] Optimistic updates with rollback
- [ ] Encryption at rest option

## Resources

- [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Background Sync API](https://developer.mozilla.org/en-US/docs/Web/API/Background_Synchronization_API)
- [Hexagonal Architecture](https://alistair.cockburn.us/hexagonal-architecture/)
- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)