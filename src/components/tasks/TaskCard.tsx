import React, { useState } from 'react';
import {
  CalendarPlus,
  Check,
  ChevronDown,
  ChevronUp,
  Pencil,
  Play,
  Trash2,
} from 'lucide-react';
import { PlannerTask } from '../../types/productivity';
import {
  formatDueTime,
  formatShortDate,
  getDeadlineStatus,
  getRelativeDayLabel,
} from '../../utils/date';
import { GlassCard } from '../ui/GlassCard';

interface TaskCardProps {
  task: PlannerTask;
  layout: 'grid' | 'list';
  onToggleComplete: (id: string) => void;
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
  onEdit: (task: PlannerTask) => void;
  onRequestDelete: (task: PlannerTask) => void;
  onStartFocus: (task: PlannerTask) => void;
  onSchedule?: (task: PlannerTask) => void;
}

const PRIORITY_META: Record<PlannerTask['priority'], { label: string; className: string }> = {
  high: { label: 'High priority', className: 'text-rose-600 dark:text-rose-400 font-medium' },
  medium: { label: 'Medium priority', className: 'text-amber-700 dark:text-amber-300 font-medium' },
  low: { label: 'Low priority', className: 'text-slate-500 dark:text-slate-400' },
};

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  layout,
  onToggleComplete,
  onToggleSubtask,
  onEdit,
  onRequestDelete,
  onStartFocus,
  onSchedule,
}) => {
  const [subtasksExpanded, setSubtasksExpanded] = useState(layout === 'grid');

  const priorityMeta = PRIORITY_META[task.priority];
  const deadlineStatus = getDeadlineStatus(task.date, task.dueTime, task.completed);
  const dueTimeLabel = formatDueTime(task.dueTime);
  const relativeDate = getRelativeDayLabel(task.date);
  const formattedDeadline = dueTimeLabel ? `${relativeDate} · ${dueTimeLabel}` : relativeDate;

  const deadlineClass =
    deadlineStatus === 'overdue'
      ? 'text-rose-600 dark:text-rose-400 font-medium'
      : deadlineStatus === 'today'
        ? 'text-purple-600 dark:text-cyan-300 font-medium'
        : deadlineStatus === 'completed'
          ? 'text-emerald-600 dark:text-emerald-400'
          : 'text-slate-500 dark:text-slate-400';

  const deadlinePrefix =
    deadlineStatus === 'overdue'
      ? `Overdue (${formatShortDate(task.date)}${dueTimeLabel ? ` ${dueTimeLabel}` : ''})`
      : deadlineStatus === 'completed'
        ? `Completed`
        : `Due ${formattedDeadline}`;

  const totalSubtasks = task.subtasks.length;
  const completedSubtasks = task.subtasks.filter((s) => s.completed).length;
  const subtaskPct =
    totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

  if (layout === 'list') {
    return (
      <li className="px-4 sm:px-5 py-3.5 hover:bg-white/50 dark:hover:bg-white/[0.04] transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <button
              type="button"
              onClick={() => onToggleComplete(task.id)}
              aria-label={
                task.completed ? `Mark ${task.title} incomplete` : `Mark ${task.title} complete`
              }
              className="min-h-[44px] min-w-[44px] -ml-2 -my-2 flex items-center justify-center shrink-0"
            >
              <span
                className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                  task.completed
                    ? 'bg-emerald-500 border-emerald-500 text-white'
                    : 'border-slate-300 dark:border-slate-600 bg-white/70 dark:bg-slate-900/70'
                }`}
              >
                {task.completed && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
              </span>
            </button>

            <div className="min-w-0 flex-1">
              <button
                type="button"
                onClick={() => onEdit(task)}
                className="text-left block w-full group"
              >
                <p
                  className={`text-sm font-semibold leading-snug group-hover:text-purple-600 dark:group-hover:text-cyan-300 transition-colors ${
                    task.completed
                      ? 'line-through text-slate-400 dark:text-slate-500'
                      : 'text-slate-950 dark:text-white'
                  }`}
                >
                  {task.title}
                </p>
              </button>

              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400">
                <span className={priorityMeta.className}>{priorityMeta.label}</span>
                <span aria-hidden="true">·</span>
                <span>{task.category}</span>
                <span aria-hidden="true">·</span>
                <span className={`font-mono tabular-nums ${deadlineClass}`}>{deadlinePrefix}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">{task.estimatedMinutes}m</span>
                {totalSubtasks > 0 && (
                  <>
                    <span aria-hidden="true">·</span>
                    <button
                      type="button"
                      onClick={() => setSubtasksExpanded((v) => !v)}
                      className="inline-flex items-center gap-1 font-mono tabular-nums text-slate-600 dark:text-slate-300 hover:text-purple-600 dark:hover:text-cyan-300"
                    >
                      <span>
                        {completedSubtasks}/{totalSubtasks} subtasks
                      </span>
                      {subtasksExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </>
                )}
              </div>

              {task.notes && (
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                  {task.notes}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 self-end sm:self-center shrink-0">
            {!task.completed && onSchedule && (
              <button
                type="button"
                onClick={() => onSchedule(task)}
                aria-label={`Schedule ${task.title} onto planner`}
                title="Schedule onto Planner"
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white hover:bg-slate-900/5 dark:hover:bg-white/10 transition-colors"
              >
                <CalendarPlus className="w-4 h-4" />
              </button>
            )}
            {!task.completed && (
              <button
                type="button"
                onClick={() => onStartFocus(task)}
                aria-label={`Start focus for ${task.title}`}
                title="Start Focus"
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-purple-600 dark:text-cyan-400 hover:bg-purple-500/10 dark:hover:bg-cyan-400/10 transition-colors"
              >
                <Play className="w-4 h-4 fill-current" />
              </button>
            )}
            <button
              type="button"
              onClick={() => onEdit(task)}
              aria-label={`Edit ${task.title}`}
              title="Edit Task"
              className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-950 dark:hover:text-white hover:bg-slate-900/5 dark:hover:bg-white/10 transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onRequestDelete(task)}
              aria-label={`Delete ${task.title}`}
              title="Delete Task"
              className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {totalSubtasks > 0 && subtasksExpanded && (
          <ul className="mt-2.5 ml-8 pl-3 border-l border-slate-200/70 dark:border-slate-700/60 space-y-1">
            {task.subtasks.map((sub) => (
              <li key={sub.id}>
                <button
                  type="button"
                  onClick={() => onToggleSubtask(task.id, sub.id)}
                  className="min-h-[34px] w-full flex items-center gap-2 text-left text-xs text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white"
                >
                  <span
                    className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                      sub.completed
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : 'border-slate-300 dark:border-slate-600 bg-white/70 dark:bg-slate-900/70'
                    }`}
                  >
                    {sub.completed && <Check className="w-2.5 h-2.5 stroke-[2.5]" />}
                  </span>
                  <span
                    className={
                      sub.completed ? 'line-through text-slate-400 dark:text-slate-500' : ''
                    }
                  >
                    {sub.title}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </li>
    );
  }

  // Responsive Glass Card Grid layout
  return (
    <GlassCard
      as="article"
      interactive
      className={`p-5 flex flex-col justify-between gap-4 transition-opacity ${
        task.completed ? 'opacity-75' : ''
      }`}
    >
      <div className="space-y-3">
        {/* Top Row: Quiet Unboxed Metadata + Action Icons */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs pt-1 min-w-0">
            <span className={priorityMeta.className}>{priorityMeta.label}</span>
            <span aria-hidden="true" className="text-slate-400">
              ·
            </span>
            <span className="text-slate-500 dark:text-slate-400">{task.category}</span>
          </div>

          <div className="flex items-center gap-0.5 -mr-1.5 -mt-1 shrink-0">
            <button
              type="button"
              onClick={() => onEdit(task)}
              aria-label={`Edit ${task.title}`}
              title="Edit Task"
              className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-950 dark:hover:text-white hover:bg-slate-900/5 dark:hover:bg-white/10 transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onRequestDelete(task)}
              aria-label={`Delete ${task.title}`}
              title="Delete Task"
              className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-xl text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Title + Completion Checkbox */}
        <div className="flex items-start gap-2.5">
          <button
            type="button"
            onClick={() => onToggleComplete(task.id)}
            aria-label={
              task.completed ? `Mark ${task.title} incomplete` : `Mark ${task.title} complete`
            }
            className="min-h-[44px] min-w-[44px] -ml-2.5 -my-2 flex items-center justify-center shrink-0"
          >
            <span
              className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                task.completed
                  ? 'bg-emerald-500 border-emerald-500 text-white'
                  : 'border-slate-300 dark:border-slate-600 bg-white/70 dark:bg-slate-900/70'
              }`}
            >
              {task.completed && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onEdit(task)}
            className="text-left min-w-0 flex-1 group"
          >
            <h3
              className={`font-display text-base font-semibold leading-snug group-hover:text-purple-600 dark:group-hover:text-cyan-300 transition-colors ${
                task.completed
                  ? 'line-through text-slate-400 dark:text-slate-500'
                  : 'text-slate-950 dark:text-white'
              }`}
            >
              {task.title}
            </h3>
          </button>
        </div>

        {/* Notes Preview */}
        {task.notes && (
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-2">
            {task.notes}
          </p>
        )}

        {/* Subtasks Checklist Section */}
        {totalSubtasks > 0 && (
          <div className="pt-2 border-t nx-divider space-y-2">
            <div className="flex items-center justify-between gap-2 text-xs">
              <button
                type="button"
                onClick={() => setSubtasksExpanded((v) => !v)}
                className="inline-flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300 hover:text-purple-600 dark:hover:text-cyan-300 transition-colors"
              >
                <span>Subtasks</span>
                {subtasksExpanded ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>
              <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400">
                {completedSubtasks}/{totalSubtasks} · {subtaskPct}%
              </span>
            </div>

            <div className="h-1.5 w-full rounded-full bg-slate-900/10 dark:bg-white/10 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  subtaskPct === 100 ? 'bg-emerald-500' : 'nx-gradient-primary'
                }`}
                style={{ width: `${subtaskPct}%` }}
              />
            </div>

            {subtasksExpanded && (
              <ul className="space-y-1 pt-1">
                {task.subtasks.map((sub) => (
                  <li key={sub.id}>
                    <button
                      type="button"
                      onClick={() => onToggleSubtask(task.id, sub.id)}
                      className="min-h-[34px] w-full flex items-center gap-2 text-left text-xs text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white transition-colors"
                    >
                      <span
                        className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                          sub.completed
                            ? 'bg-emerald-500 border-emerald-500 text-white'
                            : 'border-slate-300 dark:border-slate-600 bg-white/70 dark:bg-slate-900/70'
                        }`}
                      >
                        {sub.completed && <Check className="w-2.5 h-2.5 stroke-[2.5]" />}
                      </span>
                      <span
                        className={`truncate ${
                          sub.completed ? 'line-through text-slate-400 dark:text-slate-500' : ''
                        }`}
                      >
                        {sub.title}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Footer Row: Deadline + Estimate + Focus CTA */}
      <div className="pt-3 border-t nx-divider flex items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 min-w-0">
          <span className={`font-mono tabular-nums truncate ${deadlineClass}`}>
            {deadlinePrefix}
          </span>
          <span aria-hidden="true" className="text-slate-400">
            ·
          </span>
          <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400 shrink-0">
            {task.estimatedMinutes}m
          </span>
        </div>

        {!task.completed && (
          <div className="flex items-center gap-1 shrink-0">
            {onSchedule && (
              <button
                type="button"
                onClick={() => onSchedule(task)}
                aria-label={`Schedule ${task.title} onto planner`}
                title="Schedule onto Planner"
                className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white hover:bg-slate-900/5 dark:hover:bg-white/10 transition-colors"
              >
                <CalendarPlus className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => onStartFocus(task)}
              className="min-h-[36px] px-2.5 rounded-xl text-xs font-medium text-purple-600 dark:text-cyan-300 hover:bg-purple-500/10 dark:hover:bg-cyan-400/10 inline-flex items-center gap-1 whitespace-nowrap shrink-0 transition-colors"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>Focus</span>
            </button>
          </div>
        )}
      </div>
    </GlassCard>
  );
};
