# Offline Support

IndexedDB-based offline data synchronization for field scouting without internet connectivity.

## Overview

The offline support system enables scouts to collect match and pit scouting data even when internet is unavailable (common at FRC competitions). Data is stored locally in IndexedDB and automatically syncs when connectivity returns.

## Status

**Infrastructure**: ✅ Complete (100%)
**Integration**: ⏳ Pending (awaiting match scouting UI)

The core offline infrastructure is production-ready and tested. Final integration will happen when match scouting forms are implemented.

## Features

- ✅ **IndexedDB Wrapper** - Type-safe database operations with TypeScript
- ✅ **Offline Queue** - Automatic submission queueing when offline
- ✅ **Auto-Sync** - Background sync when connection returns
- ✅ **Conflict Resolution** - Strategies for handling duplicate submissions
- ✅ **Connection Monitoring** - Real-time online/offline detection
- ⏳ **Match Scouting Integration** - Coming with match scouting UI

## Documentation

### [Components Overview](./components.md)
**Detailed technical guide covering:**
- IndexedDB wrapper architecture
- Submission queue implementation
- Sync strategies and algorithms
- Connection state management
- Error handling and retry logic

**Use when:**
- Understanding offline architecture
- Implementing new offline features
- Debugging sync issues
- Adding offline support to new features

### [Infrastructure Status](./infrastructure.md)
**Implementation status document:**
- Completed components
- Integration points
- Testing status
- Remaining work

**Use when:**
- Checking implementation progress
- Planning offline integration
- Understanding what's built vs. what's planned

## Quick Links

### Library Code
- `/src/lib/offline/indexeddb.ts` - IndexedDB wrapper
- `/src/lib/offline/queue.ts` - Submission queue manager
- `/src/lib/offline/sync.ts` - Sync engine
- `/src/lib/offline/connection.ts` - Connection monitoring

### Types
- `/src/types/offline.ts` - Offline system types

### Hooks (Planned)
- `/src/hooks/useOfflineQueue.ts` - Queue management hook
- `/src/hooks/useConnectionStatus.ts` - Connection monitoring hook

## Architecture

### Data Flow

#### Online Submission
```
User fills form → Validate → Submit to API → Save to database → Success
```

#### Offline Submission
```
User fills form → Validate → Save to IndexedDB → Queue for sync → Show pending state
                                                        ↓
When online: → Retry submission → Save to database → Remove from queue → Success
```

### IndexedDB Schema

#### `pendingSubmissions` Store
```typescript
interface PendingSubmission {
  id: string;                    // UUID
  type: 'match' | 'pit';         // Submission type
  data: any;                     // Form data (match/pit scouting)
  timestamp: number;             // When created
  retryCount: number;            // Sync attempts
  lastError?: string;            // Last error message
}
```

#### `matchScouting` Store
```typescript
// Local cache of match scouting data
// For offline viewing and editing
```

#### `pitScouting` Store
```typescript
// Local cache of pit scouting data
// For offline viewing and editing
```

### Conflict Resolution Strategies

#### Last Write Wins
Default strategy for most data:
- Latest submission overwrites previous
- Simple and predictable
- Works for independent scouts

#### Merge Strategy
For collaborative scouting:
- Combine data from multiple scouts
- Use consolidation algorithms
- Resolve conflicts based on rules

#### User Confirmation
For critical conflicts:
- Show both versions to user
- Let user choose or merge manually
- Fallback when automatic resolution fails

## Connection Monitoring

### Online Detection
```typescript
// Checks multiple indicators:
- navigator.onLine (browser API)
- Periodic ping to server
- WebSocket connection state
```

### Offline Detection
```typescript
// Triggers on:
- navigator.onLine = false
- Ping timeout
- API request failure
```

### Network Quality
```typescript
// Monitors:
- Latency (ping time)
- Bandwidth (download speed)
- Connection stability (drops)
```

## Common Tasks

### Queue a Submission for Offline
```typescript
import { queueSubmission } from '@/lib/offline/queue';

const submission = {
  type: 'match',
  data: matchScoutingData,
};

await queueSubmission(submission);
// Automatically syncs when online
```

