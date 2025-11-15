import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api/auth-middleware';
import { createServiceClient } from '@/lib/supabase/server';

/**
 * GET /api/admin/scouters/[id]/history
 *
 * Fetches detailed ELO history for a scouter with validation details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { id } = await params;
    const scouterId = id;
    const { searchParams } = new URL(request.url);
    const seasonYear = searchParams.get('seasonYear') || '2025';
    const limit = parseInt(searchParams.get('limit') || '100');

    console.log('Fetching history for scouter:', scouterId, 'season:', seasonYear);

    const supabase = createServiceClient();

    // First, let's check if ANY records exist for this scouter
    const { data: allRecords, error: countError } = await supabase
      .from('scouter_elo_history')
      .select('id, scouter_id, created_at')
      .eq('scouter_id', scouterId);

    console.log('Total records for scouter:', allRecords?.length || 0);
    if (allRecords && allRecords.length > 0) {
      console.log('Sample record:', JSON.stringify(allRecords[0], null, 2));
    }

    // Fetch ELO history for this scouter
    const { data: historyRecords, error: historyError } = await supabase
      .from('scouter_elo_history')
      .select('*')
      .eq('scouter_id', scouterId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (historyError) {
      console.error('History query error:', historyError);
      throw historyError;
    }

    console.log('History query returned:', historyRecords?.length || 0, 'records');

    if (!historyRecords || historyRecords.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          currentRating: null,
          history: [],
        },
      });
    }

    // Fetch validation results for all history records
    const validationIds = historyRecords.map(h => h.validation_id).filter(Boolean);
    const { data: validations, error: validationsError } = await supabase
      .from('validation_results')
      .select('*')
      .in('id', validationIds)
      .eq('season_year', parseInt(seasonYear));

    if (validationsError) {
      console.error('Validations query error:', validationsError);
      // Continue without validation details rather than failing
    }

    // Create a map of validations by id
    const validationsMap = new Map(
      (validations || []).map(v => [v.id, v])
    );

    // Combine history with validation results
    const history = historyRecords
      .filter(h => validationsMap.has(h.validation_id))
      .map(h => ({
        ...h,
        validation_results: validationsMap.get(h.validation_id),
      }));

    console.log('Combined history:', history.length, 'records');

    // Fetch current ELO rating
    const { data: currentRating, error: ratingError } = await supabase
      .from('scouter_elo_ratings')
      .select('*')
      .eq('scouter_id', scouterId)
      .eq('season_year', parseInt(seasonYear))
      .single();

    if (ratingError && ratingError.code !== 'PGRST116') {
      throw ratingError;
    }

    return NextResponse.json({
      success: true,
      data: {
        currentRating: currentRating || null,
        history: history || [],
      },
    });
  } catch (error) {
    console.error('Error fetching scouter history:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch scouter history',
      },
      { status: 500 }
    );
  }
}
