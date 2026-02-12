import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/api/auth-middleware';
import { successResponse, errorResponse, serverError } from '@/lib/api/response';
import { getScoutingSessionService } from '@/lib/services/scouting-session.service';
import type { StationKey, MatchOrchestrationState } from '@/types/scouting-session';
import { ALL_STATION_KEYS, getOrchestration } from '@/types/scouting-session';

/**
 * POST /api/scouting-session/notify-submission
 * Any authenticated scouter can mark their own station as submitted.
 * This durably records the submission in session_data so the lead sees it
 * even if the scouter disconnects (losing ephemeral presence).
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
    const service = getScoutingSessionService();
    const session = await service.getOrCreateSession(body.event_key);

    const orchestration = getOrchestration(session.session_data);

    // Find this user's assigned station
    let stationKey: StationKey | null = null;
    for (const key of ALL_STATION_KEYS) {
      if (orchestration.assignments[key]?.user_id === userId) {
        stationKey = key;
        break;
      }
    }

    if (!stationKey) {
      return errorResponse('You are not assigned to a station in this match', 400);
    }

    // Update just the submission for this station
    const updatedSubmissions = {
      ...orchestration.submissions,
      [stationKey]: {
        submitted: true,
        submitted_at: new Date().toISOString(),
      },
    };

    const updatedData = {
      ...session.session_data,
      submissions: updatedSubmissions,
    };

    await service.updateSession(body.event_key, {
      session_data: updatedData,
    });

    return successResponse({ station: stationKey, submitted: true });
  } catch (error) {
    console.error('Error in POST /api/scouting-session/notify-submission:', error);
    return serverError('Failed to notify submission');
  }
}
