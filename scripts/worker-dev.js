#!/usr/bin/env node

/**
 * Development worker script
 * Polls the import worker endpoint every 10 seconds to process pending jobs
 *
 * Usage: node scripts/worker-dev.js
 * Or add to package.json: "worker:dev": "node scripts/worker-dev.js"
 */

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const POLL_INTERVAL = 10000; // 10 seconds
const WORKER_SECRET = process.env.WORKER_SECRET;

async function processJobs() {
  try {
    console.log(`[${new Date().toISOString()}] Checking for pending import jobs...`);

    const headers = {
      'Content-Type': 'application/json',
    };

    // Add Authorization header if WORKER_SECRET is available
    if (WORKER_SECRET) {
      headers['Authorization'] = `Bearer ${WORKER_SECRET}`;
    }

    const response = await fetch(`${BASE_URL}/api/admin/workers/process-imports`, {
      method: 'POST',
      headers,
    });

    const data = await response.json();

    if (data.success) {
      const { processed, successful, failed } = data.data;
      if (processed > 0) {
        console.log(`✅ Processed ${processed} jobs (${successful} successful, ${failed} failed)`);
      } else {
        console.log('ℹ️  No pending jobs');
      }
    } else {
      console.error('❌ Worker error:', data.error);
    }
  } catch (error) {
    console.error('❌ Failed to contact worker:', error.message);
  }
}

console.log('🚀 Development worker started');
console.log(`📍 Polling ${BASE_URL}/api/admin/workers/process-imports every ${POLL_INTERVAL / 1000}s`);
console.log('Press Ctrl+C to stop\n');

// Initial run
processJobs();

// Poll periodically
setInterval(processJobs, POLL_INTERVAL);
