'use client';

import React, { useState } from 'react';
import { FormSection } from '@/components/ui/FormSection';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { validateImageFile } from '@/lib/supabase/storage';

interface ImageUploadSectionProps {
  photos: string[];
  onPhotosChange: (photos: string[]) => void;
}

/**
 * ImageUploadSection Component
 *
 * Form section for uploading and managing robot photos.
 * Integrates with Supabase Storage for file management.
 *
 * Features:
 * - Upload up to 10 photos (max 5MB each)
 * - Drag-and-drop support
 * - File validation (type and size)
 * - Delete confirmation
 * - Error handling with user feedback
 *
 * @example
 * ```tsx
 * const [photos, setPhotos] = useState<string[]>([]);
 *
 * <ImageUploadSection
 *   photos={photos}
 *   onPhotosChange={setPhotos}
 * />
 * ```
 */
export function ImageUploadSection({ photos, onPhotosChange }: ImageUploadSectionProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Handles file upload via API route
   * Server-side upload to avoid browser client conflicts
   */
  const handleUpload = async (file: File): Promise<string> => {
    setError(null);

    // Validate file
    const validation = validateImageFile(file);
    if (!validation.valid) {
      const errorMessage = validation.error || 'File validation failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    }

    // Upload via API route
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload-photo', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Upload failed');
      }

      return result.data.url;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  /**
   * Handles photo deletion via API route
   */
  const handleDelete = async (url: string): Promise<void> => {
    setError(null);

    try {
      const response = await fetch('/api/delete-photo', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Delete failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Delete failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  return (
    <FormSection
      title="Robot Photos"
      description="Upload photos of the robot (max 10 photos, 5MB each)"
      collapsible
      defaultOpen
    >
      <ImageUpload
        value={photos}
        onChange={onPhotosChange}
        maxImages={10}
        maxSizeBytes={5 * 1024 * 1024} // 5MB
        disabled={uploading}
        onUpload={handleUpload}
        onDelete={handleDelete}
      />

      {/* Upload Status */}
      {uploading && (
        <p className="mt-2 text-sm text-frc-blue dark:text-blue-400">Uploading photo...</p>
      )}

      {/* Error Message */}
      {error && (
        <div className="mt-2 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Helper Text */}
      {!uploading && !error && photos.length > 0 && (
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          {photos.length} of 10 photos uploaded
        </p>
      )}
    </FormSection>
  );
}
