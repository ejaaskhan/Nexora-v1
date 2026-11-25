import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, Clock } from 'lucide-react';
import { ActivityEventType, ActivityItem } from '../../types/productivity';
import { formatRelativeTime } from '../../utils/date';
import { GlassCard } from '../ui/GlassCard';

interface RecentActivityWidgetProps {
  activities: ActivityItem[];
  maxItems?: number;
}

const EVENT_TYPE_LABEL: Record<ActivityEventType, { label: string; className: string }> = {
  session_logged: { label: 'Focus', className: 'text-purple-600 dark:text-cyan-300' },
  task_completed: { label: 'Completed', className: 'text-emerald-600 dark:text-emerald-400' },
  task_created: { label: 'Task', className: 'text-slate-600 dark:text-slate-400' },
  block_completed: { label: 'Schedule', className: 'text-emerald-600 dark:text-emerald-400' },
  block_scheduled: { label: 'Schedule', className: 'text-indigo-600 dark:text-indigo-300' },
  goal_completed: { label: 'Goal', className: 'text-emerald-600 dark:text-emerald-400' },
  goal_progress: { label: 'Goal', className: 'text-purple-600 dark:text-cyan-300' },
  goal_created: { label: 'Goal', className: 'text-purple-600 dark:text-purple-300' },
  milestone_completed: { label: 'Milestone', className: 'text-emerald-600 dark:text-emerald-400' },
  note_created: { label: 'Note', className: 'text-cyan-700 dark:text-cyan-300' },
  event_created: { label: 'Event', className: 'text-amber-700 dark:text-amber-300' },
};

export const RecentActivityWidget: React.FC<RecentActivityWidgetProps> = ({
  activities,
  maxItems = 7,
}) => {
  const navigate = useNavigate();
  const visible = activities.slice(0, maxItems);

  return (
    <GlassCard as="section" className="overflow-hidden">
      <div className="px-5 py-4 border-b nx-divider flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-base font-semibold text-slate-950 dark:text-white">
            Recent Activity
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Automatically recorded across tasks, focus cycles, and goals
          </p>
        </div>
        <span className="font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400 shrink-0">
          {activities.length} logged
        </span>
      </div>

      {visible.length === 0 ? (
        <div className="px-5 py-9 text-center">
          <Clock className="w-6 h-6 mx-auto text-slate-400 dark:text-slate-500" />
          <p className="mt-2.5 text-sm font-medium text-slate-800 dark:text-slate-200">
            No workspace activity yet
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Complete a task, log a focus session, or advance a goal to populate your feed.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-200/60 dark:divide-slate-800/70">
          {visible.map((item) => {
            const meta = EVENT_TYPE_LABEL[item.type];
            const clickable = item.route !== '/';
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => {
                    if (clickable) navigate(item.route);
                  }}
                  disabled={!clickable}
                  className={`w-full text-left px-5 py-3 flex items-start justify-between gap-3 transition-colors ${
                    clickable
                      ? 'hover:bg-white/50 dark:hover:bg-white/[0.04] cursor-pointer'
                      : 'cursor-default'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      <span className={`font-medium ${meta.className}`}>{meta.label}</span>
                      <span aria-hidden="true" className="text-slate-400">
                        ·
                      </span>
                      <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400">
                        {formatRelativeTime(item.timestamp)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-sm font-medium text-slate-950 dark:text-slate-100 truncate">
                      {item.title}
                    </p>
                    {item.detail && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {item.detail}
                      </p>
                    )}
                  </div>
                  {clickable && (
                    <ArrowUpRight className="w-4 h-4 text-slate-400 shrink-0 mt-1" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </GlassCard>
  );
};
