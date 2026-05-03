import React from 'react';

type BadgeVariant = 'blue' | 'purple' | 'cyan' | 'green' | 'red' | 'yellow' | 'gray';
type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  children: React.ReactNode;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  blue:   'bg-brand-primary/15 text-brand-primary border-brand-primary/30',
  purple: 'bg-brand-secondary/15 text-brand-secondary border-brand-secondary/30',
  cyan:   'bg-brand-accent/15 text-brand-accent border-brand-accent/30',
  green:  'bg-status-success/15 text-status-success border-status-success/30',
  red:    'bg-status-error/15 text-status-error border-status-error/30',
  yellow: 'bg-status-warning/15 text-status-warning border-status-warning/30',
  gray:   'bg-text-muted/15 text-text-muted border-text-muted/30',
};

const dotColors: Record<BadgeVariant, string> = {
  blue:   'bg-brand-primary',
  purple: 'bg-brand-secondary',
  cyan:   'bg-brand-accent',
  green:  'bg-status-success',
  red:    'bg-status-error',
  yellow: 'bg-status-warning',
  gray:   'bg-text-muted',
};

const sizeClasses: Record<BadgeSize, string> = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-2.5 py-1',
};

export default function Badge({
  variant = 'blue',
  size = 'sm',
  dot = false,
  children,
  className = '',
}: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1 font-medium rounded-full border',
        variantClasses[variant],
        sizeClasses[size],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColors[variant]}`} />
      )}
      {children}
    </span>
  );
}
