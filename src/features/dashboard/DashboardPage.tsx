import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CalendarClock,
  CalendarPlus,
  Check,
  CheckCircle2,
  Clock,
  Pencil,
  Play,
  Plus,
  Target,
  Trash2,
  X,
} from 'lucide-react';
import { useWorkspace } from '../../store/WorkspaceContext';
import { useAuth } from '../../store/AuthContext';
import {
  calculateFocusStreak,
  formatClockSeconds,
  formatDurationCompact,
  formatLongDate,
  formatTimeRange,
  getCurrentMinuteOfDay,
  getTimeOfDayGreeting,
  getTodayISO,
} from '../../utils/date';
import { PlannerTask, ProductivityGoal, TimeBlock } from '../../types/productivity';
import { GlassCard } from '../../components/ui/GlassCard';
import { GlowButton } from '../../components/ui/GlowButton';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { PageTransition } from '../../components/ui/PageTransition';
import { TaskFormModal } from '../../components/planner/TaskFormModal';
import { TimeBlockFormModal } from '../../components/planner/TimeBlockFormModal';
import { GoalFormModal } from '../../components/dashboard/GoalFormModal';
import { ProductivityCharts } from '../../components/dashboard/ProductivityCharts';
import { ActiveGoalsWidget } from '../../components/dashboard/ActiveGoalsWidget';
import { RecentActivityWidget } from '../../components/dashboard/RecentActivityWidget';

const PRIORITY_TEXT: Record<PlannerTask['priority'], { label: string; className: string }> = {
  high: { label: 'High priority', className: 'text-rose-600 dark:text-rose-400' },
  medium: { label: 'Medium', className: 'text-amber-700 dark:text-amber-300' },
  low: { label: 'Low', className: 'text-slate-500 dark:text-slate-400' },
};

const BLOCK_STATUS_LABEL: Record<TimeBlock['status'], { label: string; className: string }> = {
  scheduled: { label: 'Scheduled', className: 'text-slate-500 dark:text-slate-400' },
  'in-progress': { label: 'In progress', className: 'text-purple-600 dark:text-cyan-300' },
  completed: { label: 'Completed', className: 'text-emerald-600 dark:text-emerald-400' },
};

