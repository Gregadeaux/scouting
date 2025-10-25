import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { successResponse, errorResponse, serverError } from '@/lib/api/response';

/**
 * GET /api/scouting
 * Fetch scouting data with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const teamNumber = searchParams.get('team_number');
    const matchId = searchParams.get('match_id');
    const scoutingType = searchParams.get('type'); // 'match' or 'pit'
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = supabase
      .from('scouting_data')
      .select('*')
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (teamNumber) {
      query = query.eq('team_number', teamNumber);
    }

    if (matchId) {
      query = query.eq('match_id', matchId);
    }

    if (scoutingType) {
      query = query.eq('scouting_type', scoutingType);
    }

    const { data, error } = await query;

    if (error) {
      return errorResponse(error.message, 500);
    }

    return successResponse(data);
  } catch (error) {
    console.error('Error fetching scouting data:', error);
    return serverError();
  }
}

/**
 * POST /api/scouting
 * Submit new scouting data
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    const { data, error } = await supabase
      .from('scouting_data')
      .insert(body)
      .select()
      .single();

    if (error) {
      return errorResponse(error.message, 400);
    }

    return successResponse(data, 201);
  } catch (error) {
    console.error('Error creating scouting data:', error);
    return serverError();
  }
}
