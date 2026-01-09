/**
 * Save Configuration Dialog Component
 *
 * Modal dialog for saving current picklist view configuration.
 * Features:
 * - Custom name input
 * - Set as default checkbox
 * - Validation and error handling
 *
 * Related: SCOUT-58
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface SaveConfigDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, isDefault: boolean) => Promise<void>;
  existingNames: string[];
}

export function SaveConfigDialog({
  isOpen,
  onClose,
  onSave,
  existingNames,
}: SaveConfigDialogProps) {
  const [name, setName] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    if (!isSaving) {
      setName('');
      setIsDefault(false);
      setError(null);
      onClose();
    }
  };

  const handleSave = async () => {
    // Validate name
    const trimmedName = name.trim();

    if (!trimmedName) {
      setError('Configuration name is required');
      return;
    }

    if (trimmedName.length > 255) {
      setError('Configuration name is too long (max 255 characters)');
      return;
    }

    if (existingNames.includes(trimmedName)) {
      setError('A configuration with this name already exists');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      await onSave(trimmedName, isDefault);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isSaving) {
      handleSave();
    } else if (e.key === 'Escape' && !isSaving) {
      handleClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={handleClose}
        />

        {/* Dialog */}
        <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg dark:bg-gray-800">
          <div className="bg-white px-4 pb-4 pt-5 sm:p-6 dark:bg-gray-800">
            <div className="sm:flex sm:items-start">
              <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900 sm:mx-0 sm:h-10 sm:w-10">
                <svg
                  className="h-6 w-6 text-blue-600 dark:text-blue-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                  />
                </svg>
              </div>
              <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left flex-1">
                <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100">
                  Save Picklist Configuration
                </h3>
                <div className="mt-4 space-y-4">
                  {/* Name input */}
                  <div>
                    <label
                      htmlFor="config-name"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    >
                      Configuration Name
                    </label>
                    <Input
                      id="config-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="e.g., Saturday Alliance Selection"
                      disabled={isSaving}
                      className="w-full"
                      autoFocus
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Give this configuration a descriptive name to easily find it later.
                    </p>
                  </div>

                  {/* Default checkbox */}
                  <div className="flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        id="set-default"
                        type="checkbox"
                        checked={isDefault}
                        onChange={(e) => setIsDefault(e.target.checked)}
                        disabled={isSaving}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label
                        htmlFor="set-default"
                        className="font-medium text-gray-700 dark:text-gray-300"
                      >
                        Set as default configuration
                      </label>
                      <p className="text-gray-500 dark:text-gray-400">
                        This configuration will automatically load when you open the picklist for
                        this event.
                      </p>
                    </div>
                  </div>

                  {/* Error message */}
                  {error && (
                    <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-3">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <svg
                            className="h-5 w-5 text-red-400"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6 dark:bg-gray-700">
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={isSaving || !name.trim()}
              className="w-full sm:ml-3 sm:w-auto"
            >
              {isSaving ? 'Saving...' : 'Save Configuration'}
            </Button>
            <Button
              variant="secondary"
              onClick={handleClose}
              disabled={isSaving}
              className="mt-3 w-full sm:mt-0 sm:w-auto"
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
