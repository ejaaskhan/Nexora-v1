import React, { useId } from 'react';
import { useReducedMotion } from 'motion/react';

interface ProgressRingProps {
  percent: number;
  size?: number;
  strokeWidth?: number;
  status?: 'active' | 'completed' | 'overdue';
  label?: string;
}

export const ProgressRing: React.FC<ProgressRingProps> = ({
  percent,
  size = 76,
  strokeWidth = 6,
  status = 'active',
  label,
}) => {
  const prefersReduced = useReducedMotion();
  const gradientId = useId();

  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  const strokeUrl =
    status === 'completed'
      ? '#10B981'
      : status === 'overdue'
        ? '#F43F5E'
        : `url(#${gradientId})`;

  return (
    <div
      className="relative inline-flex items-center justify-center shrink-0 select-none"
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? `${clamped}% progress`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#06B6D4" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-slate-900/10 dark:stroke-white/10"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={strokeUrl}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: prefersReduced ? 'none' : 'stroke-dashoffset 320ms cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className={`font-mono text-sm font-bold tabular-nums leading-none ${
            status === 'completed'
              ? 'text-emerald-600 dark:text-emerald-400'
              : status === 'overdue'
                ? 'text-rose-600 dark:text-rose-400'
                : 'text-slate-950 dark:text-white'
          }`}
        >
          {clamped}%
        </span>
      </div>
    </div>
  );
};
