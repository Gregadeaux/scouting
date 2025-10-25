# PWA & Offline Functionality - Usage Guide

This guide explains how to use the offline functionality in the FRC Scouting System.

## 🎯 Overview

The app now supports:
- ✅ **Progressive Web App (PWA)** - Install to home screen
- ✅ **Offline data submission** - Queue scouting data when offline
- ✅ **Auto-sync** - Automatic retry with exponential backoff
- ✅ **Cached assets** - App shell loads instantly offline
- ✅ **Match schedules offline** - View cached schedules without internet

## 📱 For Users

### Installing the App

**On Mobile (iOS/Android):**
1. Open the app in your browser
2. Look for "Add to Home Screen" prompt
3. Tap "Add" or "Install"
4. App icon appears on your home screen

**On Desktop (Chrome/Edge):**
1. Look for install icon in address bar
2. Click "Install FRC Scout"
3. App opens in standalone window

### Working Offline

**During Competitions:**
1. Load the app while you have WiFi (pre-caches data)
2. Navigate to match schedules (caches schedule data)
3. If you lose connection:
   - App continues to work
   - Forms still submit (queued automatically)
   - You see "Offline" indicator in navbar

**Checking Sync Status:**
1. Click the "Online/Offline" indicator in navbar
2. View pending submissions on `/offline` page
3. See auto-retry progress

**What Works Offline:**
- ✅ Match scouting forms (submissions queued)
- ✅ Viewing cached match schedules
- ✅ Viewing cached team data
- ✅ Viewing previous submissions
- ❌ Admin features (require server)
- ❌ Fetching new data (requires server)

## 💻 For Developers

### Using the Offline API in Forms

Replace standard `fetch` calls with offline-aware wrappers:

```typescript
import { offlinePost } from '@/lib/offline';

// Before (standard fetch):
const response = await fetch('/api/scouting', {
  method: 'POST',
  body: JSON.stringify(data),
});

// After (offline-aware):
const result = await offlinePost('/api/scouting', data);

if (result.success) {
  if (result.queued) {
    // Submission was queued for later sync
    console.log('Queued with ID:', result.queueId);
  } else {
    // Submission succeeded immediately
    console.log('Data:', result.data);
  }
} else {
  // Handle error
  console.error('Error:', result.error);
}
```

### Available API Functions

```typescript
import {
  offlineGet,    // GET requests (rely on service worker cache)
  offlinePost,   // POST requests (queue if offline)
  offlinePut,    // PUT requests (queue if offline)
  offlinePatch,  // PATCH requests (queue if offline)
  offlineDelete, // DELETE requests (queue if offline)
} from '@/lib/offline';
```

### Example: Match Scouting Form

```typescript
'use client';

import { useState } from 'react';
import { offlinePost } from '@/lib/offline';

export function MatchScoutingForm() {
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  async function handleSubmit(formData: any) {
    setSubmitting(true);

    const result = await offlinePost('/api/match-scouting', formData, {
      onQueued: (queueId) => {
        setMessage(`Queued for sync (${queueId})`);
      },
    });

    if (result.success) {
      if (result.queued) {
        setMessage('Submitted offline - will sync when online');
      } else {
        setMessage('Submitted successfully!');
      }
    } else {
      setMessage(`Error: ${result.error}`);
    }

    setSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      <button type="submit" disabled={submitting}>
        {submitting ? 'Submitting...' : 'Submit'}
      </button>
      {message && <p>{message}</p>}
    </form>
  );
}
```

### Adding the Sync Status Indicator

Add to your layout or navbar:

```typescript
import { SyncStatusIndicator } from '@/components/SyncStatusIndicator';

export function Navbar() {
  return (
    <nav>
      {/* Other nav items */}
      <SyncStatusIndicator />
    </nav>
  );
}
```

### Listening to Sync Events

```typescript
import { useEffect } from 'react';
import { syncManager } from '@/lib/offline';

function MyComponent() {
  useEffect(() => {
    const unsubscribe = syncManager.on((event) => {
      switch (event.type) {
        case 'sync-start':
          console.log('Sync started');
          break;
        case 'sync-complete':
          console.log('Sync complete, pending:', event.pending);
          break;
        case 'submission-success':
          console.log('Submission synced:', event.submissionId);
          break;
        case 'submission-failed':
          console.error('Submission failed:', event.error);
          break;
      }
    });

    return unsubscribe;
  }, []);
}
```

### Manual Queue Operations

```typescript
import {
  queueSubmission,
  getPendingSubmissions,
  updateSubmission,
  deleteSubmission,
  getPendingCount,
} from '@/lib/offline';

// Queue a submission manually
const queueId = await queueSubmission(
  '/api/scouting',
  'POST',
  { data: 'example' },
  { 'Content-Type': 'application/json' }
);

// Get all pending submissions
const pending = await getPendingSubmissions();

// Get count only
const count = await getPendingCount();

// Update a submission
await updateSubmission(queueId, { status: 'failed' });

// Delete a submission
await deleteSubmission(queueId);
```

## 🔧 Configuration

### Caching Strategies (next.config.ts)

Current configuration in `next.config.ts:44-112`:

| Resource | Strategy | Cache Duration |
|----------|----------|----------------|
| Supabase API | NetworkFirst | 1 hour |
| Supabase Storage | CacheFirst | 1 week |
| Match Schedules | StaleWhileRevalidate | 2 hours |
| Teams Data | StaleWhileRevalidate | 24 hours |
| Next.js Static | CacheFirst | 1 year |
| Images | CacheFirst | 30 days |

