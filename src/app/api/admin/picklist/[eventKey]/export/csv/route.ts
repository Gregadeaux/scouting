/**
 * Pick List CSV Export Endpoint
 *
 * GET /api/admin/picklist/[eventKey]/export/csv - Export pick list as downloadable CSV
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api/auth-middleware';
import { createPickListService, PICK_LIST_STRATEGIES } from '@/lib/services/picklist.service';
import { createServiceClient } from '@/lib/supabase/server';
import type { PickListOptions } from '@/types/picklist';

/**
 * GET /api/admin/picklist/[eventKey]/export/csv
 * Generate and export pick list as CSV file
 *
 * Query params:
 * - strategy: Strategy ID (BALANCED, OFFENSIVE, DEFENSIVE, RELIABLE) - default: BALANCED
 * - minMatches: Minimum matches played (default: 5)
 * - filename: Custom filename (default: picklist-{eventKey}-{strategy}.csv)
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
    // Await params
    const { eventKey } = await params;

    if (!eventKey) {
      return NextResponse.json({ error: 'eventKey is required' }, { status: 400 });
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const strategy = searchParams.get('strategy') || 'BALANCED';
    const minMatches = parseInt(searchParams.get('minMatches') || '5', 10);
    const customFilename = searchParams.get('filename');

    // Validate strategy
    if (!PICK_LIST_STRATEGIES[strategy]) {
      return NextResponse.json(
        {
          error: `Invalid strategy: ${strategy}`,
          available: Object.keys(PICK_LIST_STRATEGIES),
        },
        { status: 400 }
      );
    }

    // Validate minMatches
    if (isNaN(minMatches) || minMatches < 0) {
      return NextResponse.json({ error: 'Invalid minMatches value' }, { status: 400 });
    }

    // Create service
    const supabase = createServiceClient();
    const service = createPickListService(supabase);

    // Generate pick list
    const options: PickListOptions = {
      minMatches,
      includeNotes: true, // Always include notes in CSV export
    };

    const pickList = await service.generatePickList(eventKey, strategy, options);

    // Export to CSV
    const csv = service.exportToCSV(pickList);

    // Generate filename
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const filename =
      customFilename ||
      `picklist-${eventKey}-${strategy.toLowerCase()}-${timestamp}.csv`;

    // Return CSV with proper headers
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error: unknown) {
    console.error('[PickList CSV Export] Error:', error);

    const errorMessage = error instanceof Error ? error.message : '';

    if (errorMessage.includes('not found')) {
      return NextResponse.json({ error: errorMessage }, { status: 404 });
    }

    if (errorMessage.includes('No team statistics')) {
      return NextResponse.json(
        {
          error: errorMessage,
          hint: 'Calculate OPR/DPR/CCWM first using POST /api/admin/statistics/opr',
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: errorMessage || 'Failed to export pick list' },
      { status: 500 }
    );
  }
}
