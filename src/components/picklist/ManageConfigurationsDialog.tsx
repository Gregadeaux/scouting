/**
 * Manage Configurations Dialog Component
 *
 * Modal dialog for managing saved picklist configurations.
 * Features:
 * - List all configurations with metadata
 * - Rename configurations
 * - Set/unset default
 * - Delete configurations
 *
 * Related: SCOUT-58
 */

'use client';

import { useState } from 'react';
import { Star, Trash2, Edit2, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import type { PickListConfiguration } from '@/types/picklist';

interface ManageConfigurationsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  configurations: PickListConfiguration[];
  onRename: (id: string, newName: string) => Promise<void>;
  onSetDefault: (id: string, isDefault: boolean) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function ManageConfigurationsDialog({
  isOpen,
  onClose,
  configurations,
  onRename,
  onSetDefault,
  onDelete,
}: ManageConfigurationsDialogProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    if (!isProcessing) {
      setEditingId(null);
      setEditName('');
      setDeleteConfirmId(null);
      setError(null);
      onClose();
    }
  };

  const startEdit = (config: PickListConfiguration) => {
    setEditingId(config.id);
    setEditName(config.name);
    setError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setError(null);
  };

  const saveEdit = async (id: string) => {
    const trimmedName = editName.trim();

    if (!trimmedName) {
      setError('Configuration name cannot be empty');
      return;
    }

    if (trimmedName.length > 255) {
      setError('Configuration name is too long');
      return;
    }

    // Check for duplicate names
    const duplicate = configurations.find(
      (c) => c.id !== id && c.name === trimmedName
    );
    if (duplicate) {
      setError('A configuration with this name already exists');
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);
      await onRename(id, trimmedName);
      setEditingId(null);
      setEditName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rename configuration');
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleDefault = async (id: string, currentDefault: boolean) => {
    try {
      setIsProcessing(true);
      setError(null);
      await onSetDefault(id, !currentDefault);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update default status');
    } finally {
      setIsProcessing(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;

    try {
      setIsProcessing(true);
      setError(null);
      await onDelete(deleteConfirmId);
      setDeleteConfirmId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete configuration');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatDate = (date: Date) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const deleteConfig = configurations.find((c) => c.id === deleteConfirmId);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
            onClick={handleClose}
          />

          {/* Dialog */}
          <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-3xl dark:bg-gray-800">
            <div className="bg-white px-4 pb-4 pt-5 sm:p-6 dark:bg-gray-800">
              {/* Header */}
              <div className="mb-6">
                <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100">
                  Manage Configurations
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Rename, set defaults, or delete saved picklist configurations.
                </p>
              </div>

              {/* Error message */}
              {error && (
                <div className="mb-4 rounded-md bg-red-50 dark:bg-red-900/20 p-3">
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

              {/* Configurations list */}
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {configurations.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    <p>No saved configurations yet.</p>
                    <p className="text-sm mt-1">
                      Create a configuration to save your current column setup.
                    </p>
                  </div>
                ) : (
                  configurations.map((config) => (
                    <div
                      key={config.id}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        {/* Name and metadata */}
                        <div className="flex-1 min-w-0">
                          {editingId === config.id ? (
                            // Edit mode
                            <div className="space-y-2">
                              <Input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveEdit(config.id);
                                  if (e.key === 'Escape') cancelEdit();
                                }}
                                disabled={isProcessing}
                                className="w-full"
                                autoFocus
                              />
                              <div className="flex gap-2">
                                <Button
                                  variant="primary"
                                  onClick={() => saveEdit(config.id)}
                                  disabled={isProcessing || !editName.trim()}
                                  className="text-xs px-2 py-1"
                                >
                                  Save
                                </Button>
                                <Button
                                  variant="secondary"
                                  onClick={cancelEdit}
                                  disabled={isProcessing}
                                  className="text-xs px-2 py-1"
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            // View mode
                            <>
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                  {config.name}
                                </h4>
                                {config.isDefault && (
                                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                                )}
                              </div>
                              <div className="mt-1 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  <span>Created: {formatDate(config.createdAt)}</span>
                                </div>
                                <div>
                                  {config.configuration.columns.length} column
                                  {config.configuration.columns.length !== 1 ? 's' : ''}
                                </div>
                              </div>
                            </>
                          )}
                        </div>

                        {/* Actions */}
                        {editingId !== config.id && (
                          <div className="flex items-center gap-2">
                            {/* Set/unset default */}
                            <button
                              onClick={() => toggleDefault(config.id, config.isDefault)}
                              disabled={isProcessing}
                              className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                              title={config.isDefault ? 'Unset as default' : 'Set as default'}
                            >
                              <Star
                                className={`w-4 h-4 ${
                                  config.isDefault
                                    ? 'text-yellow-500 fill-yellow-500'
                                    : 'text-gray-400'
                                }`}
                              />
                            </button>

                            {/* Rename */}
                            <button
                              onClick={() => startEdit(config)}
                              disabled={isProcessing}
                              className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                              title="Rename"
                            >
                              <Edit2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                            </button>

                            {/* Delete */}
                            <button
                              onClick={() => setDeleteConfirmId(config.id)}
                              disabled={isProcessing}
                              className="p-2 rounded-md hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6 dark:bg-gray-700">
              <Button variant="secondary" onClick={handleClose} disabled={isProcessing}>
                Close
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        isOpen={deleteConfirmId !== null}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={confirmDelete}
        title="Delete Configuration"
        message={`Are you sure you want to delete "${deleteConfig?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </>
  );
}
