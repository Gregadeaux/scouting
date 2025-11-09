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

    // Build update input - only include provided fields
    const updateInput: UpdateScouterInput = {};

    if (body.scout_name !== undefined) {
      updateInput.scout_name = body.scout_name;
    }

    if (body.team_affiliation !== undefined) {
      updateInput.team_affiliation = body.team_affiliation ? parseInt(body.team_affiliation) : undefined;
    }

    if (body.role !== undefined) {
      updateInput.role = body.role;
    }

    if (body.email !== undefined) {
      updateInput.email = body.email;
    }

    if (body.phone !== undefined) {
      updateInput.phone = body.phone;
    }

    if (body.experience_level !== undefined) {
      updateInput.experience_level = body.experience_level;
    }

    if (body.certifications !== undefined) {
      updateInput.certifications = body.certifications;
    }

    if (body.preferred_position !== undefined) {
      updateInput.preferred_position = body.preferred_position;
    }

    if (body.notes !== undefined) {
      updateInput.notes = body.notes;
    }

    if (body.active !== undefined) {
      updateInput.active = body.active;
    }

    if (body.matches_scouted !== undefined) {
      updateInput.matches_scouted = parseInt(body.matches_scouted);
    }

    if (body.reliability_score !== undefined) {
      updateInput.reliability_score = parseFloat(body.reliability_score);
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