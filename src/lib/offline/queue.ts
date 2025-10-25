/**
 * IndexedDB Queue for Offline Submissions
 *
 * Stores failed/offline API requests and manages their retry lifecycle.
 * Used for match scouting submissions when network is unavailable.
 */

export interface QueuedSubmission {
  id: string;
  url: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body: unknown;
  headers?: Record<string, string>;
  timestamp: number;
  retryCount: number;
  status: 'pending' | 'syncing' | 'failed' | 'success';
  error?: string;
  lastAttempt?: number;
}

const DB_NAME = 'frc-scouting-offline';
const DB_VERSION = 1;
const STORE_NAME = 'submission-queue';

/**
 * Open IndexedDB connection
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create object store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

/**
 * Add a submission to the queue
 */
export async function queueSubmission(
  url: string,
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  body: unknown,
  headers?: Record<string, string>
): Promise<string> {
  const db = await openDB();
  const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const submission: QueuedSubmission = {
    id,
    url,
    method,
    body,
    headers,
    timestamp: Date.now(),
    retryCount: 0,
    status: 'pending',
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.add(submission);

    request.onsuccess = () => resolve(id);
    request.onerror = () => reject(request.error);

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Get all pending submissions
 */
export async function getPendingSubmissions(): Promise<QueuedSubmission[]> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('status');
    const request = index.getAll('pending');

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Get all submissions (for UI display)
 */
export async function getAllSubmissions(): Promise<QueuedSubmission[]> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Update submission status
 */
export async function updateSubmission(
  id: string,
  updates: Partial<QueuedSubmission>
): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const getRequest = store.get(id);

    getRequest.onsuccess = () => {
      const submission = getRequest.result;
      if (!submission) {
        reject(new Error(`Submission ${id} not found`));
        return;
      }

      const updated = { ...submission, ...updates };
      const putRequest = store.put(updated);

      putRequest.onsuccess = () => resolve();
      putRequest.onerror = () => reject(putRequest.error);
    };

    getRequest.onerror = () => reject(getRequest.error);

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Delete a submission from the queue
 */
export async function deleteSubmission(id: string): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Clear all successful submissions older than 24 hours
 */
export async function cleanupOldSubmissions(): Promise<void> {
  const db = await openDB();
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      const submissions = request.result as QueuedSubmission[];
      const toDelete = submissions.filter(
        (s) => s.status === 'success' && s.timestamp < oneDayAgo
      );

      toDelete.forEach((s) => store.delete(s.id));
      resolve();
    };

    request.onerror = () => reject(request.error);

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Get count of pending submissions
 */
export async function getPendingCount(): Promise<number> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('status');
    const request = index.count('pending');

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);

    transaction.oncomplete = () => db.close();
  });
}
