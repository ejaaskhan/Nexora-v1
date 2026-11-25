import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckSquare,
  LayoutGrid,
  List,
  Plus,
  RotateCcw,
  Search,
  X,
} from 'lucide-react';
import { useWorkspace } from '../../store/WorkspaceContext';
import { PlannerTask, TaskCategory, TaskPriority, TimeBlock } from '../../types/productivity';
import { getDeadlineStatus, getTodayISO, isTaskOverdue } from '../../utils/date';
import { GlassCard } from '../../components/ui/GlassCard';
import { GlowButton } from '../../components/ui/GlowButton';
import { PageTransition } from '../../components/ui/PageTransition';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { TaskFormModal } from '../../components/planner/TaskFormModal';
import { TimeBlockFormModal } from '../../components/planner/TimeBlockFormModal';
import { TaskCard } from '../../components/tasks/TaskCard';

type StatusFilter = 'all' | 'active' | 'completed' | 'overdue';
type PriorityFilter = 'all' | TaskPriority;
type CategoryFilter = 'all' | TaskCategory;
type DeadlineFilter = 'all' | 'overdue' | 'today' | 'upcoming';
type SortOption = 'smart' | 'deadline' | 'newest' | 'duration';
type LayoutMode = 'grid' | 'list';

const PRIORITY_WEIGHT: Record<TaskPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

