import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export default function Input({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
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
          className="block text-sm font-medium text-text-secondary mb-1.5"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
            {leftIcon}
          </div>
        )}
        <input
          id={inputId}
          {...props}
          className={[
            'w-full bg-bg-elevated border rounded-xl px-4 py-3',
            'text-text-primary placeholder-text-muted',
            'focus:outline-none transition-colors',
            error
              ? 'border-status-error focus:border-status-error focus:ring-1 focus:ring-status-error/30'
              : 'border-bg-border focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/30',
            leftIcon ? 'pl-10' : '',
            rightIcon ? 'pr-10' : '',
            className,
          ]
            .filter(Boolean)
            .join(' ')}
        />
        {rightIcon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted">
            {rightIcon}
          </div>
        )}
      </div>
      {error && (
        <p className="mt-1.5 text-xs text-status-error">{error}</p>
      )}
      {hint && !error && (
        <p className="mt-1.5 text-xs text-text-muted">{hint}</p>
      )}
    </div>
  );
}
