'use client';

import React from 'react';

interface StatusBadgeProps {
  status: 'active' | 'inactive' | 'completed' | 'pending' | 'success' | 'error';
  variant?: 'default' | 'outline';
  className?: string;
}

export function StatusBadge({ status, variant = 'default', className = '' }: StatusBadgeProps) {
  // Handle undefined/null status
  if (!status) {
    return <span className="text-gray-400">-</span>;
  }

  const statusStyles = {
    active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    completed: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    success: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    error: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  };

  const outlineStyles = {
    active: 'border-2 border-green-500 text-green-700 dark:text-green-400',
    inactive: 'border-2 border-gray-500 text-gray-700 dark:text-gray-400',
    completed: 'border-2 border-blue-500 text-blue-700 dark:text-blue-400',
    pending: 'border-2 border-yellow-500 text-yellow-700 dark:text-yellow-400',
    success: 'border-2 border-green-500 text-green-700 dark:text-green-400',
    error: 'border-2 border-red-500 text-red-700 dark:text-red-400',
  };

  const baseStyles = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
  const styles = variant === 'outline' ? outlineStyles[status] : statusStyles[status];

  return (
    <span className={`${baseStyles} ${styles} ${className}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
