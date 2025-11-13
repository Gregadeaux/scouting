/**
 * Admin API: Individual Scouter Operations
 * GET /api/admin/scouters/[id] - Get single scouter by ID
 * PATCH /api/admin/scouters/[id] - Update scouter
 * DELETE /api/admin/scouters/[id] - Delete scouter
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { successResponse, errorResponse } from '@/lib/api/response';
import { requireAdmin } from '@/lib/api/auth-middleware';
import { ScouterRepository } from '@/lib/repositories';
import type { UpdateScouterInput } from '@/lib/repositories/scouter.repository';
import { EntityNotFoundError, RepositoryError } from '@/lib/repositories/base.repository';

// GET /api/admin/scouters/[id] - Get a single scouter
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Require admin authentication
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const supabase = createServiceClient();
    const repository = new ScouterRepository(supabase);
    const { id } = await params;

    const scouter = await repository.findById(id);

    if (!scouter) {
      return errorResponse('Scouter not found', 404);
    }

    return successResponse({ scouter });
  } catch (error) {
    console.error('Error fetching scouter:', error);
    return errorResponse('Failed to fetch scouter', 500);
  }
}

// PATCH /api/admin/scouters/[id] - Update a scouter
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Require admin authentication
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const supabase = createServiceClient();
    const repository = new ScouterRepository(supabase);
    const { id } = await params;
    const body = await request.json();

    // Build update input matching repository interface - only include provided fields
    const updateInput: UpdateScouterInput = {};

    // Handle team_number with validation
    if (body.team_number !== undefined) {
      if (body.team_number === null) {
        updateInput.team_number = null;
      } else {
        const parsed = parseInt(body.team_number);
        if (isNaN(parsed) || parsed < 0) {
          return errorResponse('team_number must be a positive integer or null', 400);
        }
        updateInput.team_number = parsed;
      }
    }

    if (body.experience_level !== undefined) {
      const validExperienceLevels = ['rookie', 'intermediate', 'veteran'];
      if (!validExperienceLevels.includes(body.experience_level)) {
        return errorResponse(`experience_level must be one of: ${validExperienceLevels.join(', ')}`, 400);
      }
      updateInput.experience_level = body.experience_level;
    }

    if (body.preferred_role !== undefined) {
      if (body.preferred_role === null) {
        updateInput.preferred_role = null;
      } else {
        const validRoles = ['match_scouting', 'pit_scouting', 'both'];
        if (!validRoles.includes(body.preferred_role)) {
          return errorResponse(`preferred_role must be one of: ${validRoles.join(', ')}`, 400);
        }
        updateInput.preferred_role = body.preferred_role;
      }
    }

    if (body.certifications !== undefined) {
      if (!Array.isArray(body.certifications)) {
        return errorResponse('certifications must be an array', 400);
      }
      updateInput.certifications = body.certifications;
    }

    if (body.availability_notes !== undefined) {
      updateInput.availability_notes = body.availability_notes;
    }

    // Check if there's anything to update
    if (Object.keys(updateInput).length === 0) {
      return errorResponse('No valid fields to update', 400);
    }

    // Perform update
    const scouter = await repository.update(id, updateInput);

    return successResponse(
      { scouter, message: 'Scouter updated successfully' },
      200
    );
  } catch (error) {
    console.error('Error updating scouter:', error);

    if (error instanceof EntityNotFoundError) {
      return errorResponse('Scouter not found', 404);
    }

    if (error instanceof RepositoryError) {
      return errorResponse(error.message, 400);
    }

    // Check for foreign key constraint (invalid team_affiliation)
    if (error && typeof error === 'object' && 'code' in error) {
      const dbError = error as { code: string };
      if (dbError.code === '23503') {
        return errorResponse('Invalid team affiliation. Team does not exist.', 400);
      }
    }

    return errorResponse('Failed to update scouter', 500);
  }
}

// DELETE /api/admin/scouters/[id] - Delete a scouter
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Require admin authentication
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const supabase = createServiceClient();
    const repository = new ScouterRepository(supabase);
    const { id } = await params;

    await repository.delete(id);

    return successResponse(
      { message: 'Scouter deleted successfully' },
      200
    );
  } catch (error) {
    console.error('Error deleting scouter:', error);

    if (error instanceof EntityNotFoundError) {
      return errorResponse('Scouter not found', 404);
    }

    if (error instanceof RepositoryError) {
      return errorResponse(error.message, 400);
    }

    // Check for foreign key constraint
    if (error && typeof error === 'object' && 'code' in error) {
      const dbError = error as { code: string };
      if (dbError.code === '23503') {
        return errorResponse(
          'Cannot delete scouter with associated scouting data. Please delete or reassign related records first.',
          409
        );
      }
    }

    return errorResponse('Failed to delete scouter', 500);
  }
}