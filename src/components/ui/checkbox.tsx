import React from 'react';

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'onCheckedChange'> {
  onCheckedChange?: (checked: boolean) => void;
}

export function Checkbox({
  className = '',
  onCheckedChange,
  onChange,
  ...props
}: CheckboxProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onCheckedChange) {
      onCheckedChange(e.target.checked);
    }
    if (onChange) {
      onChange(e);
    }
  };

  return (
    <input
      type="checkbox"
      className={`h-4 w-4 rounded border-gray-300 text-frc-blue focus:ring-2 focus:ring-frc-blue dark:border-gray-600 dark:bg-gray-800 ${className}`}
      onChange={handleChange}
      {...props}
    />
  );
}