export const TasksPage: React.FC = () => {
  const {
    tasks,
    timeBlocks,
    addTask,
    updateTask,
    toggleTaskComplete,
    toggleTaskSubtask,
    deleteTask,
    addTimeBlock,
    updateTimeBlock,
    deleteTimeBlock,
    launchFocusForItem,
  } = useWorkspace();

  const navigate = useNavigate();
  const todayISO = getTodayISO();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [deadlineFilter, setDeadlineFilter] = useState<DeadlineFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('smart');
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('grid');

  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<PlannerTask | null>(null);
  const [pendingDeleteTask, setPendingDeleteTask] = useState<PlannerTask | null>(null);
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [scheduleBlockDraft, setScheduleBlockDraft] = useState<TimeBlock | null>(null);

  // Live Task Summary Metrics
  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.completed).length;
    const active = total - completed;
    const overdue = tasks.filter((t) => isTaskOverdue(t.date, t.dueTime, t.completed)).length;
    const highPriorityOpen = tasks.filter((t) => !t.completed && t.priority === 'high').length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, active, overdue, highPriorityOpen, completionRate };
  }, [tasks]);

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    statusFilter !== 'all' ||
    priorityFilter !== 'all' ||
    categoryFilter !== 'all' ||
    deadlineFilter !== 'all';

  const resetFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setPriorityFilter('all');
    setCategoryFilter('all');
    setDeadlineFilter('all');
  };

  // Search, Multi-Criteria Filter & Sort Pipeline
  const filteredTasks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return tasks
      .filter((task) => {
        if (statusFilter === 'active') return !task.completed;
        if (statusFilter === 'completed') return task.completed;
        if (statusFilter === 'overdue') return isTaskOverdue(task.date, task.dueTime, task.completed);
        return true;
      })
      .filter((task) => (priorityFilter === 'all' ? true : task.priority === priorityFilter))
      .filter((task) => (categoryFilter === 'all' ? true : task.category === categoryFilter))
      .filter((task) => {
        if (deadlineFilter === 'all') return true;
        const dStatus = getDeadlineStatus(task.date, task.dueTime, task.completed);
        if (deadlineFilter === 'overdue') return dStatus === 'overdue';
        if (deadlineFilter === 'today') return task.date === todayISO;
        if (deadlineFilter === 'upcoming') return task.date > todayISO && !task.completed;
        return true;
      })
      .filter((task) => {
        if (!q) return true;
        const inTitle = task.title.toLowerCase().includes(q);
        const inNotes = task.notes.toLowerCase().includes(q);
        const inCategory = task.category.toLowerCase().includes(q);
        const inSubtasks = task.subtasks.some((s) => s.title.toLowerCase().includes(q));
        return inTitle || inNotes || inCategory || inSubtasks;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') {
          return b.createdAt.localeCompare(a.createdAt);
        }
        if (sortBy === 'duration') {
          if (a.completed !== b.completed) return a.completed ? 1 : -1;
          return b.estimatedMinutes - a.estimatedMinutes;
        }
        if (sortBy === 'deadline') {
          if (a.completed !== b.completed) return a.completed ? 1 : -1;
          const dateDiff = a.date.localeCompare(b.date);
          if (dateDiff !== 0) return dateDiff;
          return (a.dueTime ?? '23:59').localeCompare(b.dueTime ?? '23:59');
        }
        // Default: Smart Priority (Active -> Overdue -> Priority -> Earliest Deadline)
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        const aOverdue = isTaskOverdue(a.date, a.dueTime, a.completed);
        const bOverdue = isTaskOverdue(b.date, b.dueTime, b.completed);
        if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;
        const prioDiff = PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];
        if (prioDiff !== 0) return prioDiff;
        const dateDiff = a.date.localeCompare(b.date);
        if (dateDiff !== 0) return dateDiff;
        return (a.dueTime ?? '23:59').localeCompare(b.dueTime ?? '23:59');
      });
  }, [tasks, searchQuery, statusFilter, priorityFilter, categoryFilter, deadlineFilter, sortBy, todayISO]);

  const linkedBlockCountForPendingDelete = useMemo(() => {
    if (!pendingDeleteTask) return 0;
    return timeBlocks.filter((b) => b.linkedTaskId === pendingDeleteTask.id).length;
  }, [pendingDeleteTask, timeBlocks]);

  const handleOpenCreate = () => {
    setEditingTask(null);
    setTaskModalOpen(true);
  };

  const handleOpenEdit = (task: PlannerTask) => {
    setEditingTask(task);
    setTaskModalOpen(true);
  };

  const handleStartFocus = (task: PlannerTask) => {
    launchFocusForItem({
      taskId: task.id,
      blockId: null,
      minutes: task.estimatedMinutes,
      intention: task.title,
    });
    navigate('/focus');
  };

  const handleScheduleTask = (task: PlannerTask) => {
    const startMinute =
      task.dueTime && /^\d{2}:\d{2}$/.test(task.dueTime)
        ? Math.max(
            6 * 60,
            Math.min(
              22 * 60,
              Number(task.dueTime.split(':')[0]) * 60 + Number(task.dueTime.split(':')[1])
            )
          )
        : 10 * 60;

    setScheduleBlockDraft({
      id: '',
      date: task.date >= todayISO ? task.date : todayISO,
      title: task.title,
      category: task.category,
      startMinute,
      durationMinutes: Math.max(15, Math.min(180, task.estimatedMinutes)),
      linkedTaskId: task.id,
      status: 'scheduled',
      notes: task.notes,
    });
    setBlockModalOpen(true);
  };

  return (
    <PageTransition className="space-y-6">
      {/* Header */}
      <section className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-purple-600 dark:text-cyan-400">
            Local-first deliverables synced automatically with Dashboard analytics
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-950 dark:text-white mt-1 text-balance">
            Task Manager
          </h1>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <GlowButton variant="primary" size="sm" onClick={handleOpenCreate}>
            <Plus className="w-4 h-4" />
            <span>New Task</span>
          </GlowButton>
        </div>
      </section>

      {/* 4-Column Task Health Summary Strip */}
      <GlassCard
        as="section"
        aria-label="Task summary statistics"
        className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 divide-x divide-slate-200/70 dark:divide-slate-700/40 overflow-hidden"
      >
        <div className="p-4 sm:p-5">
          <p className="text-xs text-slate-500 dark:text-slate-400">Total Tasks</p>
          <p className="mt-1.5 font-mono text-2xl font-semibold tabular-nums text-slate-950 dark:text-white">
            {stats.total}
          </p>
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
            All workspace deliverables
          </p>
        </div>

        <div className="p-4 sm:p-5">
          <p className="text-xs text-slate-500 dark:text-slate-400">Active Queue</p>
          <p className="mt-1.5 font-mono text-2xl font-semibold tabular-nums text-slate-950 dark:text-white">
            {stats.active}
          </p>
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-mono tabular-nums text-rose-600 dark:text-rose-400">
              {stats.highPriorityOpen}
            </span>{' '}
            high priority
          </p>
        </div>

        <div className="p-4 sm:p-5">
          <p className="text-xs text-slate-500 dark:text-slate-400">Overdue</p>
          <p
            className={`mt-1.5 font-mono text-2xl font-semibold tabular-nums ${
              stats.overdue > 0
                ? 'text-rose-600 dark:text-rose-400'
                : 'text-slate-950 dark:text-white'
            }`}
          >
            {stats.overdue}
          </p>
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
            {stats.overdue > 0 ? 'Needs immediate attention' : 'All deadlines on track'}
          </p>
        </div>

        <div className="p-4 sm:p-5">
          <p className="text-xs text-slate-500 dark:text-slate-400">Completed</p>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-semibold tabular-nums text-slate-950 dark:text-white">
              {stats.completed}
            </span>
            <span className="font-mono text-xs tabular-nums text-emerald-600 dark:text-emerald-400">
              {stats.completionRate}%
            </span>
          </div>
          <div className="mt-2.5 h-1.5 w-full rounded-full bg-slate-900/10 dark:bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${stats.completionRate}%` }}
            />
          </div>
        </div>
      </GlassCard>

      {/* Search, Multi-Criteria Filter & Layout Toolbar */}
      <GlassCard as="section" aria-label="Search and filter tasks" className="p-4 space-y-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-lg">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks, notes, categories, or subtasks..."
              aria-label="Search tasks"
              className="w-full min-h-[44px] pl-10 pr-10 py-2 text-sm rounded-xl nx-input placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                className="min-h-[36px] min-w-[36px] absolute right-1 top-1/2 -translate-y-1/2 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Status Filter + Layout Toggle */}
          <div className="flex flex-wrap items-center justify-between lg:justify-end gap-2">
            <SegmentedControl
              ariaLabel="Filter by completion status"
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: 'all', label: 'All' },
                { value: 'active', label: 'Active' },
                { value: 'overdue', label: 'Overdue' },
                { value: 'completed', label: 'Done' },
              ]}
            />

            <div
              role="group"
              aria-label="Task view layout"
              className="inline-flex items-center p-1 rounded-xl nx-glass gap-0.5 shrink-0"
            >
              <button
                type="button"
                onClick={() => setLayoutMode('grid')}
                aria-label="Card grid view"
                aria-pressed={layoutMode === 'grid'}
                className={`min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg transition-colors ${
                  layoutMode === 'grid'
                    ? 'nx-glow-button text-white'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setLayoutMode('list')}
                aria-label="Compact list view"
                aria-pressed={layoutMode === 'list'}
                className={`min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg transition-colors ${
                  layoutMode === 'list'
                    ? 'nx-glow-button text-white'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Secondary Filter Selects + Result Readout */}
        <div className="pt-3 border-t nx-divider flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Filter by priority"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as PriorityFilter)}
              className="min-h-[40px] px-3 py-1.5 text-xs font-medium rounded-xl nx-input"
            >
              <option value="all" className="bg-white dark:bg-slate-900">
                All Priorities
              </option>
              <option value="high" className="bg-white dark:bg-slate-900">
                High Priority
              </option>
              <option value="medium" className="bg-white dark:bg-slate-900">
                Medium Priority
              </option>
              <option value="low" className="bg-white dark:bg-slate-900">
                Low Priority
              </option>
            </select>

            <select
              aria-label="Filter by category"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as CategoryFilter)}
              className="min-h-[40px] px-3 py-1.5 text-xs font-medium rounded-xl nx-input"
            >
              <option value="all" className="bg-white dark:bg-slate-900">
                All Categories
              </option>
              <option value="Deep Work" className="bg-white dark:bg-slate-900">
                Deep Work
              </option>
              <option value="Planning" className="bg-white dark:bg-slate-900">
                Planning
              </option>
              <option value="Admin" className="bg-white dark:bg-slate-900">
                Admin
              </option>
              <option value="Personal" className="bg-white dark:bg-slate-900">
                Personal
              </option>
            </select>

            <select
              aria-label="Filter by deadline"
              value={deadlineFilter}
              onChange={(e) => setDeadlineFilter(e.target.value as DeadlineFilter)}
              className="min-h-[40px] px-3 py-1.5 text-xs font-medium rounded-xl nx-input"
            >
              <option value="all" className="bg-white dark:bg-slate-900">
                Any Deadline
              </option>
              <option value="overdue" className="bg-white dark:bg-slate-900">
                Overdue
              </option>
              <option value="today" className="bg-white dark:bg-slate-900">
                Due Today
              </option>
              <option value="upcoming" className="bg-white dark:bg-slate-900">
                Upcoming
              </option>
            </select>

            <select
              aria-label="Sort tasks"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="min-h-[40px] px-3 py-1.5 text-xs font-medium rounded-xl nx-input"
            >
              <option value="smart" className="bg-white dark:bg-slate-900">
                Sort: Smart Priority
              </option>
              <option value="deadline" className="bg-white dark:bg-slate-900">
                Sort: Earliest Deadline
              </option>
              <option value="newest" className="bg-white dark:bg-slate-900">
                Sort: Recently Added
              </option>
              <option value="duration" className="bg-white dark:bg-slate-900">
                Sort: Focus Duration
              </option>
            </select>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400">
              Showing {filteredTasks.length} of {tasks.length}
            </span>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="min-h-[34px] px-2.5 rounded-lg font-medium text-purple-600 dark:text-cyan-400 hover:bg-purple-500/10 dark:hover:bg-cyan-400/10 inline-flex items-center gap-1 whitespace-nowrap transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>
      </GlassCard>

      {/* Task Cards Grid / Compact List / Empty States */}
      {tasks.length === 0 ? (
        <GlassCard as="section" className="px-6 py-14 text-center">
          <CheckSquare className="w-7 h-7 mx-auto text-slate-400 dark:text-slate-500" />
          <h2 className="mt-3 font-display text-lg font-semibold text-slate-950 dark:text-white">
            Your task workspace is empty
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
            Create your first deliverable with a deadline, priority level, category, and subtask checklist.
          </p>
          <div className="mt-5">
            <GlowButton variant="primary" onClick={handleOpenCreate}>
              <Plus className="w-4 h-4" />
              <span>Create First Task</span>
            </GlowButton>
          </div>
        </GlassCard>
      ) : filteredTasks.length === 0 ? (
        <GlassCard as="section" className="px-6 py-12 text-center">
          <Search className="w-6 h-6 mx-auto text-slate-400 dark:text-slate-500" />
          <h2 className="mt-3 font-display text-base font-semibold text-slate-950 dark:text-white">
            No tasks match your active filters
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Adjust your search keywords, priority, category, or deadline filter to view more tasks.
          </p>
          <div className="mt-4 flex items-center justify-center gap-2.5">
            <GlowButton variant="secondary" size="sm" onClick={resetFilters}>
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </GlowButton>
            <GlowButton variant="primary" size="sm" onClick={handleOpenCreate}>
              <Plus className="w-3.5 h-3.5" />
              <span>New Task</span>
            </GlowButton>
          </div>
        </GlassCard>
      ) : layoutMode === 'grid' ? (
        <section
          aria-label="Task cards"
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-stretch"
        >
          {filteredTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              layout="grid"
              onToggleComplete={toggleTaskComplete}
              onToggleSubtask={toggleTaskSubtask}
              onEdit={handleOpenEdit}
              onRequestDelete={setPendingDeleteTask}
              onStartFocus={handleStartFocus}
              onSchedule={handleScheduleTask}
            />
          ))}
        </section>
      ) : (
        <GlassCard as="section" aria-label="Task list" className="overflow-hidden">
          <ul className="divide-y divide-slate-200/60 dark:divide-slate-800/70">
            {filteredTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                layout="list"
                onToggleComplete={toggleTaskComplete}
                onToggleSubtask={toggleTaskSubtask}
                onEdit={handleOpenEdit}
                onRequestDelete={setPendingDeleteTask}
                onStartFocus={handleStartFocus}
                onSchedule={handleScheduleTask}
              />
            ))}
          </ul>
        </GlassCard>
      )}

      {/* Interactive Create / Edit Task Dialog */}
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
        onRequestDelete={(task) => setPendingDeleteTask(task)}
      />

      {/* Schedule Task onto Daily Planner Dialog */}
      <TimeBlockFormModal
        open={blockModalOpen}
        onClose={() => setBlockModalOpen(false)}
        defaultDate={scheduleBlockDraft?.date ?? todayISO}
        editingBlock={scheduleBlockDraft}
        availableTasks={tasks.filter((t) => !t.completed)}
        existingBlocks={timeBlocks}
        onSave={(input, existingId) => {
          if (existingId) {
            updateTimeBlock(existingId, input);
          } else {
            addTimeBlock(input);
          }
        }}
        onDelete={(id) => {
          if (id) deleteTimeBlock(id);
        }}
      />

      {/* Interactive Delete Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(pendingDeleteTask)}
        title="Delete task permanently?"
        description={
          pendingDeleteTask
            ? `Remove "${pendingDeleteTask.title}" from your local workspace?`
            : ''
        }
        detail={
          linkedBlockCountForPendingDelete > 0
            ? `This task is currently linked to ${linkedBlockCountForPendingDelete} scheduled time ${
                linkedBlockCountForPendingDelete === 1 ? 'block' : 'blocks'
              }. Deleting it will safely unlink those blocks while keeping them on your schedule.`
            : 'Dashboard totals and completion rates will update immediately after removal.'
        }
        confirmLabel="Delete Task"
        cancelLabel="Keep Task"
        tone="danger"
        onCancel={() => setPendingDeleteTask(null)}
        onConfirm={() => {
          if (pendingDeleteTask) {
            deleteTask(pendingDeleteTask.id);
          }
          setPendingDeleteTask(null);
        }}
      />
    </PageTransition>
  );
};
