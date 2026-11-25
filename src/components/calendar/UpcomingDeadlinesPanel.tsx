import React, { useMemo, useState } from 'react';
import { ArrowUpRight, CalendarClock } from 'lucide-react';
import {
  CalendarEvent,
  PlannerTask,
  ProductivityGoal,
} from '../../types/productivity';
import {
  formatCountdownLabel,
  formatShortDate,
  getDaysUntilISO,
  getTodayISO,
} from '../../utils/date';
import { GlassCard } from '../ui/GlassCard';

interface UpcomingDeadlinesPanelProps {
  goals: ProductivityGoal[];
  tasks: PlannerTask[];
  events: CalendarEvent[];
  onJumpToDate: (isoDate: string) => void;
  onOpenGoals: () => void;
  onOpenTasks: () => void;
}

type DeadlineFilter = 'all' | 'goals' | 'tasks' | 'events';

interface UnifiedDeadlineItem {
  id: string;
  kind: 'goal' | 'milestone' | 'task' | 'event';
  title: string;
  subtitle: string;
  date: string;
}

export const UpcomingDeadlinesPanel: React.FC<UpcomingDeadlinesPanelProps> = ({
  goals,
  tasks,
  events,
  onJumpToDate,
  onOpenGoals,
  onOpenTasks,
}) => {
  const [filter, setFilter] = useState<DeadlineFilter>('all');
  const todayISO = getTodayISO();

  const items = useMemo(() => {
    const collected: UnifiedDeadlineItem[] = [];

    if (filter === 'all' || filter === 'goals') {
      goals.forEach((g) => {
        if (!g.completed) {
          const pct = Math.min(100, Math.round((g.currentValue / Math.max(1, g.targetValue)) * 100));
          collected.push({
            id: `goal_${g.id}`,
            kind: 'goal',
            title: g.title,
            subtitle: `Goal · ${pct}% complete`,
            date: g.deadline,
          });
        }
        g.milestones.forEach((ms) => {
          if (!ms.completed && ms.targetDate) {
            collected.push({
              id: `ms_${ms.id}`,
              kind: 'milestone',
              title: ms.title,
              subtitle: `Milestone · ${g.title}`,
              date: ms.targetDate,
            });
          }
        });
      });
    }

    if (filter === 'all' || filter === 'tasks') {
      tasks.forEach((t) => {
        if (t.completed) return;
        const days = getDaysUntilISO(t.date, todayISO);
        if (days <= 14) {
          collected.push({
            id: `task_${t.id}`,
            kind: 'task',
            title: t.title,
            subtitle: `Task · ${t.category}${t.dueTime ? ` · ${t.dueTime}` : ''}`,
            date: t.date,
          });
        }
      });
    }

    if (filter === 'all' || filter === 'events') {
      events.forEach((ev) => {
        const days = getDaysUntilISO(ev.date, todayISO);
        if (days >= 0 && days <= 21) {
          collected.push({
            id: `evt_${ev.id}`,
            kind: 'event',
            title: ev.title,
            subtitle: `Event · ${ev.allDay ? 'All day' : ev.location || ev.category}`,
            date: ev.date,
          });
        }
      });
    }

    return collected.sort((a, b) => a.date.localeCompare(b.date)).slice(0, 10);
  }, [goals, tasks, events, filter, todayISO]);

  return (
    <GlassCard as="section" className="overflow-hidden">
      <div className="px-5 py-4 border-b nx-divider flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-base font-semibold text-slate-950 dark:text-white">
            Upcoming Deadlines
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Goals, milestones, tasks, and events ranked by urgency
          </p>
        </div>

        <div className="flex items-center gap-1">
          {(
            [
              { value: 'all', label: 'All' },
              { value: 'goals', label: 'Goals' },
              { value: 'tasks', label: 'Tasks' },
              { value: 'events', label: 'Events' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setFilter(tab.value)}
              className={`min-h-[30px] px-2.5 rounded-lg text-xs font-medium transition-colors ${
                filter === tab.value
                  ? 'bg-purple-500/15 dark:bg-cyan-400/18 text-purple-700 dark:text-cyan-300'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <CalendarClock className="w-6 h-6 mx-auto text-slate-400 dark:text-slate-500" />
          <p className="mt-2.5 text-sm font-medium text-slate-800 dark:text-slate-200">
            No upcoming deadlines in this filter
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Your horizon is clear for the next two weeks.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-200/60 dark:divide-slate-800/70">
          {items.map((item) => {
            const countdown = formatCountdownLabel(item.date, false);
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onJumpToDate(item.date)}
                  className="w-full text-left px-5 py-3 flex items-start justify-between gap-3 hover:bg-white/50 dark:hover:bg-white/[0.04] transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      <span
                        className={`font-mono tabular-nums font-medium ${
                          countdown.tone === 'overdue'
                            ? 'text-rose-600 dark:text-rose-400'
                            : countdown.tone === 'soon'
                              ? 'text-amber-700 dark:text-amber-300'
                              : 'text-purple-600 dark:text-cyan-300'
                        }`}
                      >
                        {countdown.label}
                      </span>
                      <span className="text-slate-400/70" aria-hidden="true">
                        ·
                      </span>
                      <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400">
                        {formatShortDate(item.date)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-sm font-medium text-slate-950 dark:text-slate-100 truncate">
                      {item.title}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {item.subtitle}
                    </p>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-slate-400 shrink-0 mt-1" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="px-5 py-3 border-t nx-divider flex items-center justify-between text-xs">
        <button
          type="button"
          onClick={onOpenGoals}
          className="font-medium text-purple-600 dark:text-cyan-400 hover:underline"
        >
          Manage Goals
        </button>
        <button
          type="button"
          onClick={onOpenTasks}
          className="font-medium text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white"
        >
          Open Task Manager
        </button>
      </div>
    </GlassCard>
  );
};
