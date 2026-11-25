import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Trash2 } from 'lucide-react';
import { useWorkspace } from '../../store/WorkspaceContext';
import { FocusSession, TaskCategory, TimerMode } from '../../types/productivity';
import {
  buildDailyProductivitySeries,
  buildWeeklyProductivitySeries,
  CategoryFilter,
  computeActivitySummary,
  computeGoalAnalytics,
  computeTaskStatistics,
} from '../../utils/analytics';
import {
  addDaysISO,
  calculateFocusStreak,
  formatDurationCompact,
  getTodayISO,
} from '../../utils/date';
import { GlassCard } from '../../components/ui/GlassCard';
import { GlowButton } from '../../components/ui/GlowButton';
import { PageTransition } from '../../components/ui/PageTransition';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { ProductivityTrendChart } from '../../components/analytics/ProductivityTrendChart';
import { TaskGoalAnalyticsSection } from '../../components/analytics/TaskGoalAnalyticsSection';
import { ActivitySummaryPanel } from '../../components/analytics/ActivitySummaryPanel';

type RangeFilter = '7d' | '30d' | 'all';
type SessionTypeFilter = 'all' | 'work' | 'breaks';

const MODE_NAMES: Record<TimerMode, string> = {
  focus: 'Pomodoro Focus',
  deep: 'Deep Work',
  'short-break': 'Short Break',
  'long-break': 'Long Break',
};

const CATEGORIES: TaskCategory[] = ['Deep Work', 'Planning', 'Admin', 'Personal'];

