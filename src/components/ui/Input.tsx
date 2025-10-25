import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helpText?: string;
}

export function Input({
  label,
  error,
  helpText,
  className = '',
  id,
  ...props
}: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:border-frc-blue focus:outline-none focus:ring-2 focus:ring-frc-blue dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 ${error ? 'border-red-500' : ''} ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>}
      {!error && helpText && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{helpText}</p>}
    </div>
  );
}
