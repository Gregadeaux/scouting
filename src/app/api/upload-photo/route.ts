import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { errorResponse, successResponse } from '@/lib/api/response';

const ROBOT_PHOTOS_BUCKET = 'robot-photos';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

/**
 * POST /api/upload-photo
 *
 * Upload a robot photo to Supabase Storage
 * Uses server-side Supabase client to avoid browser client conflicts
 *
 * Body: FormData with 'file' field
 * Returns: { url: string } - Public URL of uploaded image
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return errorResponse('You must be logged in to upload photos', 401);
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return errorResponse('No file provided', 400);
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return errorResponse(
        `Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`,
        400
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      const maxMB = (MAX_FILE_SIZE / (1024 * 1024)).toFixed(1);
      return errorResponse(`File size exceeds maximum of ${maxMB}MB`, 400);
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 9);
    const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const filename = `${timestamp}-${randomString}.${extension}`;

    // Convert File to Buffer for Supabase
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(ROBOT_PHOTOS_BUCKET)
      .upload(filename, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Storage upload error:', error);
      return errorResponse(`Upload failed: ${error.message}`, 500);
    }

    if (!data) {
      return errorResponse('Upload succeeded but no data returned', 500);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(ROBOT_PHOTOS_BUCKET)
      .getPublicUrl(data.path);

    if (!urlData?.publicUrl) {
      return errorResponse('Failed to generate public URL', 500);
    }

    return successResponse({
      url: urlData.publicUrl,
    });
  } catch (error) {
    console.error('Upload API error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Upload failed',
      500
    );
  }
}
