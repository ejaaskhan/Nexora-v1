import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Flag, ListChecks, Target } from 'lucide-react';
import { GoalAnalyticsSummary, TaskAnalyticsSummary } from '../../utils/analytics';
import { GlassCard } from '../ui/GlassCard';
import { ProgressRing } from '../goals/ProgressRing';

interface TaskGoalAnalyticsSectionProps {
  taskStats: TaskAnalyticsSummary;
  goalStats: GoalAnalyticsSummary;
}

const PRIORITY_BAR_COLORS: Record<'high' | 'medium' | 'low', string> = {
  high: 'bg-rose-500/85 dark:bg-rose-400/85',
  medium: 'bg-amber-500/85 dark:bg-amber-400/85',
  low: 'bg-cyan-500/80 dark:bg-cyan-400/80',
};

export const TaskGoalAnalyticsSection: React.FC<TaskGoalAnalyticsSectionProps> = ({
  taskStats,
  goalStats,
}) => {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Completed Task Statistics Card */}
      <GlassCard as="section" className="lg:col-span-6 p-5 sm:p-6 flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-950 dark:text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                <span>Completed Task Statistics</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Live completion rate, priority balance, and subtask execution
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/tasks')}
              className="min-h-[36px] px-2.5 rounded-lg text-xs font-medium text-purple-600 dark:text-cyan-400 hover:bg-purple-500/10 dark:hover:bg-cyan-400/10 inline-flex items-center gap-1 transition-colors shrink-0"
            >
              <span>Tasks</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {taskStats.total === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                No tasks recorded for this filter
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Create and complete tasks to populate real execution statistics.
              </p>
            </div>
          ) : (
            <>
              {/* Ring + Key Counters */}
              <div className="mt-5 flex flex-col sm:flex-row sm:items-center gap-5 pb-5 border-b nx-divider">
                <div className="flex items-center gap-4">
                  <ProgressRing
                    percent={taskStats.completionRate}
                    size={76}
                    strokeWidth={6}
                    status="completed"
                    label={`Task completion rate ${taskStats.completionRate}%`}
                  />
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Overall Completion</p>
                    <p className="font-mono text-xl font-semibold tabular-nums text-slate-950 dark:text-white mt-0.5">
                      {taskStats.completed}{' '}
                      <span className="text-sm font-normal text-slate-400 dark:text-slate-500">
                        / {taskStats.total}
                      </span>
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      <span className="font-mono tabular-nums text-emerald-600 dark:text-emerald-400 font-medium">
                        {taskStats.completedToday}
                      </span>{' '}
                      today ·{' '}
                      <span className="font-mono tabular-nums text-slate-700 dark:text-slate-300 font-medium">
                        {taskStats.completedLast7Days}
                      </span>{' '}
                      last 7d
                    </p>
                  </div>
                </div>

                <div className="sm:ml-auto grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-xl bg-slate-900/[0.03] dark:bg-white/[0.03] border nx-divider px-3 py-2.5">
                    <p className="text-slate-500 dark:text-slate-400">Open Tasks</p>
                    <p className="font-mono text-base font-semibold tabular-nums text-slate-950 dark:text-white mt-0.5">
                      {taskStats.open}
                    </p>
                    <p
                      className={`text-[11px] font-mono tabular-nums mt-0.5 ${
                        taskStats.overdueCount > 0
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {taskStats.overdueCount > 0
                        ? `${taskStats.overdueCount} overdue`
                        : 'All on track'}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-900/[0.03] dark:bg-white/[0.03] border nx-divider px-3 py-2.5">
                    <p className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <ListChecks className="w-3.5 h-3.5" />
                      <span>Subtasks</span>
                    </p>
                    <p className="font-mono text-base font-semibold tabular-nums text-slate-950 dark:text-white mt-0.5">
                      {taskStats.completedSubtasks}/{taskStats.totalSubtasks}
                    </p>
                    <p className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400 mt-0.5">
                      {taskStats.totalSubtasks > 0 ? `${taskStats.subtaskRate}% checked` : 'None added'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Priority Completion Breakdown */}
              <div className="mt-5 space-y-3.5">
                <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  Completion by Priority Tier
                </p>
                {taskStats.byPriority.map((row) => (
                  <div key={row.priority}>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {row.label}
                      </span>
                      <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400">
                        {row.completed}/{row.total} done · {row.rate}%
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-900/8 dark:bg-white/10 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${PRIORITY_BAR_COLORS[row.priority]}`}
                        style={{ width: `${row.rate}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </GlassCard>

      {/* Goal Progress Analytics Card */}
      <GlassCard as="section" className="lg:col-span-6 p-5 sm:p-6 flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-950 dark:text-white flex items-center gap-2">
                <Target className="w-4 h-4 text-purple-600 dark:text-cyan-400" />
                <span>Goal Progress &amp; Milestones</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Real advancement across active goals and milestone checklists
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/goals')}
              className="min-h-[36px] px-2.5 rounded-lg text-xs font-medium text-purple-600 dark:text-cyan-400 hover:bg-purple-500/10 dark:hover:bg-cyan-400/10 inline-flex items-center gap-1 transition-colors shrink-0"
            >
              <span>Goals</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {goalStats.total === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                No goals tracked for this filter
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Add measurable goals or milestones to visualize target progress here.
              </p>
            </div>
          ) : (
            <>
              {/* Ring + Goal Summary Counters */}
              <div className="mt-5 flex flex-col sm:flex-row sm:items-center gap-5 pb-5 border-b nx-divider">
                <div className="flex items-center gap-4">
                  <ProgressRing
                    percent={goalStats.avgProgressPct}
                    size={76}
                    strokeWidth={6}
                    status={goalStats.avgProgressPct >= 100 ? 'completed' : 'active'}
                    label={`Average goal progress ${goalStats.avgProgressPct}%`}
                  />
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Average Progress</p>
                    <p className="font-mono text-xl font-semibold tabular-nums text-slate-950 dark:text-white mt-0.5">
                      {goalStats.completed}{' '}
                      <span className="text-sm font-normal text-slate-400 dark:text-slate-500">
                        / {goalStats.total} achieved
                      </span>
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      <span className="font-mono tabular-nums text-slate-700 dark:text-slate-300 font-medium">
                        {goalStats.active}
                      </span>{' '}
                      in progress
                    </p>
                  </div>
                </div>

                <div className="sm:ml-auto rounded-xl bg-slate-900/[0.03] dark:bg-white/[0.03] border nx-divider px-3.5 py-2.5 text-xs">
                  <p className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Flag className="w-3.5 h-3.5 text-purple-600 dark:text-cyan-400" />
                    <span>Milestones Completed</span>
                  </p>
                  <p className="font-mono text-base font-semibold tabular-nums text-slate-950 dark:text-white mt-0.5">
                    {goalStats.completedMilestones}/{goalStats.totalMilestones}
                  </p>
                  <p className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400 mt-0.5">
                    {goalStats.totalMilestones > 0
                      ? `${goalStats.milestoneRate}% reached`
                      : 'Numeric targets'}
                  </p>
                </div>
              </div>

              {/* Per-Goal Progress List */}
              <div className="mt-4 space-y-3.5 max-h-[220px] overflow-y-auto pr-1">
                {goalStats.items.map(({ goal, pct, completedMilestones, totalMilestones, countdown }) => (
                  <div key={goal.id}>
                    <div className="flex items-center justify-between gap-2 text-xs mb-1">
                      <span className="font-medium text-slate-900 dark:text-slate-100 truncate">
                        {goal.title}
                      </span>
                      <span className="font-mono tabular-nums text-slate-600 dark:text-slate-300 shrink-0">
                        {pct}%
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-900/8 dark:bg-white/10 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          goal.completed ? 'bg-emerald-500' : 'nx-gradient-primary'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="font-mono tabular-nums truncate">
                        {goal.progressMode === 'milestones' && totalMilestones > 0
                          ? `${completedMilestones}/${totalMilestones} milestones`
                          : `${goal.currentValue}/${goal.targetValue} ${goal.unit}`}
                        {' · '}
                        {goal.category}
                      </span>
                      <span
                        className={`font-mono tabular-nums shrink-0 ${
                          countdown.tone === 'overdue'
                            ? 'text-rose-600 dark:text-rose-400'
                            : countdown.tone === 'completed'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : countdown.tone === 'soon'
                                ? 'text-amber-600 dark:text-amber-400'
                                : ''
                        }`}
                      >
                        {countdown.label}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </GlassCard>
    </div>
  );
};