**Strategies Explained:**
- **NetworkFirst**: Try network, fallback to cache (good for APIs)
- **CacheFirst**: Serve from cache, update in background (good for static assets)
- **StaleWhileRevalidate**: Serve cache immediately, fetch fresh in background (best UX)

### Retry Configuration (src/lib/offline/sync.ts)

```typescript
const MAX_RETRIES = 5;           // Maximum retry attempts
const BASE_DELAY = 1000;         // 1 second base delay
const MAX_DELAY = 60000;         // 1 minute max delay
const SYNC_INTERVAL = 30000;     // 30 seconds between sync checks
```

To adjust retry behavior, edit `src/lib/offline/sync.ts:12-14`.

### PWA Manifest (public/manifest.json)

Customize app appearance:
```json
{
  "name": "FRC Scouting System",
  "short_name": "FRC Scout",
  "theme_color": "#3b82f6",
  "background_color": "#0f172a",
  "display": "standalone"
}
```

## 🧪 Testing Offline Functionality

### In Chrome DevTools

1. Open DevTools (F12)
2. Go to "Application" tab
3. Click "Service Workers" in sidebar
4. Check "Offline" checkbox
5. Reload page - app should work offline
6. Try submitting a form - should queue

### Testing Sync

1. Go offline (DevTools or disable WiFi)
2. Submit a match scouting form
3. Check `/offline` page - submission should be queued
4. Go back online
5. Watch submission auto-sync (or click "Sync Now")

### Clearing Cache

**During Development:**
1. DevTools → Application → Storage
2. Click "Clear site data"
3. Or unregister service worker manually

**For Users:**
- iOS: Settings → Safari → Clear History and Website Data
- Android: Settings → Apps → Browser → Storage → Clear Cache
- Desktop: Browser settings → Clear browsing data

## 🐛 Troubleshooting

### Service Worker Not Updating

**Problem:** Changes don't appear after deployment

**Solution:**
```typescript
// In next.config.ts, change skipWaiting:
skipWaiting: true  // Auto-update service worker
```

Or manually:
1. DevTools → Application → Service Workers
2. Click "Update" or "Unregister"
3. Reload page

### Submissions Not Syncing

**Check:**
1. Visit `/offline` page
2. Look for "failed" status
3. Check error messages
4. Verify API endpoint is correct
5. Check network tab for 4xx/5xx errors

**Force Retry:**
```typescript
import { syncManager } from '@/lib/offline';

// Retry all
await syncManager.syncAll();

// Retry specific submission
await syncManager.retrySubmission(submissionId);
```

### IndexedDB Quota Exceeded

**Problem:** Too many queued submissions

**Solution:**
```typescript
import { cleanupOldSubmissions } from '@/lib/offline';

// Clean up successful submissions older than 24 hours
await cleanupOldSubmissions();
```

### PWA Not Installing

**Requirements:**
- HTTPS (or localhost)
- Valid manifest.json
- Service worker registered
- Icons in manifest

**Check:**
1. DevTools → Application → Manifest
2. Look for errors
3. Verify all icon sizes exist

## 📊 Monitoring in Production

### Track Queue Size

```typescript
import { getPendingCount } from '@/lib/offline';

// Add to analytics
const pendingCount = await getPendingCount();
analytics.track('offline_queue_size', { count: pendingCount });
```

### Sync Success Rate

```typescript
import { syncManager } from '@/lib/offline';

let successCount = 0;
let failureCount = 0;

syncManager.on((event) => {
  if (event.type === 'submission-success') successCount++;
  if (event.type === 'submission-failed') failureCount++;
});

// Report metrics
console.log('Success rate:', successCount / (successCount + failureCount));
```

## 🚀 Best Practices

### 1. Pre-cache Critical Data

Load match schedules and team data while online:

```typescript
// On app load with WiFi
await fetch('/api/matches');  // Service worker caches
await fetch('/api/teams');    // Service worker caches
```

### 2. Show Clear Feedback

Always inform users when offline:
- Show queue count badge
- Display "Queued" status after submission
- Show sync progress

### 3. Handle Edge Cases

```typescript
// Check if IndexedDB is available
if (typeof indexedDB === 'undefined') {
  // Fallback: store in localStorage or show error
}

// Handle quota exceeded
try {
  await queueSubmission(...);
} catch (error) {
  if (error.name === 'QuotaExceededError') {
    await cleanupOldSubmissions();
    // Retry
  }
}
```

### 4. Test Thoroughly

- Test on actual devices (not just desktop)
- Test poor network conditions (3G throttling)
- Test offline → online transitions
- Test long queues (100+ submissions)

## 📚 Additional Resources

- [PWA Documentation](https://web.dev/progressive-web-apps/)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [IndexedDB Guide](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Workbox (used by next-pwa)](https://developer.chrome.com/docs/workbox/)

## ❓ FAQ

**Q: Does offline mode work with SSR?**
A: Yes! SSR works perfectly with PWA. Server-rendered pages are cached by the service worker just like client-rendered pages.

**Q: What happens if I edit a queued submission?**
A: Currently not supported. Submissions are immutable once queued. Consider adding a "delete draft" feature if needed.

**Q: Can I queue non-POST requests?**
A: Yes, the queue supports POST, PUT, PATCH, and DELETE. GET requests don't queue (they rely on service worker cache).

**Q: How long do queued submissions persist?**
A: Until successfully synced or manually deleted. Successful submissions are cleaned up after 24 hours.

**Q: Does this work on iOS?**
A: Yes! iOS 16.4+ has full service worker support. Earlier versions have limited support.

---

**Last Updated:** 2025-01-23
