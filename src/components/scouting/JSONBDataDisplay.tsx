/**
 * JSONBDataDisplay Component
 *
 * Displays JSONB scouting data in human-readable format with proper labels,
 * grouping, and interaction features. Works with any season configuration.
 *
 * Usage:
 * ```tsx
 * import { JSONBDataDisplay } from '@/components/scouting/JSONBDataDisplay';
 * import { REEFSCAPE_CONFIG } from '@/lib/config/season-2025';
 *
 * <JSONBDataDisplay
 *   data={matchScouting.auto_performance}
 *   seasonConfig={REEFSCAPE_CONFIG}
 *   sections={['auto']}
 *   compact={true}
 * />
 * ```
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Copy, Check } from 'lucide-react';
import { FieldDisplay, FieldDisplayCompact } from './FieldDisplay';
import type { FieldDefinition } from '@/lib/config/season-2025';
import { Button } from '@/components/ui/Button';
import type { JSONBData } from '@/types';

interface JSONBDataDisplayProps {
  data: JSONBData;
  seasonConfig: {
    autoFields?: FieldDefinition[];
    teleopFields?: FieldDefinition[];
    endgameFields?: FieldDefinition[];
    [key: string]: unknown;
  };
  sections?: string[]; // Filter to specific sections
  compact?: boolean; // Compact mode for dense display
  collapsible?: boolean; // Allow sections to collapse
  showCopy?: boolean; // Show copy-to-clipboard button
  title?: string; // Optional title for the section
}

export function JSONBDataDisplay({
  data,
  seasonConfig,
  sections,
  compact = false,
  collapsible = true,
  showCopy = true,
  title,
}: JSONBDataDisplayProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['all']));
  const [copied, setCopied] = useState(false);

  // Determine which field definitions to use based on schema_version
  const getFieldDefinitions = (): FieldDefinition[] => {
    const schemaVersion = data.schema_version;

    if (!schemaVersion || typeof schemaVersion !== 'string') {
      return [];
    }

    // Match schema version to field definitions
    if (schemaVersion.includes('2025')) {
      // Check data structure to determine period
      if ('left_starting_zone' in data) {
        return seasonConfig.autoFields || [];
      } else if ('cycles_completed' in data) {
        return seasonConfig.teleopFields || [];
      } else if ('cage_climb_attempted' in data || 'endgame_points' in data) {
        return seasonConfig.endgameFields || [];
      }
    }

    return [];
  };

  const fieldDefinitions = getFieldDefinitions();

  // Create a map of field key to definition for easy lookup
  const fieldMap = new Map<string, FieldDefinition>();
  fieldDefinitions.forEach(field => {
    fieldMap.set(field.key, field);
  });

  // Group fields by section
  const groupedFields = new Map<string, Array<{ key: string; value: unknown; field: FieldDefinition }>>();

  Object.entries(data).forEach(([key, value]) => {
    // Skip schema_version and other metadata
    if (key === 'schema_version') return;

    const field = fieldMap.get(key);
    if (!field) return; // Skip fields not in definition

    // Filter by sections if provided
    if (sections && field.section && !sections.includes(field.section)) {
      return;
    }

    const section = field.section || 'Other';
    if (!groupedFields.has(section)) {
      groupedFields.set(section, []);
    }

    groupedFields.get(section)!.push({ key, value, field });
  });

  // Sort fields within each section by order
  groupedFields.forEach((fields, section) => {
    fields.sort((a, b) => (a.field.order || 0) - (b.field.order || 0));
  });

  // Get section names sorted
  const sectionNames = Array.from(groupedFields.keys()).sort();

  // Toggle section expansion
  const toggleSection = (section: string) => {
    if (!collapsible) return;

    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  // Copy data to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  // If no fields to display
  if (groupedFields.size === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
        No data to display
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {title && (
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {title}
          </h3>
          {showCopy && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="gap-1.5"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Copy
                </>
              )}
            </Button>
          )}
        </div>
      )}

      {sectionNames.map(section => {
        const fields = groupedFields.get(section) || [];
        const isExpanded = expandedSections.has(section);

        return (
          <div
            key={section}
            className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
          >
            {/* Section Header */}
            <button
              onClick={() => toggleSection(section)}
              disabled={!collapsible}
              className={`w-full flex items-center justify-between p-3 text-left ${
                collapsible ? 'hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer' : ''
              }`}
            >
              <div className="flex items-center gap-2">
                {collapsible && (
                  isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-gray-500" />
                  )
                )}
                <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                  {section}
                </h4>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {fields.length} {fields.length === 1 ? 'field' : 'fields'}
                </span>
              </div>
              {!title && showCopy && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopy();
                  }}
                  className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-600"
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-green-600" />
                  ) : (
                    <Copy className="h-3.5 w-3.5 text-gray-500" />
                  )}
                </button>
              )}
            </button>

            {/* Section Content */}
            {isExpanded && (
              <div className={`border-t border-gray-200 dark:border-gray-700 ${compact ? 'p-2' : 'p-4'}`}>
                {compact ? (
                  // Compact grid layout - maximize information density
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-1">
                    {fields.map(({ key, value, field }) => (
                      <FieldDisplayCompact
                        key={key}
                        field={field}
                        value={value as string | number | boolean | null | undefined}
                        compact={true}
                      />
                    ))}
                  </div>
                ) : (
                  // Standard layout - more spacious
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {fields.map(({ key, value, field }) => (
                      <FieldDisplay
                        key={key}
                        field={field}
                        value={value as string | number | boolean | null | undefined}
                        compact={false}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Simplified component for inline display (no sections)
export function JSONBDataDisplayInline({
  data,
  seasonConfig,
  showCopy = false,
}: Pick<JSONBDataDisplayProps, 'data' | 'seasonConfig' | 'showCopy'>) {
  const [copied, setCopied] = useState(false);

  const getFieldDefinitions = (): FieldDefinition[] => {
    const schemaVersion = data.schema_version;

    if (!schemaVersion || typeof schemaVersion !== 'string') {
      return [];
    }

    if (schemaVersion.includes('2025')) {
      if ('left_starting_zone' in data) {
        return seasonConfig.autoFields || [];
      } else if ('cycles_completed' in data) {
        return seasonConfig.teleopFields || [];
      } else if ('cage_climb_attempted' in data || 'endgame_points' in data) {
        return seasonConfig.endgameFields || [];
      }
    }

    return [];
  };

  const fieldDefinitions = getFieldDefinitions();
  const fieldMap = new Map<string, FieldDefinition>();
  fieldDefinitions.forEach(field => {
    fieldMap.set(field.key, field);
  });

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1">
          {Object.entries(data).map(([key, value]) => {
            if (key === 'schema_version') return null;
            const field = fieldMap.get(key);
            if (!field) return null;

            return (
              <FieldDisplayCompact
                key={key}
                field={field}
                value={value as string | number | boolean | null | undefined}
                compact={true}
              />
            );
          })}
        </div>
        {showCopy && (
          <button
            onClick={handleCopy}
            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-600 flex-shrink-0"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-green-600" />
            ) : (
              <Copy className="h-3.5 w-3.5 text-gray-500" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}
