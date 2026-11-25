import React, { useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Minus,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { ProductivityGoal, TaskCategory } from '../../types/productivity';
import { formatCountdownLabel, formatShortDate } from '../../utils/date';
import { GlassCard } from '../ui/GlassCard';
import { ProgressRing } from './ProgressRing';

interface GoalCardProps {
  goal: ProductivityGoal;
  onEdit: (goal: ProductivityGoal) => void;
  onRequestDelete: (goal: ProductivityGoal) => void;
  onToggleComplete: (id: string) => void;
  onStepProgress: (id: string, delta: number) => void;
  onSetProgress: (id: string, value: number) => void;
  onToggleMilestone: (goalId: string, milestoneId: string) => void;
  onAddMilestone: (goalId: string, title: string, targetDate?: string | null) => void;
  onDeleteMilestone: (goalId: string, milestoneId: string) => void;
}

const CATEGORY_TOP_BAR: Record<TaskCategory, string> = {
  'Deep Work': 'bg-purple-500',
  Planning: 'bg-cyan-500',
  Admin: 'bg-amber-500',
  Personal: 'bg-emerald-500',
};

const CATEGORY_TEXT: Record<TaskCategory, string> = {
  'Deep Work': 'text-purple-600 dark:text-purple-300',
  Planning: 'text-cyan-700 dark:text-cyan-300',
  Admin: 'text-amber-700 dark:text-amber-300',
  Personal: 'text-emerald-700 dark:text-emerald-300',
};

export const GoalCard: React.FC<GoalCardProps> = ({
  goal,
  onEdit,
  onRequestDelete,
  onToggleComplete,
  onStepProgress,
  onSetProgress,
  onToggleMilestone,
  onAddMilestone,
  onDeleteMilestone,
}) => {
  const [milestonesOpen, setMilestonesOpen] = useState(goal.milestones.length > 0 && !goal.completed);
  const [quickMilestone, setQuickMilestone] = useState('');

  const pct = Math.min(100, Math.round((goal.currentValue / Math.max(1, goal.targetValue)) * 100));
  const countdown = formatCountdownLabel(goal.deadline, goal.completed);
  const ringStatus = goal.completed
    ? 'completed'
    : countdown.tone === 'overdue'
      ? 'overdue'
      : 'active';

  const completedMilestones = goal.milestones.filter((m) => m.completed).length;

  const handleQuickAddMilestone = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = quickMilestone.trim();
    if (!clean) return;
    onAddMilestone(goal.id, clean, null);
    setQuickMilestone('');
    setMilestonesOpen(true);
  };

  return (
    <GlassCard className="relative overflow-hidden flex flex-col">
      {/* 2px category top hairline */}
      <div className={`h-[2px] w-full ${CATEGORY_TOP_BAR[goal.category]}`} aria-hidden="true" />

      <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
        {/* Top Header: Progress Ring + Title + Actions */}
        <div className="flex items-start gap-4">
          <ProgressRing
            percent={pct}
            size={74}
            strokeWidth={6}
            status={ringStatus}
            label={`${goal.title} ${pct}% complete`}
          />

          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className={`font-medium ${CATEGORY_TEXT[goal.category]}`}>
                    {goal.category}
                  </span>
                  <span className="text-slate-400/70" aria-hidden="true">
                    ·
                  </span>
                  <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400">
                    Target {formatShortDate(goal.deadline)}
                  </span>
                  <span className="text-slate-400/70" aria-hidden="true">
                    ·
                  </span>
                  <span
                    className={`font-mono tabular-nums font-medium ${
                      countdown.tone === 'completed'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : countdown.tone === 'overdue'
                          ? 'text-rose-600 dark:text-rose-400'
                          : countdown.tone === 'soon'
                            ? 'text-amber-700 dark:text-amber-300'
                            : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {countdown.label}
                  </span>
                </div>

                <h3
                  className={`mt-1 font-display text-base font-semibold leading-snug ${
                    goal.completed
                      ? 'line-through text-slate-400 dark:text-slate-500'
                      : 'text-slate-950 dark:text-white'
                  }`}
                >
                  {goal.title}
                </h3>
              </div>

              <div className="flex items-center gap-0.5 shrink-0 -mr-1 -mt-1">
                <button
                  type="button"
                  onClick={() => onToggleComplete(goal.id)}
                  aria-label={goal.completed ? `Reopen ${goal.title}` : `Mark ${goal.title} complete`}
                  title={goal.completed ? 'Reopen goal' : 'Mark complete'}
                  className={`min-h-[36px] min-w-[36px] rounded-xl flex items-center justify-center transition-colors ${
                    goal.completed
                      ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/12'
                      : 'text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-500/10'
                  }`}
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onEdit(goal)}
                  aria-label={`Edit ${goal.title}`}
                  title="Edit goal"
                  className="min-h-[36px] min-w-[36px] rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-950 dark:hover:text-white hover:bg-slate-900/5 dark:hover:bg-white/10 transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onRequestDelete(goal)}
                  aria-label={`Delete ${goal.title}`}
                  title="Delete goal"
                  className="min-h-[36px] min-w-[36px] rounded-xl flex items-center justify-center text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {goal.description && (
              <p className="text-xs text-slate-600 dark:text-slate-300/90 leading-relaxed line-clamp-2">
                {goal.description}
              </p>
            )}
          </div>
        </div>

        {/* Interactive Progress Controller */}
        <div className="space-y-2.5 pt-3 border-t nx-divider">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="font-mono tabular-nums font-medium text-slate-800 dark:text-slate-200">
              {goal.currentValue} / {goal.targetValue} {goal.unit}
            </span>

            {goal.progressMode === 'numeric' ? (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onStepProgress(goal.id, -1)}
                  disabled={goal.currentValue <= 0}
                  aria-label={`Decrease progress for ${goal.title}`}
                  className="min-h-[32px] min-w-[32px] rounded-lg nx-glass flex items-center justify-center text-slate-600 dark:text-slate-300 hover:border-cyan-400/50 disabled:opacity-35 transition-colors"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onStepProgress(goal.id, 1)}
                  disabled={goal.currentValue >= goal.targetValue}
                  aria-label={`Increase progress for ${goal.title}`}
                  className="min-h-[32px] min-w-[32px] rounded-lg nx-glass flex items-center justify-center text-purple-600 dark:text-cyan-300 hover:border-cyan-400/50 disabled:opacity-35 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Driven by milestones
              </span>
            )}
          </div>

          {goal.progressMode === 'numeric' ? (
            <input
              type="range"
              min={0}
              max={Math.max(1, goal.targetValue)}
              value={goal.currentValue}
              onChange={(e) => onSetProgress(goal.id, Number(e.target.value))}
              aria-label={`Adjust numeric progress for ${goal.title}`}
              className="w-full h-1.5 rounded-full accent-purple-500 dark:accent-cyan-400 cursor-pointer"
            />
          ) : (
            <div className="h-1.5 w-full rounded-full bg-slate-900/10 dark:bg-white/10 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  goal.completed ? 'bg-emerald-500' : 'nx-gradient-primary'
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
          )}
        </div>

        {/* Expandable Milestones Checklist */}
        <div className="pt-2 border-t nx-divider space-y-2.5">
          <button
            type="button"
            onClick={() => setMilestonesOpen((v) => !v)}
            className="w-full min-h-[34px] flex items-center justify-between text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white transition-colors"
          >
            <span>
              Milestones{' '}
              <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400">
                ({completedMilestones}/{goal.milestones.length})
              </span>
            </span>
            {milestonesOpen ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {milestonesOpen && (
            <div className="space-y-2">
              {goal.milestones.length > 0 ? (
                <ul className="space-y-1.5">
                  {goal.milestones.map((ms) => (
                    <li
                      key={ms.id}
                      className="group flex items-center justify-between gap-2 py-1"
                    >
                      <button
                        type="button"
                        onClick={() => onToggleMilestone(goal.id, ms.id)}
                        className="flex items-start gap-2.5 text-left min-w-0 flex-1"
                      >
                        <span
                          className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                            ms.completed
                              ? 'bg-emerald-500 border-emerald-500 text-white'
                              : 'border-slate-300 dark:border-slate-600 bg-white/70 dark:bg-slate-900/70'
                          }`}
                        >
                          {ms.completed && <Check className="w-3 h-3 stroke-[2.5]" />}
                        </span>
                        <span
                          className={`text-xs leading-snug ${
                            ms.completed
                              ? 'line-through text-slate-400 dark:text-slate-500'
                              : 'text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          {ms.title}
                        </span>
                      </button>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {ms.targetDate && (
                          <span className="font-mono text-[10px] tabular-nums text-slate-500 dark:text-slate-400">
                            {formatShortDate(ms.targetDate)}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => onDeleteMilestone(goal.id, ms.id)}
                          aria-label={`Remove milestone ${ms.title}`}
                          className="p-1 rounded-lg text-slate-400 opacity-0 group-hover:opacity-100 focus:opacity-100 hover:text-rose-500 transition-opacity"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  No milestones yet — add concrete checkpoints below.
                </p>
              )}

              <form onSubmit={handleQuickAddMilestone} className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  value={quickMilestone}
                  onChange={(e) => setQuickMilestone(e.target.value)}
                  placeholder="Quick add milestone..."
                  aria-label={`Add milestone to ${goal.title}`}
                  className="flex-1 min-h-[36px] px-3 py-1 text-xs rounded-xl nx-input placeholder:text-slate-400"
                />
                <button
                  type="submit"
                  disabled={!quickMilestone.trim()}
                  className="min-h-[36px] px-3 rounded-xl nx-glass text-xs font-medium text-purple-700 dark:text-cyan-300 hover:border-cyan-400/50 disabled:opacity-40 transition-colors"
                >
                  Add
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </GlassCard>
  );
};
