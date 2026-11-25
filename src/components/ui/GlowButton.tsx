import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface GlowButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'min-h-[38px] px-3.5 py-1.5 text-xs rounded-xl gap-1.5',
  md: 'min-h-[44px] px-4 py-2 text-sm rounded-xl gap-2',
  lg: 'min-h-[48px] px-6 py-2.5 text-sm rounded-xl gap-2',
};

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'nx-glow-button text-white font-medium border border-white/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400',
  secondary:
    'nx-glass text-slate-800 dark:text-slate-100 font-medium hover:border-cyan-500/40 dark:hover:border-cyan-400/40 hover:bg-white/85 dark:hover:bg-slate-800/70 active:scale-[0.98] transition-all focus-visible:outline-2 focus-visible:outline-cyan-500',
  ghost:
    'text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-900/5 dark:hover:bg-white/8 active:scale-[0.98] transition-all focus-visible:outline-2 focus-visible:outline-cyan-500',
  danger:
    'border border-rose-400/35 bg-rose-500/10 text-rose-700 dark:text-rose-300 hover:bg-rose-500/20 active:scale-[0.98] transition-all focus-visible:outline-2 focus-visible:outline-rose-500',
};

export const GlowButton: React.FC<GlowButtonProps> = ({
  variant = 'primary',
  size = 'md',
  type = 'button',
  className = '',
  children,
  ...rest
}) => {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center whitespace-nowrap shrink-0 disabled:opacity-45 disabled:cursor-not-allowed ${SIZE_CLASSES[size]} ${VARIANT_CLASSES[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
};
