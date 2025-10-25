import { NextRequest, NextResponse } from 'next/server';
import { getEventService } from '@/lib/services';
import { createServiceClient } from '@/lib/supabase/server';
import { successResponse, errorResponse } from '@/lib/api/response';
import { requireAdmin } from '@/lib/api/auth-middleware';

/**
 * GET /api/admin/events/[eventKey]
 * Get event information
 *
 * Query parameters:
 * - simple=true: Returns just the event object (for edit form)
 * - (default): Returns comprehensive EventDetail with teams, matches, coverage
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
    const { eventKey } = await params;
    const { searchParams } = new URL(request.url);
    const simple = searchParams.get('simple') === 'true';

    if (simple) {
      // Return just the event object for the edit form
      const supabase = createServiceClient();
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('event_key', eventKey)
        .single();

      if (error) {
        console.error('Error fetching event:', error);
        if (error.code === 'PGRST116') {
          return errorResponse('Event not found', 404);
        }
        return errorResponse('Failed to fetch event', 500);
      }

      return NextResponse.json(data);
    }

    // Return comprehensive event detail
    const eventService = getEventService();
    const eventDetail = await eventService.getEventDetail(eventKey);

    return successResponse(eventDetail);
  } catch (error: any) {
    console.error('[API] Get event detail error:', error);

    if (error.name === 'EntityNotFoundError') {
      return errorResponse('Event not found', 404);
    }

    return errorResponse('Failed to fetch event details', 500);
  }
}

/**
 * PUT /api/admin/events/[eventKey]
 * Update event manually OR refresh from TBA
 *
 * If body contains event fields (event_name, etc), performs manual update.
 * If body is empty or contains { refresh: true }, refreshes from TBA.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ eventKey: string }> }
) {
  // Require admin authentication
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { eventKey } = await params;
    const body = await request.json().catch(() => ({}));

    // Check if this is a TBA refresh request
    if (Object.keys(body).length === 0 || body.refresh === true) {
      const eventService = getEventService();
      const updatedEvent = await eventService.refreshEventFromTBA(eventKey);
      return successResponse(updatedEvent);
    }

    // Otherwise, this is a manual update from the edit form
    const supabase = createServiceClient();

    // Validate date range
    if (body.start_date && body.end_date && body.start_date > body.end_date) {
      return errorResponse('End date must be after start date', 400);
    }

    const { data, error } = await supabase
      .from('events')
      .update({
        event_name: body.event_name,
        event_code: body.event_code,
        year: body.year,
        event_type: body.event_type,
        district: body.district || null,
        week: body.week || null,
        city: body.city || null,
        state_province: body.state_province || null,
        country: body.country || null,
        start_date: body.start_date,
        end_date: body.end_date,
        updated_at: new Date().toISOString(),
      })
      .eq('event_key', eventKey)
      .select()
      .single();

    if (error) {
      console.error('Error updating event:', error);
      if (error.code === 'PGRST116') {
        return errorResponse('Event not found', 404);
      }
      return errorResponse('Failed to update event', 500);
    }

    return successResponse(data);
  } catch (error: any) {
    console.error('[API] Update/refresh event error:', error);

    if (error.name === 'EntityNotFoundError') {
      return errorResponse('Event not found', 404);
    }

    if (error.name === 'TBAApiError') {
      return errorResponse(`TBA API error: ${error.message}`, 502);
    }

    return errorResponse('Failed to update event', 500);
  }
}

/**
 * DELETE /api/admin/events/[eventKey]
 * Delete an event and all associated data
 * Warning: This is a destructive operation
 *
 * Note: Due to database constraints, events with matches or scouting data
 * cannot be deleted. Consider archiving instead.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventKey: string }> }
) {
  // Require admin authentication
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { eventKey } = await params;
    const supabase = createServiceClient();

    // Attempt to delete the event
    // This will fail if there are associated matches or scouting data
    // due to foreign key constraints
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('event_key', eventKey);

    if (error) {
      console.error('Error deleting event:', error);

      // Check for foreign key constraint violations
      if (error.code === '23503') {
        return errorResponse(
          'Cannot delete event with associated data (matches, scouting). Delete associated data first.',
          409
        );
      }

      // Event not found
      if (error.code === 'PGRST116') {
        return errorResponse('Event not found', 404);
      }

      return errorResponse('Failed to delete event', 500);
    }

    return successResponse({ message: 'Event deleted successfully' });
  } catch (error: any) {
    console.error('[API] Delete event error:', error);
    return errorResponse('Failed to delete event', 500);
  }
}
