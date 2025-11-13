/**
 * Configuration Selector Component
 *
 * Dropdown for selecting and loading saved picklist configurations.
 * Features:
 * - List saved configurations with metadata
 * - Indicates default configuration
 * - Quick one-click load
 *
 * Related: SCOUT-58
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Star, Calendar } from 'lucide-react';
import type { PickListConfiguration } from '@/types/picklist';

interface ConfigurationSelectorProps {
  configurations: PickListConfiguration[];
  onLoad: (config: PickListConfiguration) => void;
  disabled?: boolean;
}

export function ConfigurationSelector({
  configurations,
  onLoad,
  disabled = false,
}: ConfigurationSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleLoad = (config: PickListConfiguration) => {
    onLoad(config);
    setIsOpen(false);
  };

  const formatDate = (date: Date) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;

    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  if (configurations.length === 0) {
    return (
      <div className="text-sm text-gray-500 dark:text-gray-400 italic">
        No saved configurations
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Load Configuration
        </span>
        <ChevronDown
          className={`w-4 h-4 text-gray-500 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10 max-h-96 overflow-y-auto">
          <div className="p-2">
            {/* Header */}
            <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Saved Configurations
            </div>

            {/* Configuration list */}
            <div className="space-y-1">
              {configurations.map((config) => (
                <button
                  key={config.id}
                  onClick={() => handleLoad(config)}
                  className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      {/* Name with default indicator */}
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {config.name}
                        </span>
                        {config.isDefault && (
                          <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                        )}
                      </div>

                      {/* Metadata */}
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>{formatDate(config.updatedAt)}</span>
                        </div>
                        <div>
                          {config.configuration.columns.length} column
                          {config.configuration.columns.length !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>

                    {/* Load indicator */}
                    <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                        Load
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
