import { NextRequest, NextResponse } from 'next/server';
import { getImportService } from '@/lib/services';
import { createImportJobRepository } from '@/lib/repositories';
import { successResponse, errorResponse } from '@/lib/api/response';
import { requireAdmin } from '@/lib/api/auth-middleware';

/**
 * POST /api/admin/workers/process-imports
 * Background worker endpoint to process pending import jobs
 *
 * This endpoint should be called:
 * 1. Via cron job (e.g., every 5 minutes) - uses WORKER_SECRET
 * 2. Manually via admin interface - uses admin session
 * 3. Webhook triggered after job creation - uses WORKER_SECRET
 *
 * It finds pending import jobs and processes them serially to respect
 * TBA API rate limits (10 requests/second).
 *
 * Authentication:
 * - Option 1: Admin user session (for manual UI triggers)
 * - Option 2: Bearer token with WORKER_SECRET (for automated/cron jobs)
 */
export async function POST(request: NextRequest) {
  // Try two authentication methods:
  // 1. Check for worker secret token (for cron jobs/webhooks)
  const authHeader = request.headers.get('authorization');
  const workerSecret = process.env.WORKER_SECRET;

  let isAuthenticated = false;

  // Check worker secret authentication
  if (workerSecret && authHeader === `Bearer ${workerSecret}`) {
    isAuthenticated = true;
    console.log('[Worker] Authenticated via WORKER_SECRET');
  } else {
    // 2. Try admin user authentication (for manual UI triggers)
    const authResult = await requireAdmin(request);
    if (!(authResult instanceof NextResponse)) {
      isAuthenticated = true;
      console.log('[Worker] Authenticated as admin user');
    }
  }

  // If neither authentication method succeeded, return 401
  if (!isAuthenticated) {
    return errorResponse(
      'Unauthorized. Provide either valid admin session or Authorization: Bearer <WORKER_SECRET> header',
      401
    );
  }

  try {
    const importService = getImportService();
    const importJobRepo = createImportJobRepository();

    // Find pending jobs (limit to 5 to avoid long-running requests)
    const maxJobs = 5;
    const pendingJobs = await importJobRepo.findPendingJobs(maxJobs);

    if (pendingJobs.length === 0) {
      return successResponse({
        message: 'No pending import jobs',
        processed: 0,
        timestamp: new Date().toISOString(),
      });
    }

    console.log(`[Worker] Processing ${pendingJobs.length} pending import jobs`);

    // Process each job serially to respect TBA rate limits
    // Each job internally handles its own rate limiting
    const results = [];
    for (const job of pendingJobs) {
      try {
        console.log(`[Worker] Processing job ${job.job_id} for event ${job.event_key}`);

        const result = await importService.processImportJob(job.job_id);

        results.push({
          job_id: job.job_id,
          event_key: job.event_key,
          status: 'processed',
          success: result.success,
          teams_imported: result.teamsImported,
          matches_imported: result.matchesImported,
          results_imported: result.resultsUpdated,
          warnings_count: result.warnings.length,
          errors_count: result.errors.length,
        });

        console.log(`[Worker] Job ${job.job_id} completed successfully`);
      } catch (error: unknown) {
        console.error(`[Worker] Failed to process job ${job.job_id}:`, error);

        results.push({
          job_id: job.job_id,
          event_key: job.event_key,
          status: 'failed',
          error: error.message || 'Unknown error',
        });
      }
    }

    // Count successes and failures
    const successful = results.filter((r) => r.status === 'processed').length;
    const failed = results.filter((r) => r.status === 'failed').length;

    return successResponse({
      message: `Processed ${results.length} import jobs (${successful} successful, ${failed} failed)`,
      processed: results.length,
      successful,
      failed,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    console.error('[Worker] Process imports error:', error);
    return errorResponse('Failed to process import jobs', 500);
  }
}

/**
 * GET /api/admin/workers/process-imports
 * Get information about pending import jobs (without processing them)
 */
export async function GET(request: NextRequest) {
  // Try two authentication methods (same as POST)
  const authHeader = request.headers.get('authorization');
  const workerSecret = process.env.WORKER_SECRET;

  let isAuthenticated = false;

  if (workerSecret && authHeader === `Bearer ${workerSecret}`) {
    isAuthenticated = true;
  } else {
    const authResult = await requireAdmin(request);
    if (!(authResult instanceof NextResponse)) {
      isAuthenticated = true;
    }
  }

  if (!isAuthenticated) {
    return errorResponse(
      'Unauthorized. Provide either valid admin session or Authorization: Bearer <WORKER_SECRET> header',
      401
    );
  }

  try {
    const importJobRepo = createImportJobRepository();

    // Find all pending jobs
    const pendingJobs = await importJobRepo.findPendingJobs(100);

    return successResponse({
      pending_count: pendingJobs.length,
      jobs: pendingJobs.map((job) => ({
        job_id: job.job_id,
        event_key: job.event_key,
        job_type: job.job_type,
        status: job.status,
        created_at: job.created_at,
        progress_percent: job.progress_percent,
      })),
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    console.error('[Worker] Get pending jobs error:', error);
    return errorResponse('Failed to fetch pending jobs', 500);
  }
}
