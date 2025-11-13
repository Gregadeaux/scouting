/**
 * Admin API: Scouter Management
 * GET /api/admin/scouters - List scouters with filtering
 * POST /api/admin/scouters - Create new scouter
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { successResponse, errorResponse } from '@/lib/api/response';
import { requireAdmin } from '@/lib/api/auth-middleware';
import { ScouterRepository } from '@/lib/repositories';
import type { CreateScouterInput, ScouterQueryOptions } from '@/lib/repositories/scouter.repository';

// GET /api/admin/scouters - List all scouters with filtering
export async function GET(request: NextRequest) {
  // Require admin authentication
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const supabase = createServiceClient();
    const repository = new ScouterRepository(supabase);

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // Build query options matching repository interface
    const queryOptions: ScouterQueryOptions = {
      limit,
      offset,
      search: searchParams.get('search') || undefined,
      team_number: searchParams.get('team') ? parseInt(searchParams.get('team')!) : undefined,
      experience_level: searchParams.get('experience') as ScouterQueryOptions['experience_level'],
      preferred_role: searchParams.get('preferred_role') as ScouterQueryOptions['preferred_role'],
      certification: searchParams.get('certification') || undefined,
      orderBy: searchParams.get('sortBy') || 'user_profiles(full_name)',
      orderDirection: (searchParams.get('sortOrder') || 'asc') as 'asc' | 'desc',
    };

    // Fetch scouters and count
    const [scouters, totalCount] = await Promise.all([
      repository.findAll(queryOptions),
      repository.count({
        search: queryOptions.search,
        team_number: queryOptions.team_number,
        experience_level: queryOptions.experience_level,
        preferred_role: queryOptions.preferred_role,
        certification: queryOptions.certification,
      }),
    ]);

    return successResponse({
      scouters,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasMore: totalCount > offset + limit,
      },
    });
  } catch (error) {
    console.error('Error fetching scouters:', error);
    return errorResponse('Failed to fetch scouters', 500);
  }
}

// POST /api/admin/scouters - Create a new scouter
export async function POST(request: NextRequest) {
  // Require admin authentication
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const supabase = createServiceClient();
    const repository = new ScouterRepository(supabase);

    const body = await request.json();

    // Validate required fields based on repository requirements
    if (!body.user_id) {
      return errorResponse('Missing required field: user_id', 400);
    }

    // Build create input matching repository interface
    const createInput: CreateScouterInput = {
      user_id: body.user_id,
      team_number: body.team_number || undefined,
      experience_level: body.experience_level || 'rookie',
      preferred_role: body.preferred_role || undefined,
      certifications: body.certifications || [],
      availability_notes: body.availability_notes || undefined,
    };

    // Handle team_number with validation
    if (body.team_number !== undefined) {
      const parsed = parseInt(body.team_number);
      if (isNaN(parsed) || parsed < 0) {
        return errorResponse('team_number must be a positive integer', 400);
      }
      createInput.team_number = parsed;
    }

    // Validate certifications is an array
    if (body.certifications !== undefined) {
      if (!Array.isArray(body.certifications)) {
        return errorResponse('certifications must be an array', 400);
      }
      createInput.certifications = body.certifications;
    }

    // Validate experience_level
    const validExperienceLevels = ['rookie', 'intermediate', 'veteran'];
    if (body.experience_level && !validExperienceLevels.includes(body.experience_level)) {
      return errorResponse(`experience_level must be one of: ${validExperienceLevels.join(', ')}`, 400);
    }

    // Validate preferred_role
    if (body.preferred_role) {
      const validRoles = ['match_scouting', 'pit_scouting', 'both'];
      if (!validRoles.includes(body.preferred_role)) {
        return errorResponse(`preferred_role must be one of: ${validRoles.join(', ')}`, 400);
      }
    }

    // Create scouter
    const scouter = await repository.create(createInput);

    return successResponse(
      { scouter, message: 'Scouter created successfully' },
      201
    );
  } catch (error) {
    console.error('Error creating scouter:', error);

    // Check for database errors
    if (error && typeof error === 'object' && 'code' in error) {
      const dbError = error as { code: string };
      // Check for duplicate error
      if (dbError.code === '23505') {
        return errorResponse('A scouter with this information already exists', 409);
      }

      // Check for foreign key constraint (invalid team_affiliation or user_id)
      if (dbError.code === '23503') {
        return errorResponse('Invalid team affiliation or user ID. Referenced record does not exist.', 400);
      }
    }

    return errorResponse('Failed to create scouter', 500);
  }
}