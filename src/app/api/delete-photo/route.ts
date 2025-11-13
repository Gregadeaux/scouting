import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { errorResponse, successResponse, sanitizedErrorResponse } from '@/lib/api/response';

const ROBOT_PHOTOS_BUCKET = 'robot-photos';

/**
 * DELETE /api/delete-photo
 *
 * Delete a robot photo from Supabase Storage
 * Uses server-side Supabase client
 *
 * Body: { url: string } - Public URL of the image to delete
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

    // Parse request body
    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== 'string') {
      return errorResponse('No URL provided', 400);
    }

    // Extract file path from URL
    // Expected format: https://{project}.supabase.co/storage/v1/object/public/robot-photos/{filename}
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');

      // Find 'robot-photos' in path and get everything after it
      const bucketIndex = pathParts.indexOf(ROBOT_PHOTOS_BUCKET);
      if (bucketIndex === -1 || bucketIndex === pathParts.length - 1) {
        return errorResponse('Invalid storage URL format', 400);
      }

      const filePath = pathParts.slice(bucketIndex + 1).join('/');

      // Delete file from storage
      const { error } = await supabase.storage
        .from(ROBOT_PHOTOS_BUCKET)
        .remove([filePath]);

      if (error) {
        // SECURITY: Use sanitized error response to prevent storage details from leaking
        return sanitizedErrorResponse(error, 'delete_robot_photo');
      }

      return successResponse({ success: true });
    } catch (error) {
      console.error('URL parsing error:', error);
      return errorResponse('Invalid storage URL format', 400);
    }
  } catch (error) {
    // SECURITY: Use sanitized error response to prevent system details from leaking
    return sanitizedErrorResponse(error, 'delete_photo_api');
  }
}
