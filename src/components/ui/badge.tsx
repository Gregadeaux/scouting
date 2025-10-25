import React from 'react';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'secondary' | 'success' | 'danger' | 'warning' | 'outline';
  children: React.ReactNode;
}

export function Badge({
  variant = 'default',
  className = '',
  children,
  ...props
}: BadgeProps) {
  const baseStyles =
    'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors';

  const variantStyles = {
    default:
      'bg-frc-blue text-white',
    secondary:
      'bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-gray-100',
    success:
      'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
    danger:
      'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100',
    warning:
      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100',
    outline:
      'border border-gray-300 bg-transparent text-gray-700 dark:border-gray-600 dark:text-gray-300',
  };

  return (
    <span
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
