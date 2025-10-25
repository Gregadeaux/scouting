import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { successResponse, errorResponse, serverError } from '@/lib/api/response';

/**
 * GET /api/teams
 * Fetch all teams
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .range(offset, offset + limit - 1)
      .order('team_number', { ascending: true });

    if (error) {
      return errorResponse(error.message, 500);
    }

    return successResponse(data);
  } catch (error) {
    console.error('Error fetching teams:', error);
    return serverError();
  }
}

/**
 * POST /api/teams
 * Create a new team
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    const { data, error } = await supabase
      .from('teams')
      .insert(body)
      .select()
      .single();

    if (error) {
      return errorResponse(error.message, 400);
    }

    return successResponse(data, 201);
  } catch (error) {
    console.error('Error creating team:', error);
    return serverError();
  }
}
