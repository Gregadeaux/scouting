/**
 * Admin API routes for scouting data management
 * Provides list, detail, and delete operations for match scouting entries
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api/auth-middleware';
import { createScoutingDataRepository } from '@/lib/repositories/scouting-data.repository';
import type { ScoutingListOptions } from '@/types/admin';

/**
 * GET /api/admin/scouting
 * List match scouting entries with filters and pagination
 */
export async function GET(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const searchParams = request.nextUrl.searchParams;

    const options: ScoutingListOptions = {
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '50'),
      sortBy: searchParams.get('sortBy') || 'created_at',
      sortOrder: (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc',
      search: searchParams.get('search') || '',
      eventKey: searchParams.get('eventKey') || undefined,
      teamNumber: searchParams.get('teamNumber') ? parseInt(searchParams.get('teamNumber')!) : undefined,
      scoutName: searchParams.get('scoutName') || undefined,
      matchKey: searchParams.get('matchKey') || undefined,
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
      dataQuality: searchParams.get('dataQuality') || undefined,
    };

    const repo = createScoutingDataRepository();
    const result = await repo.listScoutingEntries(options);

    return NextResponse.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error('Error fetching scouting data:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch scouting data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/scouting
 * Delete a match scouting entry
 * Body: { id: string }
 */
export async function DELETE(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: 'ID is required'
        },
        { status: 400 }
      );
    }

    const repo = createScoutingDataRepository();
    await repo.deleteMatchScouting(id);

    return NextResponse.json({
      success: true,
      message: 'Scouting entry deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting scouting entry:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete scouting entry',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}