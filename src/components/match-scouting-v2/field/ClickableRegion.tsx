'use client';

import { useState, useRef } from 'react';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

type SVGShape = 'circle' | 'rect' | 'polygon' | 'path';

interface BaseCoords {
  // Circle
  cx?: number;
  cy?: number;
  r?: number;
  // Rectangle
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  // Polygon
  points?: string;
  // Path
  d?: string;
}

interface ClickableRegionProps {
  // SVG shape and positioning
  shape: SVGShape;
  coords: BaseCoords;

  // Interaction callbacks
  onClick: () => void;
  onLongPress?: () => void; // For decrement

  // Display
  label?: string;
  labelPosition?: 'top' | 'bottom' | 'center';
  count?: number;
  color?: string;

  // State
  isActive?: boolean;
  isDisabled?: boolean;

  // Styling
  className?: string;
}

// ============================================================================
// Utility Functions
// ============================================================================

function hexToRgb(hex: string): string {
  // Remove # if present
  hex = hex.replace('#', '');

  // Parse hex to RGB
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  return `${r}, ${g}, ${b}`;
}

function getCenterPoint(shape: SVGShape, coords: BaseCoords): { x: number; y: number } {
  switch (shape) {
    case 'circle':
      return { x: coords.cx || 0, y: coords.cy || 0 };
    case 'rect':
      return {
        x: (coords.x || 0) + (coords.width || 0) / 2,
        y: (coords.y || 0) + (coords.height || 0) / 2,
      };
    case 'polygon': {
      // Calculate centroid of polygon
      const points = coords.points?.split(' ').map((p) => {
        const [x, y] = p.split(',').map(Number);
        return { x, y };
      }) || [];
      if (points.length === 0) return { x: 0, y: 0 };
      const sum = points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
      return { x: sum.x / points.length, y: sum.y / points.length };
    }
    case 'path':
      // For paths, just use coords.cx/cy if provided, otherwise 0,0
      return { x: coords.cx || 0, y: coords.cy || 0 };
    default:
      return { x: 0, y: 0 };
  }
}

// ============================================================================
// Component
// ============================================================================

export function ClickableRegion({
  shape,
  coords,
  onClick,
  onLongPress,
  label,
  labelPosition = 'top',
  count,
  color = '#3b82f6',
  isActive = false,
  isDisabled = false,
  className,
}: ClickableRegionProps) {
  const [isPressing, setIsPressing] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | undefined>(undefined);
  const hasTriggeredLongPress = useRef(false);

  // ============================================================================
  // Touch Handlers
  // ============================================================================

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isDisabled) return;

    setIsPressing(true);
    hasTriggeredLongPress.current = false;

    // Set up long press timer
    if (onLongPress) {
      longPressTimer.current = setTimeout(() => {
        hasTriggeredLongPress.current = true;
        onLongPress();

        // Haptic feedback on supported devices
        if ('vibrate' in navigator) {
          navigator.vibrate(50);
        }
      }, 500); // 500ms for long press
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (isDisabled) return;

    setIsPressing(false);

    // Clear long press timer
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }

    // Only trigger onClick if long press wasn't triggered
    if (!hasTriggeredLongPress.current) {
      onClick();

      // Haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate(30);
      }
    }
  };

  const handleTouchCancel = () => {
    setIsPressing(false);
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  };

  // ============================================================================
  // Mouse Handlers (for desktop testing)
  // ============================================================================

  const handleMouseDown = () => {
    if (isDisabled) return;
    setIsPressing(true);
    hasTriggeredLongPress.current = false;

    if (onLongPress) {
      longPressTimer.current = setTimeout(() => {
        hasTriggeredLongPress.current = true;
        onLongPress();
      }, 500);
    }
  };

  const handleMouseUp = () => {
    if (isDisabled) return;
    setIsPressing(false);

    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }

    if (!hasTriggeredLongPress.current) {
      onClick();
    }
  };

  const handleMouseLeave = () => {
    setIsPressing(false);
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  };

  // ============================================================================
  // Rendering
  // ============================================================================

  const baseProps = {
    fill: isDisabled
      ? '#9ca3af'
      : `rgba(${hexToRgb(color)}, ${isPressing ? 0.7 : isActive ? 0.5 : 0.3})`,
    stroke: isDisabled ? '#6b7280' : color,
    strokeWidth: isActive ? 4 : 2,
    onTouchStart: handleTouchStart,
    onTouchEnd: handleTouchEnd,
    onTouchCancel: handleTouchCancel,
    onMouseDown: handleMouseDown,
    onMouseUp: handleMouseUp,
    onMouseLeave: handleMouseLeave,
    className: cn(
      'transition-all duration-150',
      !isDisabled && 'cursor-pointer',
      isPressing && 'opacity-80',
      className
    ),
    style: { touchAction: 'none' } as React.CSSProperties, // Prevent scrolling on touch
  };

  const renderShape = () => {
    switch (shape) {
      case 'circle':
        return <circle cx={coords.cx} cy={coords.cy} r={coords.r} {...baseProps} />;
      case 'rect':
        return (
          <rect
            x={coords.x}
            y={coords.y}
            width={coords.width}
            height={coords.height}
            rx="8"
            {...baseProps}
          />
        );
      case 'polygon':
        return <polygon points={coords.points} {...baseProps} />;
      case 'path':
        return <path d={coords.d} {...baseProps} />;
    }
  };

  const center = getCenterPoint(shape, coords);

  return (
    <g className="select-none">
      {renderShape()}

      {/* Label */}
      {label && (
        <text
          x={center.x}
          y={
            labelPosition === 'top'
              ? center.y - (coords.r || coords.height || 40)
              : labelPosition === 'bottom'
                ? center.y + (coords.r || coords.height || 40) + 20
                : center.y - 25
          }
          textAnchor="middle"
          className="text-xs font-semibold fill-gray-700 pointer-events-none"
          style={{ userSelect: 'none' }}
        >
          {label}
        </text>
      )}

      {/* Counter */}
      {count !== undefined && (
        <text
          x={center.x}
          y={labelPosition === 'center' ? center.y + 10 : center.y}
          textAnchor="middle"
          dominantBaseline="middle"
          className="text-3xl font-bold fill-gray-900 pointer-events-none"
          style={{ userSelect: 'none' }}
        >
          {count}
        </text>
      )}
    </g>
  );
}
