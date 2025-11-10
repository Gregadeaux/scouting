/**
 * Picklist Configurations API
 *
 * GET /api/admin/picklist/configurations?eventKey={key}
 *   - List all saved configurations for user + event
 *
 * POST /api/admin/picklist/configurations
 *   - Create new configuration
 *
 * Related: SCOUT-58
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { successResponse, errorResponse } from '@/lib/api/response';
import { pickListConfigurationRepository } from '@/lib/repositories/picklist-configuration.repository';
import type { SaveConfigurationRequest } from '@/types/picklist';

/**
 * GET /api/admin/picklist/configurations
 * List all saved configurations for user and event
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
      return errorResponse('Unauthorized', 401);
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const eventKey = searchParams.get('eventKey');

    if (!eventKey) {
      return errorResponse('eventKey query parameter is required', 400);
    }

    // Fetch configurations
    const configurations = await pickListConfigurationRepository.findByUserAndEvent(
      user.id,
      eventKey
    );

    return successResponse(configurations);
  } catch (error) {
    console.error('[API] Error fetching picklist configurations:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to fetch configurations',
      500
    );
  }
}

/**
 * POST /api/admin/picklist/configurations
 * Create a new configuration
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
      return errorResponse('Unauthorized', 401);
    }

    // Parse and validate request body
    const body = (await request.json()) as SaveConfigurationRequest;

    if (!body.eventKey || !body.name || !body.configuration) {
      return errorResponse(
        'Missing required fields: eventKey, name, configuration',
        400
      );
    }

    if (!body.configuration.columns || !Array.isArray(body.configuration.columns)) {
      return errorResponse('configuration.columns must be an array', 400);
    }

    if (body.name.trim().length === 0) {
      return errorResponse('Configuration name cannot be empty', 400);
    }

    if (body.name.length > 255) {
      return errorResponse('Configuration name too long (max 255 characters)', 400);
    }

    // Validate columns structure
    for (const col of body.configuration.columns) {
      if (!col.id || !col.sortMetric || !col.sortDirection) {
        return errorResponse(
          'Each column must have id, sortMetric, and sortDirection',
          400
        );
      }
    }

    // Create configuration
    const configuration = await pickListConfigurationRepository.create(body, user.id);

    return successResponse(configuration, 201);
  } catch (error) {
    console.error('[API] Error creating picklist configuration:', error);

    // Handle duplicate name error
    if (
      error instanceof Error &&
      error.message.includes('already exists')
    ) {
      return errorResponse(error.message, 409);
    }

    return errorResponse(
      error instanceof Error ? error.message : 'Failed to create configuration',
      500
    );
  }
}
