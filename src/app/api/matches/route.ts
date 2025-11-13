import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { successResponse, sanitizedErrorResponse, errorResponse, serverError } from '@/lib/api/response';
import { requireAdmin } from '@/lib/api/auth-middleware';

/**
 * GET /api/matches
 * Fetch all matches
 *
 * SECURITY: Public read access - match schedules are non-sensitive public data
 * that scouts and viewers need to see. Only POST/PUT/DELETE require admin auth.
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
      // SECURITY: Use sanitized error response to prevent database details from leaking
      return sanitizedErrorResponse(error, 'fetch_matches');
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

    // SECURITY: Validate input to prevent malformed data insertion
    const validationErrors: string[] = [];

    if (!body.event_key || typeof body.event_key !== 'string') {
      validationErrors.push('event_key is required and must be a string');
    }

    if (!body.match_key || typeof body.match_key !== 'string') {
      validationErrors.push('match_key is required and must be a string');
    }

    if (typeof body.match_number !== 'number' || body.match_number < 1) {
      validationErrors.push('match_number must be a positive integer');
    }

    if (!body.comp_level || !['qm', 'ef', 'qf', 'sf', 'f'].includes(body.comp_level)) {
      validationErrors.push('comp_level must be one of: qm, ef, qf, sf, f');
    }

    if (typeof body.set_number !== 'number' || body.set_number < 1) {
      validationErrors.push('set_number must be a positive integer');
    }

    // Validate team numbers (should have 6 teams: 3 red, 3 blue)
    const requiredTeamFields = ['red_1', 'red_2', 'red_3', 'blue_1', 'blue_2', 'blue_3'];
    for (const field of requiredTeamFields) {
      if (typeof body[field] !== 'number' || body[field] < 1) {
        validationErrors.push(`${field} must be a positive team number`);
      }
    }

    if (validationErrors.length > 0) {
      return errorResponse(validationErrors.join('; '), 400);
    }

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
