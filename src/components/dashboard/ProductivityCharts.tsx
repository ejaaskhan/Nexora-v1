import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, BarChart3 } from 'lucide-react';
import { FocusSession, PlannerTask, TaskCategory } from '../../types/productivity';
import {
  addDaysISO,
  formatDurationCompact,
  formatShortDate,
  getTodayISO,
  parseISODate,
} from '../../utils/date';
import { GlassCard } from '../ui/GlassCard';

interface ProductivityChartsProps {
  sessions: FocusSession[];
  tasks: PlannerTask[];
  dailyFocusGoalMinutes: number;
}

const CATEGORIES: Array<{ key: TaskCategory; color: string; trackClass: string }> = [
  { key: 'Deep Work', color: '#8B5CF6', trackClass: 'bg-purple-500' },
  { key: 'Planning', color: '#06B6D4', trackClass: 'bg-cyan-500' },
  { key: 'Admin', color: '#6366F1', trackClass: 'bg-indigo-500' },
  { key: 'Personal', color: '#10B981', trackClass: 'bg-emerald-500' },
];

export const ProductivityCharts: React.FC<ProductivityChartsProps> = ({
  sessions,
  tasks,
  dailyFocusGoalMinutes,
}) => {
  const navigate = useNavigate();
  const todayISO = getTodayISO();
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(6); // Default to Today

  const sevenDayData = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const iso = addDaysISO(todayISO, i - 6);
      const dt = parseISODate(iso);
      const dayWorkSessions = sessions.filter(
        (s) => s.date === iso && s.completed && (s.mode === 'focus' || s.mode === 'deep')
      );
      const focusMinutes = dayWorkSessions.reduce((sum, s) => sum + s.durationMinutes, 0);
      const completedTasks = tasks.filter((t) => {
        if (!t.completed) return false;
        if (t.completedAt) return t.completedAt.slice(0, 10) === iso;
        return t.date === iso;
      }).length;

      return {
        iso,
        dayLabel: dt.toLocaleDateString('en-US', { weekday: 'short' }),
        dateShort: formatShortDate(iso),
        focusMinutes,
        sessionCount: dayWorkSessions.length,
        completedTasks,
        isToday: iso === todayISO,
      };
    });
  }, [sessions, tasks, todayISO]);

  const weeklyFocusMinutes = useMemo(
    () => sevenDayData.reduce((sum, d) => sum + d.focusMinutes, 0),
    [sevenDayData]
  );

  const chartMax = Math.max(
    dailyFocusGoalMinutes,
    ...sevenDayData.map((d) => d.focusMinutes),
    60
  );

  const selectedDay = sevenDayData[selectedDayIndex] ?? sevenDayData[6];

  const categoryBreakdown = useMemo(() => {
    const cutoffISO = addDaysISO(todayISO, -6);
    const recentWork = sessions.filter(
      (s) =>
        s.date >= cutoffISO &&
        s.completed &&
        (s.mode === 'focus' || s.mode === 'deep')
    );

    const totals = new Map<TaskCategory, number>();
    CATEGORIES.forEach((c) => totals.set(c.key, 0));
    recentWork.forEach((s) => {
      totals.set(s.category, (totals.get(s.category) ?? 0) + s.durationMinutes);
    });

    const grandTotal = recentWork.reduce((sum, s) => sum + s.durationMinutes, 0);

    return {
      grandTotal,
      items: CATEGORIES.map((cat) => {
        const minutes = totals.get(cat.key) ?? 0;
        const pct = grandTotal > 0 ? Math.round((minutes / grandTotal) * 100) : 0;
        return { ...cat, minutes, pct };
      }).sort((a, b) => b.minutes - a.minutes),
    };
  }, [sessions, todayISO]);

  // SVG Geometry for 7-Day Focus Trend
  const svgW = 560;
  const plotLeft = 18;
  const plotRight = 542;
  const plotTop = 26;
  const plotBottom = 166;
  const plotHeight = plotBottom - plotTop;
  const slotW = (plotRight - plotLeft) / 7;

  const points = sevenDayData.map((d, idx) => {
    const cx = plotLeft + idx * slotW + slotW / 2;
    const ratio = d.focusMinutes / chartMax;
    const cy = plotBottom - ratio * plotHeight;
    return { cx, cy, ...d };
  });

  const linePath = points
    .map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${pt.cx.toFixed(1)} ${pt.cy.toFixed(1)}`)
    .join(' ');

  const areaPath =
    points.length > 0
      ? `${linePath} L ${points[points.length - 1].cx.toFixed(1)} ${plotBottom} L ${points[0].cx.toFixed(1)} ${plotBottom} Z`
      : '';

  const goalY = plotBottom - (dailyFocusGoalMinutes / chartMax) * plotHeight;

  // SVG Geometry for Category Donut Ring
  const donutSize = 148;
  const donutRadius = 56;
  const donutStroke = 14;
  const donutCircumference = 2 * Math.PI * donutRadius;

  let cumulativeFraction = 0;
  const donutSegments = categoryBreakdown.items
    .filter((item) => item.minutes > 0 && categoryBreakdown.grandTotal > 0)
    .map((item) => {
      const fraction = item.minutes / categoryBreakdown.grandTotal;
      const dashLength = Math.max(0, fraction * donutCircumference - 2.5);
      const dashOffset = -cumulativeFraction * donutCircumference;
      cumulativeFraction += fraction;
      return {
        ...item,
        dashArray: `${dashLength.toFixed(2)} ${donutCircumference.toFixed(2)}`,
        dashOffset: dashOffset.toFixed(2),
      };
    });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
      {/* 7-Day Focus Trend (7 columns) */}
      <GlassCard as="section" className="lg:col-span-7 p-5 sm:p-6 flex flex-col justify-between">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-950 dark:text-white">
              7-Day Focus Trend
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Select any day to inspect logged focus minutes against your{' '}
              <span className="font-mono tabular-nums text-purple-600 dark:text-cyan-300">
                {formatDurationCompact(dailyFocusGoalMinutes)}
              </span>{' '}
              target
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/history')}
            className="min-h-[36px] px-2.5 rounded-lg text-xs font-medium text-purple-600 dark:text-cyan-400 hover:bg-purple-500/10 dark:hover:bg-cyan-400/10 inline-flex items-center gap-1 whitespace-nowrap shrink-0 self-start transition-colors"
          >
            <span>Full Analytics</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Selected Day Live Readout */}
        <div className="mt-4 pt-3 border-t nx-divider flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
            <span className="font-semibold text-slate-950 dark:text-white">
              {selectedDay.isToday ? 'Today' : `${selectedDay.dayLabel}, ${selectedDay.dateShort}`}
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums text-purple-600 dark:text-cyan-300 font-medium">
              {formatDurationCompact(selectedDay.focusMinutes)} focused
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              {selectedDay.completedTasks} {selectedDay.completedTasks === 1 ? 'task' : 'tasks'} done
            </span>
          </div>
          <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400">
            7-day total: {formatDurationCompact(weeklyFocusMinutes)}
          </span>
        </div>

        {/* Interactive SVG Chart */}
        <div className="mt-4 w-full overflow-x-auto">
          <svg
            viewBox={`0 0 ${svgW} 214`}
            className="w-full min-w-[320px] h-auto select-none"
            role="img"
            aria-label="7-day focus minutes trend chart"
          >
            <defs>
              <linearGradient id="nxDashArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.30" />
                <stop offset="65%" stopColor="#8B5CF6" stopOpacity="0.10" />
                <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="nxDashLine" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#8B5CF6" />
                <stop offset="100%" stopColor="#06B6D4" />
              </linearGradient>
              <linearGradient id="nxDashBarActive" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.92" />
                <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.72" />
              </linearGradient>
              <linearGradient id="nxDashBarMuted" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.40" />
                <stop offset="100%" stopColor="#4F46E5" stopOpacity="0.18" />
              </linearGradient>
            </defs>

            {/* Daily Goal Reference Line */}
            <line
              x1={plotLeft}
              y1={goalY}
              x2={plotRight}
              y2={goalY}
              strokeDasharray="4 4"
              strokeWidth="1"
              className="stroke-cyan-500/45 dark:stroke-cyan-400/40"
            />
            <text
              x={plotRight}
              y={Math.max(14, goalY - 6)}
              textAnchor="end"
              className="fill-cyan-700 dark:fill-cyan-300 text-[10px] font-mono"
            >
              Target {dailyFocusGoalMinutes}m
            </text>

            {/* Baseline */}
            <line
              x1={plotLeft}
              y1={plotBottom}
              x2={plotRight}
              y2={plotBottom}
              strokeWidth="1"
              className="stroke-slate-300/70 dark:stroke-slate-700/70"
            />

            {/* Soft Area Fill */}
            {weeklyFocusMinutes > 0 && <path d={areaPath} fill="url(#nxDashArea)" />}

            {/* Column Bars */}
            {points.map((pt, idx) => {
              const barW = 28;
              const barH =
                pt.focusMinutes > 0 ? Math.max(8, (pt.focusMinutes / chartMax) * plotHeight) : 4;
              const isSelected = idx === selectedDayIndex;
              return (
                <g
                  key={pt.iso}
                  onMouseEnter={() => setSelectedDayIndex(idx)}
                  onClick={() => setSelectedDayIndex(idx)}
                  className="cursor-pointer"
                >
                  {/* Invisible full-column hit target */}
                  <rect
                    x={plotLeft + idx * slotW}
                    y={plotTop - 10}
                    width={slotW}
                    height={plotBottom - plotTop + 56}
                    fill="transparent"
                  />
                  <rect
                    x={pt.cx - barW / 2}
                    y={plotBottom - barH}
                    width={barW}
                    height={barH}
                    rx="7"
                    fill={
                      pt.focusMinutes === 0
                        ? undefined
                        : isSelected
                          ? 'url(#nxDashBarActive)'
                          : 'url(#nxDashBarMuted)'
                    }
                    className={
                      pt.focusMinutes === 0
                        ? 'fill-slate-300/50 dark:fill-slate-800/80'
                        : ''
                    }
                  />
                </g>
              );
            })}

            {/* Connecting Trend Line */}
            {weeklyFocusMinutes > 0 && (
              <path
                d={linePath}
                fill="none"
                stroke="url(#nxDashLine)"
                strokeWidth="2.25"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Data Nodes + Labels */}
            {points.map((pt, idx) => {
              const isSelected = idx === selectedDayIndex;
              return (
                <g
                  key={`node-${pt.iso}`}
                  onMouseEnter={() => setSelectedDayIndex(idx)}
                  onClick={() => setSelectedDayIndex(idx)}
                  className="cursor-pointer"
                >
                  <circle
                    cx={pt.cx}
                    cy={pt.cy}
                    r={isSelected ? 5 : 3.25}
                    className={
                      isSelected
                        ? 'fill-cyan-400 stroke-white dark:stroke-[#070B19]'
                        : 'fill-purple-500 stroke-white/80 dark:stroke-[#0D152D]'
                    }
                    strokeWidth="2"
                  />
                  {pt.focusMinutes > 0 && (
                    <text
                      x={pt.cx}
                      y={Math.max(15, pt.cy - 10)}
                      textAnchor="middle"
                      className={`text-[10.5px] font-mono ${
                        isSelected
                          ? 'fill-slate-950 dark:fill-white font-semibold'
                          : 'fill-slate-500 dark:fill-slate-400'
                      }`}
                    >
                      {pt.focusMinutes}m
                    </text>
                  )}
                  <text
                    x={pt.cx}
                    y="186"
                    textAnchor="middle"
                    className={`text-[11px] ${
                      isSelected
                        ? 'fill-purple-600 dark:fill-cyan-300 font-semibold'
                        : 'fill-slate-600 dark:fill-slate-400'
                    }`}
                  >
                    {pt.dayLabel}
                  </text>
                  <text
                    x={pt.cx}
                    y="202"
                    textAnchor="middle"
                    className="fill-slate-400 dark:fill-slate-500 text-[10px] font-mono"
                  >
                    {pt.dateShort}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </GlassCard>

      {/* Category Breakdown (5 columns) */}
      <GlassCard as="section" className="lg:col-span-5 p-5 sm:p-6 flex flex-col justify-between">
        <div>
          <h2 className="font-display text-base font-semibold text-slate-950 dark:text-white">
            Category Breakdown
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Last 7 days focus allocation by work mode
          </p>

          {categoryBreakdown.grandTotal === 0 ? (
            <div className="py-10 text-center">
              <BarChart3 className="w-6 h-6 mx-auto text-slate-400 dark:text-slate-500" />
              <p className="mt-2.5 text-sm font-medium text-slate-800 dark:text-slate-200">
                No focus sessions logged yet
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Complete a focus cycle to visualize your category distribution.
              </p>
            </div>
          ) : (
            <div className="mt-5 flex flex-col sm:flex-row lg:flex-col xl:flex-row items-center gap-6">
              {/* Donut Ring */}
              <div className="relative shrink-0" style={{ width: donutSize, height: donutSize }}>
                <svg
                  width={donutSize}
                  height={donutSize}
                  viewBox={`0 0 ${donutSize} ${donutSize}`}
                  className="-rotate-90"
                  role="img"
                  aria-label="Category focus distribution ring"
                >
                  <circle
                    cx={donutSize / 2}
                    cy={donutSize / 2}
                    r={donutRadius}
                    fill="none"
                    strokeWidth={donutStroke}
                    className="stroke-slate-900/10 dark:stroke-white/10"
                  />
                  {donutSegments.map((seg) => (
                    <circle
                      key={seg.key}
                      cx={donutSize / 2}
                      cy={donutSize / 2}
                      r={donutRadius}
                      fill="none"
                      stroke={seg.color}
                      strokeWidth={donutStroke}
                      strokeDasharray={seg.dashArray}
                      strokeDashoffset={seg.dashOffset}
                      strokeLinecap="butt"
                    />
                  ))}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                  <span className="font-mono text-lg font-bold tabular-nums text-slate-950 dark:text-white">
                    {formatDurationCompact(categoryBreakdown.grandTotal)}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">7d focus</span>
                </div>
              </div>

              {/* Distribution List */}
              <div className="flex-1 w-full space-y-3.5">
                {categoryBreakdown.items.map((row) => (
                  <div key={row.key}>
                    <div className="flex items-center justify-between gap-2 text-xs mb-1.5">
                      <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                        {row.key}
                      </span>
                      <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400 shrink-0">
                        {formatDurationCompact(row.minutes)} · {row.pct}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-slate-900/10 dark:bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${row.pct}%`,
                          backgroundColor: row.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mt-5 pt-4 border-t nx-divider flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>Primary focus track</span>
          <span className="font-medium text-slate-900 dark:text-slate-100">
            {categoryBreakdown.grandTotal > 0 ? categoryBreakdown.items[0].key : 'Not established'}
          </span>
        </div>
      </GlassCard>
    </div>
  );
};
