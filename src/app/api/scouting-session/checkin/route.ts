import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/api/auth-middleware';
import { successResponse, errorResponse, serverError } from '@/lib/api/response';
import { getScoutingSessionService } from '@/lib/services/scouting-session.service';

/**
 * POST /api/scouting-session/checkin
 * Scouters call this periodically to register their presence.
 * Stores presence in session_data.checkins so the lead can see who's connected
 * without relying on Supabase Realtime presence.
 */
export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) return authResult;

  try {
    const body = await request.json();

    if (!body.event_key) {
      return errorResponse('event_key is required', 400);
    }

    const userId = authResult.user.auth.id;
    const scoutName = body.scout_name || authResult.user.profile?.full_name || 'Unknown';
    const status = body.status || 'connected';

    const service = getScoutingSessionService();
    const session = await service.getOrCreateSession(body.event_key);

    const currentData = session.session_data as Record<string, unknown>;
    const checkins = (currentData.checkins ?? {}) as Record<string, unknown>;

    checkins[userId] = {
      scoutName,
      status,
      lastSeen: new Date().toISOString(),
    };

    await service.updateSession(body.event_key, {
      session_data: { ...currentData, checkins },
    });

    return successResponse({ ok: true });
  } catch (error) {
    console.error('Error in POST /api/scouting-session/checkin:', error);
    return serverError('Failed to check in');
  }
}
