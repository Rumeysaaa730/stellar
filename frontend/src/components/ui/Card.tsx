import React from 'react';

type CardVariant = 'default' | 'elevated' | 'glass';

interface CardProps {
  variant?: CardVariant;
  padding?: boolean;
  hover?: boolean;
  onClick?: () => void;
  className?: string;
  children: React.ReactNode;
}

const variantClasses: Record<CardVariant, string> = {
  default: 'bg-bg-card border border-bg-border rounded-2xl',
  elevated: 'bg-bg-elevated border border-bg-border rounded-2xl',
  glass: 'bg-bg-card/80 backdrop-blur-sm border border-bg-border rounded-2xl',
};

export default function Card({
  variant = 'default',
  padding = true,
  hover = false,
  onClick,
  className = '',
  children,
}: CardProps) {
  return (
    <div
      onClick={onClick}
      className={[
        variantClasses[variant],
        padding ? 'p-5' : '',
        hover ? 'hover:border-brand-primary/40 hover:bg-bg-elevated/80 transition-all cursor-pointer' : '',
        onClick ? 'cursor-pointer' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  );
}
