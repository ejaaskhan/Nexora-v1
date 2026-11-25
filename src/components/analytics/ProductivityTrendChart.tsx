import React, { useMemo, useState } from 'react';
import {
  DailyProductivityPoint,
  WeeklyProductivityPoint,
} from '../../utils/analytics';
import { formatDurationCompact } from '../../utils/date';
import { GlassCard } from '../ui/GlassCard';
import { SegmentedControl } from '../ui/SegmentedControl';

export type ChartGranularity = '7d' | '14d' | 'weekly';
type ChartMetricMode = 'both' | 'focus' | 'tasks';

interface ProductivityTrendChartProps {
  daily7: DailyProductivityPoint[];
  daily14: DailyProductivityPoint[];
  weekly: WeeklyProductivityPoint[];
  dailyGoalMinutes: number;
}

interface UnifiedBar {
  id: string;
  primaryLabel: string;
  secondaryLabel: string;
  fullTitle: string;
  isCurrent: boolean;
  focusMinutes: number;
  workSessions: number;
  breakSessions: number;
  completedTasks: number;
  activeDays?: number;
}

export const ProductivityTrendChart: React.FC<ProductivityTrendChartProps> = ({
  daily7,
  daily14,
  weekly,
  dailyGoalMinutes,
}) => {
  const [granularity, setGranularity] = useState<ChartGranularity>('7d');
  const [metricMode, setMetricMode] = useState<ChartMetricMode>('both');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const bars: UnifiedBar[] = useMemo(() => {
    if (granularity === 'weekly') {
      return weekly.map((w) => ({
        id: w.weekStartISO,
        primaryLabel: w.label,
        secondaryLabel: `${w.activeDays}d`,
        fullTitle: w.isCurrentWeek ? `This Week (${w.rangeLabel})` : `Week of ${w.rangeLabel}`,
        isCurrent: w.isCurrentWeek,
        focusMinutes: w.focusMinutes,
        workSessions: w.workSessions,
        breakSessions: w.breakSessions,
        completedTasks: w.completedTasks,
        activeDays: w.activeDays,
      }));
    }

    const src = granularity === '14d' ? daily14 : daily7;
    return src.map((d) => ({
      id: d.iso,
      primaryLabel: granularity === '14d' ? d.shortDate.replace(/^[A-Za-z]+\s/, '') : d.dayLabel,
      secondaryLabel: granularity === '14d' ? d.dayLabel.slice(0, 2) : d.shortDate,
      fullTitle: d.isToday ? `Today · ${d.shortDate}` : `${d.dayLabel} · ${d.shortDate}`,
      isCurrent: d.isToday,
      focusMinutes: d.focusMinutes,
      workSessions: d.workSessions,
      breakSessions: d.breakSessions,
      completedTasks: d.completedTasks,
    }));
  }, [granularity, daily7, daily14, weekly]);

  const activeBar = useMemo(() => {
    if (selectedId) {
      const found = bars.find((b) => b.id === selectedId);
      if (found) return found;
    }
    return bars[bars.length - 1] ?? null;
  }, [bars, selectedId]);

  const targetMinutes = granularity === 'weekly' ? dailyGoalMinutes * 7 : dailyGoalMinutes;

  const maxFocus = Math.max(
    targetMinutes,
    ...bars.map((b) => b.focusMinutes),
    granularity === 'weekly' ? 120 : 60
  );
  const maxTasks = Math.max(...bars.map((b) => b.completedTasks), 4);

  const totals = useMemo(() => {
    const focusMinutes = bars.reduce((sum, b) => sum + b.focusMinutes, 0);
    const completedTasks = bars.reduce((sum, b) => sum + b.completedTasks, 0);
    const workSessions = bars.reduce((sum, b) => sum + b.workSessions, 0);
    return { focusMinutes, completedTasks, workSessions };
  }, [bars]);

  // Week-over-week comparison for weekly view
  const weeklyDeltaPct = useMemo(() => {
    if (granularity !== 'weekly' || weekly.length < 2) return null;
    const current = weekly[weekly.length - 1].focusMinutes;
    const prev = weekly[weekly.length - 2].focusMinutes;
    if (prev === 0 && current === 0) return 0;
    if (prev === 0) return 100;
    return Math.round(((current - prev) / prev) * 100);
  }, [granularity, weekly]);

  const svgWidth = 640;
  const svgHeight = 236;
  const plotLeft = 18;
  const plotRight = 622;
  const plotWidth = plotRight - plotLeft;
  const plotTop = 28;
  const plotBottom = 184;
  const plotHeight = plotBottom - plotTop;

  const showFocus = metricMode === 'both' || metricMode === 'focus';
  const showTasks = metricMode === 'both' || metricMode === 'tasks';

  const goalY =
    plotTop + plotHeight - Math.min(1, targetMinutes / maxFocus) * plotHeight;

  const targetHitPct =
    activeBar && targetMinutes > 0
      ? Math.round((activeBar.focusMinutes / targetMinutes) * 100)
      : 0;

  return (
    <GlassCard as="section" className="p-5 sm:p-6">
      {/* Header Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-base sm:text-lg font-semibold text-slate-950 dark:text-white">
            {granularity === 'weekly'
              ? 'Weekly Productivity Trend'
              : granularity === '14d'
                ? '14-Day Daily Cadence'
                : '7-Day Daily Cadence'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real focus time &amp; completed tasks · Window total:{' '}
            <span className="font-mono tabular-nums font-medium text-slate-800 dark:text-slate-200">
              {formatDurationCompact(totals.focusMinutes)}
            </span>{' '}
            ·{' '}
            <span className="font-mono tabular-nums font-medium text-emerald-600 dark:text-emerald-400">
              {totals.completedTasks} {totals.completedTasks === 1 ? 'task' : 'tasks'}
            </span>
            {weeklyDeltaPct !== null && (
              <>
                {' · '}
                <span
                  className={`font-mono tabular-nums font-medium ${
                    weeklyDeltaPct >= 0
                      ? 'text-cyan-600 dark:text-cyan-400'
                      : 'text-amber-600 dark:text-amber-400'
                  }`}
                >
                  {weeklyDeltaPct >= 0 ? `+${weeklyDeltaPct}%` : `${weeklyDeltaPct}%`} vs last wk
                </span>
              </>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <SegmentedControl
            ariaLabel="Chart time granularity"
            value={granularity}
            onChange={(val) => {
              setGranularity(val);
              setSelectedId(null);
            }}
            options={[
              { value: '7d', label: 'Daily · 7D' },
              { value: '14d', label: 'Daily · 14D' },
              { value: 'weekly', label: 'Weekly · 6W' },
            ]}
          />
          <SegmentedControl
            ariaLabel="Chart metric filter"
            value={metricMode}
            onChange={setMetricMode}
            options={[
              { value: 'both', label: 'Both' },
              { value: 'focus', label: 'Focus' },
              { value: 'tasks', label: 'Tasks' },
            ]}
          />
        </div>
      </div>

      {/* Interactive SVG Chart */}
      <div className="mt-5 w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full min-w-[360px] h-auto select-none"
          role="img"
          aria-label="Interactive daily and weekly productivity chart"
        >
          <defs>
            <linearGradient id="nxTrendFocusActive" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06B6D4" />
              <stop offset="100%" stopColor="#8B5CF6" />
            </linearGradient>
            <linearGradient id="nxTrendFocusPast" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.86" />
              <stop offset="100%" stopColor="#4F46E5" stopOpacity="0.46" />
            </linearGradient>
            <linearGradient id="nxTrendTaskBar" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.92" />
              <stop offset="100%" stopColor="#059669" stopOpacity="0.48" />
            </linearGradient>
          </defs>

          {/* Subtle horizontal gridlines */}
          {[0.25, 0.5, 0.75].map((ratio) => {
            const gy = plotTop + plotHeight * (1 - ratio);
            return (
              <line
                key={ratio}
                x1={plotLeft}
                y1={gy}
                x2={plotRight}
                y2={gy}
                strokeWidth="1"
                className="stroke-slate-300/35 dark:stroke-slate-700/35"
              />
            );
          })}

          {/* Focus target reference line */}
          {showFocus && (
            <g>
              <line
                x1={plotLeft}
                y1={goalY}
                x2={plotRight}
                y2={goalY}
                strokeDasharray="4 4"
                strokeWidth="1.2"
                className="stroke-cyan-500/55 dark:stroke-cyan-400/50"
              />
              <text
                x={plotRight}
                y={Math.max(14, goalY - 6)}
                textAnchor="end"
                className="fill-cyan-700 dark:fill-cyan-300 text-[10px] font-mono"
              >
                {granularity === 'weekly' ? '7d Goal' : 'Goal'} {formatDurationCompact(targetMinutes)}
              </text>
            </g>
          )}

          {/* Baseline axis */}
          <line
            x1={plotLeft}
            y1={plotBottom}
            x2={plotRight}
            y2={plotBottom}
            strokeWidth="1"
            className="stroke-slate-300/80 dark:stroke-slate-700/80"
          />

          {/* Data bars */}
          {bars.map((bar, idx) => {
            const slotWidth = plotWidth / Math.max(1, bars.length);
            const centerX = plotLeft + idx * slotWidth + slotWidth / 2;
            const isSelected = activeBar?.id === bar.id;

            const singleBarW =
              granularity === '14d' ? 18 : granularity === 'weekly' ? 40 : 34;
            const pairFocusW =
              granularity === '14d' ? 13 : granularity === 'weekly' ? 28 : 24;
            const pairTaskW =
              granularity === '14d' ? 9 : granularity === 'weekly' ? 18 : 16;
            const pairGap = granularity === '14d' ? 3 : 5;

            const focusH =
              bar.focusMinutes > 0
                ? Math.max(8, (bar.focusMinutes / maxFocus) * plotHeight)
                : 3;
            const taskH =
              bar.completedTasks > 0
                ? Math.max(8, (bar.completedTasks / maxTasks) * plotHeight)
                : 3;

            const focusW = metricMode === 'both' ? pairFocusW : singleBarW;
            const taskW = metricMode === 'both' ? pairTaskW : singleBarW;
            const totalPairW =
              metricMode === 'both' ? pairFocusW + pairGap + pairTaskW : singleBarW;

            const focusX =
              metricMode === 'both' ? centerX - totalPairW / 2 : centerX - focusW / 2;
            const taskX =
              metricMode === 'both'
                ? centerX - totalPairW / 2 + pairFocusW + pairGap
                : centerX - taskW / 2;

            return (
              <g
                key={bar.id}
                onMouseEnter={() => setSelectedId(bar.id)}
                onClick={() => setSelectedId(bar.id)}
                className="cursor-pointer"
                role="button"
                tabIndex={0}
                aria-label={`${bar.fullTitle}: ${formatDurationCompact(bar.focusMinutes)} focus, ${bar.completedTasks} tasks completed`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedId(bar.id);
                  }
                }}
              >
                {/* Hover/Selected subtle column highlight */}
                <rect
                  x={plotLeft + idx * slotWidth + 2}
                  y={plotTop - 4}
                  width={Math.max(4, slotWidth - 4)}
                  height={plotHeight + 44}
                  rx="8"
                  className={
                    isSelected
                      ? 'fill-slate-900/[0.045] dark:fill-white/[0.055]'
                      : 'fill-transparent hover:fill-slate-900/[0.025] dark:hover:fill-white/[0.03]'
                  }
                />

                {/* Focus Minutes Bar */}
                {showFocus && (
                  <>
                    <rect
                      x={focusX}
                      y={plotBottom - focusH}
                      width={focusW}
                      height={focusH}
                      rx={granularity === '14d' ? 4 : 6}
                      fill={
                        bar.focusMinutes === 0
                          ? undefined
                          : bar.isCurrent || isSelected
                            ? 'url(#nxTrendFocusActive)'
                            : 'url(#nxTrendFocusPast)'
                      }
                      className={
                        bar.focusMinutes === 0
                          ? 'fill-slate-300/60 dark:fill-slate-800/80'
                          : ''
                      }
                    />
                    {bar.focusMinutes > 0 && granularity !== '14d' && (
                      <text
                        x={focusX + focusW / 2}
                        y={plotBottom - focusH - 6}
                        textAnchor="middle"
                        className="fill-slate-700 dark:fill-slate-200 text-[10px] font-mono"
                      >
                        {granularity === 'weekly'
                          ? formatDurationCompact(bar.focusMinutes)
                          : `${bar.focusMinutes}m`}
                      </text>
                    )}
                  </>
                )}

                {/* Completed Tasks Bar */}
                {showTasks && (
                  <>
                    <rect
                      x={taskX}
                      y={plotBottom - taskH}
                      width={taskW}
                      height={taskH}
                      rx={granularity === '14d' ? 3 : 5}
                      fill={bar.completedTasks === 0 ? undefined : 'url(#nxTrendTaskBar)'}
                      className={
                        bar.completedTasks === 0
                          ? 'fill-slate-300/45 dark:fill-slate-800/60'
                          : ''
                      }
                    />
                    {bar.completedTasks > 0 && granularity !== '14d' && (
                      <text
                        x={taskX + taskW / 2}
                        y={plotBottom - taskH - 6}
                        textAnchor="middle"
                        className="fill-emerald-700 dark:fill-emerald-300 text-[10px] font-mono"
                      >
                        {bar.completedTasks}
                      </text>
                    )}
                  </>
                )}

                {/* X-axis Labels */}
                <text
                  x={centerX}
                  y={plotBottom + 18}
                  textAnchor="middle"
                  className={`text-[11px] ${
                    bar.isCurrent || isSelected
                      ? 'fill-purple-600 dark:fill-cyan-300 font-semibold'
                      : 'fill-slate-600 dark:fill-slate-400'
                  }`}
                >
                  {bar.primaryLabel}
                </text>
                <text
                  x={centerX}
                  y={plotBottom + 33}
                  textAnchor="middle"
                  className="fill-slate-400 dark:fill-slate-500 text-[10px] font-mono"
                >
                  {bar.secondaryLabel}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Selected Bucket Live Readout + Legend */}
      <div className="mt-4 pt-4 border-t nx-divider flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {activeBar ? (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            <span className="font-semibold text-slate-950 dark:text-white">
              {activeBar.fullTitle}
            </span>
            <span className="font-mono tabular-nums text-purple-600 dark:text-cyan-300">
              {formatDurationCompact(activeBar.focusMinutes)} focus
            </span>
            <span className="font-mono tabular-nums text-slate-600 dark:text-slate-300">
              {activeBar.workSessions} {activeBar.workSessions === 1 ? 'cycle' : 'cycles'}
            </span>
            <span className="font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
              {activeBar.completedTasks} {activeBar.completedTasks === 1 ? 'task done' : 'tasks done'}
            </span>
            <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400">
              {targetHitPct}% of target
            </span>
          </div>
        ) : (
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Select a bar to inspect period metrics
          </span>
        )}

        <div className="flex items-center gap-4 text-[11px] text-slate-500 dark:text-slate-400 shrink-0">
          {showFocus && (
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm nx-gradient-primary inline-block" />
              <span>Focus Time</span>
            </span>
          )}
          {showTasks && (
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
              <span>Completed Tasks</span>
            </span>
          )}
        </div>
      </div>
    </GlassCard>
  );
};
