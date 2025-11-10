/**
 * Individual Picklist Configuration API
 *
 * PATCH /api/admin/picklist/configurations/[id]
 *   - Update configuration (name, columns, isDefault)
 *
 * DELETE /api/admin/picklist/configurations/[id]
 *   - Delete configuration
 *
 * Related: SCOUT-58
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { successResponse, errorResponse } from '@/lib/api/response';
import { pickListConfigurationRepository } from '@/lib/repositories/picklist-configuration.repository';
import type { UpdateConfigurationRequest } from '@/types/picklist';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * PATCH /api/admin/picklist/configurations/[id]
 * Update an existing configuration
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
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

    const { id } = await params;

    // Verify configuration exists and belongs to user
    const existing = await pickListConfigurationRepository.findById(id);
    if (!existing) {
      return errorResponse('Configuration not found', 404);
    }

    if (existing.userId !== user.id) {
      return errorResponse('Forbidden: You do not own this configuration', 403);
    }

    // Parse and validate request body
    const body = (await request.json()) as UpdateConfigurationRequest;

    // Validate name if provided
    if (body.name !== undefined) {
      if (body.name.trim().length === 0) {
        return errorResponse('Configuration name cannot be empty', 400);
      }
      if (body.name.length > 255) {
        return errorResponse('Configuration name too long (max 255 characters)', 400);
      }
    }

    // Validate columns if provided
    if (body.configuration?.columns) {
      if (!Array.isArray(body.configuration.columns)) {
        return errorResponse('configuration.columns must be an array', 400);
      }

      for (const col of body.configuration.columns) {
        if (!col.id || !col.sortMetric || !col.sortDirection) {
          return errorResponse(
            'Each column must have id, sortMetric, and sortDirection',
            400
          );
        }
      }
    }

    // Update configuration
    const updated = await pickListConfigurationRepository.update(id, body);

    return successResponse(updated);
  } catch (error) {
    console.error('[API] Error updating picklist configuration:', error);

    // Handle duplicate name error
    if (
      error instanceof Error &&
      error.message.includes('already exists')
    ) {
      return errorResponse(error.message, 409);
    }

    return errorResponse(
      error instanceof Error ? error.message : 'Failed to update configuration',
      500
    );
  }
}

/**
 * DELETE /api/admin/picklist/configurations/[id]
 * Delete a configuration
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    const { id } = await params;

    // Verify configuration exists and belongs to user
    const existing = await pickListConfigurationRepository.findById(id);
    if (!existing) {
      return errorResponse('Configuration not found', 404);
    }

    if (existing.userId !== user.id) {
      return errorResponse('Forbidden: You do not own this configuration', 403);
    }

    // Delete configuration
    await pickListConfigurationRepository.delete(id);

    return successResponse({ message: 'Configuration deleted successfully' });
  } catch (error) {
    console.error('[API] Error deleting picklist configuration:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to delete configuration',
      500
    );
  }
}
