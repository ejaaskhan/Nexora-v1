import {
  ActivityEventType,
  ActivityItem,
  FocusSession,
  PlannerTask,
  ProductivityGoal,
  TaskCategory,
  TaskPriority,
} from '../types/productivity';
import {
  addDaysISO,
  formatCountdownLabel,
  formatShortDate,
  isTaskOverdue,
  parseISODate,
  toISODate,
} from './date';

export type CategoryFilter = 'all' | TaskCategory;
export type ActivityDomain = 'Focus' | 'Tasks' | 'Goals' | 'Schedule' | 'Notes';

export interface DailyProductivityPoint {
  iso: string;
  dayLabel: string;
  shortDate: string;
  isToday: boolean;
  focusMinutes: number;
  workSessions: number;
  breakSessions: number;
  completedTasks: number;
}

export interface WeeklyProductivityPoint {
  weekStartISO: string;
  weekEndISO: string;
  label: string;
  rangeLabel: string;
  isCurrentWeek: boolean;
  focusMinutes: number;
  workSessions: number;
  breakSessions: number;
  completedTasks: number;
  activeDays: number;
}

export interface PriorityTaskStat {
  priority: TaskPriority;
  label: string;
  total: number;
  completed: number;
  open: number;
  rate: number;
}

export interface TaskAnalyticsSummary {
  total: number;
  completed: number;
  open: number;
  completionRate: number;
  completedToday: number;
  completedLast7Days: number;
  overdueCount: number;
  onTimeOpenCount: number;
  totalSubtasks: number;
  completedSubtasks: number;
  subtaskRate: number;
  byPriority: PriorityTaskStat[];
}

export interface GoalAnalyticsItem {
  goal: ProductivityGoal;
  pct: number;
  completedMilestones: number;
  totalMilestones: number;
  countdown: {
    label: string;
    tone: 'completed' | 'overdue' | 'soon' | 'normal';
  };
}

export interface GoalAnalyticsSummary {
  total: number;
  completed: number;
  active: number;
  avgProgressPct: number;
  totalMilestones: number;
  completedMilestones: number;
  milestoneRate: number;
  items: GoalAnalyticsItem[];
}

export interface ActivityDomainStat {
  domain: ActivityDomain;
  count: number;
  pct: number;
}

export interface ActivityAnalyticsSummary {
  total: number;
  todayCount: number;
  last7DaysCount: number;
  byDomain: ActivityDomainStat[];
}

export function getTaskCompletionDateISO(task: PlannerTask): string | null {
  if (!task.completed) return null;
  if (task.completedAt) {
    const parsed = Date.parse(task.completedAt);
    if (Number.isFinite(parsed)) {
      return toISODate(new Date(parsed));
    }
  }
  return task.date;
}

export function getTimestampLocalDateISO(isoTimestamp: string): string | null {
  const parsed = Date.parse(isoTimestamp);
  if (!Number.isFinite(parsed)) return null;
  return toISODate(new Date(parsed));
}

export function classifyActivityDomain(type: ActivityEventType): ActivityDomain {
  switch (type) {
    case 'session_logged':
      return 'Focus';
    case 'task_created':
    case 'task_completed':
      return 'Tasks';
    case 'goal_created':
    case 'goal_progress':
    case 'goal_completed':
    case 'milestone_completed':
      return 'Goals';
    case 'block_scheduled':
    case 'block_completed':
    case 'event_created':
      return 'Schedule';
    case 'note_created':
      return 'Notes';
  }
}

export function computeGoalPercentage(goal: ProductivityGoal): number {
  if (goal.completed) return 100;
  if (goal.progressMode === 'milestones' && goal.milestones.length > 0) {
    const done = goal.milestones.filter((m) => m.completed).length;
    return Math.round((done / goal.milestones.length) * 100);
  }
  if (goal.targetValue <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((goal.currentValue / goal.targetValue) * 100)));
}

