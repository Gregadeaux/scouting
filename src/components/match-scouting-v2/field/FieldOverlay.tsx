'use client';

import { ReactNode } from 'react';

// ============================================================================
// Types
// ============================================================================

interface FieldOverlayProps {
  children: ReactNode;
  backgroundImage?: string;
  backgroundOpacity?: number;
  viewBox?: string; // Default: "0 0 1755 805" (field dimensions in cm)
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

/**
 * FieldOverlay provides a container for SVG-based field layouts with an optional
 * background image. The SVG scales to fit the container while maintaining aspect ratio.
 *
 * Default viewBox is based on FRC field dimensions (1755cm x 805cm).
 */
export function FieldOverlay({
  children,
  backgroundImage,
  backgroundOpacity = 0.4,
  viewBox = '0 0 1755 805',
  className = '',
}: FieldOverlayProps) {
  return (
    <div className={`relative w-full h-full ${className}`}>
      {/* Background image (optional) */}
      {backgroundImage && (
        <img
          src={backgroundImage}
          alt="Field layout"
          className="absolute inset-0 w-full h-full object-contain"
          style={{ opacity: backgroundOpacity }}
          draggable={false}
        />
      )}

      {/* SVG overlay with clickable regions */}
      <svg
        viewBox={viewBox}
        className="absolute inset-0 w-full h-full"
        preserveAspectRatio="xMidYMid meet"
        xmlns="http://www.w3.org/2000/svg"
      >
        {children}
      </svg>
    </div>
  );
}
