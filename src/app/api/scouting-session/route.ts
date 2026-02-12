import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/api/auth-middleware';
import { successResponse, errorResponse, serverError } from '@/lib/api/response';
import { getScoutingSessionService } from '@/lib/services/scouting-session.service';
import { canManageScoutingSession } from '@/lib/services/auth.service';

/**
 * GET /api/scouting-session?event_key=X
 * Fetch or create a scouting session for an event.
 */
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) return authResult;

  const eventKey = request.nextUrl.searchParams.get('event_key');
  if (!eventKey) {
    return errorResponse('event_key query parameter is required', 400);
  }

  try {
    const service = getScoutingSessionService();
    const session = await service.getOrCreateSession(eventKey);
    return successResponse(session);
  } catch (error) {
    console.error('Error in GET /api/scouting-session:', error);
    return serverError('Failed to get scouting session');
  }
}

/**
 * PATCH /api/scouting-session
 * Update session state (match number, comp level, session data).
 */
export async function PATCH(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) return authResult;

  if (!canManageScoutingSession(authResult.user.profile)) {
    return errorResponse('Only admins and mentors can update scouting sessions', 403);
  }

  try {
    const body = await request.json();

    if (!body.event_key) {
      return errorResponse('event_key is required', 400);
    }

    const updates: {
      current_match_number?: number;
      comp_level?: string;
      session_data?: Record<string, unknown>;
      updated_by: string;
    } = { updated_by: authResult.user.auth.id };

    if (body.current_match_number !== undefined) {
      if (typeof body.current_match_number !== 'number' || !Number.isInteger(body.current_match_number) || body.current_match_number < 1) {
        return errorResponse('current_match_number must be a positive integer', 400);
      }
      updates.current_match_number = body.current_match_number;
    }
    if (body.comp_level !== undefined) {
      const validCompLevels = ['qm', 'ef', 'qf', 'sf', 'f'];
      if (!validCompLevels.includes(body.comp_level)) {
        return errorResponse(`comp_level must be one of: ${validCompLevels.join(', ')}`, 400);
      }
      updates.comp_level = body.comp_level;
    }
    if (body.session_data !== undefined) {
      updates.session_data = body.session_data;
    }

    const service = getScoutingSessionService();
    const session = await service.updateSession(body.event_key, updates);
    return successResponse(session);
  } catch (error) {
    console.error('Error in PATCH /api/scouting-session:', error);
    return serverError('Failed to update scouting session');
  }
}
