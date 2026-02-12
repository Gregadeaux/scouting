import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { errorResponse, successResponse } from '@/lib/api/response';

/**
 * TBA Webhook Types
 * Based on The Blue Alliance webhook documentation
 */
interface TBAWebhookPayload {
  message_type: 'match_score' | 'upcoming_match' | 'verification' | 'ping';
  message_data: unknown;
}

interface TBAMatchScoreData {
  match: {
    key: string;
    comp_level: string;
    set_number: number;
    match_number: number;
    alliances: {
      red: TBAAlliance;
      blue: TBAAlliance;
    };
    score_breakdown: Record<string, unknown> | null;
    winning_alliance: 'red' | 'blue' | '';
    event_key: string;
    time: number | null;
    actual_time: number | null;
    post_result_time: number | null;
  };
}

interface TBAAlliance {
  score: number;
  team_keys: string[];
  surrogate_team_keys: string[];
  dq_team_keys: string[];
}

/**
 * Verify TBA webhook HMAC signature
 * TBA signs webhooks with HMAC-SHA256 using the webhook secret
 */
function verifyWebhookSignature(
  signature: string | null,
  body: string,
  secret: string
): boolean {
  if (!signature || !secret) {
    return false;
  }

  const computed = crypto.createHmac('sha256', secret).update(body).digest('hex');

  // Use timing-safe comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(computed));
  } catch {
    // Lengths don't match
    return false;
  }
}

/**
 * Create a Supabase client with service role for webhook operations
 * Webhooks don't have user context, so we use service role
 */
function getSupabaseServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase configuration');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

/**
 * Type guard to validate TBAMatchScoreData structure
 * Validates nested alliance objects to prevent runtime errors
 */
function isValidMatchScoreData(data: unknown): data is TBAMatchScoreData {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  if (!d.match || typeof d.match !== 'object') return false;
  const match = d.match as Record<string, unknown>;

  // Validate match key
  if (typeof match.key !== 'string') return false;

  // Validate alliances structure
  if (!match.alliances || typeof match.alliances !== 'object') return false;
  const alliances = match.alliances as Record<string, unknown>;

  // Validate red and blue alliance objects exist
  if (!alliances.red || typeof alliances.red !== 'object') return false;
  if (!alliances.blue || typeof alliances.blue !== 'object') return false;

  return true;
}

/**
 * Handle match_score webhook event
 * Updates match_schedule table with scores from TBA
 */
async function handleMatchScore(data: unknown): Promise<void> {
  // Validate input before processing
  if (!isValidMatchScoreData(data)) {
    throw new Error('Invalid match score data: missing required match fields');
  }

  const supabase = getSupabaseServiceClient();
  const { match } = data;

  console.log(
    `[TBA Webhook] Processing match_score for ${match.key}: ` +
      `Red ${match.alliances.red.score} - Blue ${match.alliances.blue.score}`
  );

  // Determine winning alliance
  let winningAlliance: 'red' | 'blue' | 'tie' | null = null;
  if (match.winning_alliance === 'red') {
    winningAlliance = 'red';
  } else if (match.winning_alliance === 'blue') {
    winningAlliance = 'blue';
  } else if (match.alliances.red.score === match.alliances.blue.score) {
    winningAlliance = 'tie';
  }

  // Update match_schedule with scores
  const { error } = await supabase
    .from('match_schedule')
    .update({
      red_score: match.alliances.red.score,
      blue_score: match.alliances.blue.score,
      score_breakdown: match.score_breakdown,
      winning_alliance: winningAlliance,
      actual_time: match.actual_time
        ? new Date(match.actual_time * 1000).toISOString()
        : null,
      post_result_time: match.post_result_time
        ? new Date(match.post_result_time * 1000).toISOString()
        : new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('match_key', match.key);

  if (error) {
    console.error(`[TBA Webhook] Error updating match ${match.key}:`, error);
    throw new Error(`Failed to update match: ${error.message}`);
  }

  console.log(`[TBA Webhook] Successfully updated match ${match.key}`);
}

/**
 * POST /api/webhooks/tba
 * Receive webhook notifications from The Blue Alliance
 *
 * TBA sends various events:
 * - match_score: When match scores are posted
 * - upcoming_match: When a match is about to start
 * - verification: When registering the webhook (must return 200)
 * - ping: Test ping from TBA dashboard
 */
export async function POST(request: NextRequest) {
  const webhookSecret = process.env.TBA_WEBHOOK_SECRET;

  // Read raw body for signature verification
  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    console.error('[TBA Webhook] Failed to read request body');
    return errorResponse('Failed to read request body', 400);
  }

  // Get signature from header
  const signature = request.headers.get('X-TBA-HMAC');

  // Verify webhook signature (skip only in development without secret)
  if (!webhookSecret) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[TBA Webhook] Missing TBA_WEBHOOK_SECRET in production');
      return errorResponse('Server configuration error', 500);
    }
    // Development without secret - skip verification with warning
    console.warn('[TBA Webhook] Development mode: skipping signature verification');
  } else {
    // Verify webhook signature
    if (!verifyWebhookSignature(signature, rawBody, webhookSecret)) {
      console.error('[TBA Webhook] Invalid signature');
      return errorResponse('Invalid webhook signature', 401);
    }
  }

  // Parse payload
  let payload: TBAWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    console.error('[TBA Webhook] Invalid JSON payload');
    return errorResponse('Invalid JSON payload', 400);
  }

  console.log(`[TBA Webhook] Received ${payload.message_type} event`);

  // Handle different message types
  try {
    switch (payload.message_type) {
      case 'verification':
        // TBA sends this when first registering the webhook
        console.log('[TBA Webhook] Verification request received');
        return successResponse({ message: 'Webhook verified' });

      case 'ping':
        // Test ping from TBA dashboard
        console.log('[TBA Webhook] Ping received');
        return successResponse({ message: 'Pong' });

      case 'match_score':
        await handleMatchScore(payload.message_data);
        return successResponse({ message: 'Match score processed' });

      case 'upcoming_match':
        // We could use this for notifications, but not critical for MVP
        console.log('[TBA Webhook] Upcoming match notification (not implemented)');
        return successResponse({ message: 'Event received' });

      default:
        console.log(`[TBA Webhook] Unknown message type: ${payload.message_type}`);
        return successResponse({ message: 'Event type not handled' });
    }
  } catch (error) {
    console.error('[TBA Webhook] Error processing webhook:', error);
    return errorResponse('Failed to process webhook', 500);
  }
}

/**
 * GET /api/webhooks/tba
 * Health check endpoint for webhook status
 */
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    message: 'TBA webhook endpoint is active',
  });
}
