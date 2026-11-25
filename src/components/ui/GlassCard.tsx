import React from 'react';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'spotlight';
  interactive?: boolean;
  as?: 'div' | 'section' | 'article';
}

export const GlassCard: React.FC<GlassCardProps> = ({
  variant = 'default',
  interactive = false,
  as = 'div',
  className = '',
  children,
  ...rest
}) => {
  const Component = as;
  const variantClass =
    variant === 'spotlight'
      ? 'nx-glass-spotlight'
      : variant === 'elevated'
        ? 'nx-glass-elevated'
        : 'nx-glass';

  return (
    <Component
      className={`rounded-2xl ${variantClass} ${
        interactive ? 'nx-glass-interactive' : ''
      } ${className}`}
      {...rest}
    >
      {children}
    </Component>
  );
};
