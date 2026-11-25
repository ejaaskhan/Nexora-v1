import React, { useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import {
  CalendarEvent,
  PlannerTask,
  ProductivityGoal,
  TimeBlock,
} from '../../types/productivity';
import { formatMonthYear, getMonthMatrix } from '../../utils/date';
import { GlassCard } from '../ui/GlassCard';
import { EVENT_COLOR_MAP } from './EventFormModal';

export type CalendarLayerFilter = 'all' | 'events' | 'blocks' | 'tasks' | 'deadlines';

interface MonthCalendarGridProps {
  year: number;
  monthIndex: number;
  selectedDate: string;
  layerFilter: CalendarLayerFilter;
  events: CalendarEvent[];
  timeBlocks: TimeBlock[];
  tasks: PlannerTask[];
  goals: ProductivityGoal[];
  onSelectDate: (isoDate: string) => void;
  onChangeMonth: (deltaMonths: number) => void;
  onJumpToday: () => void;
  onChangeLayer: (layer: CalendarLayerFilter) => void;
  onQuickAddEvent: (isoDate: string) => void;
}

interface DaySummaryItem {
  id: string;
  label: string;
  barClass: string;
  kind: 'event' | 'block' | 'task' | 'deadline';
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const LAYER_OPTIONS: Array<{ value: CalendarLayerFilter; label: string }> = [
  { value: 'all', label: 'All Layers' },
  { value: 'events', label: 'Events' },
  { value: 'blocks', label: 'Blocks' },
  { value: 'tasks', label: 'Tasks' },
  { value: 'deadlines', label: 'Deadlines' },
];

export const MonthCalendarGrid: React.FC<MonthCalendarGridProps> = ({
  year,
  monthIndex,
  selectedDate,
  layerFilter,
  events,
  timeBlocks,
  tasks,
  goals,
  onSelectDate,
  onChangeMonth,
  onJumpToday,
  onChangeLayer,
  onQuickAddEvent,
}) => {
  const cells = useMemo(() => getMonthMatrix(year, monthIndex), [year, monthIndex]);

  const itemsByDate = useMemo(() => {
    const map = new Map<string, DaySummaryItem[]>();
    const pushItem = (iso: string, item: DaySummaryItem) => {
      const list = map.get(iso);
      if (list) list.push(item);
      else map.set(iso, [item]);
    };

    if (layerFilter === 'all' || layerFilter === 'events') {
      events.forEach((ev) => {
        pushItem(ev.date, {
          id: ev.id,
          label: ev.title,
          barClass: EVENT_COLOR_MAP[ev.color]?.barClass ?? 'bg-cyan-500',
          kind: 'event',
        });
      });
    }

    if (layerFilter === 'all' || layerFilter === 'blocks') {
      timeBlocks.forEach((blk) => {
        pushItem(blk.date, {
          id: blk.id,
          label: blk.title,
          barClass: blk.status === 'completed' ? 'bg-emerald-500' : 'bg-purple-500',
          kind: 'block',
        });
      });
    }

    if (layerFilter === 'all' || layerFilter === 'tasks') {
      tasks.forEach((t) => {
        if (t.completed) return;
        pushItem(t.date, {
          id: t.id,
          label: t.title,
          barClass: t.priority === 'high' ? 'bg-rose-500' : 'bg-sky-500',
          kind: 'task',
        });
      });
    }

    if (layerFilter === 'all' || layerFilter === 'deadlines') {
      goals.forEach((g) => {
        if (!g.completed) {
          pushItem(g.deadline, {
            id: `goal_${g.id}`,
            label: `Goal: ${g.title}`,
            barClass: 'bg-amber-500',
            kind: 'deadline',
          });
        }
        g.milestones.forEach((ms) => {
          if (!ms.completed && ms.targetDate) {
            pushItem(ms.targetDate, {
              id: `ms_${ms.id}`,
              label: `Milestone: ${ms.title}`,
              barClass: 'bg-amber-400',
              kind: 'deadline',
            });
          }
        });
      });
    }

    return map;
  }, [events, timeBlocks, tasks, goals, layerFilter]);

  return (
    <GlassCard as="section" className="overflow-hidden">
      {/* Month Controls & Layer Filter Bar */}
      <div className="px-4 sm:px-5 py-3.5 border-b nx-divider flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center justify-between sm:justify-start gap-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onChangeMonth(-1)}
              aria-label="Previous month"
              className="min-h-[38px] min-w-[38px] rounded-xl nx-glass flex items-center justify-center text-slate-700 dark:text-slate-200 hover:border-cyan-400/50 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onJumpToday}
              className="min-h-[38px] px-3 rounded-xl nx-glass text-xs font-medium text-slate-800 dark:text-slate-100 hover:border-cyan-400/50 transition-colors"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => onChangeMonth(1)}
              aria-label="Next month"
              className="min-h-[38px] min-w-[38px] rounded-xl nx-glass flex items-center justify-center text-slate-700 dark:text-slate-200 hover:border-cyan-400/50 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <h2 className="font-display text-base sm:text-lg font-semibold text-slate-950 dark:text-white ml-1 whitespace-nowrap">
            {formatMonthYear(year, monthIndex)}
          </h2>
        </div>

        {/* Interactive Layer Filter Buttons */}
        <div
          role="group"
          aria-label="Filter calendar layers"
          className="flex items-center gap-1 overflow-x-auto pb-0.5 sm:pb-0"
        >
          {LAYER_OPTIONS.map((opt) => {
            const active = layerFilter === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChangeLayer(opt.value)}
                aria-pressed={active}
                className={`min-h-[34px] px-2.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                  active
                    ? 'bg-purple-500/15 dark:bg-cyan-400/18 text-purple-700 dark:text-cyan-300 border border-purple-500/35 dark:border-cyan-400/35'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white hover:bg-slate-900/5 dark:hover:bg-white/10 border border-transparent'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Weekday Header Row */}
      <div className="grid grid-cols-7 border-b nx-divider bg-slate-900/[0.02] dark:bg-white/[0.02]">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="py-2 text-center text-[11px] font-medium text-slate-500 dark:text-slate-400"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Month Day Cells */}
      <div className="grid grid-cols-7 divide-x divide-y divide-slate-200/60 dark:divide-slate-800/70">
        {cells.map((cell) => {
          const isSelected = cell.iso === selectedDate;
          const items = itemsByDate.get(cell.iso) ?? [];
          const visibleItems = items.slice(0, 2);
          const extraCount = Math.max(0, items.length - visibleItems.length);

          return (
            <div
              key={cell.iso}
              role="button"
              tabIndex={0}
              onClick={() => onSelectDate(cell.iso)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectDate(cell.iso);
                }
              }}
              aria-label={`${cell.iso}, ${items.length} scheduled items`}
              aria-pressed={isSelected}
              className={`group relative min-h-[72px] sm:min-h-[96px] p-1.5 sm:p-2 text-left flex flex-col justify-between transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-cyan-400 ${
                isSelected
                  ? 'bg-purple-500/[0.11] dark:bg-cyan-400/[0.12]'
                  : cell.inCurrentMonth
                    ? 'hover:bg-white/60 dark:hover:bg-white/[0.04]'
                    : 'bg-slate-900/[0.02] dark:bg-slate-950/30 opacity-55 hover:opacity-85'
              }`}
            >
              {/* Top Row: Day Number + Hover Quick Add */}
              <div className="flex items-center justify-between gap-1">
                <span
                  className={`w-6 h-6 rounded-lg font-mono text-xs tabular-nums font-semibold flex items-center justify-center ${
                    cell.isToday
                      ? 'nx-gradient-primary text-white shadow-xs'
                      : isSelected
                        ? 'text-purple-700 dark:text-cyan-300'
                        : 'text-slate-700 dark:text-slate-200'
                  }`}
                >
                  {cell.dayNumber}
                </span>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectDate(cell.iso);
                    onQuickAddEvent(cell.iso);
                  }}
                  aria-label={`Add event on ${cell.iso}`}
                  title="Add event"
                  className="hidden sm:flex w-5 h-5 rounded-md items-center justify-center text-slate-400 opacity-0 group-hover:opacity-100 focus:opacity-100 hover:text-purple-600 dark:hover:text-cyan-300 hover:bg-slate-900/10 dark:hover:bg-white/10 transition-opacity"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Desktop Item Bars + Mobile Compact Indicator Bars */}
              <div className="mt-1.5 space-y-1">
                {/* Mobile compact micro-bars */}
                {items.length > 0 && (
                  <div className="flex sm:hidden items-center gap-0.5 flex-wrap">
                    {items.slice(0, 4).map((it) => (
                      <span
                        key={it.id}
                        className={`h-1.5 flex-1 min-w-[6px] max-w-[14px] rounded-full ${it.barClass}`}
                      />
                    ))}
                  </div>
                )}

                {/* Desktop concise 1-line previews */}
                <div className="hidden sm:block space-y-1">
                  {visibleItems.map((it) => (
                    <div
                      key={it.id}
                      className="flex items-center gap-1.5 min-w-0"
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${it.barClass}`}
                        aria-hidden="true"
                      />
                      <span className="text-[11px] leading-tight text-slate-700 dark:text-slate-200 truncate">
                        {it.label}
                      </span>
                    </div>
                  ))}
                  {extraCount > 0 && (
                    <p className="font-mono text-[10px] tabular-nums text-slate-500 dark:text-slate-400 pl-3">
                      +{extraCount} more
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Unboxed Color Key Legend */}
      <div className="px-4 sm:px-5 py-2.5 border-t nx-divider flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-cyan-500" aria-hidden="true" />
          Events
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-purple-500" aria-hidden="true" />
          Time Blocks
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-sky-500" aria-hidden="true" />
          Open Tasks
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-500" aria-hidden="true" />
          Goal &amp; Milestone Deadlines
        </span>
      </div>
    </GlassCard>
  );
};
