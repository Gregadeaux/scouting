import React from 'react';

interface ProgressProps {
  value: number;
  max?: number;
  className?: string;
  showLabel?: boolean;
}

export function Progress({
  value,
  max = 100,
  className = '',
  showLabel = false,
}: ProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  const getColor = () => {
    if (percentage >= 80) return 'bg-green-600';
    if (percentage >= 50) return 'bg-yellow-600';
    return 'bg-red-600';
  };

  return (
    <div className={`w-full ${className}`}>
      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden dark:bg-gray-700">
        <div
          className={`h-full ${getColor()} transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <p className="text-xs text-muted-foreground mt-1 text-right">
          {percentage.toFixed(1)}%
        </p>
      )}
    </div>
  );
}
