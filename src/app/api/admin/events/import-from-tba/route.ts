import { NextRequest, NextResponse } from 'next/server';
import { getEventService, getImportService } from '@/lib/services';
import { successResponse, errorResponse } from '@/lib/api/response';
import { requireAdmin } from '@/lib/api/auth-middleware';

/**
 * POST /api/admin/events/import-from-tba
 * Import and create an event from The Blue Alliance
 * Also queues a full import job to fetch teams, matches, and results
 *
 * Request body: { eventKey: string }
 * Returns: Created/updated event and import job details
 */
export async function POST(request: NextRequest) {
  // Require admin authentication
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const body = await request.json();
    const { eventKey } = body;

    if (!eventKey || typeof eventKey !== 'string') {
      return errorResponse('Event key is required', 400);
    }

    // Validate event key format (e.g., "2025txaus")
    const eventKeyPattern = /^\d{4}[a-z0-9]+$/i;
    if (!eventKeyPattern.test(eventKey)) {
      return errorResponse('Invalid event key format (expected: YYYYcode, e.g., 2025txaus)', 400);
    }

    const eventService = getEventService();
    const importService = getImportService();

    // Step 1: Import the event details
    const event = await eventService.importEventFromTBA(eventKey);

    // Step 2: Queue a full import job for teams, matches, and results
    const importJob = await importService.startImport(eventKey, {
      importTeams: true,
      importMatches: true,
      importResults: true,
    });

    console.log(`[API] Event ${eventKey} imported, queued import job ${importJob.job_id}`);

    return successResponse(
      {
        event,
        import_job: importJob,
      },
      201
    );
  } catch (error: unknown) {
    console.error('[API] Import event from TBA error:', error);

    if (error.name === 'TBAApiError') {
      return errorResponse(`TBA API error: ${error.message}`, 502);
    }

    return errorResponse(error.message || 'Failed to import event', 500);
  }
}