export const DashboardPage: React.FC = () => {
  const {
    tasks,
    timeBlocks,
    sessions,
    goals,
    activities,
    settings,
    timer,
    addTask,
    updateTask,
    toggleTaskComplete,
    deleteTask,
    addTimeBlock,
    updateTimeBlock,
    setTimeBlockStatus,
    deleteTimeBlock,
    addGoal,
    updateGoal,
    incrementGoalProgress,
    toggleGoalComplete,
    deleteGoal,
    launchFocusForItem,
    clearAllData,
  } = useWorkspace();

  const { user } = useAuth();
  const navigate = useNavigate();
  const todayISO = getTodayISO();
  const firstName = user?.displayName?.trim().split(/\s+/)[0] ?? '';
  const greeting = getTimeOfDayGreeting();
  const isTimerActive = timer.status === 'running' || timer.status === 'paused';

  const [quickTaskTitle, setQuickTaskTitle] = useState('');
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<PlannerTask | null>(null);
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<TimeBlock | null>(null);
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<ProductivityGoal | null>(null);
  const [confirmClearStarter, setConfirmClearStarter] = useState(false);
  const [starterNoticeDismissed, setStarterNoticeDismissed] = useState<boolean>(() => {
    try {
      return window.localStorage.getItem('nexora_starter_notice_dismissed') === '1';
    } catch {
      return false;
    }
  });

  const hasStarterSeedData = useMemo(
    () =>
      tasks.some((t) => /^task_[1-6]$/.test(t.id)) ||
      goals.some((g) => /^goal_[1-4]$/.test(g.id)),
    [tasks, goals]
  );

  const dismissStarterNotice = () => {
    setStarterNoticeDismissed(true);
    try {
      window.localStorage.setItem('nexora_starter_notice_dismissed', '1');
    } catch {
      // Ignore storage failures
    }
  };

  // Derived real workspace state metrics
  const totalTasksCount = tasks.length;
  const completedTasksCount = useMemo(
    () => tasks.filter((t) => t.completed).length,
    [tasks]
  );
  const taskCompletionPct =
    totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

  const todayTasks = useMemo(() => {
    const order = { high: 0, medium: 1, low: 2 };
    return tasks
      .filter((t) => t.date === todayISO)
      .sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        return order[a.priority] - order[b.priority];
      });
  }, [tasks, todayISO]);

  const todayOpenTasksCount = todayTasks.filter((t) => !t.completed).length;

  const todayBlocks = useMemo(
    () =>
      timeBlocks
        .filter((b) => b.date === todayISO)
        .sort((a, b) => a.startMinute - b.startMinute),
    [timeBlocks, todayISO]
  );

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

  const activeGoalsCount = useMemo(
    () => goals.filter((g) => !g.completed).length,
    [goals]
  );
  const completedGoalsCount = goals.length - activeGoalsCount;
  const streakDays = useMemo(() => calculateFocusStreak(sessions), [sessions]);
  const dailyGoalPct = Math.min(
    100,
    Math.round((todayFocusMinutes / Math.max(1, settings.dailyFocusGoalMinutes)) * 100)
  );

  const spotlightBlock = useMemo(() => {
    const inProgress = todayBlocks.find((b) => b.status === 'in-progress');
    if (inProgress) return inProgress;
    const nowMin = getCurrentMinuteOfDay();
    const upcoming = todayBlocks.find(
      (b) => b.status !== 'completed' && b.startMinute + b.durationMinutes >= nowMin
    );
    return upcoming ?? todayBlocks.find((b) => b.status !== 'completed') ?? null;
  }, [todayBlocks]);

  const handleQuickAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = quickTaskTitle.trim();
    if (!trimmed) return;
    addTask({
      title: trimmed,
      notes: '',
      date: todayISO,
      priority: 'medium',
      category: 'Deep Work',
      estimatedMinutes: settings.focusMinutes,
    });
    setQuickTaskTitle('');
  };

  const handleStartFocusOnBlock = (block: TimeBlock) => {
    launchFocusForItem({
      blockId: block.id,
      taskId: block.linkedTaskId,
      minutes: Math.min(
        block.durationMinutes,
        block.durationMinutes >= 50 ? settings.deepWorkMinutes : settings.focusMinutes
      ),
      intention: block.notes || block.title,
    });
    navigate('/focus');
  };

  const handleStartFocusOnTask = (task: PlannerTask) => {
    launchFocusForItem({
      taskId: task.id,
      blockId: null,
      minutes: task.estimatedMinutes,
      intention: task.title,
    });
    navigate('/focus');
  };

  return (
    <PageTransition className="space-y-6">
      {/* 1. Personalized Greeting Header */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-purple-600 dark:text-cyan-400">
              {formatLongDate(todayISO)}
              {user?.isAnonymous ? ' · Local Guest' : user?.role ? ` · ${user.role}` : ''}
            </p>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-950 dark:text-white mt-1 text-balance">
              {user && !user.isAnonymous && firstName
                ? `${greeting}, ${firstName}`
                : `${greeting} — Welcome to NEXORA`}
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              <span className="font-mono tabular-nums font-medium text-slate-900 dark:text-slate-200">
                {todayOpenTasksCount}
              </span>{' '}
              open {todayOpenTasksCount === 1 ? 'task' : 'tasks'} today ·{' '}
              <span className="font-mono tabular-nums font-medium text-slate-900 dark:text-slate-200">
                {activeGoalsCount}
              </span>{' '}
              active {activeGoalsCount === 1 ? 'goal' : 'goals'} ·{' '}
              <span className="font-mono tabular-nums font-medium text-purple-600 dark:text-cyan-300">
                {dailyGoalPct}%
              </span>{' '}
              of daily focus target
            </p>
          </div>
        </div>

        {/* 2. Inline Quick Action Bar */}
        <GlassCard
          as="div"
          aria-label="Quick actions"
          className="px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2.5"
        >
          <div className="flex flex-wrap items-center gap-2">
            <GlowButton
              variant="primary"
              size="sm"
              onClick={() => navigate('/focus')}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>
                {isTimerActive
                  ? `Resume ${formatClockSeconds(timer.remainingSeconds)}`
                  : 'Start Focus'}
              </span>
            </GlowButton>

            <GlowButton
              variant="secondary"
              size="sm"
              onClick={() => {
                setEditingTask(null);
                setTaskModalOpen(true);
              }}
            >
              <Plus className="w-3.5 h-3.5 text-purple-600 dark:text-cyan-400" />
              <span>New Task</span>
            </GlowButton>

            <GlowButton
              variant="secondary"
              size="sm"
              onClick={() => {
                setEditingBlock(null);
                setBlockModalOpen(true);
              }}
            >
              <CalendarPlus className="w-3.5 h-3.5 text-purple-600 dark:text-cyan-400" />
              <span>Schedule Block</span>
            </GlowButton>

            <GlowButton
              variant="secondary"
              size="sm"
              onClick={() => {
                setEditingGoal(null);
                setGoalModalOpen(true);
              }}
            >
              <Target className="w-3.5 h-3.5 text-purple-600 dark:text-cyan-400" />
              <span>New Goal</span>
            </GlowButton>
          </div>

          <button
            type="button"
            onClick={() => navigate('/calendar')}
            className="min-h-[38px] px-3 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-purple-600 dark:hover:text-cyan-300 hover:bg-slate-900/5 dark:hover:bg-white/5 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
          >
            <CalendarClock className="w-3.5 h-3.5" />
            <span>Open Calendar</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </GlassCard>

        {hasStarterSeedData && !starterNoticeDismissed && (
          <GlassCard
            as="div"
            className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Curated starter workspace is loaded so you can explore live analytics, calendar
              schedules, and goals right away.
            </p>
            <div className="flex items-center gap-2 shrink-0">
              <GlowButton
                variant="secondary"
                size="sm"
                onClick={() => setConfirmClearStarter(true)}
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />
                <span>Clear Starter Data</span>
              </GlowButton>
              <button
                type="button"
                onClick={dismissStarterNotice}
                aria-label="Dismiss starter workspace notice"
                className="min-h-[38px] min-w-[38px] rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-900/5 dark:hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </GlassCard>
        )}
      </section>

      {/* 3. Overview Statistics Strip (Total Tasks, Completed Tasks, Active Goals, Focus Logged) */}
      <GlassCard
        as="section"
        aria-label="Overview statistics"
        className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 divide-x divide-slate-200/70 dark:divide-slate-700/40 overflow-hidden"
      >
        <div className="p-4 sm:p-5">
          <p className="text-xs text-slate-500 dark:text-slate-400">Total Tasks</p>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-semibold tabular-nums text-slate-950 dark:text-white">
              {totalTasksCount}
            </span>
            <span className="font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
              workspace
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-mono tabular-nums text-slate-700 dark:text-slate-300">
              {todayTasks.length}
            </span>{' '}
            scheduled for today
          </p>
        </div>

        <div className="p-4 sm:p-5">
          <p className="text-xs text-slate-500 dark:text-slate-400">Completed Tasks</p>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-semibold tabular-nums text-slate-950 dark:text-white">
              {completedTasksCount}
            </span>
            <span className="font-mono text-xs tabular-nums text-emerald-600 dark:text-emerald-400">
              {taskCompletionPct}%
            </span>
          </div>
          <div className="mt-3 h-1.5 w-full rounded-full bg-slate-900/10 dark:bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${taskCompletionPct}%` }}
            />
          </div>
        </div>

        <div className="p-4 sm:p-5">
          <p className="text-xs text-slate-500 dark:text-slate-400">Active Goals</p>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-semibold tabular-nums nx-gradient-text">
              {activeGoalsCount}
            </span>
            <span className="font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
              / {goals.length} custom
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            {completedGoalsCount} achieved · daily target {dailyGoalPct}%
          </p>
        </div>

        <div className="p-4 sm:p-5">
          <p className="text-xs text-slate-500 dark:text-slate-400">Focus Logged</p>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-semibold tabular-nums text-slate-950 dark:text-white">
              {formatDurationCompact(todayFocusMinutes)}
            </span>
            <span className="font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
              / {formatDurationCompact(settings.dailyFocusGoalMinutes)}
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-mono tabular-nums text-purple-600 dark:text-cyan-300 font-medium">
              {streakDays}d
            </span>{' '}
            active focus streak
          </p>
        </div>
      </GlassCard>

      {/* 4. Productivity Charts (7-Day Focus Trend + Category Breakdown) */}
      <ProductivityCharts
        sessions={sessions}
        tasks={tasks}
        dailyFocusGoalMinutes={settings.dailyFocusGoalMinutes}
      />

      {/* 5. Core Execution & Tracking Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Today's Schedule + Priority Tasks */}
        <div className="lg:col-span-7 space-y-6">
          {/* Active / Up Next Spotlight */}
          <GlassCard variant="spotlight" interactive className="p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold nx-gradient-text">
                {spotlightBlock
                  ? spotlightBlock.status === 'in-progress'
                    ? 'Active Time Block'
                    : 'Up Next on Today’s Schedule'
                  : 'Open Focus Window'}
              </p>
              {spotlightBlock && (
                <span className="font-mono text-xs tabular-nums text-slate-600 dark:text-cyan-300">
                  {formatTimeRange(spotlightBlock.startMinute, spotlightBlock.durationMinutes)}
                </span>
              )}
            </div>

            {spotlightBlock ? (
              <>
                <h2 className="font-display text-lg sm:text-xl font-semibold text-slate-950 dark:text-white mt-2">
                  {spotlightBlock.title}
                </h2>
                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                  <span>{spotlightBlock.category}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">{spotlightBlock.durationMinutes} min</span>
                  <span aria-hidden="true">·</span>
                  <span className={BLOCK_STATUS_LABEL[spotlightBlock.status].className}>
                    {BLOCK_STATUS_LABEL[spotlightBlock.status].label}
                  </span>
                </div>
                {spotlightBlock.notes && (
                  <p className="mt-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    {spotlightBlock.notes}
                  </p>
                )}

                <div className="mt-5 flex flex-wrap items-center gap-2.5">
                  <GlowButton
                    variant="primary"
                    size="sm"
                    onClick={() => handleStartFocusOnBlock(spotlightBlock)}
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Launch Focus</span>
                  </GlowButton>
                  <GlowButton
                    variant="secondary"
                    size="sm"
                    onClick={() => setTimeBlockStatus(spotlightBlock.id, 'completed')}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Mark Complete</span>
                  </GlowButton>
                </div>
              </>
            ) : (
              <div className="mt-2">
                <h2 className="font-display text-lg font-semibold text-slate-950 dark:text-white">
                  All scheduled blocks are clear
                </h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  Start an unscheduled deep work cycle or schedule a new block for today.
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-2.5">
                  <GlowButton variant="primary" size="sm" onClick={() => navigate('/focus')}>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Open Focus Studio</span>
                  </GlowButton>
                  <GlowButton
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setEditingBlock(null);
                      setBlockModalOpen(true);
                    }}
                  >
                    Schedule Block
                  </GlowButton>
                </div>
              </div>
            )}
          </GlassCard>

          {/* Today's Schedule */}
          <GlassCard as="section" className="overflow-hidden">
            <div className="px-5 py-4 border-b nx-divider flex items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-base font-semibold text-slate-950 dark:text-white">
                  Today&apos;s Schedule
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Chronological time blocks linked directly to your focus timer
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/calendar')}
                className="min-h-[36px] px-2.5 rounded-lg text-xs font-medium text-purple-600 dark:text-cyan-400 hover:bg-purple-500/10 dark:hover:bg-cyan-400/10 inline-flex items-center gap-1 whitespace-nowrap shrink-0 transition-colors"
              >
                <span>Full Calendar</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {todayBlocks.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <Clock className="w-6 h-6 mx-auto text-slate-400 dark:text-slate-500" />
                <p className="mt-2.5 text-sm font-medium text-slate-800 dark:text-slate-200">
                  No time blocks scheduled for today
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Reserve dedicated focus windows to protect your top outcomes.
                </p>
                <div className="mt-4">
                  <GlowButton
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setEditingBlock(null);
                      setBlockModalOpen(true);
                    }}
                  >
                    Schedule First Block
                  </GlowButton>
                </div>
              </div>
            ) : (
              <ul className="divide-y divide-slate-200/60 dark:divide-slate-800/70">
                {todayBlocks.map((block) => {
                  const statusMeta = BLOCK_STATUS_LABEL[block.status];
                  const done = block.status === 'completed';
                  return (
                    <li
                      key={block.id}
                      className="px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-white/50 dark:hover:bg-white/[0.04] transition-colors"
                    >
                      <div className="flex items-start gap-3.5 min-w-0">
                        <div className="w-24 shrink-0 pt-0.5">
                          <span className="font-mono text-xs tabular-nums text-slate-600 dark:text-slate-400">
                            {formatTimeRange(block.startMinute, block.durationMinutes)}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p
                            className={`text-sm font-medium truncate ${
                              done
                                ? 'line-through text-slate-400 dark:text-slate-500'
                                : 'text-slate-950 dark:text-slate-100'
                            }`}
                          >
                            {block.title}
                          </p>
                          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                            <span>{block.category}</span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono tabular-nums">{block.durationMinutes}m</span>
                            <span aria-hidden="true">·</span>
                            <span className={statusMeta.className}>{statusMeta.label}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {!done && (
                          <button
                            type="button"
                            onClick={() => handleStartFocusOnBlock(block)}
                            aria-label={`Start focus for ${block.title}`}
                            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-purple-600 dark:text-cyan-400 hover:bg-purple-500/10 dark:hover:bg-cyan-400/10 transition-colors"
                          >
                            <Play className="w-4 h-4 fill-current" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setEditingBlock(block);
                            setBlockModalOpen(true);
                          }}
                          aria-label={`Edit ${block.title}`}
                          className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-900/5 dark:hover:bg-white/10 transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </GlassCard>

          {/* Today's Priority Tasks + Quick Capture */}
          <GlassCard as="section" className="overflow-hidden">
            <div className="px-5 py-4 border-b nx-divider flex items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-base font-semibold text-slate-950 dark:text-white">
                  Today&apos;s Priorities
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Check off completed outcomes or manage all tasks
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/tasks')}
                className="min-h-[36px] px-2.5 rounded-lg text-xs font-medium text-purple-600 dark:text-cyan-400 hover:bg-purple-500/10 dark:hover:bg-cyan-400/10 inline-flex items-center gap-1 whitespace-nowrap shrink-0 transition-colors"
              >
                <span>All Tasks</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <form
              onSubmit={handleQuickAddTask}
              className="px-4 py-3 border-b nx-divider flex items-center gap-2"
            >
              <input
                type="text"
                value={quickTaskTitle}
                onChange={(e) => setQuickTaskTitle(e.target.value)}
                placeholder="Quick capture a task for today..."
                aria-label="Quick capture task for today"
                className="flex-1 min-h-[42px] px-3.5 py-2 text-sm rounded-xl nx-input placeholder:text-slate-400"
              />
              <GlowButton
                type="submit"
                variant="primary"
                size="sm"
                disabled={!quickTaskTitle.trim()}
                aria-label="Add task"
              >
                Add
              </GlowButton>
            </form>

            {todayTasks.length === 0 ? (
              <div className="px-5 py-9 text-center">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                  No tasks queued for today
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Use quick capture above to add your next deliverable.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-200/60 dark:divide-slate-800/70">
                {todayTasks.map((task) => {
                  const prio = PRIORITY_TEXT[task.priority];
                  return (
                    <li
                      key={task.id}
                      className="px-4 py-3 flex items-center justify-between gap-2 hover:bg-white/50 dark:hover:bg-white/[0.04] transition-colors"
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <button
                          type="button"
                          onClick={() => toggleTaskComplete(task.id)}
                          aria-label={
                            task.completed
                              ? `Mark ${task.title} incomplete`
                              : `Mark ${task.title} complete`
                          }
                          className="min-h-[44px] min-w-[44px] -ml-2 -my-1.5 flex items-center justify-center shrink-0"
                        >
                          <span
                            className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                              task.completed
                                ? 'bg-emerald-500 border-emerald-500 text-white shadow-xs'
                                : 'border-slate-300 dark:border-slate-600 bg-white/70 dark:bg-slate-900/70'
                            }`}
                          >
                            {task.completed && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setEditingTask(task);
                            setTaskModalOpen(true);
                          }}
                          className="text-left min-w-0 py-0.5"
                        >
                          <p
                            className={`text-sm font-medium leading-snug ${
                              task.completed
                                ? 'line-through text-slate-400 dark:text-slate-500'
                                : 'text-slate-950 dark:text-slate-100'
                            }`}
                          >
                            {task.title}
                          </p>
                          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                            <span className={prio.className}>{prio.label}</span>
                            <span aria-hidden="true">·</span>
                            <span>{task.category}</span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono tabular-nums">{task.estimatedMinutes}m</span>
                          </div>
                        </button>
                      </div>

                      {!task.completed && (
                        <button
                          type="button"
                          onClick={() => handleStartFocusOnTask(task)}
                          aria-label={`Focus on ${task.title}`}
                          className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-slate-500 hover:text-purple-600 dark:text-slate-400 dark:hover:text-cyan-400 hover:bg-purple-500/10 dark:hover:bg-cyan-400/10 transition-colors shrink-0"
                        >
                          <Play className="w-4 h-4 fill-current" />
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </GlassCard>
        </div>

        {/* Right Column: Active Goals + Recent Activity */}
        <div className="lg:col-span-5 space-y-6">
          <ActiveGoalsWidget
            goals={goals}
            todayFocusMinutes={todayFocusMinutes}
            dailyFocusGoalMinutes={settings.dailyFocusGoalMinutes}
            onAddGoal={() => {
              setEditingGoal(null);
              setGoalModalOpen(true);
            }}
            onEditGoal={(goal) => {
              setEditingGoal(goal);
              setGoalModalOpen(true);
            }}
            onIncrementGoal={(id) => incrementGoalProgress(id, 1)}
            onToggleComplete={toggleGoalComplete}
            onOpenFocus={() => navigate('/focus')}
            onViewAllGoals={() => navigate('/goals')}
          />

          <RecentActivityWidget activities={activities} maxItems={7} />
        </div>
      </div>

      {/* Connected Modals */}
      <TaskFormModal
        open={taskModalOpen}
        onClose={() => setTaskModalOpen(false)}
        defaultDate={todayISO}
        editingTask={editingTask}
        onSave={(input, existingId) => {
          if (existingId) {
            updateTask(existingId, input);
          } else {
            addTask(input);
          }
        }}
        onDelete={deleteTask}
      />

      <TimeBlockFormModal
        open={blockModalOpen}
        onClose={() => setBlockModalOpen(false)}
        defaultDate={todayISO}
        editingBlock={editingBlock}
        availableTasks={todayTasks.filter((t) => !t.completed)}
        existingBlocks={timeBlocks}
        onSave={(input, existingId) => {
          if (existingId) {
            updateTimeBlock(existingId, input);
          } else {
            addTimeBlock(input);
          }
        }}
        onDelete={deleteTimeBlock}
      />

      <GoalFormModal
        open={goalModalOpen}
        onClose={() => setGoalModalOpen(false)}
        editingGoal={editingGoal}
        onSave={(input, existingId) => {
          if (existingId) {
            updateGoal(existingId, input);
          } else {
            addGoal(input);
          }
        }}
        onDelete={deleteGoal}
      />

      <ConfirmDialog
        open={confirmClearStarter}
        title="Clear starter workspace data?"
        description="Start with a completely clean workspace by removing the starter tasks, notes, goals, calendar events, time blocks, and sample focus sessions."
        detail="A local safety restore point will be saved automatically in Settings → Data & Backups so you can undo anytime."
        confirmLabel="Clear Starter Data"
        tone="danger"
        onCancel={() => setConfirmClearStarter(false)}
        onConfirm={() => {
          clearAllData();
          dismissStarterNotice();
          setConfirmClearStarter(false);
        }}
      />
    </PageTransition>
  );
};