export const HistoryPage: React.FC = () => {
  const { sessions, tasks, goals, activities, settings, deleteSession } = useWorkspace();
  const navigate = useNavigate();

  const [range, setRange] = useState<RangeFilter>('7d');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [sessionTypeFilter, setSessionTypeFilter] = useState<SessionTypeFilter>('all');
  const [sessionToDelete, setSessionToDelete] = useState<FocusSession | null>(null);

  const todayISO = getTodayISO();

  const rangeFilteredSessions = useMemo(() => {
    const cutoffISO =
      range === '7d'
        ? addDaysISO(todayISO, -6)
        : range === '30d'
          ? addDaysISO(todayISO, -29)
          : null;

    return sessions
      .filter((s) => (cutoffISO ? s.date >= cutoffISO : true))
      .filter((s) => (categoryFilter === 'all' ? true : s.category === categoryFilter));
  }, [sessions, range, categoryFilter, todayISO]);

  const ledgerSessions = useMemo(() => {
    if (sessionTypeFilter === 'work') {
      return rangeFilteredSessions.filter((s) => s.mode === 'focus' || s.mode === 'deep');
    }
    if (sessionTypeFilter === 'breaks') {
      return rangeFilteredSessions.filter(
        (s) => s.mode === 'short-break' || s.mode === 'long-break'
      );
    }
    return rangeFilteredSessions;
  }, [rangeFilteredSessions, sessionTypeFilter]);

  const workSessions = useMemo(
    () =>
      rangeFilteredSessions.filter(
        (s) => s.completed && (s.mode === 'focus' || s.mode === 'deep')
      ),
    [rangeFilteredSessions]
  );

  const breakSessions = useMemo(
    () =>
      rangeFilteredSessions.filter(
        (s) => s.completed && (s.mode === 'short-break' || s.mode === 'long-break')
      ),
    [rangeFilteredSessions]
  );

  const totalMinutes = useMemo(
    () => workSessions.reduce((sum, s) => sum + s.durationMinutes, 0),
    [workSessions]
  );

  const avgMinutes =
    workSessions.length > 0 ? Math.round(totalMinutes / workSessions.length) : 0;
  const streak = useMemo(() => calculateFocusStreak(sessions), [sessions]);

  // Real-data daily & weekly trend series
  const daily7 = useMemo(
    () => buildDailyProductivitySeries(sessions, tasks, 7, categoryFilter, todayISO),
    [sessions, tasks, categoryFilter, todayISO]
  );
  const daily14 = useMemo(
    () => buildDailyProductivitySeries(sessions, tasks, 14, categoryFilter, todayISO),
    [sessions, tasks, categoryFilter, todayISO]
  );
  const weekly6 = useMemo(
    () => buildWeeklyProductivitySeries(sessions, tasks, 6, categoryFilter, todayISO),
    [sessions, tasks, categoryFilter, todayISO]
  );

  // Real-data Task, Goal, and Activity statistics
  const taskStats = useMemo(
    () => computeTaskStatistics(tasks, categoryFilter, todayISO),
    [tasks, categoryFilter, todayISO]
  );
  const goalStats = useMemo(
    () => computeGoalAnalytics(goals, categoryFilter),
    [goals, categoryFilter]
  );
  const activitySummary = useMemo(
    () => computeActivitySummary(activities, todayISO),
    [activities, todayISO]
  );

  // Real category focus allocation
  const categoryBreakdown = useMemo(() => {
    const map = new Map<TaskCategory, number>();
    CATEGORIES.forEach((c) => map.set(c, 0));
    workSessions.forEach((s) => {
      map.set(s.category, (map.get(s.category) ?? 0) + s.durationMinutes);
    });
    return CATEGORIES.map((cat) => {
      const minutes = map.get(cat) ?? 0;
      const pct = totalMinutes > 0 ? Math.round((minutes / totalMinutes) * 100) : 0;
      return { category: cat, minutes, pct };
    }).sort((a, b) => b.minutes - a.minutes);
  }, [workSessions, totalMinutes]);

  return (
    <PageTransition className="space-y-6">
      {/* Header & Global Filters */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-purple-600 dark:text-cyan-400">
            Live local productivity telemetry across focus, tasks, goals, and activity
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-950 dark:text-white mt-1">
            Productivity Analytics
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <SegmentedControl
            ariaLabel="Analytics time window"
            value={range}
            onChange={setRange}
            options={[
              { value: '7d', label: 'Last 7 Days' },
              { value: '30d', label: '30 Days' },
              { value: 'all', label: 'All Time' },
            ]}
          />
          <select
            aria-label="Filter analytics by category"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as CategoryFilter)}
            className="min-h-[44px] px-3.5 py-1.5 text-xs font-medium rounded-xl nx-glass text-slate-800 dark:text-slate-200 focus:outline-none focus:border-cyan-400"
          >
            <option value="all" className="bg-white dark:bg-slate-900">
              All Categories
            </option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c} className="bg-white dark:bg-slate-900">
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 4-Column Real-Data KPI Metric Strip */}
      <GlassCard
        as="section"
        className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 divide-x divide-slate-200/70 dark:divide-slate-700/40 overflow-hidden"
      >
        <div className="p-4 sm:p-5">
          <p className="text-xs text-slate-500 dark:text-slate-400">Focus Time</p>
          <p className="mt-1.5 font-mono text-2xl font-semibold tabular-nums text-slate-950 dark:text-white">
            {formatDurationCompact(totalMinutes)}
          </p>
          <p className="mt-1 text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
            {workSessions.length} cycles · {avgMinutes}m avg
          </p>
        </div>

        <div className="p-4 sm:p-5">
          <p className="text-xs text-slate-500 dark:text-slate-400">Tasks Completed</p>
          <p className="mt-1.5 font-mono text-2xl font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
            {taskStats.completed}
            <span className="text-sm font-normal text-slate-400 dark:text-slate-500">
              /{taskStats.total}
            </span>
          </p>
          <p className="mt-1 text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
            {taskStats.completionRate}% rate · {taskStats.completedLast7Days} in 7d
          </p>
        </div>

        <div className="p-4 sm:p-5">
          <p className="text-xs text-slate-500 dark:text-slate-400">Goal Progress</p>
          <p className="mt-1.5 font-mono text-2xl font-semibold tabular-nums text-slate-950 dark:text-white">
            {goalStats.avgProgressPct}%
          </p>
          <p className="mt-1 text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
            {goalStats.completed}/{goalStats.total} goals · {goalStats.completedMilestones} milestones
          </p>
        </div>

        <div className="p-4 sm:p-5">
          <p className="text-xs text-slate-500 dark:text-slate-400">Focus Streak</p>
          <p className="mt-1.5 font-mono text-2xl font-semibold tabular-nums nx-gradient-text">
            {streak}d
          </p>
          <p className="mt-1 text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
            {activitySummary.todayCount} actions today · {breakSessions.length} breaks
          </p>
        </div>
      </GlassCard>

      {/* Primary Charts Row: Daily/Weekly Trend Chart + Category Focus Share */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-8">
          <ProductivityTrendChart
            daily7={daily7}
            daily14={daily14}
            weekly={weekly6}
            dailyGoalMinutes={settings.dailyFocusGoalMinutes}
          />
        </div>

        <GlassCard as="section" className="xl:col-span-4 p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-950 dark:text-white">
              Focus Allocation by Area
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Real share of completed work sessions in selected window
            </p>

            <div className="mt-5 space-y-4">
              {categoryBreakdown.map((row, idx) => (
                <div key={row.category}>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {row.category}
                    </span>
                    <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400">
                      {formatDurationCompact(row.minutes)} · {row.pct}%
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-900/8 dark:bg-white/10 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        idx === 0
                          ? 'nx-gradient-primary'
                          : 'bg-purple-500/60 dark:bg-cyan-400/55'
                      }`}
                      style={{ width: `${row.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t nx-divider space-y-2 text-xs">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span>Work vs Break cycles</span>
              <span className="font-mono tabular-nums font-medium text-slate-900 dark:text-slate-200">
                {workSessions.length} work · {breakSessions.length} breaks
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span>Daily focus target</span>
              <span className="font-mono tabular-nums font-medium text-purple-600 dark:text-cyan-300">
                {formatDurationCompact(settings.dailyFocusGoalMinutes)}
              </span>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Completed Task Statistics & Goal Progress */}
      <TaskGoalAnalyticsSection taskStats={taskStats} goalStats={goalStats} />

      {/* Workspace Activity Summary & Filterable Timeline */}
      <ActivitySummaryPanel activities={activities} summary={activitySummary} />

      {/* Focus Session Ledger */}
      <GlassCard as="section" className="overflow-hidden">
        <div className="px-5 py-4 border-b nx-divider flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-950 dark:text-white">
              Focus Session Ledger
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Recorded Pomodoro work sprints and break intervals
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <SegmentedControl
              ariaLabel="Filter ledger by session type"
              value={sessionTypeFilter}
              onChange={setSessionTypeFilter}
              options={[
                { value: 'all', label: 'All' },
                { value: 'work', label: 'Work' },
                { value: 'breaks', label: 'Breaks' },
              ]}
            />
            <span className="font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
              {ledgerSessions.length} {ledgerSessions.length === 1 ? 'entry' : 'entries'}
            </span>
          </div>
        </div>

        {ledgerSessions.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
              No focus sessions recorded for this filter
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Complete a Pomodoro cycle in Focus Studio to begin building real analytics.
            </p>
            <div className="mt-4">
              <GlowButton variant="primary" size="sm" onClick={() => navigate('/focus')}>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Open Focus Studio</span>
              </GlowButton>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b nx-divider text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-900/[0.03] dark:bg-white/[0.02]">
                  <th className="py-2.5 px-5">Session</th>
                  <th className="py-2.5 px-4">Category</th>
                  <th className="py-2.5 px-4">Mode</th>
                  <th className="py-2.5 px-4 text-right">Date</th>
                  <th className="py-2.5 px-4 text-right">Duration</th>
                  <th className="py-2.5 px-4 text-right w-14">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/70 text-sm">
                {ledgerSessions.map((sess) => {
                  const isBreak = sess.mode === 'short-break' || sess.mode === 'long-break';
                  return (
                    <tr
                      key={sess.id}
                      className="hover:bg-white/50 dark:hover:bg-white/[0.04] transition-colors"
                    >
                      <td className="py-3 px-5 max-w-[280px]">
                        <p className="font-medium text-slate-950 dark:text-slate-100 truncate">
                          {sess.linkedTitle}
                        </p>
                        {sess.intention && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            {sess.intention}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {sess.category}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        <span
                          className={
                            isBreak
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-slate-600 dark:text-slate-300'
                          }
                        >
                          {MODE_NAMES[sess.mode]}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400 text-right whitespace-nowrap">
                        {sess.date}
                      </td>
                      <td className="py-3 px-4 text-xs font-mono tabular-nums font-medium text-purple-600 dark:text-cyan-300 text-right whitespace-nowrap">
                        {sess.durationMinutes}m
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSessionToDelete(sess)}
                          aria-label={`Delete session ${sess.linkedTitle}`}
                          className="min-h-[36px] min-w-[36px] inline-flex items-center justify-center rounded-xl text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      <ConfirmDialog
        open={sessionToDelete !== null}
        title="Delete session record?"
        description={
          sessionToDelete
            ? `Remove "${sessionToDelete.linkedTitle}" (${sessionToDelete.durationMinutes}m on ${sessionToDelete.date}) from your focus history?`
            : ''
        }
        detail="Analytics totals and charts will immediately recalculate from your remaining stored sessions."
        confirmLabel="Delete Session"
        onCancel={() => setSessionToDelete(null)}
        onConfirm={() => {
          if (sessionToDelete) {
            deleteSession(sessionToDelete.id);
            setSessionToDelete(null);
          }
        }}
      />
    </PageTransition>
  );
};
