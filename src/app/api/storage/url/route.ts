import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { errorResponse, successResponse } from '@/lib/api/response';

const ROBOT_PHOTOS_BUCKET = 'robot-photos';

/**
 * GET /api/storage/url
 *
 * Generate a public URL for a file path in the robot-photos bucket
 * No authentication required (public URLs are accessible by anyone)
 *
 * Query params:
 * - path: string (required) - The file path within the bucket
 *   Example: ?path=930/2025txaus/1735155600000-abc123.jpg
 *
 * Returns: { url: string }
 *
 * Note: This does NOT verify the file exists, it just generates the URL.
 * The URL will return 404 if the file doesn't exist.
 */
export async function GET(request: NextRequest) {
  try {
    // Get path from query params
    const searchParams = request.nextUrl.searchParams;
    const path = searchParams.get('path');

    if (!path || typeof path !== 'string') {
      return errorResponse('File path is required as query parameter (?path=...)', 400);
    }

    // Create Supabase client (no auth check needed for public URLs)
    const supabase = await createClient();

    // Generate public URL
    const { data } = supabase.storage
      .from(ROBOT_PHOTOS_BUCKET)
      .getPublicUrl(path);

    if (!data?.publicUrl) {
      return errorResponse('Failed to generate public URL', 500);
    }

    return successResponse({
      url: data.publicUrl,
    });
  } catch (error) {
    console.error('URL generation API error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'URL generation failed',
      500
    );
  }
}
