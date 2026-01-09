import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api/auth-middleware';
import { createSeasonConfigRepository } from '@/lib/repositories';
import type { SeasonConfigUpdate } from '@/types';

interface RouteParams {
  params: Promise<{ year: string }>;
}

/**
 * GET /api/admin/seasons/[year] - Get full season configuration details
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  // Require admin authentication
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { year: yearParam } = await params;
    const year = parseInt(yearParam);

    if (isNaN(year) || year < 1992 || year > 2100) {
      return NextResponse.json(
        { success: false, error: 'Invalid year parameter' },
        { status: 400 }
      );
    }

    const repository = createSeasonConfigRepository();
    const season = await repository.findByYear(year);

    if (!season) {
      return NextResponse.json(
        { success: false, error: 'Season configuration not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: season,
    });
  } catch (error) {
    console.error('Error in GET /api/admin/seasons/[year]:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch season configuration' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/seasons/[year] - Update season configuration metadata
 * Note: Schema updates should be done via migrations/code for type safety
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  // Require admin authentication
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { year: yearParam } = await params;
    const year = parseInt(yearParam);

    if (isNaN(year) || year < 1992 || year > 2100) {
      return NextResponse.json(
        { success: false, error: 'Invalid year parameter' },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Validate the update payload - only allow editable fields
    const allowedFields: (keyof SeasonConfigUpdate)[] = [
      'game_name',
      'game_description',
      'kickoff_date',
      'championship_start_date',
      'championship_end_date',
      'rules_manual_url',
      'game_animation_url',
      'notes',
    ];

    const updateData: SeasonConfigUpdate = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    // Validate required fields if provided
    if (updateData.game_name !== undefined && !updateData.game_name.trim()) {
      return NextResponse.json(
        { success: false, error: 'game_name cannot be empty' },
        { status: 400 }
      );
    }

    // Validate URL fields if provided
    const urlFields = ['rules_manual_url', 'game_animation_url'] as const;
    for (const field of urlFields) {
      const value = updateData[field];
      if (value && value.trim()) {
        try {
          new URL(value);
        } catch {
          return NextResponse.json(
            { success: false, error: `${field} must be a valid URL` },
            { status: 400 }
          );
        }
      }
    }

    // Validate date fields if provided
    const dateFields = ['kickoff_date', 'championship_start_date', 'championship_end_date'] as const;
    for (const field of dateFields) {
      const value = updateData[field];
      if (value && value.trim()) {
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          return NextResponse.json(
            { success: false, error: `${field} must be a valid date` },
            { status: 400 }
          );
        }
      }
    }

    // Validate championship date range if both provided
    if (updateData.championship_start_date && updateData.championship_end_date) {
      const start = new Date(updateData.championship_start_date);
      const end = new Date(updateData.championship_end_date);
      if (end < start) {
        return NextResponse.json(
          { success: false, error: 'championship_end_date must be >= championship_start_date' },
          { status: 400 }
        );
      }
    }

    const repository = createSeasonConfigRepository();
    const updatedSeason = await repository.update(year, updateData);

    // Log the update for audit purposes
    const { user } = authResult;
    console.log(
      `[AUDIT] Season ${year} updated by ${user.profile.email}:`,
      JSON.stringify(updateData)
    );

    return NextResponse.json({
      success: true,
      data: updatedSeason,
    });
  } catch (error) {
    console.error('Error in PATCH /api/admin/seasons/[year]:', error);

    // Check for not found error
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { success: false, error: 'Season configuration not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to update season configuration' },
      { status: 500 }
    );
  }
}
