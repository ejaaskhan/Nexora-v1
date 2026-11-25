import { useId } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { NX_SPRINGS } from '../../design/tokens';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  options: Array<SegmentedOption<T>>;
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  fullWidth?: boolean;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  fullWidth = false,
}: SegmentedControlProps<T>) {
  const groupId = useId();
  const prefersReduced = useReducedMotion();

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`inline-flex items-center gap-1 p-1 rounded-xl nx-glass overflow-x-auto max-w-full ${
        fullWidth ? 'w-full' : ''
      }`}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={`relative min-h-[40px] px-3.5 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap shrink-0 transition-colors focus-visible:outline-2 focus-visible:outline-cyan-500 ${
              fullWidth ? 'flex-1 text-center' : ''
            } ${
              active
                ? 'text-white'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-slate-100'
            }`}
          >
            {active && (
              <motion.span
                layoutId={`nx-seg-${groupId}`}
                transition={prefersReduced ? { duration: 0 } : NX_SPRINGS.snappy}
                className="absolute inset-0 rounded-lg nx-gradient-primary shadow-sm"
                aria-hidden="true"
              />
            )}
            <span className="relative z-10">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
