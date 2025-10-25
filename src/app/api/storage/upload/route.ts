import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { errorResponse, successResponse } from '@/lib/api/response';

const ROBOT_PHOTOS_BUCKET = 'robot-photos';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

/**
 * POST /api/storage/upload
 *
 * Upload a robot photo to Supabase Storage with organized path structure
 *
 * Form Data:
 * - file: File (required) - The image file to upload
 * - teamNumber: string (required) - Team number for path organization (e.g., "930")
 * - eventKey: string (required) - Event key for path organization (e.g., "2025txaus")
 *
 * Returns: { url: string, path: string }
 * - url: Public URL for accessing the image
 * - path: Storage path (for database storage and future deletion)
 *
 * Path Structure: {teamNumber}/{eventKey}/{timestamp}-{filename}
 * Example: 930/2025txaus/1735155600000-abc123.jpg
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
    const teamNumber = formData.get('teamNumber') as string | null;
    const eventKey = formData.get('eventKey') as string | null;

    // Validate required fields
    if (!file) {
      return errorResponse('No file provided', 400);
    }

    if (!teamNumber) {
      return errorResponse('Team number is required', 400);
    }

    if (!eventKey) {
      return errorResponse('Event key is required', 400);
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

    // Generate unique filename with organized path
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 9);
    const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const filename = `${timestamp}-${randomString}.${extension}`;

    // Create organized path: teamNumber/eventKey/filename
    const filePath = `${teamNumber}/${eventKey}/${filename}`;

    // Convert File to Buffer for Supabase
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(ROBOT_PHOTOS_BUCKET)
      .upload(filePath, buffer, {
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
      path: data.path,
    }, 201);
  } catch (error) {
    console.error('Upload API error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Upload failed',
      500
    );
  }
}
