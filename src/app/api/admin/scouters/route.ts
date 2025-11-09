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

    // Build query options
    const queryOptions: ScouterQueryOptions = {
      limit,
      offset,
      search: searchParams.get('search') || undefined,
      team_number: searchParams.get('team') ? parseInt(searchParams.get('team')!) : undefined,
      experience_level: searchParams.get('experience') as ScouterQueryOptions['experience_level'],
      role: searchParams.get('role') as ScouterQueryOptions['role'],
      active: searchParams.get('active') ? searchParams.get('active') === 'true' : undefined,
      certification: searchParams.get('certification') || undefined,
      orderBy: searchParams.get('sortBy') || 'scout_name',
      orderDirection: (searchParams.get('sortOrder') || 'asc') as 'asc' | 'desc',
    };

    // Fetch scouters and count
    const [scouters, totalCount] = await Promise.all([
      repository.findAll(queryOptions),
      repository.count({
        search: queryOptions.search,
        team_number: queryOptions.team_number,
        experience_level: queryOptions.experience_level,
        role: queryOptions.role,
        active: queryOptions.active,
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

    // Validate required fields
    if (!body.scout_name) {
      return errorResponse('Missing required field: scout_name', 400);
    }

    // Build create input
    const createInput: CreateScouterInput = {
      scout_name: body.scout_name,
      team_affiliation: body.team_affiliation ? parseInt(body.team_affiliation) : undefined,
      role: body.role || undefined,
      email: body.email || undefined,
      phone: body.phone || undefined,
      experience_level: body.experience_level || undefined,
      certifications: body.certifications || [],
      preferred_position: body.preferred_position || undefined,
      notes: body.notes || undefined,
      active: body.active !== undefined ? body.active : true,
      user_id: body.user_id || undefined,
    };

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

      // Check for foreign key constraint (invalid team_affiliation)
      if (dbError.code === '23503') {
        return errorResponse('Invalid team affiliation. Team does not exist.', 400);
      }
    }

    return errorResponse('Failed to create scouter', 500);
  }
}