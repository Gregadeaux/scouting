'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';

interface ImageUploadProps {
  value: string[]; // Array of image URLs
  onChange: (urls: string[]) => void;
  maxImages?: number;
  maxSizeBytes?: number;
  disabled?: boolean;
  onUpload?: (file: File) => Promise<string>; // Upload handler returns URL
  onDelete?: (url: string) => Promise<void>; // Delete handler
  className?: string;
}

/**
 * ImageUpload Component
 *
 * Upload and preview images with drag-and-drop support.
 * Used for robot photos in pit scouting.
 *
 * @example
 * ```tsx
 * <ImageUpload
 *   value={photoUrls}
 *   onChange={setPhotoUrls}
 *   maxImages={5}
 *   maxSizeBytes={5 * 1024 * 1024} // 5MB
 *   onUpload={async (file) => {
 *     // Upload to Supabase Storage
 *     return uploadedUrl;
 *   }}
 * />
 * ```
 */
export function ImageUpload({
  value,
  onChange,
  maxImages = 5,
  maxSizeBytes = 5 * 1024 * 1024, // 5MB default
  disabled = false,
  onUpload,
  onDelete,
  className = '',
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;

      setError(null);

      // Check max images limit
      if (value.length >= maxImages) {
        setError(`Maximum ${maxImages} images allowed`);
        return;
      }

      const file = files[0]; // Handle one file at a time

      // Validate file
      if (!file.type.startsWith('image/')) {
        setError('File must be an image');
        return;
      }
      if (file.size > maxSizeBytes) {
        const maxMB = (maxSizeBytes / (1024 * 1024)).toFixed(1);
        setError(`File size must be less than ${maxMB}MB`);
        return;
      }

      try {
        setUploading(true);
        setUploadingIndex(value.length);

        if (onUpload) {
          // Custom upload handler
          const url = await onUpload(file);
          onChange([...value, url]);
        } else {
          // Default behavior: create data URL for preview
          const reader = new FileReader();
          reader.onloadend = () => {
            const dataUrl = reader.result as string;
            onChange([...value, dataUrl]);
          };
          reader.readAsDataURL(file);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Upload failed';
        setError(errorMessage);
      } finally {
        setUploading(false);
        setUploadingIndex(null);
        // Reset input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    },
    [value, onChange, onUpload, maxImages, maxSizeBytes]
  );

  const handleDelete = useCallback(
    async (url: string, index: number) => {
      try {
        if (onDelete) {
          await onDelete(url);
        }
        onChange(value.filter((_, i) => i !== index));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Delete failed');
      }
    },
    [value, onChange, onDelete]
  );

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (disabled || uploading) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUpload(e.dataTransfer.files);
    }
  };

  const canAddMore = value.length < maxImages;

  return (
    <div className={`w-full ${className}`}>
      {/* Upload Area */}
      {canAddMore && (
        <div
          className={`relative mb-4 rounded-lg border-2 border-dashed p-6 transition-colors ${dragActive
            ? 'border-frc-blue bg-blue-50 dark:bg-blue-950'
            : 'border-gray-300 bg-gray-50 dark:border-gray-600 dark:bg-gray-800'
            } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:border-frc-blue'}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => !disabled && !uploading && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => handleUpload(e.target.files)}
            disabled={disabled || uploading}
            className="hidden"
            aria-label="Upload image"
          />

          <div className="flex flex-col items-center justify-center text-center">
            {uploading ? (
              <>
                <Loader2 className="mb-3 h-10 w-10 animate-spin text-frc-blue" />
                <p className="text-sm text-gray-600 dark:text-gray-400">Uploading...</p>
              </>
            ) : (
              <>
                <Upload className="mb-3 h-10 w-10 text-gray-400" />
                <p className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  PNG, JPG up to {(maxSizeBytes / (1024 * 1024)).toFixed(1)}MB ({value.length}/
                  {maxImages})
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Image Preview Grid */}
      {value.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {value.map((url, index) => (
            <div
              key={`${url}-${index}`}
              className="group relative aspect-square overflow-hidden rounded-lg border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`Upload ${index + 1}`}
                className="h-full w-full object-cover"
              />

              {/* Loading overlay */}
              {uploadingIndex === index && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                  <Loader2 className="h-8 w-8 animate-spin text-white" />
                </div>
              )}

              {/* Delete button - shows on hover */}
              {!disabled && uploadingIndex !== index && (
                <button
                  type="button"
                  onClick={() => handleDelete(url, index)}
                  className="absolute right-2 top-2 rounded-full bg-red-600 p-1.5 text-white opacity-0 shadow-lg transition-opacity hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 group-hover:opacity-100"
                  aria-label="Delete image"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {value.length === 0 && !canAddMore && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-gray-50 p-8 text-center dark:border-gray-700 dark:bg-gray-800">
          <ImageIcon className="mb-2 h-12 w-12 text-gray-400" />
          <p className="text-sm text-gray-600 dark:text-gray-400">No images uploaded</p>
        </div>
      )}
    </div>
  );
}
