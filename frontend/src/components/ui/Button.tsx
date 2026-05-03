import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-gradient-to-r from-brand-primary to-brand-secondary hover:opacity-90 text-white shadow-glow-sm',
  secondary: 'bg-transparent border border-brand-primary text-brand-primary hover:bg-brand-primary/10',
  ghost: 'bg-bg-elevated border border-bg-border text-text-secondary hover:bg-bg-card hover:text-text-primary',
  danger: 'bg-status-error/10 border border-status-error/40 text-status-error hover:bg-status-error/20',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm rounded-lg',
  md: 'px-5 py-2.5 text-sm rounded-xl',
  lg: 'px-7 py-3.5 text-base rounded-xl',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  className = '',
  disabled,
  children,
  ...props
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-2 font-heading font-semibold transition-all ' +
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/50 ' +
    'disabled:opacity-50 disabled:cursor-not-allowed';

  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={[
        base,
        variantClasses[variant],
        sizeClasses[size],
        fullWidth ? 'w-full' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {loading ? (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : leftIcon ? (
        <span className="flex-shrink-0">{leftIcon}</span>
      ) : null}
      {children}
      {!loading && rightIcon && (
        <span className="flex-shrink-0">{rightIcon}</span>
      )}
    </button>
  );
}
