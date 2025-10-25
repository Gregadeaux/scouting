import { NextRequest, NextResponse } from 'next/server';
import { getImportService } from '@/lib/services';
import { successResponse, errorResponse } from '@/lib/api/response';
import type { ImportOptions } from '@/lib/services';
import { requireAdmin } from '@/lib/api/auth-middleware';

/**
 * POST /api/admin/events/[eventKey]/import-tba
 * Initiate a background import job to sync data from The Blue Alliance
 *
 * Request body:
 * {
 *   importTeams: boolean,     // Import team roster
 *   importMatches: boolean,   // Import match schedule
 *   importResults: boolean    // Import match results
 * }
 *
 * Returns 202 Accepted with job ID for status polling
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventKey: string }> }
) {
  // Require admin authentication
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { eventKey } = await params;

    // Parse request body
    let options: ImportOptions;
    try {
      options = await request.json();
    } catch (parseError) {
      return errorResponse('Invalid JSON in request body', 400);
    }

    // Validate options
    if (
      typeof options.importTeams !== 'boolean' ||
      typeof options.importMatches !== 'boolean' ||
      typeof options.importResults !== 'boolean'
    ) {
      return errorResponse(
        'Invalid import options. Required: { importTeams: boolean, importMatches: boolean, importResults: boolean }',
        400
      );
    }

    // Validate at least one option is selected
    if (!options.importTeams && !options.importMatches && !options.importResults) {
      return errorResponse('At least one import option must be enabled', 400);
    }

    // Start import job (returns immediately, job runs in background)
    const importService = getImportService();
    const job = await importService.startImport(eventKey, options);

    // Return 202 Accepted with job ID
    return successResponse(
      {
        job_id: job.job_id,
        status: job.status,
        event_key: job.event_key,
        job_type: job.job_type,
        message: 'Import job started successfully. Use job_id to poll for status.',
      },
      202
    );
  } catch (error: any) {
    console.error('[API] Start import error:', error);

    // Handle TBA API errors
    if (error.name === 'TBAApiError') {
      return errorResponse(`TBA API error: ${error.message}`, 502);
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
      return errorResponse(error.message, 400);
    }

    // Handle entity not found (event doesn't exist)
    if (error.name === 'EntityNotFoundError') {
      return errorResponse(`Event not found: ${error.message}`, 404);
    }

    // Generic error
    return errorResponse('Failed to start import job', 500);
  }
}

/**
 * GET /api/admin/events/[eventKey]/import-tba
 * Get import job history for this event
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventKey: string }> }
) {
  // Require admin authentication
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { eventKey } = await params;
    const importService = getImportService();

    // Get all import jobs for this event
    const jobs = await importService.getEventImportHistory(eventKey);

    if (jobs.length === 0) {
      return successResponse({
        message: 'No import jobs found for this event',
        has_jobs: false,
        jobs: [],
      });
    }

    // Sort by created_at descending to get latest first
    const sortedJobs = jobs.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return successResponse({
      has_jobs: true,
      job_count: sortedJobs.length,
      latest_job: sortedJobs[0],
      jobs: sortedJobs,
    });
  } catch (error: any) {
    console.error('[API] Get import history error:', error);
    return errorResponse('Failed to fetch import job history', 500);
  }
}
