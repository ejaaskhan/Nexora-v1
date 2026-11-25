import {
  ActivityEventType,
  ActivityItem,
  CalendarEvent,
  CalendarEventColor,
  ExportEnvelope,
  FocusSession,
  GoalMilestone,
  GoalProgressMode,
  NoteColorCategory,
  PlannerTask,
  ProductivityGoal,
  SmartNote,
  TaskCategory,
  TaskPriority,
  TaskSubtask,
  TimeBlock,
  TimeBlockStatus,
  TimerMode,
  UserSettings,
  WorkspaceData,
} from '../types/productivity';
import { DEFAULT_SETTINGS } from '../data/seed';
import { getTodayISO } from './date';
import { extractPlainText, sanitizeNoteHtml } from './richText';

const VALID_CATEGORIES = new Set<TaskCategory>(['Deep Work', 'Planning', 'Admin', 'Personal']);
const VALID_PRIORITIES = new Set<TaskPriority>(['high', 'medium', 'low']);
const VALID_BLOCK_STATUS = new Set<TimeBlockStatus>(['scheduled', 'in-progress', 'completed']);
const VALID_TIMER_MODES = new Set<TimerMode>(['focus', 'deep', 'short-break', 'long-break']);
const VALID_NOTE_COLORS = new Set<NoteColorCategory>([
  'violet',
  'cyan',
  'emerald',
  'amber',
  'rose',
  'slate',
]);
const VALID_EVENT_COLORS = new Set<CalendarEventColor>([
  'violet',
  'cyan',
  'emerald',
  'amber',
  'rose',
]);
const VALID_ACTIVITY_TYPES = new Set<ActivityEventType>([
  'task_created',
  'task_completed',
  'block_scheduled',
  'block_completed',
  'session_logged',
  'goal_created',
  'goal_progress',
  'goal_completed',
  'milestone_completed',
  'note_created',
  'event_created',
]);
const VALID_ROUTES = new Set<ActivityItem['route']>([
  '/',
  '/tasks',
  '/notes',
  '/goals',
  '/calendar',
  '/focus',
  '/planner',
  '/history',
  '/analytics',
]);

export function createExportEnvelope(data: WorkspaceData): ExportEnvelope {
  return {
    schemaVersion: 1,
    app: 'NEXORA',
    exportedAt: new Date().toISOString(),
    data,
  };
}

export function triggerJsonDownload(data: WorkspaceData): string {
  const envelope = createExportEnvelope(data);
  const filename = `nexora-backup-${getTodayISO()}.json`;
  const json = JSON.stringify(envelope, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);

  return filename;
}

export function triggerSelectiveJsonDownload(
  data: WorkspaceData,
  collections: Array<'tasks' | 'notes' | 'goals' | 'events' | 'timeBlocks' | 'sessions' | 'settings'>
): string {
  const selectedSet = new Set(collections);
  const partial: WorkspaceData = {
    tasks: selectedSet.has('tasks') ? data.tasks : [],
    notes: selectedSet.has('notes') ? data.notes : [],
    goals: selectedSet.has('goals') ? data.goals : [],
    events: selectedSet.has('events') ? data.events : [],
    timeBlocks: selectedSet.has('timeBlocks') ? data.timeBlocks : [],
    sessions: selectedSet.has('sessions') ? data.sessions : [],
    activities: [],
    settings: selectedSet.has('settings') ? data.settings : { ...DEFAULT_SETTINGS },
  };
  const envelope = createExportEnvelope(partial);
  const tag = collections.length === 1 ? collections[0] : 'custom';
  const filename = `nexora-${tag}-${getTodayISO()}.json`;
  const json = JSON.stringify(envelope, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);

  return filename;
}

