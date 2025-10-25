import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { successResponse, errorResponse, unauthorizedError } from '@/lib/api/response';
import { canViewEvents } from '@/lib/services/auth.service';
import type { Event } from '@/types';

/**
 * GET /api/events
 * Get events with optional filtering and pagination
 *
 * Query Parameters:
 * - year (optional): Filter by year
 * - limit (optional): Number of results (default: 50, max: 200)
 * - offset (optional): Pagination offset (default: 0)
 *
 * Returns:
 * {
 *   success: true,
 *   data: {
 *     data: Event[],
 *     pagination: {
 *       limit: number,
 *       offset: number,
 *       total: number
 *     }
 *   }
 * }
 *
 * Authentication: Requires authenticated user with event viewing permissions
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return unauthorizedError('Authentication required');
    }

    // Get user profile for permission check
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role, is_active')
      .eq('id', user.id)
      .single();

    if (!canViewEvents(profile)) {
      return errorResponse('Forbidden - insufficient permissions', 403);
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const year = searchParams.get('year');
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');

    // Validate and set defaults for pagination
    let limit = 50;
    let offset = 0;

    if (limitParam) {
      const parsedLimit = parseInt(limitParam, 10);
      if (isNaN(parsedLimit) || parsedLimit < 1) {
        return errorResponse('Invalid limit parameter', 400);
      }
      limit = Math.min(parsedLimit, 200); // Cap at 200
    }

    if (offsetParam) {
      const parsedOffset = parseInt(offsetParam, 10);
      if (isNaN(parsedOffset) || parsedOffset < 0) {
        return errorResponse('Invalid offset parameter', 400);
      }
      offset = parsedOffset;
    }

    // Build query
    let query = supabase.from('events').select('*', { count: 'exact' });

    // Apply year filter if provided
    if (year) {
      const parsedYear = parseInt(year, 10);
      if (isNaN(parsedYear)) {
        return errorResponse('Invalid year parameter', 400);
      }
      query = query.eq('year', parsedYear);
    }

    // Apply sorting (most recent first)
    query = query.order('start_date', { ascending: false });

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    // Execute query
    const { data, error, count } = await query;

    if (error) {
      console.error('[API] Error fetching events:', error);
      return errorResponse('Failed to fetch events', 500);
    }

    // Return response with pagination metadata
    return successResponse({
      data: data as Event[],
      pagination: {
        limit,
        offset,
        total: count || 0,
      },
    });
  } catch (error) {
    console.error('[API] Unexpected error in GET /api/events:', error);
    return errorResponse('Internal server error', 500);
  }
}
