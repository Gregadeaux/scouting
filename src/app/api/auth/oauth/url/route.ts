/**
 * OAuth URL Generation Route
 * POST /api/auth/oauth/url - Generate OAuth URL for provider
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { successResponse, errorResponse } from '@/lib/api/auth-middleware';
import type { OAuthProvider } from '@/types/auth';

interface OAuthUrlRequest {
  provider: string;
  redirectTo?: string;
}

/**
 * POST /api/auth/oauth/url
 * Body: { provider: string, redirectTo?: string }
 * Returns: { success: true, data: { url: string } }
 */
export async function POST(request: NextRequest) {
  try {
    // Parse JSON with error handling for empty body
    let body: OAuthUrlRequest;
    try {
      body = await request.json() as OAuthUrlRequest;
    } catch (parseError) {
      return errorResponse('Invalid request body. Expected JSON with provider field.', 400);
    }

    // Validate required fields
    if (!body.provider) {
      return errorResponse('Provider is required', 400);
    }

    // Validate provider - Currently only Google is supported in the types
    const validProviders: OAuthProvider[] = ['google'];
    if (!validProviders.includes(body.provider as OAuthProvider)) {
      return errorResponse(`Invalid provider. Currently supported: ${validProviders.join(', ')}`, 400);
    }

    const supabase = await createClient();

    // Get the redirect URL (use provided or default to callback)
    const redirectTo = body.redirectTo || `${request.nextUrl.origin}/auth/callback`;

    // Generate OAuth URL
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: body.provider as OAuthProvider,
      options: {
        redirectTo,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error || !data.url) {
      console.error('OAuth URL generation error:', error);
      return errorResponse(
        error?.message || 'Failed to generate OAuth URL',
        500
      );
    }

    return successResponse({ url: data.url }, 200);
  } catch (error) {
    console.error('Error in POST /api/auth/oauth/url:', error);
    return errorResponse('Failed to generate OAuth URL', 500);
  }
}