export function buildDailyProductivitySeries(
  sessions: FocusSession[],
  tasks: PlannerTask[],
  days: number,
  categoryFilter: CategoryFilter,
  todayISO: string
): DailyProductivityPoint[] {
  const filteredSessions = sessions.filter(
    (s) => s.completed && (categoryFilter === 'all' || s.category === categoryFilter)
  );
  const filteredCompletedTasks = tasks.filter(
    (t) => t.completed && (categoryFilter === 'all' || t.category === categoryFilter)
  );

  const sessionBucket = new Map<
    string,
    { focusMinutes: number; workSessions: number; breakSessions: number }
  >();
  for (const s of filteredSessions) {
    const entry = sessionBucket.get(s.date) ?? {
      focusMinutes: 0,
      workSessions: 0,
      breakSessions: 0,
    };
    if (s.mode === 'focus' || s.mode === 'deep') {
      entry.focusMinutes += s.durationMinutes;
      entry.workSessions += 1;
    } else {
      entry.breakSessions += 1;
    }
    sessionBucket.set(s.date, entry);
  }

  const taskBucket = new Map<string, number>();
  for (const t of filteredCompletedTasks) {
    const completedISO = getTaskCompletionDateISO(t);
    if (!completedISO) continue;
    taskBucket.set(completedISO, (taskBucket.get(completedISO) ?? 0) + 1);
  }

  return Array.from({ length: days }, (_, idx) => {
    const iso = addDaysISO(todayISO, idx - (days - 1));
    const dt = parseISODate(iso);
    const sess = sessionBucket.get(iso);
    return {
      iso,
      dayLabel: dt.toLocaleDateString('en-US', { weekday: 'short' }),
      shortDate: formatShortDate(iso),
      isToday: iso === todayISO,
      focusMinutes: sess?.focusMinutes ?? 0,
      workSessions: sess?.workSessions ?? 0,
      breakSessions: sess?.breakSessions ?? 0,
      completedTasks: taskBucket.get(iso) ?? 0,
    };
  });
}

function getMondayISO(isoDate: string): string {
  const dt = parseISODate(isoDate);
  const dow = dt.getDay(); // 0=Sun..6=Sat
  const diffToMonday = dow === 0 ? -6 : 1 - dow;
  return addDaysISO(isoDate, diffToMonday);
}

export function buildWeeklyProductivitySeries(
  sessions: FocusSession[],
  tasks: PlannerTask[],
  weeks: number,
  categoryFilter: CategoryFilter,
  todayISO: string
): WeeklyProductivityPoint[] {
  const currentWeekMonday = getMondayISO(todayISO);

  const filteredSessions = sessions.filter(
    (s) => s.completed && (categoryFilter === 'all' || s.category === categoryFilter)
  );
  const filteredCompletedTasks = tasks.filter(
    (t) => t.completed && (categoryFilter === 'all' || t.category === categoryFilter)
  );

  return Array.from({ length: weeks }, (_, idx) => {
    const offsetWeeks = idx - (weeks - 1);
    const weekStartISO = addDaysISO(currentWeekMonday, offsetWeeks * 7);
    const weekEndISO = addDaysISO(weekStartISO, 6);
    const isCurrentWeek = offsetWeeks === 0;

    let focusMinutes = 0;
    let workSessions = 0;
    let breakSessions = 0;
    const activeDaySet = new Set<string>();

    for (const s of filteredSessions) {
      if (s.date >= weekStartISO && s.date <= weekEndISO) {
        if (s.mode === 'focus' || s.mode === 'deep') {
          focusMinutes += s.durationMinutes;
          workSessions += 1;
          activeDaySet.add(s.date);
        } else {
          breakSessions += 1;
        }
      }
    }

    let completedTasks = 0;
    for (const t of filteredCompletedTasks) {
      const doneISO = getTaskCompletionDateISO(t);
      if (doneISO && doneISO >= weekStartISO && doneISO <= weekEndISO) {
        completedTasks += 1;
      }
    }

    const startShort = formatShortDate(weekStartISO);
    const endShort = formatShortDate(weekEndISO);

    return {
      weekStartISO,
      weekEndISO,
      label: isCurrentWeek ? 'This wk' : startShort,
      rangeLabel: `${startShort} – ${endShort}`,
      isCurrentWeek,
      focusMinutes,
      workSessions,
      breakSessions,
      completedTasks,
      activeDays: activeDaySet.size,
    };
  });
}

