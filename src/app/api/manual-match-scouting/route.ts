import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/api/auth-middleware';
import { successResponse, errorResponse, serverError } from '@/lib/api/response';
import { getManualMatchService } from '@/lib/services/manual-match.service';

/**
 * Map service-layer error messages to HTTP status codes.
 * Duplicates are 409, client errors (bad input) are 400, everything else is 500.
 */
function getServiceErrorStatus(message: string): number {
  if (message.includes('Duplicate')) return 409;
  if (message.includes('not a manual-schedule') || message.includes('not found')) return 400;
  return 500;
}

/**
 * POST /api/manual-match-scouting
 * Submit scouting data for a manual-schedule event.
 * Separate from /api/match-scouting to keep the TBA workflow untouched.
 */
export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) return authResult;

  try {
    const body = await request.json();

    // Validate required fields
    const requiredFields = [
      'event_key',
      'match_number',
      'team_number',
      'alliance_color',
      'scout_name',
      'auto_performance',
      'teleop_performance',
      'endgame_performance',
    ];

    const missing = requiredFields.filter((f) => body[f] === undefined || body[f] === null);
    if (missing.length > 0) {
      return errorResponse(`Missing required fields: ${missing.join(', ')}`, 400);
    }

    // Validate alliance color
    if (body.alliance_color !== 'red' && body.alliance_color !== 'blue') {
      return errorResponse('alliance_color must be "red" or "blue"', 400);
    }

    // Validate match number
    if (typeof body.match_number !== 'number' || !Number.isInteger(body.match_number) || body.match_number < 1) {
      return errorResponse('match_number must be a positive integer', 400);
    }

    // Validate team number
    if (typeof body.team_number !== 'number' || !Number.isInteger(body.team_number) || body.team_number < 1) {
      return errorResponse('team_number must be a positive integer', 400);
    }

    const service = getManualMatchService();
    const result = await service.submitScoutingData({
      ...body,
      scout_id: authResult.user.auth.id,
    });

    return successResponse(result, 201);
  } catch (error) {
    console.error('Error in POST /api/manual-match-scouting:', error);

    if (error instanceof Error) {
      const status = getServiceErrorStatus(error.message);
      return errorResponse(error.message, status);
    }

    return serverError('Failed to submit manual match scouting data');
  }
}
