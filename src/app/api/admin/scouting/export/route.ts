/**
 * Export API route for scouting data
 * Generates CSV export of filtered scouting entries
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api/auth-middleware';
import { createScoutingDataRepository } from '@/lib/repositories/scouting-data.repository';
import type { ScoutingListOptions, ScoutingEntryWithDetails } from '@/types/admin';

/**
 * Convert scouting entries to CSV format
 */
function convertToCSV(entries: ScoutingEntryWithDetails[]): string {
  if (entries.length === 0) {
    return 'No data to export';
  }

  // Define CSV headers
  const headers = [
    'Team Number',
    'Team Name',
    'Match Key',
    'Event Name',
    'Scout Name',
    'Competition Level',
    'Match Number',
    'Auto Points',
    'Teleop Points',
    'Endgame Points',
    'Total Points',
    'Data Quality',
    'Created At',
    'Updated At',
    // Auto performance details
    'Left Starting Zone',
    'Coral L1 (Auto)',
    'Coral L2 (Auto)',
    'Coral L3 (Auto)',
    'Coral L4 (Auto)',
    // Teleop performance details
    'Coral L1 (Teleop)',
    'Coral L2 (Teleop)',
    'Coral L3 (Teleop)',
    'Coral L4 (Teleop)',
    'Algae Barge',
    'Algae Processor',
    'Cycles Completed',
    'Defense Time (seconds)',
    // Endgame details
    'Cage Climb Attempted',
    'Cage Climb Successful',
    'Cage Level',
    // Notes
    'Auto Notes',
    'Teleop Notes',
    'Endgame Notes'
  ];

  // Convert entries to CSV rows
  const rows = entries.map(entry => {
    const auto = entry.auto_performance || {};
    const teleop = entry.teleop_performance || {};
    const endgame = entry.endgame_performance || {};

    return [
      entry.team_number,
      entry.team_name || '',
      entry.match_key,
      entry.event_name || '',
      entry.scout_name,
      entry.comp_level || '',
      entry.match_number || '',
      entry.preview_metrics.auto_points,
      entry.preview_metrics.teleop_points,
      entry.preview_metrics.endgame_points,
      entry.preview_metrics.total_points,
      entry.data_quality,
      entry.created_at,
      entry.updated_at || '',
      // Auto performance
      auto.left_starting_zone ? 'Yes' : 'No',
      auto.coral_scored_L1 || 0,
      auto.coral_scored_L2 || 0,
      auto.coral_scored_L3 || 0,
      auto.coral_scored_L4 || 0,
      // Teleop performance
      teleop.coral_scored_L1 || 0,
      teleop.coral_scored_L2 || 0,
      teleop.coral_scored_L3 || 0,
      teleop.coral_scored_L4 || 0,
      teleop.algae_scored_barge || 0,
      teleop.algae_scored_processor || 0,
      teleop.cycles_completed || 0,
      teleop.defense_time_seconds || 0,
      // Endgame
      endgame.cage_climb_attempted ? 'Yes' : 'No',
      endgame.cage_climb_successful ? 'Yes' : 'No',
      endgame.cage_level_achieved || '',
      // Notes
      auto.notes ? `"${auto.notes.replace(/"/g, '""')}"` : '',
      teleop.notes ? `"${teleop.notes.replace(/"/g, '""')}"` : '',
      endgame.notes ? `"${endgame.notes.replace(/"/g, '""')}"` : '',
    ].join(',');
  });

  // Combine headers and rows
  return [headers.join(','), ...rows].join('\n');
}

/**
 * GET /api/admin/scouting/export
 * Export filtered scouting data as CSV
 */
export async function GET(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const searchParams = request.nextUrl.searchParams;

    // Get all data without pagination limit for export
    const options: ScoutingListOptions = {
      page: 1,
      limit: 10000, // Get all entries for export
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

    // Generate CSV
    const csvContent = convertToCSV(result.data);

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0];
    const eventSuffix = options.eventKey ? `-${options.eventKey}` : '';
    const filename = `scouting-data${eventSuffix}-${timestamp}.csv`;

    // Return CSV file response
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error exporting scouting data:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to export scouting data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}