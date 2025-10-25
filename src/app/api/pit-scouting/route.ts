import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { successResponse, errorResponse, serverError, unauthorizedError } from '@/lib/api/response';
import { ScoutingDataRepository } from '@/lib/repositories/scouting-data.repository';
import {
  PitScoutingService,
  PitScoutingValidationError,
  DuplicatePitScoutingError,
  PitScoutingNotFoundError,
  UnsupportedSchemaVersionError,
} from '@/lib/services/pit-scouting.service';
import type {
  CreatePitScoutingDTO,
  UpdatePitScoutingDTO,
  PitScoutingQueryParams,
} from '@/lib/services/types/pit-scouting-dto';

/**
 * Create service instance with authenticated client
 */
async function getPitScoutingService() {
  const supabase = await createClient();
  const repository = new ScoutingDataRepository(supabase);
  return new PitScoutingService(repository);
}

/**
 * POST /api/pit-scouting
 * Submit new pit scouting observation with validation
 *
 * Request Body:
 * - event_key: string (required)
 * - team_number: number (required)
 * - scout_id: string (required) - scouted_by field
 * - robot_capabilities: RobotCapabilities2025 JSONB (required)
 * - autonomous_capabilities: AutonomousCapabilities2025 JSONB (required)
 * - physical_description?: string (optional - maps to robot_features)
 * - photos?: string[] (optional - maps to photo_urls)
 * - notes?: string (optional - maps to scouting_notes)
 * - drive_train?: string
 * - drive_motors?: string
 * - programming_language?: string
 * - robot_weight_lbs?: number
 * - height_inches?: number
 * - width_inches?: number
 * - length_inches?: number
 * - team_strategy?: string
 * - preferred_starting_position?: number
 * - team_goals?: string
 * - team_comments?: string
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
      return unauthorizedError('You must be logged in to submit pit scouting data');
    }

    // Parse request body as DTO
    const body = await request.json();
    const dto: CreatePitScoutingDTO = {
      event_key: body.event_key,
      team_number: body.team_number,
      scout_id: body.scout_id,
      robot_capabilities: body.robot_capabilities,
      autonomous_capabilities: body.autonomous_capabilities,
      physical_description: body.physical_description,
      photos: body.photos,
      notes: body.notes,
      drive_train: body.drive_train,
      drive_motors: body.drive_motors,
      programming_language: body.programming_language,
      robot_weight_lbs: body.robot_weight_lbs,
      height_inches: body.height_inches,
      width_inches: body.width_inches,
      length_inches: body.length_inches,
      team_strategy: body.team_strategy,
      preferred_starting_position: body.preferred_starting_position,
      team_goals: body.team_goals,
      team_comments: body.team_comments,
    };

    // Delegate to service
    const service = await getPitScoutingService();
    const result = await service.createPitScouting(dto);

    return successResponse(result, 201);
  } catch (error) {
    // Handle service errors
    if (error instanceof PitScoutingValidationError) {
      return errorResponse(error.message, 400, error.errors);
    }
    if (error instanceof DuplicatePitScoutingError) {
      return errorResponse(
        'A pit scouting observation already exists for this team and event. Use PUT to update.',
        409
      );
    }
    if (error instanceof UnsupportedSchemaVersionError) {
      return errorResponse(
        `Unsupported schema version: ${error.version}. Supported versions: ${error.supportedVersions.join(', ')}`,
        400
      );
    }

    console.error('Error creating pit scouting observation:', error);
    return serverError();
  }
}

/**
 * GET /api/pit-scouting
 * Retrieve pit scouting observations with filters
 *
 * Query Parameters:
 * - team_number (optional): Filter by team
 * - event_key (optional): Filter by event
 * - scout_id (optional): Filter by scout (scouted_by)
 * - limit (optional, default 50): Max results
 * - offset (optional, default 0): Pagination offset
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
      return unauthorizedError('You must be logged in to view pit scouting data');
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryParams: PitScoutingQueryParams = {
      team_number: searchParams.get('team_number')
        ? parseInt(searchParams.get('team_number')!)
        : undefined,
      event_key: searchParams.get('event_key') || undefined,
      scout_id: searchParams.get('scout_id') || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0,
    };

    // Validate query parameters
    if (queryParams.limit && (queryParams.limit < 1 || queryParams.limit > 200)) {
      return errorResponse('limit must be between 1 and 200', 400);
    }
    if (queryParams.offset && queryParams.offset < 0) {
      return errorResponse('offset must be >= 0', 400);
    }
    if (queryParams.team_number && isNaN(queryParams.team_number)) {
      return errorResponse('team_number must be a valid number', 400);
    }

    // Delegate to service
    const service = await getPitScoutingService();

    // If filtering by event_key only, use optimized method
    if (queryParams.event_key && !queryParams.team_number && !queryParams.scout_id) {
      const data = await service.getPitScoutingByEvent(queryParams.event_key);
      return successResponse({
        data,
        pagination: {
          limit: queryParams.limit || 50,
          offset: queryParams.offset || 0,
          total: data.length,
        },
      });
    }

    // If filtering by team and event, use single lookup
    if (queryParams.team_number && queryParams.event_key) {
      const entry = await service.getPitScoutingByTeam(queryParams.event_key, queryParams.team_number);
      return successResponse({
        data: entry ? [entry] : [],
        pagination: {
          limit: queryParams.limit || 50,
          offset: queryParams.offset || 0,
          total: entry ? 1 : 0,
        },
      });
    }

    // For other query combinations, return empty for now
    // TODO: Implement queryPitScouting method in service for complex filters
    return successResponse({
      data: [],
      pagination: {
        limit: queryParams.limit || 50,
        offset: queryParams.offset || 0,
        total: 0,
      },
    });
  } catch (error) {
    console.error('Error fetching pit scouting data:', error);
    return serverError();
  }
}

/**
 * PUT /api/pit-scouting
 * Update existing pit scouting observation
 *
 * Request Body:
 * - id: string (UUID) - ID of pit scouting observation to update
 * - Same optional fields as POST
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return unauthorizedError('You must be logged in to update pit scouting data');
    }

    // Parse request body
    const body = await request.json();

    // Validate ID is present
    if (!body.id) {
      return errorResponse('id is required for updates', 400);
    }

    const dto: UpdatePitScoutingDTO = {
      id: body.id,
      event_key: body.event_key,
      team_number: body.team_number,
      scout_id: body.scout_id,
      robot_capabilities: body.robot_capabilities,
      autonomous_capabilities: body.autonomous_capabilities,
      physical_description: body.physical_description,
      photos: body.photos,
      notes: body.notes,
      drive_train: body.drive_train,
      drive_motors: body.drive_motors,
      programming_language: body.programming_language,
      robot_weight_lbs: body.robot_weight_lbs,
      height_inches: body.height_inches,
      width_inches: body.width_inches,
      length_inches: body.length_inches,
      team_strategy: body.team_strategy,
      preferred_starting_position: body.preferred_starting_position,
      team_goals: body.team_goals,
      team_comments: body.team_comments,
    };

    // Delegate to service
    const service = await getPitScoutingService();
    const result = await service.updatePitScouting(dto.id, dto);

    return successResponse(result);
  } catch (error) {
    // Handle service errors
    if (error instanceof PitScoutingValidationError) {
      return errorResponse(error.message, 400, error.errors);
    }
    if (error instanceof PitScoutingNotFoundError) {
      return errorResponse('Pit scouting observation not found', 404);
    }
    if (error instanceof UnsupportedSchemaVersionError) {
      return errorResponse(
        `Unsupported schema version: ${error.version}. Supported versions: ${error.supportedVersions.join(', ')}`,
        400
      );
    }

    console.error('Error updating pit scouting observation:', error);
    return serverError();
  }
}
