import React, { useMemo, useState } from 'react';
import { ArrowRight, Check, Pencil, Play, Plus, Target } from 'lucide-react';
import { ProductivityGoal } from '../../types/productivity';
import { formatDurationCompact, formatShortDate } from '../../utils/date';
import { GlassCard } from '../ui/GlassCard';
import { GlowButton } from '../ui/GlowButton';

interface ActiveGoalsWidgetProps {
  goals: ProductivityGoal[];
  todayFocusMinutes: number;
  dailyFocusGoalMinutes: number;
  onAddGoal: () => void;
  onEditGoal: (goal: ProductivityGoal) => void;
  onIncrementGoal: (id: string) => void;
  onToggleComplete: (id: string) => void;
  onOpenFocus: () => void;
  onViewAllGoals?: () => void;
}

type GoalFilter = 'active' | 'completed' | 'all';

export const ActiveGoalsWidget: React.FC<ActiveGoalsWidgetProps> = ({
  goals,
  todayFocusMinutes,
  dailyFocusGoalMinutes,
  onAddGoal,
  onEditGoal,
  onIncrementGoal,
  onToggleComplete,
  onOpenFocus,
  onViewAllGoals,
}) => {
  const [filter, setFilter] = useState<GoalFilter>('active');

  const dailyFocusPct = Math.min(
    100,
    Math.round((todayFocusMinutes / Math.max(1, dailyFocusGoalMinutes)) * 100)
  );

  const visibleGoals = useMemo(() => {
    const filtered = goals.filter((g) => {
      if (filter === 'active') return !g.completed;
      if (filter === 'completed') return g.completed;
      return true;
    });
    return filtered.sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      return a.deadline.localeCompare(b.deadline);
    });
  }, [goals, filter]);

  const activeCount = goals.filter((g) => !g.completed).length;

  return (
    <GlassCard as="section" className="overflow-hidden">
      <div className="px-5 py-4 border-b nx-divider flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-base font-semibold text-slate-950 dark:text-white">
            Active Goals
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Daily focus target plus {activeCount} active custom {activeCount === 1 ? 'goal' : 'goals'}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {onViewAllGoals && (
            <button
              type="button"
              onClick={onViewAllGoals}
              className="min-h-[34px] px-2.5 rounded-lg text-xs font-medium text-purple-600 dark:text-cyan-400 hover:bg-purple-500/10 dark:hover:bg-cyan-400/10 inline-flex items-center gap-1 whitespace-nowrap transition-colors"
            >
              <span>All Goals</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
          <GlowButton variant="secondary" size="sm" onClick={onAddGoal}>
            <Plus className="w-3.5 h-3.5 text-purple-600 dark:text-cyan-400" />
            <span>New</span>
          </GlowButton>
        </div>
      </div>

      {/* Pinned Daily Focus Target */}
      <div className="px-5 py-4 border-b nx-divider bg-purple-500/[0.04] dark:bg-cyan-400/[0.04]">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-purple-600 dark:text-cyan-300">
              Daily Focus Target
            </p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-mono text-base font-semibold tabular-nums text-slate-950 dark:text-white">
                {formatDurationCompact(todayFocusMinutes)}
              </span>
              <span className="font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
                / {formatDurationCompact(dailyFocusGoalMinutes)} ({dailyFocusPct}%)
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenFocus}
            className="min-h-[38px] px-3 rounded-xl nx-glass text-xs font-medium text-purple-700 dark:text-cyan-300 hover:border-cyan-400/50 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>Focus</span>
          </button>
        </div>
        <div className="mt-3 h-1.5 w-full rounded-full bg-slate-900/10 dark:bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full nx-gradient-primary transition-all duration-300"
            style={{ width: `${dailyFocusPct}%` }}
          />
        </div>
      </div>

      {/* Filter Bar */}
      <div className="px-5 py-2.5 border-b nx-divider flex items-center justify-between gap-2">
        <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-slate-900/[0.05] dark:bg-white/[0.05]">
          {(
            [
              { value: 'active', label: 'Active' },
              { value: 'completed', label: 'Done' },
              { value: 'all', label: 'All' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setFilter(tab.value)}
              className={`min-h-[30px] px-2.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                filter === tab.value
                  ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <span className="font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
          {visibleGoals.length} shown
        </span>
      </div>

      {/* Custom Goals List */}
      {visibleGoals.length === 0 ? (
        <div className="px-5 py-9 text-center">
          <Target className="w-6 h-6 mx-auto text-slate-400 dark:text-slate-500" />
          <p className="mt-2.5 text-sm font-medium text-slate-800 dark:text-slate-200">
            {filter === 'completed'
              ? 'No completed goals yet'
              : 'No custom goals tracked right now'}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {filter === 'completed'
              ? 'Advance progress on your active milestones to mark them complete.'
              : 'Set a measurable milestone to track alongside your daily focus target.'}
          </p>
          {filter !== 'completed' && (
            <div className="mt-4">
              <GlowButton variant="primary" size="sm" onClick={onAddGoal}>
                <Plus className="w-3.5 h-3.5" />
                <span>Create First Goal</span>
              </GlowButton>
            </div>
          )}
        </div>
      ) : (
        <ul className="divide-y divide-slate-200/60 dark:divide-slate-800/70">
          {visibleGoals.map((goal) => {
            const pct = Math.min(
              100,
              Math.round((goal.currentValue / Math.max(1, goal.targetValue)) * 100)
            );
            return (
              <li
                key={goal.id}
                className="px-5 py-3.5 hover:bg-white/50 dark:hover:bg-white/[0.04] transition-colors"
              >
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <button
                      type="button"
                      onClick={() => onToggleComplete(goal.id)}
                      aria-label={
                        goal.completed
                          ? `Reopen goal ${goal.title}`
                          : `Complete goal ${goal.title}`
                      }
                      className="min-h-[44px] min-w-[44px] -ml-2.5 -my-2 flex items-center justify-center shrink-0"
                    >
                      <span
                        className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                          goal.completed
                            ? 'bg-emerald-500 border-emerald-500 text-white'
                            : 'border-slate-300 dark:border-slate-600 bg-white/70 dark:bg-slate-900/70'
                        }`}
                      >
                        {goal.completed && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                      </span>
                    </button>

                    <div className="min-w-0">
                      <p
                        className={`text-sm font-medium leading-snug ${
                          goal.completed
                            ? 'line-through text-slate-400 dark:text-slate-500'
                            : 'text-slate-950 dark:text-slate-100'
                        }`}
                      >
                        {goal.title}
                      </p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                        <span>{goal.category}</span>
                        <span aria-hidden="true">·</span>
                        <span>Due {formatShortDate(goal.deadline)}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums text-slate-700 dark:text-slate-300">
                          {goal.currentValue}/{goal.targetValue} {goal.unit}
                        </span>
                        {goal.milestones.length > 0 && goal.progressMode !== 'milestones' && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono tabular-nums">
                              {goal.milestones.filter((m) => m.completed).length}/
                              {goal.milestones.length} milestones
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {!goal.completed && (
                      <button
                        type="button"
                        onClick={() => onIncrementGoal(goal.id)}
                        aria-label={`Increment progress for ${goal.title}`}
                        className="min-h-[36px] px-2.5 rounded-xl nx-glass text-xs font-mono font-semibold text-purple-600 dark:text-cyan-300 hover:border-cyan-400/50 transition-colors"
                      >
                        +1
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onEditGoal(goal)}
                      aria-label={`Edit goal ${goal.title}`}
                      className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-900/5 dark:hover:bg-white/10 transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="mt-2.5 pl-7 flex items-center gap-2.5">
                  <div className="flex-1 h-1.5 rounded-full bg-slate-900/10 dark:bg-white/10 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        goal.completed ? 'bg-emerald-500' : 'nx-gradient-primary'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="font-mono text-[11px] tabular-nums text-slate-500 dark:text-slate-400 w-9 text-right">
                    {pct}%
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </GlassCard>
  );
};
