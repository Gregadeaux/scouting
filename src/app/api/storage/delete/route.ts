import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { errorResponse, successResponse } from '@/lib/api/response';

const ROBOT_PHOTOS_BUCKET = 'robot-photos';

/**
 * DELETE /api/storage/delete
 *
 * Delete a robot photo from Supabase Storage
 *
 * Request:
 * - Query params: ?path={path} (e.g., ?path=930/2025txaus/1735155600000-abc123.jpg)
 * - OR Body: { path: string }
 *
 * Returns: { success: true }
 */
export async function DELETE(request: NextRequest) {
  try {
    // Check authentication
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return errorResponse('You must be logged in to delete photos', 401);
    }

    // Get path from query params or request body
    let path: string | null = null;

    // Try query params first
    const searchParams = request.nextUrl.searchParams;
    path = searchParams.get('path');

    // If not in query params, try request body
    if (!path) {
      try {
        const body = await request.json();
        path = body.path;
      } catch {
        // Body parsing failed, path is still null
      }
    }

    if (!path || typeof path !== 'string') {
      return errorResponse('File path is required (provide as query param ?path=... or in request body)', 400);
    }

    // Delete file from storage
    const { error } = await supabase.storage
      .from(ROBOT_PHOTOS_BUCKET)
      .remove([path]);

    if (error) {
      console.error('Storage delete error:', error);
      return errorResponse(`Delete failed: ${error.message}`, 500);
    }

    return successResponse({ success: true });
  } catch (error) {
    console.error('Delete API error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Delete failed',
      500
    );
  }
}
