import React from 'react';

interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  children: React.ReactNode;
}

export function Label({ className = '', children, ...props }: LabelProps) {
  return (
    <label
      className={`text-sm font-medium text-gray-700 dark:text-gray-300 ${className}`}
      {...props}
    >
      {children}
    </label>
  );
}
