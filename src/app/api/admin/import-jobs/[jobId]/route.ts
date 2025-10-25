import { NextRequest, NextResponse } from 'next/server';
import { getImportService } from '@/lib/services';
import { successResponse, errorResponse } from '@/lib/api/response';
import { requireAdmin } from '@/lib/api/auth-middleware';

/**
 * GET /api/admin/import-jobs/[jobId]
 * Poll the status of an import job
 *
 * Response includes:
 * - Current status (pending, running, completed, failed, cancelled)
 * - Progress information
 * - Error details if failed
 * - Completion timestamp if finished
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  // Require admin authentication
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { jobId } = await params;
    const importService = getImportService();
    const status = await importService.getImportStatus(jobId);

    if (!status) {
      return errorResponse('Import job not found', 404);
    }

    return successResponse(status);
  } catch (error: unknown) {
    console.error('[API] Get import status error:', error);

    if (error.name === 'EntityNotFoundError') {
      return errorResponse('Import job not found', 404);
    }

    return errorResponse('Failed to fetch import status', 500);
  }
}

/**
 * DELETE /api/admin/import-jobs/[jobId]
 * Cancel a running import job
 *
 * Only pending or running jobs can be cancelled.
 * Completed, failed, or already cancelled jobs cannot be cancelled.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  // Require admin authentication
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { jobId } = await params;
    const importService = getImportService();

    // Attempt to cancel the job
    await importService.cancelImport(jobId);

    return successResponse({
      message: 'Import job cancelled successfully',
      job_id: jobId,
    });
  } catch (error: unknown) {
    console.error('[API] Cancel import error:', error);

    if (error.name === 'EntityNotFoundError') {
      return errorResponse('Import job not found', 404);
    }

    if (error.name === 'ValidationError') {
      // Job is in a state that cannot be cancelled
      return errorResponse(error.message, 400);
    }

    return errorResponse('Failed to cancel import job', 500);
  }
}

/**
 * PATCH /api/admin/import-jobs/[jobId]
 * Retry a failed import job
 *
 * Only failed jobs can be retried.
 * This creates a new job based on the failed job's type.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  // Require admin authentication
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { jobId } = await params;
    const importService = getImportService();

    // Get the failed job
    const failedJob = await importService.getImportStatus(jobId);

    if (!failedJob) {
      return errorResponse('Import job not found', 404);
    }

    if (failedJob.status !== 'failed') {
      return errorResponse('Only failed jobs can be retried', 400);
    }

    // Determine import options based on job type
    const options = {
      importTeams: failedJob.job_type === 'teams' || failedJob.job_type === 'full',
      importMatches: failedJob.job_type === 'matches' || failedJob.job_type === 'full',
      importResults: failedJob.job_type === 'results',
    };

    // Start a new import job with the same options
    const newJob = await importService.startImport(failedJob.event_key, options);

    return successResponse({
      message: 'Import job retried successfully',
      original_job_id: jobId,
      new_job_id: newJob.job_id,
      new_job: newJob,
    });
  } catch (error: unknown) {
    console.error('[API] Retry import error:', error);

    if (error.name === 'EntityNotFoundError') {
      return errorResponse('Import job not found', 404);
    }

    return errorResponse('Failed to retry import job', 500);
  }
}
