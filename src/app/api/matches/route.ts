import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { successResponse, errorResponse, serverError } from '@/lib/api/response';
import { requireAdmin } from '@/lib/api/auth-middleware';

/**
 * GET /api/matches
 * Fetch all matches
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const eventKey = searchParams.get('event_key');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = supabase
      .from('match_schedule')
      .select('*')
      .range(offset, offset + limit - 1)
      .order('match_number', { ascending: true });

    if (eventKey) {
      query = query.eq('event_key', eventKey);
    }

    const { data, error } = await query;

    if (error) {
      return errorResponse(error.message, 500);
    }

    return successResponse(data);
  } catch (error) {
    console.error('Error fetching matches:', error);
    return serverError();
  }
}

/**
 * POST /api/matches
 * Create a new match (Admin only)
 */
export async function POST(request: NextRequest) {
  // SECURITY: Require admin authentication
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const supabase = await createClient();
    const body = await request.json();

    const { data, error } = await supabase
      .from('match_schedule')
      .insert(body)
      .select()
      .single();

    if (error) {
      return errorResponse(error.message, 400);
    }

    return successResponse(data, 201);
  } catch (error) {
    console.error('Error creating match:', error);
    return serverError();
  }
}
