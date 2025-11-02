/**
 * Custom Service Worker Extension for Background Sync
 *
 * This file extends the auto-generated service worker with Background Sync functionality.
 * It handles offline submission queuing and automatic syncing when connectivity is restored.
 */

const SYNC_TAG = 'submission-sync';
const DB_NAME = 'offline-submissions';
const DB_VERSION = 1;
const STORE_NAME = 'submissions';

/**
 * Listen for background sync events triggered by the browser
 */
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background sync event:', event.tag);

  if (event.tag === SYNC_TAG) {
    // waitUntil ensures the service worker doesn't terminate until sync is complete
    event.waitUntil(replayFailedRequests());
  }
});

/**
 * Replay all queued submissions when connectivity is restored
 */
async function replayFailedRequests() {
  try {
    // Open IndexedDB to get queued submissions
    const db = await openDatabase();
    const submissions = await getAllSubmissions(db);

    if (submissions.length === 0) {
      console.log('[Service Worker] No submissions to sync');
      return;
    }

    console.log(`[Service Worker] Replaying ${submissions.length} failed requests`);

    let successCount = 0;
    const failedIds = [];

    for (const submission of submissions) {
      try {
        // Reconstruct the original request
        const response = await fetch(submission.url, {
          method: submission.method || 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...submission.headers,
          },
          body: JSON.stringify(submission.data),
        });

        if (response.ok) {
          // Remove from queue on success
          await removeSubmission(db, submission.id);
          console.log(`[Service Worker] Successfully synced submission ${submission.id}`);
          successCount++;
        } else {
          console.error(`[Service Worker] Failed to sync submission ${submission.id}: HTTP ${response.status}`);
          failedIds.push(submission.id);
        }
      } catch (error) {
        console.error(`[Service Worker] Failed to sync submission ${submission.id}:`, error);
        failedIds.push(submission.id);
        // Keep in queue for next sync attempt
      }
    }

    // Notify all clients about sync completion
    const clients = await self.clients.matchAll();
    clients.forEach((client) => {
      client.postMessage({
        type: 'SYNC_COMPLETE',
        totalCount: submissions.length,
        successCount,
        failedCount: failedIds.length,
        failedIds,
        timestamp: new Date().toISOString(),
      });
    });

    // If there are still failed submissions, register another sync for later
    if (failedIds.length > 0) {
      try {
        await self.registration.sync.register(SYNC_TAG);
        console.log('[Service Worker] Re-registered sync for failed submissions');
      } catch (error) {
        console.error('[Service Worker] Failed to re-register sync:', error);
      }
    }

    db.close();
  } catch (error) {
    console.error('[Service Worker] Background sync failed:', error);
    throw error;
  }
}

/**
 * Open IndexedDB connection
 */
function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error('Failed to open database: ' + request.error));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Create submissions store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('type', 'type', { unique: false });
      }
    };
  });
}

/**
 * Get all submissions from IndexedDB
 */
function getAllSubmissions(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      // Sort by timestamp (oldest first)
      const submissions = request.result || [];
      submissions.sort((a, b) => {
        const timeA = new Date(a.timestamp).getTime();
        const timeB = new Date(b.timestamp).getTime();
        return timeA - timeB;
      });
      resolve(submissions);
    };

    request.onerror = () => {
      reject(new Error('Failed to get submissions: ' + request.error));
    };
  });
}

/**
 * Remove a submission from IndexedDB after successful sync
 */
function removeSubmission(db, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(new Error('Failed to delete submission: ' + request.error));
    };
  });
}

/**
 * Handle fetch events for offline caching of submissions
 * Intercept failed API calls and queue them for background sync
 */
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only intercept API calls for scouting submissions
  if (
    event.request.method === 'POST' &&
    (url.pathname.includes('/api/match-scouting') ||
     url.pathname.includes('/api/pit-scouting'))
  ) {
    event.respondWith(
      fetch(event.request.clone())
        .catch(async (error) => {
          // Network failed, queue for background sync
          console.log('[Service Worker] Network failed, queueing for background sync');

          try {
            const body = await event.request.json();
            const db = await openDatabase();

            // Store the failed request
            const submission = {
              id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              url: event.request.url,
              method: event.request.method,
              headers: Object.fromEntries(event.request.headers.entries()),
              data: body,
              timestamp: new Date().toISOString(),
              type: url.pathname.includes('match') ? 'match' : 'pit',
            };

            await saveSubmission(db, submission);
            db.close();

            // Register background sync
            await self.registration.sync.register(SYNC_TAG);

            // Return a synthetic success response
            return new Response(
              JSON.stringify({
                success: true,
                queued: true,
                id: submission.id,
                message: 'Submission queued for background sync',
              }),
              {
                status: 202, // Accepted
                headers: { 'Content-Type': 'application/json' },
              }
            );
          } catch (queueError) {
            console.error('[Service Worker] Failed to queue submission:', queueError);
            // Return error response if queueing fails
            return new Response(
              JSON.stringify({
                success: false,
                error: 'Failed to queue submission for offline sync',
              }),
              {
                status: 503, // Service Unavailable
                headers: { 'Content-Type': 'application/json' },
              }
            );
          }
        })
    );
  }
});

/**
 * Save a submission to IndexedDB
 */
function saveSubmission(db, submission) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.add(submission);

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(new Error('Failed to save submission: ' + request.error));
    };
  });
}

/**
 * Listen for messages from the main thread
 */
self.addEventListener('message', (event) => {
  if (event.data?.type === 'TRIGGER_SYNC') {
    // Manually trigger sync when requested
    event.waitUntil(replayFailedRequests());
  }
});