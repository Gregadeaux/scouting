/**
 * FieldDisplay Component
 *
 * Renders individual field values from JSONB data with type-specific formatting.
 * Used by JSONBDataDisplay to show human-readable field values.
 */

import React from 'react';
import { Check, X, Info } from 'lucide-react';
import type { FieldDefinition } from '@/lib/config/season-2025';

interface FieldDisplayProps {
  field: FieldDefinition;
  value: string | number | boolean | null | undefined;
  compact?: boolean;
}

export function FieldDisplay({ field, value, compact = false }: FieldDisplayProps) {
  // Handle null/undefined values
  if (value === null || value === undefined) {
    return (
      <div className={compact ? 'text-sm' : ''}>
        <span className="text-gray-400 dark:text-gray-600">-</span>
      </div>
    );
  }

  // Render based on field type
  const renderValue = () => {
    switch (field.type) {
      case 'boolean':
        return (
          <div className="flex items-center gap-1.5">
            {value ? (
              <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
            ) : (
              <X className="h-4 w-4 text-gray-400 dark:text-gray-600" />
            )}
            {!compact && (
              <span className={value ? 'text-green-700 dark:text-green-300' : 'text-gray-500 dark:text-gray-400'}>
                {value ? 'Yes' : 'No'}
              </span>
            )}
          </div>
        );

      case 'counter':
      case 'number':
        return (
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              {typeof value === 'number' ? value.toFixed(0) : value}
            </span>
            {field.min !== undefined && field.max !== undefined && !compact && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                ({field.min}-{field.max})
              </span>
            )}
          </div>
        );

      case 'select':
        // Convert enum value to label if options exist
        if (field.options) {
          const option = field.options.find(opt => opt.value === value);
          const displayValue = option?.label || value;
          return (
            <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200">
              {displayValue}
            </span>
          );
        }
        return (
          <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            {String(value)}
          </span>
        );

      case 'rating':
        const ratingValue = typeof value === 'number' ? value : 0;
        return (
          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <span
                key={i}
                className={i < ratingValue ? 'text-yellow-500' : 'text-gray-300 dark:text-gray-600'}
              >
                ★
              </span>
            ))}
            {!compact && (
              <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                {ratingValue}/5
              </span>
            )}
          </div>
        );

      case 'text':
      case 'textarea':
        const text = String(value);
        const shouldTruncate = compact && text.length > 50;
        return (
          <span className="text-gray-900 dark:text-gray-100">
            {shouldTruncate ? `${text.substring(0, 50)}...` : text}
          </span>
        );

      case 'timer':
        // Format as MM:SS
        const totalSeconds = typeof value === 'number' ? value : 0;
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return (
          <span className="font-mono text-gray-900 dark:text-gray-100">
            {minutes}:{seconds.toString().padStart(2, '0')}
          </span>
        );

      default:
        return (
          <span className="text-gray-900 dark:text-gray-100">
            {String(value)}
          </span>
        );
    }
  };

  return (
    <div className={`flex items-start gap-2 ${compact ? 'flex-col' : 'flex-row items-center'}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <label className={`font-medium text-gray-700 dark:text-gray-300 ${compact ? 'text-xs' : 'text-sm'}`}>
            {field.label}:
          </label>
          {field.helpText && (
            <div className="group relative">
              <Info className="h-3.5 w-3.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
              <div className="invisible group-hover:visible absolute z-10 w-64 p-2 mt-1 text-xs text-white bg-gray-900 rounded shadow-lg -left-24">
                {field.helpText}
              </div>
            </div>
          )}
        </div>
        <div className={compact ? 'mt-0.5' : ''}>
          {renderValue()}
        </div>
      </div>
    </div>
  );
}

// Simplified version for grid layouts - just label and value
export function FieldDisplayCompact({ field, value }: FieldDisplayProps) {
  if (value === null || value === undefined) {
    return null; // Don't render empty fields in compact mode
  }

  const renderValue = () => {
    switch (field.type) {
      case 'boolean':
        return value ? (
          <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
        ) : (
          <X className="h-4 w-4 text-gray-400 dark:text-gray-600" />
        );

      case 'counter':
      case 'number':
        return (
          <span className="font-semibold text-gray-900 dark:text-gray-100">
            {typeof value === 'number' ? value : value}
          </span>
        );

      case 'select':
        if (field.options) {
          const option = field.options.find(opt => opt.value === value);
          return (
            <span className="text-xs text-gray-900 dark:text-gray-100">
              {option?.label || value}
            </span>
          );
        }
        return <span className="text-xs text-gray-900 dark:text-gray-100">{String(value)}</span>;

      case 'rating':
        return (
          <span className="text-sm text-gray-900 dark:text-gray-100">
            {value}/5 ★
          </span>
        );

      case 'text':
      case 'textarea':
        const text = String(value);
        return (
          <span className="text-xs text-gray-900 dark:text-gray-100 truncate">
            {text.length > 30 ? `${text.substring(0, 30)}...` : text}
          </span>
        );

      default:
        return (
          <span className="text-xs text-gray-900 dark:text-gray-100">
            {String(value)}
          </span>
        );
    }
  };

  return (
    <div className="flex items-center justify-between gap-2 py-1">
      <span className="text-xs font-medium text-gray-600 dark:text-gray-400 truncate">
        {field.label}:
      </span>
      <div className="flex-shrink-0">
        {renderValue()}
      </div>
    </div>
  );
}