### Manually Trigger Sync
```typescript
import { syncPendingSubmissions } from '@/lib/offline/sync';

const result = await syncPendingSubmissions();
console.log(`Synced ${result.successful} submissions`);
```

### Check Connection Status
```typescript
import { isOnline } from '@/lib/offline/connection';

if (await isOnline()) {
  // Submit directly
} else {
  // Queue for later
}
```

### Get Pending Submissions Count
```typescript
import { getPendingCount } from '@/lib/offline/queue';

const count = await getPendingCount();
// Show badge: "3 pending uploads"
```

## Integration with Scouting Forms

### Match Scouting (Planned)
```typescript
// In match scouting form component:
const handleSubmit = async (data) => {
  if (await isOnline()) {
    // Direct submission
    await submitMatchScouting(data);
  } else {
    // Queue for offline sync
    await queueSubmission({ type: 'match', data });
    showNotification('Saved offline. Will sync when online.');
  }
};
```

### Pit Scouting
```typescript
// Similar pattern for pit scouting
// Can also save drafts locally for editing later
```

## UI Components (Planned)

### Connection Status Banner
```typescript
// Shows at top of app:
"⚠️ Offline - 3 submissions pending"
"✅ Online - All data synced"
"🔄 Syncing - 2 of 5 uploads complete"
```

### Pending Submissions List
```typescript
// Shows queued submissions:
[
  { type: 'Match 23', team: 'Team 1234', status: 'Pending' },
  { type: 'Pit Scouting', team: 'Team 5678', status: 'Uploading' },
]
```

### Sync Button
```typescript
// Manual sync trigger:
<Button onClick={handleSync}>
  Sync Now ({pendingCount})
</Button>
```

## Error Handling

### Transient Errors
Network timeouts, temporary server issues:
- **Strategy**: Retry with exponential backoff
- **Max retries**: 5
- **Backoff**: 1s, 2s, 4s, 8s, 16s

### Permanent Errors
Validation failures, data conflicts:
- **Strategy**: Mark as failed, notify user
- **Action**: Allow manual retry or discard
- **Logging**: Save error details for debugging

### Storage Quota Exceeded
IndexedDB storage full:
- **Strategy**: Purge old synced submissions
- **Fallback**: Warn user, block new submissions
- **Recovery**: Sync and clear queue

## Testing

### Manual Testing
```bash
# Test offline mode:
1. Open dev tools → Network tab
2. Select "Offline" throttling
3. Submit scouting data
4. Verify saved to IndexedDB
5. Reconnect
6. Verify auto-sync
```

### Automated Testing
(Coming soon - test suite for offline flows)

## Best Practices

### For Developers
- Always check `isOnline()` before API calls
- Queue submissions when offline
- Show clear status to users
- Handle errors gracefully
- Test offline scenarios thoroughly

### For Scouts
- Submit data regularly (don't wait until end of event)
- Check sync status before closing app
- Connect to WiFi periodically to sync
- Don't clear browser data during competition

### For Admins
- Test offline mode before competition
- Monitor sync status during event
- Have backup submission method
- Train scouts on offline workflow

## Performance Considerations

### IndexedDB Limitations
- **Storage**: ~50 MB typical, varies by browser
- **Performance**: Fast for <1000 records, slower for more
- **Cleanup**: Purge synced submissions regularly

### Sync Strategy
- **Batch Size**: Sync 10 submissions at a time
- **Concurrency**: 2 parallel uploads max
- **Throttling**: Wait 5s between batches to avoid overwhelming server

### Memory Usage
- Don't load all pending submissions at once
- Use pagination for large queues
- Clear synced data promptly

## Future Enhancements

- [ ] Progressive Web App (PWA) support
- [ ] Service Worker for background sync
- [ ] Offline asset caching (team logos, etc.)
- [ ] Conflict resolution UI
- [ ] Export/import offline data
- [ ] Multi-device sync

---

**Status**: ⏳ Infrastructure Complete (Integration Pending)
**Last Updated**: 2025-10-24