export function createBackupSnapshot(
  data: WorkspaceData,
  label: string,
  source: 'manual' | 'pre-import' | 'auto-safety' = 'manual'
) {
  const serialized = JSON.stringify(data);
  const cloned = JSON.parse(serialized) as WorkspaceData;
  const sizeBytes =
    typeof TextEncoder !== 'undefined'
      ? new TextEncoder().encode(serialized).length
      : serialized.length;

  return {
    id: `snap_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    label: label.trim() || `Workspace Backup · ${getTodayISO()}`,
    createdAt: new Date().toISOString(),
    source,
    sizeBytes,
    summary: {
      tasks: cloned.tasks.length,
      goals: cloned.goals.length,
      events: cloned.events.length,
      notes: cloned.notes.length,
      timeBlocks: cloned.timeBlocks.length,
      sessions: cloned.sessions.length,
    },
    data: cloned,
  };
}

export function formatBytesCompact(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

export interface ParsedBackupResult {
  ok: true;
  data: WorkspaceData;
  exportedAt: string | null;
  summary: {
    tasks: number;
    timeBlocks: number;
    events: number;
    sessions: number;
    goals: number;
    notes: number;
  };
}

export interface ParsedBackupError {
  ok: false;
  error: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function sanitizeTasks(raw: unknown): PlannerTask[] | null {
  if (!Array.isArray(raw)) return null;
  const tasks: PlannerTask[] = [];
  for (const item of raw) {
    if (!isRecord(item) || typeof item.id !== 'string' || typeof item.title !== 'string') {
      return null;
    }
    const rawSubtasks = Array.isArray(item.subtasks) ? item.subtasks : [];
    const subtasks: TaskSubtask[] = rawSubtasks
      .filter((s): s is Record<string, unknown> => isRecord(s) && typeof s.title === 'string')
      .map((s, idx) => ({
        id: typeof s.id === 'string' && s.id ? s.id : `${item.id}_sub_${idx}`,
        title: typeof s.title === 'string' ? s.title.trim() || 'Subtask' : 'Subtask',
        completed: Boolean(s.completed),
      }));

    tasks.push({
      id: item.id,
      title: item.title.trim() || 'Untitled task',
      notes: typeof item.notes === 'string' ? item.notes : '',
      date: typeof item.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(item.date) ? item.date : getTodayISO(),
      dueTime:
        typeof item.dueTime === 'string' && /^\d{2}:\d{2}$/.test(item.dueTime)
          ? item.dueTime
          : null,
      priority: VALID_PRIORITIES.has(item.priority as TaskPriority) ? (item.priority as TaskPriority) : 'medium',
      category: VALID_CATEGORIES.has(item.category as TaskCategory) ? (item.category as TaskCategory) : 'Deep Work',
      estimatedMinutes:
        typeof item.estimatedMinutes === 'number' && Number.isFinite(item.estimatedMinutes)
          ? Math.max(5, Math.min(480, Math.round(item.estimatedMinutes)))
          : 25,
      subtasks,
      completed: Boolean(item.completed),
      completedAt: typeof item.completedAt === 'string' ? item.completedAt : null,
      createdAt: typeof item.createdAt === 'string' ? item.createdAt : new Date().toISOString(),
    });
  }
  return tasks;
}

function sanitizeTimeBlocks(raw: unknown): TimeBlock[] | null {
  if (!Array.isArray(raw)) return null;
  const blocks: TimeBlock[] = [];
  for (const item of raw) {
    if (
      !isRecord(item) ||
      typeof item.id !== 'string' ||
      typeof item.title !== 'string' ||
      typeof item.startMinute !== 'number'
    ) {
      return null;
    }
    blocks.push({
      id: item.id,
      date: typeof item.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(item.date) ? item.date : getTodayISO(),
      title: item.title.trim() || 'Untitled block',
      category: VALID_CATEGORIES.has(item.category as TaskCategory) ? (item.category as TaskCategory) : 'Deep Work',
      startMinute: Math.max(0, Math.min(23 * 60 + 45, Math.round(item.startMinute))),
      durationMinutes:
        typeof item.durationMinutes === 'number' && Number.isFinite(item.durationMinutes)
          ? Math.max(15, Math.min(480, Math.round(item.durationMinutes)))
          : 45,
      linkedTaskId: typeof item.linkedTaskId === 'string' ? item.linkedTaskId : null,
      status: VALID_BLOCK_STATUS.has(item.status as TimeBlockStatus) ? (item.status as TimeBlockStatus) : 'scheduled',
      notes: typeof item.notes === 'string' ? item.notes : '',
    });
  }
  return blocks;
}

function sanitizeSessions(raw: unknown): FocusSession[] | null {
  if (!Array.isArray(raw)) return null;
  const sessions: FocusSession[] = [];
  for (const item of raw) {
    if (!isRecord(item) || typeof item.id !== 'string' || typeof item.durationMinutes !== 'number') {
      return null;
    }
    sessions.push({
      id: item.id,
      startedAt: typeof item.startedAt === 'string' ? item.startedAt : new Date().toISOString(),
      endedAt: typeof item.endedAt === 'string' ? item.endedAt : new Date().toISOString(),
      date: typeof item.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(item.date) ? item.date : getTodayISO(),
      durationMinutes: Math.max(1, Math.min(300, Math.round(item.durationMinutes))),
      mode: VALID_TIMER_MODES.has(item.mode as TimerMode) ? (item.mode as TimerMode) : 'focus',
      category: VALID_CATEGORIES.has(item.category as TaskCategory) ? (item.category as TaskCategory) : 'Deep Work',
      linkedTaskId: typeof item.linkedTaskId === 'string' ? item.linkedTaskId : null,
      linkedBlockId: typeof item.linkedBlockId === 'string' ? item.linkedBlockId : null,
      linkedTitle: typeof item.linkedTitle === 'string' ? item.linkedTitle : 'Focus Session',
      intention: typeof item.intention === 'string' ? item.intention : '',
      completed: item.completed !== false,
    });
  }
  return sessions;
}

function sanitizeGoals(raw: unknown): ProductivityGoal[] {
  if (!Array.isArray(raw)) return [];
  const goals: ProductivityGoal[] = [];
  for (const item of raw) {
    if (!isRecord(item) || typeof item.id !== 'string' || typeof item.title !== 'string') {
      continue;
    }
    const rawMilestones = Array.isArray(item.milestones) ? item.milestones : [];
    const milestones: GoalMilestone[] = rawMilestones
      .filter((m): m is Record<string, unknown> => isRecord(m) && typeof m.title === 'string')
      .map((m, idx) => ({
        id: typeof m.id === 'string' && m.id ? m.id : `${item.id}_ms_${idx}`,
        title: typeof m.title === 'string' ? m.title.trim() || 'Milestone' : 'Milestone',
        completed: Boolean(m.completed),
        targetDate:
          typeof m.targetDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(m.targetDate)
            ? m.targetDate
            : null,
      }));

    const progressMode: GoalProgressMode =
      item.progressMode === 'milestones' && milestones.length > 0 ? 'milestones' : 'numeric';

    const targetValue =
      progressMode === 'milestones' && milestones.length > 0
        ? milestones.length
        : typeof item.targetValue === 'number' && Number.isFinite(item.targetValue)
          ? Math.max(1, Math.min(10000, Math.round(item.targetValue)))
          : 5;
    const currentValue =
      progressMode === 'milestones' && milestones.length > 0
        ? milestones.filter((m) => m.completed).length
        : typeof item.currentValue === 'number' && Number.isFinite(item.currentValue)
          ? Math.max(0, Math.min(targetValue, Math.round(item.currentValue)))
          : 0;
    const completed = Boolean(item.completed) || currentValue >= targetValue;
    goals.push({
      id: item.id,
      title: item.title.trim() || 'Untitled goal',
      description: typeof item.description === 'string' ? item.description : '',
      category: VALID_CATEGORIES.has(item.category as TaskCategory) ? (item.category as TaskCategory) : 'Deep Work',
      currentValue,
      targetValue,
      unit: typeof item.unit === 'string' && item.unit.trim() ? item.unit.trim().slice(0, 24) : 'milestones',
      deadline:
        typeof item.deadline === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(item.deadline)
          ? item.deadline
          : getTodayISO(),
      milestones,
      progressMode,
      completed,
      createdAt: typeof item.createdAt === 'string' ? item.createdAt : new Date().toISOString(),
      updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : new Date().toISOString(),
    });
  }
  return goals;
}

function sanitizeEvents(raw: unknown): CalendarEvent[] {
  if (!Array.isArray(raw)) return [];
  const events: CalendarEvent[] = [];
  const nowIso = new Date().toISOString();
  for (const item of raw) {
    if (!isRecord(item) || typeof item.id !== 'string' || typeof item.title !== 'string') {
      continue;
    }
    events.push({
      id: item.id,
      title: item.title.trim() || 'Untitled event',
      date:
        typeof item.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(item.date)
          ? item.date
          : getTodayISO(),
      allDay: Boolean(item.allDay),
      startMinute:
        typeof item.startMinute === 'number' && Number.isFinite(item.startMinute)
          ? Math.max(0, Math.min(23 * 60 + 45, Math.round(item.startMinute)))
          : 9 * 60,
      durationMinutes:
        typeof item.durationMinutes === 'number' && Number.isFinite(item.durationMinutes)
          ? Math.max(15, Math.min(720, Math.round(item.durationMinutes)))
          : 60,
      category: VALID_CATEGORIES.has(item.category as TaskCategory) ? (item.category as TaskCategory) : 'Planning',
      color: VALID_EVENT_COLORS.has(item.color as CalendarEventColor)
        ? (item.color as CalendarEventColor)
        : 'cyan',
      location: typeof item.location === 'string' ? item.location : '',
      notes: typeof item.notes === 'string' ? item.notes : '',
      createdAt: typeof item.createdAt === 'string' ? item.createdAt : nowIso,
      updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : nowIso,
    });
  }
  return events;
}

function sanitizeNotes(raw: unknown): SmartNote[] {
  if (!Array.isArray(raw)) return [];
  const notes: SmartNote[] = [];
  for (const item of raw) {
    if (!isRecord(item) || typeof item.id !== 'string') {
      continue;
    }
    const contentHtml = sanitizeNoteHtml(typeof item.contentHtml === 'string' ? item.contentHtml : '');
    const nowIso = new Date().toISOString();
    notes.push({
      id: item.id,
      title: typeof item.title === 'string' && item.title.trim() ? item.title.trim() : 'Untitled note',
      contentHtml,
      plainText: extractPlainText(contentHtml),
      color: VALID_NOTE_COLORS.has(item.color as NoteColorCategory)
        ? (item.color as NoteColorCategory)
        : 'violet',
      pinned: Boolean(item.pinned),
      createdAt: typeof item.createdAt === 'string' ? item.createdAt : nowIso,
      updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : nowIso,
    });
  }
  return notes;
}

function sanitizeActivities(raw: unknown): ActivityItem[] {
  if (!Array.isArray(raw)) return [];
  const activities: ActivityItem[] = [];
  for (const item of raw) {
    if (!isRecord(item) || typeof item.id !== 'string' || typeof item.title !== 'string') {
      continue;
    }
    activities.push({
      id: item.id,
      type: VALID_ACTIVITY_TYPES.has(item.type as ActivityEventType)
        ? (item.type as ActivityEventType)
        : 'task_completed',
      title: item.title.trim() || 'Workspace update',
      detail: typeof item.detail === 'string' ? item.detail : '',
      timestamp: typeof item.timestamp === 'string' ? item.timestamp : new Date().toISOString(),
      route: VALID_ROUTES.has(item.route as ActivityItem['route'])
        ? (item.route as ActivityItem['route'])
        : '/',
    });
  }
  return activities.slice(0, 100);
}

function sanitizeSettings(raw: unknown): UserSettings {
  if (!isRecord(raw)) return { ...DEFAULT_SETTINGS };
  const theme =
    raw.theme === 'light' || raw.theme === 'dark' || raw.theme === 'system'
      ? raw.theme
      : DEFAULT_SETTINGS.theme;
  const clamp = (val: unknown, min: number, max: number, fallback: number) =>
    typeof val === 'number' && Number.isFinite(val)
      ? Math.max(min, Math.min(max, Math.round(val)))
      : fallback;

  const rawNotif = isRecord(raw.notificationPreferences) ? raw.notificationPreferences : {};
  const lead = rawNotif.eventLeadMinutes;
  const validLead: 5 | 10 | 15 | 30 =
    lead === 5 || lead === 10 || lead === 15 || lead === 30
      ? lead
      : DEFAULT_SETTINGS.notificationPreferences.eventLeadMinutes;

  const hhmm = (val: unknown, fallback: string) =>
    typeof val === 'string' && /^\d{2}:\d{2}$/.test(val) ? val : fallback;

  return {
    theme,
    focusMinutes: clamp(raw.focusMinutes, 5, 120, DEFAULT_SETTINGS.focusMinutes),
    deepWorkMinutes: clamp(raw.deepWorkMinutes, 15, 180, DEFAULT_SETTINGS.deepWorkMinutes),
    shortBreakMinutes: clamp(raw.shortBreakMinutes, 1, 30, DEFAULT_SETTINGS.shortBreakMinutes),
    longBreakMinutes: clamp(raw.longBreakMinutes, 5, 60, DEFAULT_SETTINGS.longBreakMinutes),
    dailyFocusGoalMinutes: clamp(
      raw.dailyFocusGoalMinutes,
      30,
      720,
      DEFAULT_SETTINGS.dailyFocusGoalMinutes
    ),
    soundEnabled:
      typeof raw.soundEnabled === 'boolean' ? raw.soundEnabled : DEFAULT_SETTINGS.soundEnabled,
    hapticsEnabled:
      typeof raw.hapticsEnabled === 'boolean'
        ? raw.hapticsEnabled
        : DEFAULT_SETTINGS.hapticsEnabled,
    notificationsEnabled:
      typeof raw.notificationsEnabled === 'boolean'
        ? raw.notificationsEnabled
        : DEFAULT_SETTINGS.notificationsEnabled,
    autoStartBreaks:
      typeof raw.autoStartBreaks === 'boolean'
        ? raw.autoStartBreaks
        : DEFAULT_SETTINGS.autoStartBreaks,
    notificationPreferences: {
      focusSessionAlerts:
        typeof rawNotif.focusSessionAlerts === 'boolean'
          ? rawNotif.focusSessionAlerts
          : DEFAULT_SETTINGS.notificationPreferences.focusSessionAlerts,
      deadlineReminders:
        typeof rawNotif.deadlineReminders === 'boolean'
          ? rawNotif.deadlineReminders
          : DEFAULT_SETTINGS.notificationPreferences.deadlineReminders,
      calendarEventReminders:
        typeof rawNotif.calendarEventReminders === 'boolean'
          ? rawNotif.calendarEventReminders
          : DEFAULT_SETTINGS.notificationPreferences.calendarEventReminders,
      eventLeadMinutes: validLead,
      quietHoursEnabled:
        typeof rawNotif.quietHoursEnabled === 'boolean'
          ? rawNotif.quietHoursEnabled
          : DEFAULT_SETTINGS.notificationPreferences.quietHoursEnabled,
      quietHoursStart: hhmm(
        rawNotif.quietHoursStart,
        DEFAULT_SETTINGS.notificationPreferences.quietHoursStart
      ),
      quietHoursEnd: hhmm(
        rawNotif.quietHoursEnd,
        DEFAULT_SETTINGS.notificationPreferences.quietHoursEnd
      ),
    },
  };
}

export function parseBackupJson(rawText: string): ParsedBackupResult | ParsedBackupError {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    return { ok: false, error: 'The selected file is not valid JSON.' };
  }

  if (!isRecord(parsed)) {
    return { ok: false, error: 'Backup file must contain a JSON object.' };
  }

  let payload: Record<string, unknown>;
  let exportedAt: string | null = null;

  if (parsed.app === 'NEXORA' && isRecord(parsed.data)) {
    payload = parsed.data;
    exportedAt = typeof parsed.exportedAt === 'string' ? parsed.exportedAt : null;
  } else if (
    'tasks' in parsed ||
    'timeBlocks' in parsed ||
    'events' in parsed ||
    'sessions' in parsed ||
    'goals' in parsed ||
    'notes' in parsed
  ) {
    payload = parsed;
  } else {
    return {
      ok: false,
      error: 'Unrecognized backup format. Expected a NEXORA JSON export file.',
    };
  }

  const tasks = sanitizeTasks(payload.tasks ?? []);
  const timeBlocks = sanitizeTimeBlocks(payload.timeBlocks ?? []);
  const events = sanitizeEvents(payload.events ?? []);
  const sessions = sanitizeSessions(payload.sessions ?? []);
  const goals = sanitizeGoals(payload.goals ?? []);
  const notes = sanitizeNotes(payload.notes ?? []);
  const activities = sanitizeActivities(payload.activities ?? []);

  if (!tasks || !timeBlocks || !sessions) {
    return {
      ok: false,
      error: 'One or more collections (tasks, timeBlocks, or sessions) contain invalid entries.',
    };
  }

  const settings = sanitizeSettings(payload.settings);

  return {
    ok: true,
    exportedAt,
    data: {
      tasks,
      timeBlocks,
      events,
      sessions,
      goals,
      notes,
      activities,
      settings,
    },
    summary: {
      tasks: tasks.length,
      timeBlocks: timeBlocks.length,
      events: events.length,
      sessions: sessions.length,
      goals: goals.length,
      notes: notes.length,
    },
  };
}
