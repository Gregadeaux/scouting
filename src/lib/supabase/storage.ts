/**
 * @file Supabase Storage Utilities for Robot Photos
 * @description Functions for uploading, deleting, and managing robot photos in Supabase Storage
 */

import { supabase as supabaseClient } from '@/lib/supabase/client';

/**
 * Storage bucket name for robot photos
 */
const ROBOT_PHOTOS_BUCKET = 'robot-photos';

/**
 * Maximum file size in bytes (5MB)
 */
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Allowed image MIME types
 */
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;

/**
 * Allowed file extensions (derived from MIME types)
 */
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif'] as const;

/**
 * Result of image file validation
 */
export interface ImageValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Error thrown by storage operations
 */
export class StorageError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = 'StorageError';
  }
}

/**
 * Validates an image file for upload
 *
 * Checks:
 * - File size (max 5MB)
 * - MIME type (jpeg, png, webp, gif)
 *
 * @param file - The file to validate
 * @returns Validation result with error message if invalid
 *
 * @example
 * ```typescript
 * const result = validateImageFile(file);
 * if (!result.valid) {
 *   console.error(result.error);
 *   return;
 * }
 * ```
 */
export function validateImageFile(file: File): ImageValidationResult {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = (file.size / 1024 / 1024).toFixed(2);
    return {
      valid: false,
      error: `File size (${sizeMB}MB) exceeds maximum allowed size of 5MB`,
    };
  }

  // Check MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.type as (typeof ALLOWED_MIME_TYPES)[number])) {
    return {
      valid: false,
      error: `File type "${file.type}" is not allowed. Allowed types: JPEG, PNG, WebP, GIF`,
    };
  }

  return { valid: true };
}

/**
 * Generates a unique filename for storage
 *
 * Format: {timestamp}-{random}.{extension}
 * Example: 1641234567890-abc123.jpg
 *
 * @param originalFilename - The original filename (used to extract extension)
 * @returns Unique filename with timestamp and random string
 *
 * @example
 * ```typescript
 * const filename = generateUniqueFilename('robot.jpg');
 * // Returns: "1641234567890-abc123.jpg"
 * ```
 */
function generateUniqueFilename(originalFilename: string): string {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 9); // 7 chars
  const extension = originalFilename.split('.').pop()?.toLowerCase() || 'jpg';

  // Validate extension
  if (!ALLOWED_EXTENSIONS.includes(extension as (typeof ALLOWED_EXTENSIONS)[number])) {
    throw new StorageError(
      `Invalid file extension: ${extension}`,
      'INVALID_EXTENSION'
    );
  }

  return `${timestamp}-${randomString}.${extension}`;
}

/**
 * Extracts the file path from a Supabase Storage public URL
 *
 * @param url - The public URL from Supabase Storage
 * @returns The file path within the bucket
 *
 * @throws {StorageError} If URL format is invalid
 *
 * @example
 * ```typescript
 * const url = 'https://project.supabase.co/storage/v1/object/public/robot-photos/file.jpg';
 * const path = extractFilePathFromUrl(url);
 * // Returns: "file.jpg"
 * ```
 */
