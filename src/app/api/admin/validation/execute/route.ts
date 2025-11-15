import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api/auth-middleware';
import { createScouterValidationService } from '@/lib/services/scouter-validation.service';
import { ValidationStrategyType, IValidationStrategy } from '@/types/validation';
import { createConsensusValidationStrategy } from '@/lib/validation/strategies/consensus-validation.strategy';
import { createTBAValidationStrategy } from '@/lib/validation/strategies/tba-validation.strategy';

/**
 * POST /api/admin/validation/execute
 *
 * Executes validation for an event using specified strategies.
 * Validates scouter accuracy and updates ELO ratings.
 *
 * Request Body:
 * {
 *   eventKey: string;        // Required - Event to validate
 *   strategies?: string[];   // Optional - ['consensus', 'tba'] or subset
 *   matchKey?: string;       // Optional - Validate single match instead of event
 * }
 *
 * Response:
 * {
 *   success: true;
 *   data: ValidationExecutionSummary;
 * }
 */
export async function POST(request: NextRequest) {
  // Require admin authentication
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const body = await request.json();

    // Validate required fields
    if (!body.eventKey && !body.matchKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'Either eventKey or matchKey is required'
        },
        { status: 400 }
      );
    }

    // Validate strategies parameter
    const allowedStrategies: ValidationStrategyType[] = ['consensus', 'tba'];
    let strategies: ValidationStrategyType[] | undefined;

    if (body.strategies) {
      if (!Array.isArray(body.strategies)) {
        return NextResponse.json(
          {
            success: false,
            error: 'strategies must be an array'
          },
          { status: 400 }
        );
      }

      // Validate each strategy
      const invalidStrategies = body.strategies.filter(
        (s: string) => !allowedStrategies.includes(s as ValidationStrategyType)
      );

      if (invalidStrategies.length > 0) {
        return NextResponse.json(
          {
            success: false,
            error: `Invalid strategies: ${invalidStrategies.join(', ')}. Allowed: ${allowedStrategies.join(', ')}`
          },
          { status: 400 }
        );
      }

      strategies = body.strategies as ValidationStrategyType[];
    }

    // Create validation strategies
    const strategiesMap = new Map<ValidationStrategyType, IValidationStrategy>([
      ['consensus', createConsensusValidationStrategy()],
      ['tba', createTBAValidationStrategy()],
    ]);

    // Create validation service with strategies
    const validationService = createScouterValidationService({
      strategies: strategiesMap,
    });

    // Execute validation
    let summary;

    if (body.matchKey) {
      // Validate single match
      summary = await validationService.validateMatch(
        body.matchKey,
        strategies
      );
    } else {
      // Validate entire event
      summary = await validationService.validateEvent(
        body.eventKey,
        strategies
      );
    }

    return NextResponse.json({
      success: true,
      data: summary,
    });

  } catch (error) {
    console.error('Error in POST /api/admin/validation/execute:', error);

    // Handle specific error types
    if (error instanceof Error) {
      // Check for validation-specific errors
      if (error.message.includes('not found')) {
        return NextResponse.json(
          {
            success: false,
            error: error.message
          },
          { status: 404 }
        );
      }

      if (error.message.includes('insufficient')) {
        return NextResponse.json(
          {
            success: false,
            error: error.message
          },
          { status: 422 }
        );
      }

      // Generic error with message
      return NextResponse.json(
        {
          success: false,
          error: error.message
        },
        { status: 500 }
      );
    }

    // Fallback generic error
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error'
      },
      { status: 500 }
    );
  }
}
