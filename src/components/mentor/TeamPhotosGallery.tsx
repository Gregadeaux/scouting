'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { X, Image as ImageIcon, Download, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import type { TeamPhoto } from '@/types/team-detail';

interface TeamPhotosGalleryProps {
  photos: TeamPhoto[];
  teamNumber?: number;
}

/**
 * TeamPhotosGallery Component
 *
 * Displays team photos in a responsive grid.
 * Click to enlarge photos in a dialog modal with download capability.
 *
 * @example
 * ```tsx
 * <TeamPhotosGallery photos={teamPhotos} teamNumber={930} />
 * ```
 */
export function TeamPhotosGallery({ photos, teamNumber }: TeamPhotosGalleryProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<TeamPhoto | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Zoom and pan state
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const imageContainerRef = useRef<HTMLDivElement>(null);
  const MIN_SCALE = 1;
  const MAX_SCALE = 20; // 2000% zoom for extreme detail inspection
  const ZOOM_STEP = 0.5;

  const handlePhotoClick = (photo: TeamPhoto, index: number) => {
    setSelectedPhoto(photo);
    setSelectedIndex(index);
    setIsDialogOpen(true);
    // Reset zoom and pan when opening a new photo
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setTimeout(() => {
      setSelectedPhoto(null);
      setScale(1);
      setPosition({ x: 0, y: 0 });
    }, 200);
  };

  const handleDownload = () => {
    if (!selectedPhoto) return;

    const link = document.createElement('a');
    link.href = selectedPhoto.url;
    const filename = teamNumber
      ? `team-${teamNumber}-photo-${selectedIndex + 1}.jpg`
      : `team-photo-${selectedIndex + 1}.jpg`;
    link.download = filename;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Zoom functions
  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + ZOOM_STEP, MAX_SCALE));
  };

  const handleZoomOut = () => {
    setScale((prev) => {
      const newScale = Math.max(prev - ZOOM_STEP, MIN_SCALE);
      if (newScale === MIN_SCALE) {
        setPosition({ x: 0, y: 0 }); // Reset position when fully zoomed out
      }
      return newScale;
    });
  };

  const handleResetZoom = () => {
    setScale(MIN_SCALE);
    setPosition({ x: 0, y: 0 });
  };

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setScale((prev) => {
      const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, prev + delta));
      if (newScale === MIN_SCALE) {
        setPosition({ x: 0, y: 0 });
      }
      return newScale;
    });
  };

  // Pan/drag functions
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > MIN_SCALE) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scale > MIN_SCALE) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch events for mobile pinch-to-zoom
  const touchStartDistance = useRef<number>(0);
  const touchStartScale = useRef<number>(1);

  const getTouchDistance = (touches: React.TouchList) => {
    const touch1 = touches[0];
    const touch2 = touches[1];
    return Math.sqrt(
      Math.pow(touch2.clientX - touch1.clientX, 2) +
      Math.pow(touch2.clientY - touch1.clientY, 2)
    );
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      touchStartDistance.current = getTouchDistance(e.touches);
      touchStartScale.current = scale;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const currentDistance = getTouchDistance(e.touches);
      const scaleChange = currentDistance / touchStartDistance.current;
      const newScale = Math.max(
        MIN_SCALE,
        Math.min(MAX_SCALE, touchStartScale.current * scaleChange)
      );
      setScale(newScale);
      if (newScale === MIN_SCALE) {
        setPosition({ x: 0, y: 0 });
      }
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    if (!isDialogOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case '+':
        case '=':
          handleZoomIn();
          break;
        case '-':
        case '_':
          handleZoomOut();
          break;
        case '0':
          handleResetZoom();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDialogOpen]);

  // Double-click to zoom
  const handleDoubleClick = () => {
    if (scale === MIN_SCALE) {
      setScale(2);
    } else {
      handleResetZoom();
    }
  };

  if (!photos || photos.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Team Photos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-gray-500 dark:text-gray-400">
            <ImageIcon className="h-12 w-12 mb-3 opacity-50" />
            <p className="text-sm">No photos available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Team Photos ({photos.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {photos.map((photo, index) => (
              <button
                key={photo.id}
                onClick={() => handlePhotoClick(photo, index)}
                className="relative aspect-video rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 hover:ring-2 hover:ring-frc-blue transition-all cursor-pointer group"
              >
                <Image
                  src={photo.url}
                  alt={photo.caption || 'Team photo'}
                  fill
                  sizes="(max-width: 768px) 50vw, 33vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-200"
                />
                {photo.caption && (
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {photo.caption}
                  </div>
                )}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Photo Enlargement Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-7xl w-[95vw] h-[90vh] p-0 bg-black/95 border-gray-700 overflow-hidden">
          <div className="relative w-full h-full flex flex-col">
            {/* Header with controls */}
            <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
              <div className="flex-1">
                {selectedPhoto?.caption && (
                  <p className="text-white text-sm font-medium">{selectedPhoto.caption}</p>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* Download Button */}
                <button
                  onClick={handleDownload}
                  className="p-2 rounded-full bg-black/50 text-white hover:bg-frc-blue/80 hover:text-white transition-colors"
                  aria-label="Download photo"
                  title="Download photo"
                >
                  <Download className="h-5 w-5" />
                </button>

                {/* Close Button */}
                <button
                  onClick={handleCloseDialog}
                  className="p-2 rounded-full bg-black/50 text-white hover:bg-red-600/80 transition-colors"
                  aria-label="Close"
                  title="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Zoom Controls - Left Side */}
            <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-2">
              <button
                onClick={handleZoomIn}
                disabled={scale >= MAX_SCALE}
                className="p-3 rounded-full bg-black/50 text-white hover:bg-frc-blue/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Zoom in"
                title="Zoom in (+)"
              >
                <ZoomIn className="h-5 w-5" />
              </button>

              <button
                onClick={handleZoomOut}
                disabled={scale <= MIN_SCALE}
                className="p-3 rounded-full bg-black/50 text-white hover:bg-frc-blue/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Zoom out"
                title="Zoom out (-)"
              >
                <ZoomOut className="h-5 w-5" />
              </button>

              <button
                onClick={handleResetZoom}
                disabled={scale === MIN_SCALE}
                className="p-3 rounded-full bg-black/50 text-white hover:bg-frc-blue/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Reset zoom"
                title="Reset zoom (0)"
              >
                <Maximize2 className="h-5 w-5" />
              </button>

              {/* Zoom Level Indicator */}
              {scale > MIN_SCALE && (
                <div className="mt-2 px-3 py-1 rounded-full bg-black/70 text-white text-xs font-medium text-center">
                  {Math.round(scale * 100)}%
                </div>
              )}
            </div>

            {/* Image Container with Zoom and Pan */}
            {selectedPhoto && (
              <div
                ref={imageContainerRef}
                className="relative w-full h-full flex items-center justify-center p-4 pt-16 pb-20 overflow-hidden"
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onDoubleClick={handleDoubleClick}
                style={{
                  cursor: scale > MIN_SCALE ? (isDragging ? 'grabbing' : 'grab') : 'default',
                  touchAction: 'none'
                }}
              >
                <div
                  className="relative w-full h-full transition-transform duration-200 ease-out"
                  style={{
                    transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                    transformOrigin: 'center center',
                  }}
                >
                  <Image
                    src={selectedPhoto.url}
                    alt={selectedPhoto.caption || 'Team photo'}
                    fill
                    sizes="95vw"
                    className="object-contain pointer-events-none select-none"
                    priority
                    draggable={false}
                  />
                </div>
              </div>
            )}

            {/* Footer with metadata */}
            {selectedPhoto && (
              <div className="absolute bottom-0 left-0 right-0 z-10 p-4 bg-gradient-to-t from-black/80 to-transparent">
                <div className="flex items-center justify-between gap-4 text-xs text-gray-400">
                  <span className="whitespace-nowrap">
                    Photo {selectedIndex + 1} of {photos.length}
                  </span>
                  <span className="whitespace-nowrap">
                    Uploaded {new Date(selectedPhoto.uploaded_at).toLocaleDateString()}
                  </span>
                </div>
                {/* Keyboard hints */}
                {scale === MIN_SCALE && (
                  <div className="mt-2 text-center text-xs text-gray-500">
                    Double-click, mouse wheel, or use +/- keys to zoom • Drag to pan when zoomed
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