function extractFilePathFromUrl(url: string): string {
  try {
    // Expected format: https://{project}.supabase.co/storage/v1/object/public/robot-photos/{filename}
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');

    // Find 'robot-photos' in path and get everything after it
    const bucketIndex = pathParts.indexOf(ROBOT_PHOTOS_BUCKET);
    if (bucketIndex === -1 || bucketIndex === pathParts.length - 1) {
      throw new Error('Bucket name not found in URL or no file path after bucket');
    }

    const filePath = pathParts.slice(bucketIndex + 1).join('/');
    return filePath;
  } catch (error) {
    throw new StorageError(
      `Invalid storage URL format: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'INVALID_URL'
    );
  }
}

/**
 * Uploads a robot photo to Supabase Storage
 *
 * Process:
 * 1. Validates file (size, type)
 * 2. Generates unique filename
 * 3. Uploads to 'robot-photos' bucket
 * 4. Returns public URL
 *
 * @param file - The image file to upload
 * @returns Public URL of the uploaded image
 *
 * @throws {StorageError} If validation fails or upload fails
 *
 * @example
 * ```typescript
 * try {
 *   const url = await uploadRobotPhoto(imageFile);
 *   console.log('Photo uploaded:', url);
 *   // Save URL to database: pit_scouting.photo_urls
 * } catch (error) {
 *   if (error instanceof StorageError) {
 *     console.error('Upload failed:', error.message);
 *   }
 * }
 * ```
 */
export async function uploadRobotPhoto(file: File): Promise<string> {
  // Validate file
  const validation = validateImageFile(file);
  if (!validation.valid) {
    throw new StorageError(validation.error || 'File validation failed', 'VALIDATION_ERROR');
  }

  // Generate unique filename
  const filename = generateUniqueFilename(file.name);

  try {
    // Extract access token from Supabase auth cookies
    // Note: Using manual cookie parsing because Supabase client methods hang
    // due to conflicts between @supabase/ssr and @supabase/supabase-js
    const allCookies = document.cookie.split('; ');

    // Supabase splits large cookies into multiple parts (.0, .1, etc.)
    const authCookieParts = allCookies
      .filter((row) => row.startsWith('sb-yiqffkixukbyjdbbroue-auth-token'))
      .sort(); // Ensure correct order

    if (authCookieParts.length === 0) {
      throw new StorageError('No auth cookie found - please sign in', 'NO_AUTH_COOKIE');
    }

    // Combine all cookie parts
    const combinedValue = authCookieParts
      .map((cookie) => decodeURIComponent(cookie.split('=')[1]))
      .join('');

    // Decode base64-encoded auth data
    let accessToken: string;
    try {
      const base64Data = combinedValue.replace(/^base64-/, '');
      const jsonString = atob(base64Data);
      const authData = JSON.parse(jsonString);
      accessToken = authData.access_token;
    } catch {
      throw new StorageError('Failed to parse auth cookie', 'COOKIE_PARSE_ERROR');
    }

    // Upload using native fetch (bypassing Supabase client)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) {
      throw new StorageError('Supabase URL not configured', 'CONFIG_ERROR');
    }
    const uploadUrl = `${supabaseUrl}/storage/v1/object/${ROBOT_PHOTOS_BUCKET}/${filename}`;

    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'x-upsert': 'false',
      },
      body: file,
    });

    if (!response.ok) {
      const _errorText = await response.text();
      throw new StorageError(`Upload failed: ${response.statusText}`, 'UPLOAD_ERROR', response.status);
    }

    await response.json(); // Response contains { Key, Id }

    // Return public URL
    const publicUrl = `${supabaseUrl}/storage/v1/object/public/${ROBOT_PHOTOS_BUCKET}/${filename}`;
    return publicUrl;
  } catch (error) {
    console.log('[Storage] Exception caught:', error);
    if (error instanceof StorageError) {
      throw error;
    }
    throw new StorageError(
      `Unexpected error during upload: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'UPLOAD_ERROR'
    );
  }
}

/**
 * Deletes a robot photo from Supabase Storage
 *
 * @param url - The public URL of the photo to delete
 *
 * @throws {StorageError} If URL is invalid or deletion fails
 *
 * @example
 * ```typescript
 * try {
 *   await deleteRobotPhoto(photoUrl);
 *   console.log('Photo deleted successfully');
 *   // Remove URL from database: pit_scouting.photo_urls
 * } catch (error) {
 *   if (error instanceof StorageError) {
 *     console.error('Delete failed:', error.message);
 *   }
 * }
 * ```
 */
