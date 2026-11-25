import React from 'react';
import { GlassCard } from './GlassCard';

/**
 * Geometry-matched glassmorphism route & hydration skeleton.
 * Renders calm structural placeholders while lazy route chunks or IndexedDB collections load.
 */
export const WorkspaceRouteSkeleton: React.FC<{ label?: string }> = ({
  label = 'Loading workspace view',
}) => (
  <div
    role="status"
    aria-live="polite"
    aria-label={label}
    className="space-y-6"
  >
    <span className="sr-only">{label}</span>

    {/* Header skeleton */}
    <div className="space-y-2.5">
      <div className="h-3.5 w-36 rounded-lg bg-slate-900/8 dark:bg-white/8" />
      <div className="h-8 w-64 max-w-full rounded-xl bg-slate-900/10 dark:bg-white/10" />
      <div className="h-4 w-80 max-w-full rounded-lg bg-slate-900/6 dark:bg-white/6" />
    </div>

    {/* KPI / Stat strip skeleton */}
    <GlassCard className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 divide-x divide-slate-200/60 dark:divide-slate-800/60 overflow-hidden">
      {[0, 1, 2, 3].map((idx) => (
        <div key={idx} className="p-4 sm:p-5 space-y-2.5">
          <div className="h-3 w-20 rounded bg-slate-900/8 dark:bg-white/8" />
          <div className="h-7 w-16 rounded-lg bg-slate-900/12 dark:bg-white/12" />
          <div className="h-3 w-28 rounded bg-slate-900/6 dark:bg-white/6" />
        </div>
      ))}
    </GlassCard>

    {/* 2-column content skeleton */}
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <GlassCard className="lg:col-span-7 p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="h-5 w-40 rounded-lg bg-slate-900/10 dark:bg-white/10" />
          <div className="h-4 w-20 rounded bg-slate-900/8 dark:bg-white/8" />
        </div>
        <div className="space-y-3 pt-2">
          {[0, 1, 2].map((row) => (
            <div
              key={row}
              className="h-14 rounded-xl border nx-divider bg-slate-900/[0.03] dark:bg-white/[0.03]"
            />
          ))}
        </div>
      </GlassCard>

      <GlassCard className="lg:col-span-5 p-5 sm:p-6 space-y-4">
        <div className="h-5 w-32 rounded-lg bg-slate-900/10 dark:bg-white/10" />
        <div className="space-y-3 pt-2">
          {[0, 1].map((row) => (
            <div
              key={row}
              className="h-20 rounded-xl border nx-divider bg-slate-900/[0.03] dark:bg-white/[0.03]"
            />
          ))}
        </div>
      </GlassCard>
    </div>
  </div>
);

/**
 * Minimal full-viewport loading shell shown briefly while auth bootstrap resolves.
 */
export const FullScreenLoadingShell: React.FC = () => (
  <div
    role="status"
    aria-live="polite"
    aria-label="Preparing NEXORA workspace"
    className="min-h-screen flex items-center justify-center nx-ambient-backdrop p-6"
  >
    <div className="flex flex-col items-center gap-3.5 text-center">
      <div className="w-12 h-12 rounded-2xl nx-glass-elevated flex items-center justify-center border border-purple-500/35 dark:border-cyan-400/35">
        <svg width="28" height="28" viewBox="0 0 512 512" fill="none" aria-hidden="true">
          <defs>
            <linearGradient id="nxLoadGrad" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#8B5CF6" />
              <stop offset="100%" stopColor="#06B6D4" />
            </linearGradient>
          </defs>
          <path d="M156 368V144H202L310 296V144H356V368H310L202 216V368H156Z" fill="currentColor" className="text-slate-900 dark:text-white" />
          <rect x="310" y="144" width="46" height="46" rx="10" fill="url(#nxLoadGrad)" />
        </svg>
      </div>
      <p className="font-display text-sm font-semibold tracking-wider text-slate-900 dark:text-white">
        NEXORA
      </p>
      <p className="text-xs text-slate-500 dark:text-slate-400">Loading your workspace…</p>
    </div>
  </div>
);
