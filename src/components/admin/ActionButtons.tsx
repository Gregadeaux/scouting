'use client';

import React, { useState } from 'react';
import { Button } from '../ui/Button';

interface ActionButtonsProps {
  onEdit: () => void;
  onDelete: () => void;
  confirmDelete?: boolean;
  deleteMessage?: string;
  className?: string;
}

export function ActionButtons({
  onEdit,
  onDelete,
  confirmDelete = true,
  deleteMessage = 'Are you sure you want to delete this item? This action cannot be undone.',
  className = '',
}: ActionButtonsProps) {
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDelete = () => {
    if (confirmDelete && !showConfirm) {
      setShowConfirm(true);
    } else {
      onDelete();
      setShowConfirm(false);
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {showConfirm ? (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">Confirm?</span>
          <Button size="sm" variant="danger" onClick={handleDelete}>
            Delete
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setShowConfirm(false)}>
            Cancel
          </Button>
        </div>
      ) : (
        <>
          <button
            onClick={onEdit}
            className="rounded p-1 text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-100"
            title="Edit"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          </button>
          <button
            onClick={handleDelete}
            className="rounded p-1 text-gray-600 hover:bg-red-100 hover:text-red-700 dark:text-gray-400 dark:hover:bg-red-900 dark:hover:text-red-200"
            title="Delete"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </>
      )}
    </div>
  );
}
