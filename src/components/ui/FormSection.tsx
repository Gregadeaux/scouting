'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Card } from './Card';

interface FormSectionProps {
  title: string;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
  description?: string;
  className?: string;
}

/**
 * FormSection Component
 *
 * A collapsible section wrapper for grouping related form fields.
 * Uses Card component as base with optional expand/collapse functionality.
 *
 * @example
 * ```tsx
 * <FormSection
 *   title="Robot Capabilities"
 *   description="Physical characteristics and capabilities"
 *   collapsible
 *   defaultOpen
 * >
 *   <Input label="Drive Train" />
 *   <Input label="Weight" />
 * </FormSection>
 * ```
 */
export function FormSection({
  title,
  children,
  collapsible = true,
  defaultOpen = true,
  description,
  className = '',
}: FormSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const toggleOpen = () => {
    if (collapsible) {
      setIsOpen(!isOpen);
    }
  };

  return (
    <Card className={`overflow-hidden transition-all ${className}`}>
      <div
        className={`flex items-center justify-between ${collapsible ? 'cursor-pointer select-none' : ''}`}
        onClick={toggleOpen}
        role={collapsible ? 'button' : undefined}
        aria-expanded={collapsible ? isOpen : undefined}
        tabIndex={collapsible ? 0 : undefined}
        onKeyDown={(e) => {
          if (collapsible && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            toggleOpen();
          }
        }}
      >
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {title}
          </h3>
          {description && (
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {description}
            </p>
          )}
        </div>
        {collapsible && (
          <div className="ml-4 text-gray-500 transition-transform dark:text-gray-400">
            {isOpen ? (
              <ChevronDown className="h-5 w-5" aria-label="Collapse section" />
            ) : (
              <ChevronRight className="h-5 w-5" aria-label="Expand section" />
            )}
          </div>
        )}
      </div>

      <div
        className={`transition-all duration-200 ease-in-out ${
          isOpen ? 'mt-4 max-h-[5000px] opacity-100' : 'max-h-0 overflow-hidden opacity-0'
        }`}
        aria-hidden={!isOpen}
      >
        <div className="space-y-4">{children}</div>
      </div>
    </Card>
  );
}
