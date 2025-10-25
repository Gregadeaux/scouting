import React from 'react';

interface SelectOption {
  value: string | number;
  label: string;
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function Select({
  label,
  error,
  options,
  placeholder = 'Select an option',
  className = '',
  size = 'md',
  disabled,
  onChange,
  ...props
}: SelectProps) {
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-4 py-3 text-lg',
  };

  // Handle onChange to convert string values back to their original types
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (onChange) {
      // Find the original option to get the correct type
      const selectedOption = options.find(opt => String(opt.value) === e.target.value);

      if (selectedOption) {
        // Create a new event with the correctly typed value
        const newEvent = {
          ...e,
          target: {
            ...e.target,
            value: selectedOption.value,
          },
        } as React.ChangeEvent<HTMLSelectElement>;

        onChange(newEvent);
      } else {
        onChange(e);
      }
    }
  };

  return (
    <div className="w-full">
      {label && (
        <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      <select
        className={`block w-full rounded-lg border ${
          error
            ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
            : 'border-gray-300 focus:border-frc-blue focus:ring-frc-blue dark:border-gray-600'
        } bg-white text-gray-900 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-800 dark:text-gray-100 ${
          sizeClasses[size]
        } ${className}`}
        disabled={disabled}
        onChange={handleChange}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="mt-1 text-sm text-red-500 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}