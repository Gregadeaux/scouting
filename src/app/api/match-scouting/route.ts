import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { successResponse, errorResponse, unauthorizedError, serverError } from '@/lib/api/response';
import { validateMatchScoutingData2025 } from '@/lib/supabase/validation';
import type { MatchScoutingSubmission } from '@/types';

/**
 * POST /api/match-scouting
 * Submit new match scouting observation with season-specific validation
 *
 * Request Body:
 * {
 *   match_id: number;
 *   team_number: number;
 *   scout_id: string;
 *   auto_performance: AutoPerformance2025;
 *   teleop_performance: TeleopPerformance2025;
 *   endgame_performance: EndgamePerformance2025;
 *   alliance_color?: 'red' | 'blue';
 *   starting_position?: 1 | 2 | 3;
 *   robot_disconnected?: boolean;
 *   robot_disabled?: boolean;
 *   robot_tipped?: boolean;
 *   foul_count?: number;
 *   tech_foul_count?: number;
 *   yellow_card?: boolean;
 *   red_card?: boolean;
 *   defense_rating?: number;
 *   driver_skill_rating?: number;
 *   speed_rating?: number;
 *   strengths?: string;
 *   weaknesses?: string;
 *   notes?: string;
 *   confidence_level?: number;
 *   device_id?: string;
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return unauthorizedError('Authentication required');
    }

    const body = await request.json();

    // Validate required fields
    const requiredFields = [
      'match_id',
      'team_number',
      'scout_name',
      'auto_performance',
      'teleop_performance',
      'endgame_performance',
    ];

    const missingFields = requiredFields.filter((field) => !body[field]);

    if (missingFields.length > 0) {
      return errorResponse(
        `Missing required fields: ${missingFields.join(', ')}`,
        400,
        { missing_fields: missingFields }
      );
    }

    // Detect schema version from auto_performance
    const schemaVersion = body.auto_performance?.schema_version;

    if (!schemaVersion) {
      return errorResponse(
        'Schema version not found in auto_performance',
        400,
        { field: 'auto_performance.schema_version' }
      );
    }

    // Route to appropriate validator based on schema version
    let validationResult;

    if (schemaVersion === '2025.1') {
      validationResult = validateMatchScoutingData2025({
        auto_performance: body.auto_performance,
        teleop_performance: body.teleop_performance,
        endgame_performance: body.endgame_performance,
      });
    } else {
      return errorResponse(
        `Unknown schema version: ${schemaVersion}. Supported versions: 2025.1`,
        400,
        { schema_version: schemaVersion }
      );
    }

    // Return validation errors if validation failed
    if (!validationResult.valid) {
      return errorResponse('Validation failed', 400, {
        validation_errors: validationResult.errors,
      });
    }

    // Prepare data for insertion
    const scoutingData: Partial<MatchScoutingSubmission> = {
      match_id: parseInt(body.match_id),
      team_number: parseInt(body.team_number),
      scout_name: body.scout_name,
      alliance_color: body.alliance_color || 'blue',
      starting_position: body.starting_position,
      robot_disconnected: body.robot_disconnected || false,
      robot_disabled: body.robot_disabled || false,
      robot_tipped: body.robot_tipped || false,
      foul_count: body.foul_count || 0,
      tech_foul_count: body.tech_foul_count || 0,
      yellow_card: body.yellow_card || false,
      red_card: body.red_card || false,
      auto_performance: body.auto_performance,
      teleop_performance: body.teleop_performance,
      endgame_performance: body.endgame_performance,
      defense_rating: body.defense_rating,
      driver_skill_rating: body.driver_skill_rating,
      speed_rating: body.speed_rating,
      strengths: body.strengths,
      weaknesses: body.weaknesses,
      notes: body.notes,
      confidence_level: body.confidence_level,
      device_id: body.device_id,
    };

    // Insert into match_scouting table
    const { data, error } = await supabase
      .from('match_scouting')
      .insert(scoutingData)
      .select()
      .single();

    if (error) {
      // Handle duplicate observation (unique constraint violation)
      if (error.code === '23505') {
        return errorResponse(
          'Duplicate observation: This scout has already submitted data for this team in this match',
          409,
          {
            constraint: 'match_id, team_number, scout_name',
            match_id: body.match_id,
            team_number: body.team_number,
            scout_name: body.scout_name,
          }
        );
      }

      // Handle other database errors
      return errorResponse(`Database error: ${error.message}`, 500, {
        code: error.code,
        details: error.details,
      });
    }

    return successResponse(data, 201);
  } catch (error) {
    console.error('Error creating match scouting observation:', error);
    if (error instanceof SyntaxError) {
      return errorResponse('Invalid JSON in request body', 400);
    }
    return serverError('Failed to create match scouting observation');
  }
}

/**
 * GET /api/match-scouting
 * Retrieve match scouting observations with filters and pagination
 *
 * Query Parameters:
 * - match_id: Filter by match ID
 * - team_number: Filter by team number
 * - event_key: Filter by event (joins through matches table)
 * - scout_name: Filter by scout name
 * - limit: Max results (default 50, max 200)
 * - offset: Pagination offset (default 0)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return unauthorizedError('Authentication required');
    }

    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const matchId = searchParams.get('match_id');
    const teamNumber = searchParams.get('team_number');
    const eventKey = searchParams.get('event_key');
    const scoutName = searchParams.get('scout_name');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);
    const offset = parseInt(searchParams.get('offset') || '0');

    // Validate pagination parameters
    if (isNaN(limit) || limit <= 0) {
      return errorResponse('Invalid limit parameter', 400);
    }

    if (isNaN(offset) || offset < 0) {
      return errorResponse('Invalid offset parameter', 400);
    }

    // Build query with joins
    let query = supabase
      .from('match_scouting')
      .select(
        `
        *,
        match:match_schedule!inner(
          match_key,
          event_key,
          comp_level,
          match_number,
          scheduled_time,
          event:events(
            event_name,
            event_code,
            year
          )
        )
      `,
        { count: 'exact' }
      );

    // Apply filters
    if (matchId) {
      const parsedMatchId = parseInt(matchId);
      if (isNaN(parsedMatchId)) {
        return errorResponse('Invalid match_id parameter', 400);
      }
      query = query.eq('match_id', parsedMatchId);
    }

    if (teamNumber) {
      const parsedTeamNumber = parseInt(teamNumber);
      if (isNaN(parsedTeamNumber)) {
        return errorResponse('Invalid team_number parameter', 400);
      }
      query = query.eq('team_number', parsedTeamNumber);
    }

    if (eventKey) {
      query = query.eq('match.event_key', eventKey);
    }

    if (scoutName) {
      query = query.eq('scout_name', scoutName);
    }

    // Apply pagination and ordering
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      return errorResponse(`Database error: ${error.message}`, 500, {
        code: error.code,
        details: error.details,
      });
    }

    // Return paginated response
    return successResponse({
      data: data || [],
      pagination: {
        limit,
        offset,
        total: count || 0,
        has_more: count ? offset + limit < count : false,
      },
    });
  } catch (error) {
    console.error('Error fetching match scouting observations:', error);
    return serverError('Failed to fetch match scouting observations');
  }
}