export function computeTaskStatistics(
  tasks: PlannerTask[],
  categoryFilter: CategoryFilter,
  todayISO: string
): TaskAnalyticsSummary {
  const filtered =
    categoryFilter === 'all' ? tasks : tasks.filter((t) => t.category === categoryFilter);
  const cutoff7d = addDaysISO(todayISO, -6);

  const total = filtered.length;
  const completedTasks = filtered.filter((t) => t.completed);
  const openTasks = filtered.filter((t) => !t.completed);
  const completed = completedTasks.length;
  const open = openTasks.length;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  let completedToday = 0;
  let completedLast7Days = 0;
  for (const t of completedTasks) {
    const doneISO = getTaskCompletionDateISO(t);
    if (!doneISO) continue;
    if (doneISO === todayISO) completedToday += 1;
    if (doneISO >= cutoff7d && doneISO <= todayISO) completedLast7Days += 1;
  }

  const now = new Date();
  let overdueCount = 0;
  for (const t of openTasks) {
    if (isTaskOverdue(t.date, t.dueTime, false, now)) {
      overdueCount += 1;
    }
  }
  const onTimeOpenCount = Math.max(0, open - overdueCount);

  let totalSubtasks = 0;
  let completedSubtasks = 0;
  for (const t of filtered) {
    totalSubtasks += t.subtasks.length;
    completedSubtasks += t.subtasks.filter((s) => s.completed).length;
  }
  const subtaskRate =
    totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

  const priorities: Array<{ key: TaskPriority; label: string }> = [
    { key: 'high', label: 'High Priority' },
    { key: 'medium', label: 'Medium Priority' },
    { key: 'low', label: 'Low Priority' },
  ];

  const byPriority: PriorityTaskStat[] = priorities.map(({ key, label }) => {
    const group = filtered.filter((t) => t.priority === key);
    const done = group.filter((t) => t.completed).length;
    return {
      priority: key,
      label,
      total: group.length,
      completed: done,
      open: group.length - done,
      rate: group.length > 0 ? Math.round((done / group.length) * 100) : 0,
    };
  });

  return {
    total,
    completed,
    open,
    completionRate,
    completedToday,
    completedLast7Days,
    overdueCount,
    onTimeOpenCount,
    totalSubtasks,
    completedSubtasks,
    subtaskRate,
    byPriority,
  };
}

export function computeGoalAnalytics(
  goals: ProductivityGoal[],
  categoryFilter: CategoryFilter
): GoalAnalyticsSummary {
  const filtered =
    categoryFilter === 'all' ? goals : goals.filter((g) => g.category === categoryFilter);

  let totalMilestones = 0;
  let completedMilestones = 0;
  let sumPct = 0;

  const items: GoalAnalyticsItem[] = filtered.map((goal) => {
    const pct = computeGoalPercentage(goal);
    sumPct += pct;
    const gTotalMs = goal.milestones.length;
    const gDoneMs = goal.milestones.filter((m) => m.completed).length;
    totalMilestones += gTotalMs;
    completedMilestones += gDoneMs;
    return {
      goal,
      pct,
      completedMilestones: gDoneMs,
      totalMilestones: gTotalMs,
      countdown: formatCountdownLabel(goal.deadline, goal.completed),
    };
  });

  items.sort((a, b) => {
    if (a.goal.completed !== b.goal.completed) return a.goal.completed ? 1 : -1;
    return a.goal.deadline.localeCompare(b.goal.deadline);
  });

  const total = filtered.length;
  const completed = filtered.filter((g) => g.completed).length;
  const active = total - completed;
  const avgProgressPct = total > 0 ? Math.round(sumPct / total) : 0;
  const milestoneRate =
    totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;

  return {
    total,
    completed,
    active,
    avgProgressPct,
    totalMilestones,
    completedMilestones,
    milestoneRate,
    items,
  };
}

export function computeActivitySummary(
  activities: ActivityItem[],
  todayISO: string
): ActivityAnalyticsSummary {
  const cutoff7d = addDaysISO(todayISO, -6);
  const domains: ActivityDomain[] = ['Focus', 'Tasks', 'Goals', 'Schedule', 'Notes'];
  const counts = new Map<ActivityDomain, number>();
  domains.forEach((d) => counts.set(d, 0));

  let todayCount = 0;
  let last7DaysCount = 0;

  for (const act of activities) {
    const domain = classifyActivityDomain(act.type);
    counts.set(domain, (counts.get(domain) ?? 0) + 1);

    const dateISO = getTimestampLocalDateISO(act.timestamp);
    if (dateISO === todayISO) todayCount += 1;
    if (dateISO && dateISO >= cutoff7d && dateISO <= todayISO) last7DaysCount += 1;
  }

  const total = activities.length;
  const byDomain: ActivityDomainStat[] = domains
    .map((domain) => {
      const count = counts.get(domain) ?? 0;
      const pct = total > 0 ? Math.round((count / total) * 100) : 0;
      return { domain, count, pct };
    })
    .sort((a, b) => b.count - a.count);

  return {
    total,
    todayCount,
    last7DaysCount,
    byDomain,
  };
}
