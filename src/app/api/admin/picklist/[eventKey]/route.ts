/**
 * Pick List API Endpoints
 *
 * GET /api/admin/picklist/[eventKey] - Generate pick list with pre-built strategy
 * POST /api/admin/picklist/[eventKey] - Generate pick list with custom weights
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api/auth-middleware';
import { createPickListService, PICK_LIST_STRATEGIES } from '@/lib/services/picklist.service';
import { createServiceClient } from '@/lib/supabase/server';
import type { PickListWeights, PickListOptions } from '@/types/picklist';

/**
 * GET /api/admin/picklist/[eventKey]
 * Generate pick list for an event using a pre-built strategy
 *
 * Query params:
 * - strategy: Strategy ID (BALANCED, OFFENSIVE, DEFENSIVE, RELIABLE) - default: BALANCED
 * - minMatches: Minimum matches played (default: 5)
 * - includeNotes: Include detailed scout notes (default: false)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventKey: string }> }
) {
  // Require admin authentication
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    // Await params
    const { eventKey } = await params;

    if (!eventKey) {
      return NextResponse.json({ error: 'eventKey is required' }, { status: 400 });
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const strategy = searchParams.get('strategy') || 'BALANCED';
    const minMatches = parseInt(searchParams.get('minMatches') || '5', 10);
    const includeNotes = searchParams.get('includeNotes') === 'true';

    // Validate strategy
    if (!PICK_LIST_STRATEGIES[strategy]) {
      return NextResponse.json(
        {
          error: `Invalid strategy: ${strategy}`,
          available: Object.keys(PICK_LIST_STRATEGIES),
        },
        { status: 400 }
      );
    }

    // Validate minMatches
    if (isNaN(minMatches) || minMatches < 0) {
      return NextResponse.json({ error: 'Invalid minMatches value' }, { status: 400 });
    }

    // Create service
    const supabase = createServiceClient();
    const service = createPickListService(supabase);

    // Generate pick list
    const options: PickListOptions = {
      minMatches,
      includeNotes,
    };

    const pickList = await service.generatePickList(eventKey, strategy, options);

    return NextResponse.json({
      success: true,
      data: pickList,
      message: `Generated ${pickList.strategy.name} pick list for ${pickList.eventName || eventKey}`,
    });
  } catch (error: unknown) {
    console.error('[PickList API] Error generating pick list:', error);

    const errorMessage = error instanceof Error ? error.message : '';

    if (errorMessage.includes('not found')) {
      return NextResponse.json({ error: errorMessage }, { status: 404 });
    }

    if (errorMessage.includes('No team statistics')) {
      return NextResponse.json(
        {
          error: errorMessage,
          hint: 'Calculate OPR/DPR/CCWM first using POST /api/admin/statistics/opr',
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: errorMessage || 'Failed to generate pick list' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/picklist/[eventKey]
 * Generate pick list with custom weights
 *
 * Body:
 * {
 *   weights: PickListWeights,
 *   minMatches?: number,
 *   includeNotes?: boolean
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventKey: string }> }
) {
  // Require admin authentication
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    // Await params
    const { eventKey } = await params;

    if (!eventKey) {
      return NextResponse.json({ error: 'eventKey is required' }, { status: 400 });
    }

    // Parse body
    const body = await request.json();
    const { weights, minMatches = 5, includeNotes = false } = body;

    if (!weights) {
      return NextResponse.json({ error: 'weights object is required' }, { status: 400 });
    }

    // Validate weights structure
    const requiredWeights = [
      'opr',
      'dpr',
      'ccwm',
      'autoScore',
      'teleopScore',
      'endgameScore',
      'reliability',
      'driverSkill',
      'defenseRating',
      'speedRating',
    ];

    const missingWeights = requiredWeights.filter(key => !(key in weights));
    if (missingWeights.length > 0) {
      return NextResponse.json(
        {
          error: 'Missing required weight properties',
          missing: missingWeights,
          required: requiredWeights,
        },
        { status: 400 }
      );
    }

    // Validate weight values
    for (const [key, value] of Object.entries(weights)) {
      if (typeof value !== 'number' || isNaN(value as number)) {
        return NextResponse.json(
          { error: `Invalid weight value for ${key}: must be a number` },
          { status: 400 }
        );
      }
    }

    // Create service
    const supabase = createServiceClient();
    const service = createPickListService(supabase);

    // Generate pick list with custom weights
    const options: PickListOptions = {
      minMatches,
      includeNotes,
    };

    const pickList = await service.generateCustomPickList(
      eventKey,
      weights as PickListWeights,
      options
    );

    return NextResponse.json({
      success: true,
      data: pickList,
      message: `Generated custom pick list for ${pickList.eventName || eventKey}`,
    });
  } catch (error: unknown) {
    console.error('[PickList API] Error generating custom pick list:', error);

    const errorMessage = error instanceof Error ? error.message : '';

    if (errorMessage.includes('not found')) {
      return NextResponse.json({ error: errorMessage }, { status: 404 });
    }

    if (errorMessage.includes('No team statistics')) {
      return NextResponse.json(
        {
          error: errorMessage,
          hint: 'Calculate OPR/DPR/CCWM first using POST /api/admin/statistics/opr',
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: errorMessage || 'Failed to generate custom pick list' },
      { status: 500 }
    );
  }
}
