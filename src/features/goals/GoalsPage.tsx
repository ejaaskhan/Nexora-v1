import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarDays,
  Play,
  Plus,
  RotateCcw,
  Search,
  Target,
  X,
} from 'lucide-react';
import { useWorkspace } from '../../store/WorkspaceContext';
import { ProductivityGoal, TaskCategory } from '../../types/productivity';
import {
  formatDurationCompact,
  getDaysUntilISO,
  getTodayISO,
} from '../../utils/date';
import { GlassCard } from '../../components/ui/GlassCard';
import { GlowButton } from '../../components/ui/GlowButton';
import { PageTransition } from '../../components/ui/PageTransition';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { GoalFormModal } from '../../components/dashboard/GoalFormModal';
import { GoalCard } from '../../components/goals/GoalCard';
import { ProgressRing } from '../../components/goals/ProgressRing';

type GoalStatusFilter = 'all' | 'active' | 'completed' | 'overdue';
type GoalCategoryFilter = 'all' | TaskCategory;
type GoalSortBy = 'deadline_asc' | 'progress_desc' | 'updated_desc';

export const GoalsPage: React.FC = () => {
  const {
    goals,
    sessions,
    settings,
    addGoal,
    updateGoal,
    incrementGoalProgress,
    setGoalProgress,
    toggleGoalComplete,
    toggleGoalMilestone,
    addGoalMilestone,
    deleteGoalMilestone,
    deleteGoal,
  } = useWorkspace();

  const navigate = useNavigate();
  const todayISO = getTodayISO();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<GoalStatusFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<GoalCategoryFilter>('all');
  const [sortBy, setSortBy] = useState<GoalSortBy>('deadline_asc');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<ProductivityGoal | null>(null);
  const [goalPendingDelete, setGoalPendingDelete] = useState<ProductivityGoal | null>(null);

  const todayFocusMinutes = useMemo(
    () =>
      sessions
        .filter(
          (s) =>
            s.date === todayISO &&
            s.completed &&
            (s.mode === 'focus' || s.mode === 'deep')
        )
        .reduce((sum, s) => sum + s.durationMinutes, 0),
    [sessions, todayISO]
  );

  const dailyFocusPct = Math.min(
    100,
    Math.round((todayFocusMinutes / Math.max(1, settings.dailyFocusGoalMinutes)) * 100)
  );

  const metrics = useMemo(() => {
    const activeGoals = goals.filter((g) => !g.completed);
    const completedGoals = goals.length - activeGoals.length;
    const avgPct =
      goals.length > 0
        ? Math.round(
            goals.reduce(
              (sum, g) => sum + Math.min(100, (g.currentValue / Math.max(1, g.targetValue)) * 100),
              0
            ) / goals.length
          )
        : 0;
    const totalMilestones = goals.reduce((sum, g) => sum + g.milestones.length, 0);
    const completedMilestones = goals.reduce(
      (sum, g) => sum + g.milestones.filter((m) => m.completed).length,
      0
    );
    const dueSoonCount = activeGoals.filter((g) => {
      const diff = getDaysUntilISO(g.deadline, todayISO);
      return diff <= 7;
    }).length;

    return {
      activeCount: activeGoals.length,
      completedCount: completedGoals,
      avgPct,
      totalMilestones,
      completedMilestones,
      dueSoonCount,
    };
  }, [goals, todayISO]);

  const filteredGoals = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return goals
      .filter((g) => {
        if (statusFilter === 'active') return !g.completed;
        if (statusFilter === 'completed') return g.completed;
        if (statusFilter === 'overdue') {
          return !g.completed && getDaysUntilISO(g.deadline, todayISO) < 0;
        }
        return true;
      })
      .filter((g) => (categoryFilter === 'all' ? true : g.category === categoryFilter))
      .filter((g) => {
        if (!q) return true;
        return (
          g.title.toLowerCase().includes(q) ||
          g.description.toLowerCase().includes(q) ||
          g.category.toLowerCase().includes(q) ||
          g.milestones.some((m) => m.title.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => {
        if (sortBy === 'deadline_asc') {
          if (a.completed !== b.completed) return a.completed ? 1 : -1;
          return a.deadline.localeCompare(b.deadline);
        }
        if (sortBy === 'progress_desc') {
          const pctA = a.currentValue / Math.max(1, a.targetValue);
          const pctB = b.currentValue / Math.max(1, b.targetValue);
          return pctB - pctA;
        }
        return Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
      });
  }, [goals, searchQuery, statusFilter, categoryFilter, sortBy, todayISO]);

  const hasActiveFilters =
    searchQuery.trim().length > 0 || statusFilter !== 'all' || categoryFilter !== 'all';

  const resetFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setCategoryFilter('all');
  };

  return (
    <PageTransition className="space-y-6">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-purple-600 dark:text-cyan-400">
            Long-term targets, milestone checklists, and live progress rings
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-950 dark:text-white mt-1">
            Goals &amp; Milestones
          </h1>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <GlowButton
            variant="secondary"
            size="sm"
            onClick={() => navigate('/calendar')}
          >
            <CalendarDays className="w-4 h-4 text-purple-600 dark:text-cyan-400" />
            <span>View Deadlines</span>
          </GlowButton>
          <GlowButton
            variant="primary"
            size="sm"
            onClick={() => {
              setEditingGoal(null);
              setModalOpen(true);
            }}
          >
            <Plus className="w-4 h-4" />
            <span>New Goal</span>
          </GlowButton>
        </div>
      </div>

      {/* 4-Column Overview KPI Strip */}
      <GlassCard
        as="section"
        aria-label="Goals overview"
        className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 divide-x divide-slate-200/70 dark:divide-slate-700/40 overflow-hidden"
      >
        <div className="p-4 sm:p-5">
          <p className="text-xs text-slate-500 dark:text-slate-400">Active Goals</p>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-semibold tabular-nums nx-gradient-text">
              {metrics.activeCount}
            </span>
            <span className="font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
              / {goals.length} total
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            {metrics.completedCount} completed
          </p>
        </div>

        <div className="p-4 sm:p-5">
          <p className="text-xs text-slate-500 dark:text-slate-400">Average Completion</p>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-semibold tabular-nums text-slate-950 dark:text-white">
              {metrics.avgPct}%
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">across goals</span>
          </div>
          <div className="mt-3 h-1.5 w-full rounded-full bg-slate-900/10 dark:bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full nx-gradient-primary transition-all duration-300"
              style={{ width: `${metrics.avgPct}%` }}
            />
          </div>
        </div>

        <div className="p-4 sm:p-5">
          <p className="text-xs text-slate-500 dark:text-slate-400">Milestones Done</p>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-semibold tabular-nums text-slate-950 dark:text-white">
              {metrics.completedMilestones}
            </span>
            <span className="font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
              / {metrics.totalMilestones}
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            {metrics.totalMilestones > 0
              ? `${Math.round((metrics.completedMilestones / metrics.totalMilestones) * 100)}% milestone rate`
              : 'Add milestones inside any goal'}
          </p>
        </div>

        <div className="p-4 sm:p-5">
          <p className="text-xs text-slate-500 dark:text-slate-400">Due Within 7 Days</p>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-semibold tabular-nums text-amber-700 dark:text-amber-300">
              {metrics.dueSoonCount}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">approaching</span>
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Synced to Calendar deadlines
          </p>
        </div>
      </GlassCard>

      {/* Pinned Daily Focus Target Strip */}
      <GlassCard variant="spotlight" className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <ProgressRing
            percent={dailyFocusPct}
            size={64}
            strokeWidth={5.5}
            status={dailyFocusPct >= 100 ? 'completed' : 'active'}
            label={`Daily focus target ${dailyFocusPct}% complete`}
          />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-purple-600 dark:text-cyan-300">
              Daily Focus Target
            </p>
            <h2 className="font-display text-base sm:text-lg font-semibold text-slate-950 dark:text-white mt-0.5">
              {formatDurationCompact(todayFocusMinutes)} logged of{' '}
              {formatDurationCompact(settings.dailyFocusGoalMinutes)} goal
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Automatically updated whenever you log a Focus or Deep Work cycle
            </p>
          </div>
        </div>
        <GlowButton variant="primary" size="sm" onClick={() => navigate('/focus')}>
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>Start Focus Cycle</span>
        </GlowButton>
      </GlassCard>

      {/* Search, Filter & Sort Toolbar */}
      <GlassCard className="p-3.5 sm:p-4 space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2.5">
          <div className="relative flex-1 min-w-0">
            <Search
              className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search goals, descriptions, or milestones..."
              aria-label="Search goals"
              className="w-full min-h-[42px] pl-10 pr-9 rounded-xl nx-input text-sm"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Filter by category"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as GoalCategoryFilter)}
              className="min-h-[42px] px-3 rounded-xl nx-input text-xs font-medium"
            >
              <option value="all">All Categories</option>
              <option value="Deep Work">Deep Work</option>
              <option value="Planning">Planning</option>
              <option value="Admin">Admin</option>
              <option value="Personal">Personal</option>
            </select>

            <select
              aria-label="Sort goals"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as GoalSortBy)}
              className="min-h-[42px] px-3 rounded-xl nx-input text-xs font-medium"
            >
              <option value="deadline_asc">Target Date</option>
              <option value="progress_desc">Highest Progress</option>
              <option value="updated_desc">Recently Updated</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t nx-divider">
          <SegmentedControl
            ariaLabel="Filter goals by status"
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: 'all', label: 'All' },
              { value: 'active', label: 'Active' },
              { value: 'completed', label: 'Completed' },
              { value: 'overdue', label: 'Overdue' },
            ]}
          />

          <div className="flex items-center gap-2 text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
            <span>
              {filteredGoals.length} of {goals.length}
            </span>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="font-sans text-xs font-medium text-purple-600 dark:text-cyan-400 hover:underline inline-flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
            )}
          </div>
        </div>
      </GlassCard>

      {/* Goals Grid / Empty States */}
      {goals.length === 0 ? (
        <GlassCard className="p-10 text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-2xl nx-glass-elevated flex items-center justify-center text-purple-600 dark:text-cyan-400">
            <Target className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="font-display text-lg font-semibold text-slate-950 dark:text-white">
              Set your first measurable goal
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
              Break big outcomes into target dates, numeric targets, and step-by-step milestone checklists.
            </p>
          </div>
          <GlowButton
            variant="primary"
            onClick={() => {
              setEditingGoal(null);
              setModalOpen(true);
            }}
          >
            <Plus className="w-4 h-4" />
            <span>Create Goal</span>
          </GlowButton>
        </GlassCard>
      ) : filteredGoals.length === 0 ? (
        <GlassCard className="p-10 text-center space-y-3">
          <h2 className="font-display text-base font-semibold text-slate-950 dark:text-white">
            No goals match your active filters
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Reset filters or create a new goal targeting this category.
          </p>
          <div className="pt-1 flex items-center justify-center gap-2.5">
            <GlowButton variant="secondary" size="sm" onClick={resetFilters}>
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </GlowButton>
            <GlowButton
              variant="primary"
              size="sm"
              onClick={() => {
                setEditingGoal(null);
                setModalOpen(true);
              }}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Goal</span>
            </GlowButton>
          </div>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-start">
          {filteredGoals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onEdit={(g) => {
                setEditingGoal(g);
                setModalOpen(true);
              }}
              onRequestDelete={setGoalPendingDelete}
              onToggleComplete={toggleGoalComplete}
              onStepProgress={(id, delta) => incrementGoalProgress(id, delta)}
              onSetProgress={setGoalProgress}
              onToggleMilestone={toggleGoalMilestone}
              onAddMilestone={addGoalMilestone}
              onDeleteMilestone={deleteGoalMilestone}
            />
          ))}
        </div>
      )}

      {/* Goal Creation & Editing Drawer */}
      <GoalFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editingGoal={editingGoal}
        onSave={(input, existingId) => {
          if (existingId) {
            updateGoal(existingId, input);
          } else {
            addGoal(input);
          }
        }}
        onDelete={(id) => {
          const target = goals.find((g) => g.id === id) ?? null;
          setModalOpen(false);
          if (target) setGoalPendingDelete(target);
        }}
      />

      {/* Safe Deletion Dialog */}
      <ConfirmDialog
        open={Boolean(goalPendingDelete)}
        title="Delete this goal?"
        description={
          goalPendingDelete
            ? `"${goalPendingDelete.title}" and its ${goalPendingDelete.milestones.length} milestones will be permanently removed.`
            : ''
        }
        confirmLabel="Delete Goal"
        cancelLabel="Cancel"
        tone="danger"
        onConfirm={() => {
          if (goalPendingDelete) {
            deleteGoal(goalPendingDelete.id);
            setGoalPendingDelete(null);
          }
        }}
        onCancel={() => setGoalPendingDelete(null)}
      />
    </PageTransition>
  );
};
