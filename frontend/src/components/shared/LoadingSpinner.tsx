import React from 'react';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = 'Processing...',
  size = 'md',
  className = ''
}) => {
  const sizeClasses = {
    sm: 'w-5 h-5 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4'
  }[size];

  return (
    <div className={`flex flex-col items-center justify-center gap-3 p-6 ${className}`}>
      <div
        className={`rounded-full border-t-indigo-500 border-r-indigo-400 border-b-violet-500 border-l-transparent animate-spin ${sizeClasses}`}
      />
      {message && (
        <span className="text-sm font-medium text-slate-400 animate-pulse tracking-wide font-mono">
          {message}
        </span>
      )}
    </div>
  );
};
