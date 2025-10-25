'use client';

import React from 'react';
import { Input } from './Input';
import { Select } from './Select';
import { Checkbox } from './checkbox';
import { Counter } from './Counter';

export interface FieldConfig {
  key: string;
  label: string;
  type: 'boolean' | 'select' | 'number' | 'text' | 'textarea' | 'counter';
  options?: Array<{ value: any; label: string }>;
  min?: number;
  max?: number;
  step?: number;
  required?: boolean;
  helpText?: string;
  placeholder?: string;
  disabled?: boolean;
}

interface FieldRendererProps {
  field: FieldConfig;
  value: any;
  onChange: (value: unknown) => void;
  error?: string;
  className?: string;
}

/**
 * FieldRenderer Component
 *
 * Dynamically renders form fields based on configuration.
 * Used to generate forms from season-specific field definitions.
 *
 * @example
 * ```tsx
 * const field = {
 *   key: 'drive_train',
 *   label: 'Drive Train',
 *   type: 'select',
 *   options: [
 *     { value: 'swerve', label: 'Swerve' },
 *     { value: 'tank', label: 'Tank' },
 *   ],
 *   required: true,
 * };
 *
 * <FieldRenderer
 *   field={field}
 *   value={formData.drive_train}
 *   onChange={(val) => setFormData({...formData, drive_train: val})}
 * />
 * ```
 */
export function FieldRenderer({
  field,
  value,
  onChange,
  error,
  className = '',
}: FieldRendererProps) {
  const { type, label, required, helpText, placeholder, disabled } = field;

  switch (type) {
    case 'boolean':
      return (
        <div className={`flex items-start gap-3 ${className}`}>
          <Checkbox
            id={field.key}
            checked={Boolean(value)}
            onCheckedChange={onChange}
            disabled={disabled}
            aria-label={label}
          />
          <div className="flex-1">
            <label
              htmlFor={field.key}
              className="text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              {label}
              {required && <span className="ml-1 text-red-500">*</span>}
            </label>
            {helpText && (
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{helpText}</p>
            )}
            {error && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>}
          </div>
        </div>
      );

    case 'select':
      if (!field.options || field.options.length === 0) {
        return (
          <div className={className}>
            <p className="text-sm text-red-600">Error: Select field requires options</p>
          </div>
        );
      }
      return (
        <div className={className}>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            {label}
            {required && <span className="ml-1 text-red-500">*</span>}
          </label>
          <Select
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            options={field.options}
            placeholder={placeholder || `Select ${label.toLowerCase()}`}
            error={error}
            disabled={disabled}
          />
          {helpText && !error && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{helpText}</p>
          )}
        </div>
      );

    case 'counter':
      return (
        <div className={className}>
          <div className="mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {label}
              {required && <span className="ml-1 text-red-500">*</span>}
            </span>
          </div>
          <Counter
            value={typeof value === 'number' ? value : 0}
            onChange={onChange}
            min={field.min ?? 0}
            max={field.max ?? 99}
            step={field.step ?? 1}
            disabled={disabled}
          />
          {helpText && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{helpText}</p>
          )}
          {error && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>}
        </div>
      );

    case 'number':
      return (
        <div className={className}>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            {label}
            {required && <span className="ml-1 text-red-500">*</span>}
          </label>
          <Input
            type="number"
            value={value ?? ''}
            onChange={(e) => {
              const val = e.target.value === '' ? null : Number(e.target.value);
              onChange(val);
            }}
            min={field.min}
            max={field.max}
            step={field.step}
            placeholder={placeholder}
            error={error}
            helpText={helpText}
            disabled={disabled}
          />
        </div>
      );

    case 'textarea':
      return (
        <div className={className}>
          <label
            htmlFor={field.key}
            className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            {label}
            {required && <span className="ml-1 text-red-500">*</span>}
          </label>
          <textarea
            id={field.key}
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            rows={4}
            className={`w-full rounded-lg border bg-white px-4 py-2 text-gray-900 focus:border-frc-blue focus:outline-none focus:ring-2 focus:ring-frc-blue dark:bg-gray-800 dark:text-gray-100 ${
              error
                ? 'border-red-500 dark:border-red-500'
                : 'border-gray-300 dark:border-gray-600'
            } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
            aria-describedby={error ? `${field.key}-error` : helpText ? `${field.key}-help` : undefined}
          />
          {error && (
            <p id={`${field.key}-error`} className="mt-1 text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
          {!error && helpText && (
            <p id={`${field.key}-help`} className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {helpText}
            </p>
          )}
        </div>
      );

    case 'text':
    default:
      return (
        <div className={className}>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            {label}
            {required && <span className="ml-1 text-red-500">*</span>}
          </label>
          <Input
            type="text"
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            error={error}
            helpText={helpText}
            disabled={disabled}
          />
        </div>
      );
  }
}
