import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api/auth-middleware';
import { createSeasonConfigRepository } from '@/lib/repositories';

/**
 * GET /api/admin/seasons - List all season configurations
 */
export async function GET(request: NextRequest) {
  // Require admin authentication
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const repository = createSeasonConfigRepository();
    const seasons = await repository.findAll();

    return NextResponse.json({
      success: true,
      data: seasons,
    });
  } catch (error) {
    console.error('Error in GET /api/admin/seasons:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch season configurations' },
      { status: 500 }
    );
  }
}