export async function deleteRobotPhoto(url: string): Promise<void> {
  // Extract file path from URL
  const filePath = extractFilePathFromUrl(url);

  try {
    // Delete file from storage
    const { error } = await supabaseClient.storage
      .from(ROBOT_PHOTOS_BUCKET)
      .remove([filePath]);

    if (error) {
      throw new StorageError(
        `Delete failed: ${error.message}`,
        error.name,
        (error as Error & { statusCode?: number }).statusCode
      );
    }
  } catch (error) {
    if (error instanceof StorageError) {
      throw error;
    }
    throw new StorageError(
      `Unexpected error during deletion: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'DELETE_ERROR'
    );
  }
}

/**
 * Gets the public URL for a file path in the robot-photos bucket
 *
 * This is a helper function for consistency when working with file paths.
 * Note: This does NOT verify the file exists.
 *
 * @param filePath - The file path within the robot-photos bucket
 * @returns The public URL for accessing the file
 *
 * @example
 * ```typescript
 * const url = getRobotPhotoUrl('1641234567890-abc123.jpg');
 * // Returns: "https://project.supabase.co/storage/v1/object/public/robot-photos/1641234567890-abc123.jpg"
 * ```
 */
export function getRobotPhotoUrl(filePath: string): string {
  const { data } = supabaseClient.storage
    .from(ROBOT_PHOTOS_BUCKET)
    .getPublicUrl(filePath);

  return data.publicUrl;
}

/**
 * Uploads multiple robot photos in sequence
 *
 * @param files - Array of image files to upload
 * @returns Array of public URLs (in same order as input files)
 *
 * @throws {StorageError} If any upload fails (partial uploads may have succeeded)
 *
 * @example
 * ```typescript
 * try {
 *   const urls = await uploadMultipleRobotPhotos([file1, file2, file3]);
 *   console.log('Uploaded photos:', urls);
 *   // Save URLs to database: pit_scouting.photo_urls = urls
 * } catch (error) {
 *   console.error('Some uploads may have failed:', error);
 * }
 * ```
 */
export async function uploadMultipleRobotPhotos(files: File[]): Promise<string[]> {
  const urls: string[] = [];
  const errors: Array<{ file: string; error: string }> = [];

  for (const file of files) {
    try {
      const url = await uploadRobotPhoto(file);
      urls.push(url);
    } catch (error) {
      errors.push({
        file: file.name,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  if (errors.length > 0) {
    throw new StorageError(
      `Failed to upload ${errors.length} of ${files.length} files: ${JSON.stringify(errors)}`,
      'BATCH_UPLOAD_ERROR'
    );
  }

  return urls;
}

/**
 * Deletes multiple robot photos in sequence
 *
 * @param urls - Array of public URLs to delete
 *
 * @throws {StorageError} If any deletion fails (partial deletions may have succeeded)
 *
 * @example
 * ```typescript
 * try {
 *   await deleteMultipleRobotPhotos(photoUrls);
 *   console.log('All photos deleted');
 *   // Update database: pit_scouting.photo_urls = []
 * } catch (error) {
 *   console.error('Some deletions may have failed:', error);
 * }
 * ```
 */
export async function deleteMultipleRobotPhotos(urls: string[]): Promise<void> {
  const errors: Array<{ url: string; error: string }> = [];

  for (const url of urls) {
    try {
      await deleteRobotPhoto(url);
    } catch (error) {
      errors.push({
        url,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  if (errors.length > 0) {
    throw new StorageError(
      `Failed to delete ${errors.length} of ${urls.length} files: ${JSON.stringify(errors)}`,
      'BATCH_DELETE_ERROR'
    );
  }
}

/**
 * Checks if a file exists in the robot-photos bucket
 *
 * @param filePath - The file path within the bucket
 * @returns True if file exists, false otherwise
 *
 * @example
 * ```typescript
 * const exists = await checkPhotoExists('1641234567890-abc123.jpg');
 * if (!exists) {
 *   console.log('Photo not found');
 * }
 * ```
 */
export async function checkPhotoExists(filePath: string): Promise<boolean> {
  try {
    const { data, error } = await supabaseClient.storage
      .from(ROBOT_PHOTOS_BUCKET)
      .list('', {
        limit: 1,
        search: filePath,
      });

    if (error) {
      return false;
    }

    return data ? data.length > 0 : false;
  } catch {
    return false;
  }
}

/**
 * Gets metadata for a robot photo
 *
 * @param filePath - The file path within the bucket
 * @returns File metadata including size, content type, created date
 *
 * @throws {StorageError} If file doesn't exist or metadata fetch fails
 *
 * @example
 * ```typescript
 * const metadata = await getPhotoMetadata('1641234567890-abc123.jpg');
 * console.log('File size:', metadata.size, 'bytes');
 * console.log('Created:', metadata.created_at);
 * ```
 */
export async function getPhotoMetadata(filePath: string) {
  try {
    const { data, error } = await supabaseClient.storage
      .from(ROBOT_PHOTOS_BUCKET)
      .list('', {
        limit: 1,
        search: filePath,
      });

    if (error) {
      throw new StorageError(
        `Failed to fetch metadata: ${error.message}`,
        error.name
      );
    }

    if (!data || data.length === 0) {
      throw new StorageError('File not found', 'FILE_NOT_FOUND', 404);
    }

    return data[0];
  } catch (error) {
    if (error instanceof StorageError) {
      throw error;
    }
    throw new StorageError(
      `Unexpected error fetching metadata: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'METADATA_ERROR'
    );
  }
}
