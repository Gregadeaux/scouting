/**
 * @file Storage API Service
 * @description Client-side service for interacting with storage API routes
 */

/**
 * Upload a robot photo to storage
 *
 * @param file - Image file to upload
 * @param teamNumber - Team number for path organization
 * @param eventKey - Event key for path organization
 * @returns Object with public URL and storage path
 *
 * @example
 * ```typescript
 * const result = await uploadPhoto(imageFile, 930, '2025txaus');
 * // Save result.path to database
 * // Display result.url in UI
 * ```
 */
export async function uploadPhoto(
  file: File,
  teamNumber: number | string,
  eventKey: string
): Promise<{ url: string; path: string }> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('teamNumber', teamNumber.toString());
  formData.append('eventKey', eventKey);

  const response = await fetch('/api/storage/upload', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Upload failed');
  }

  const { data } = await response.json();
  return data;
}

/**
 * Delete a robot photo from storage
 *
 * @param path - Storage path of the photo to delete
 *
 * @example
 * ```typescript
 * await deletePhoto('930/2025txaus/1735155600000-abc123.jpg');
 * ```
 */
export async function deletePhoto(path: string): Promise<void> {
  const response = await fetch(`/api/storage/delete?path=${encodeURIComponent(path)}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Delete failed');
  }
}

/**
 * Get public URL for a storage path
 *
 * @param path - Storage path of the photo
 * @returns Public URL for accessing the photo
 *
 * @example
 * ```typescript
 * const url = await getPhotoUrl('930/2025txaus/1735155600000-abc123.jpg');
 * // Display: <img src={url} />
 * ```
 */
export async function getPhotoUrl(path: string): Promise<string> {
  const response = await fetch(`/api/storage/url?path=${encodeURIComponent(path)}`);

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to get URL');
  }

  const { data } = await response.json();
  return data.url;
}

/**
 * Upload multiple photos in sequence
 *
 * @param files - Array of image files to upload
 * @param teamNumber - Team number for path organization
 * @param eventKey - Event key for path organization
 * @returns Array of objects with URLs and paths
 *
 * @example
 * ```typescript
 * const results = await uploadMultiplePhotos([file1, file2, file3], 930, '2025txaus');
 * const paths = results.map(r => r.path);
 * // Save paths to database
 * ```
 */
export async function uploadMultiplePhotos(
  files: File[],
  teamNumber: number | string,
  eventKey: string
): Promise<Array<{ url: string; path: string }>> {
  const results: Array<{ url: string; path: string }> = [];
  const errors: Array<{ file: string; error: string }> = [];

  for (const file of files) {
    try {
      const result = await uploadPhoto(file, teamNumber, eventKey);
      results.push(result);
    } catch (error) {
      errors.push({
        file: file.name,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  if (errors.length > 0) {
    throw new Error(
      `Failed to upload ${errors.length} of ${files.length} files: ${JSON.stringify(errors)}`
    );
  }

  return results;
}

/**
 * Delete multiple photos in sequence
 *
 * @param paths - Array of storage paths to delete
 *
 * @example
 * ```typescript
 * await deleteMultiplePhotos([
 *   '930/2025txaus/1735155600000-abc123.jpg',
 *   '930/2025txaus/1735155700000-def456.jpg',
 * ]);
 * ```
 */
export async function deleteMultiplePhotos(paths: string[]): Promise<void> {
  const errors: Array<{ path: string; error: string }> = [];

  for (const path of paths) {
    try {
      await deletePhoto(path);
    } catch (error) {
      errors.push({
        path,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  if (errors.length > 0) {
    throw new Error(
      `Failed to delete ${errors.length} of ${paths.length} files: ${JSON.stringify(errors)}`
    );
  }
}

/**
 * Validate image file before upload
 *
 * @param file - File to validate
 * @returns Validation result with error message if invalid
 *
 * @example
 * ```typescript
 * const validation = validateImageFile(file);
 * if (!validation.valid) {
 *   alert(validation.error);
 *   return;
 * }
 * await uploadPhoto(file, teamNumber, eventKey);
 * ```
 */
export function validateImageFile(file: File): {
  valid: boolean;
  error?: string;
} {
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = (file.size / 1024 / 1024).toFixed(2);
    return {
      valid: false,
      error: `File size (${sizeMB}MB) exceeds maximum allowed size of 5MB`,
    };
  }

  // Check MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `File type "${file.type}" is not allowed. Allowed types: JPEG, PNG, WebP, GIF`,
    };
  }

  return { valid: true };
}

/**
 * Extract team number and event key from storage path
 *
 * @param path - Storage path (e.g., "930/2025txaus/1735155600000-abc123.jpg")
 * @returns Object with team number and event key, or null if invalid
 *
 * @example
 * ```typescript
 * const info = extractPathInfo('930/2025txaus/1735155600000-abc123.jpg');
 * // Returns: { teamNumber: '930', eventKey: '2025txaus' }
 * ```
 */
export function extractPathInfo(path: string): {
  teamNumber: string;
  eventKey: string;
} | null {
  const parts = path.split('/');
  if (parts.length < 3) {
    return null;
  }

  return {
    teamNumber: parts[0],
    eventKey: parts[1],
  };
}
