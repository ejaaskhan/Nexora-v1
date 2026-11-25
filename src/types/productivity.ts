export type TaskCategory = 'Deep Work' | 'Planning' | 'Admin' | 'Personal';

export type TaskPriority = 'high' | 'medium' | 'low';

export type TimeBlockStatus = 'scheduled' | 'in-progress' | 'completed';

export type TimerMode = 'focus' | 'deep' | 'short-break' | 'long-break';

export type TimerStatus = 'idle' | 'running' | 'paused' | 'completed';

export type ThemePreference = 'light' | 'dark' | 'system';

export interface TaskSubtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface PlannerTask {
  id: string;
  title: string;
  notes: string;
  date: string; // YYYY-MM-DD deadline
  dueTime: string | null; // Optional HH:MM 24h time
  priority: TaskPriority;
  category: TaskCategory;
  estimatedMinutes: number;
  subtasks: TaskSubtask[];
  completed: boolean;
  completedAt: string | null;
  createdAt: string;
}

export type CreateTaskInput = Omit<
  PlannerTask,
  'id' | 'completed' | 'completedAt' | 'createdAt' | 'dueTime' | 'subtasks'
> & {
  dueTime?: string | null;
  subtasks?: TaskSubtask[];
};

export interface TimeBlock {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  category: TaskCategory;
  startMinute: number; // minutes from midnight (e.g., 540 = 09:00)
  durationMinutes: number;
  linkedTaskId: string | null;
  status: TimeBlockStatus;
  notes: string;
}

export interface FocusSession {
  id: string;
  startedAt: string; // ISO timestamp
  endedAt: string; // ISO timestamp
  date: string; // YYYY-MM-DD
  durationMinutes: number;
  mode: TimerMode;
  category: TaskCategory;
  linkedTaskId: string | null;
  linkedBlockId: string | null;
  linkedTitle: string;
  intention: string;
  completed: boolean;
}

export interface TimerRuntimeState {
  mode: TimerMode;
  status: TimerStatus;
  durationSeconds: number;
  remainingSeconds: number;
  startedAtTimestamp: number | null;
  targetEndTimestamp: number | null;
  linkedTaskId: string | null;
  linkedBlockId: string | null;
  intention: string;
  pomodoroRoundCount: number; // 0..4 completed work cycles in current Pomodoro set
}

export interface NotificationPreferences {
  focusSessionAlerts: boolean;
  deadlineReminders: boolean;
  calendarEventReminders: boolean;
  eventLeadMinutes: 5 | 10 | 15 | 30;
  quietHoursEnabled: boolean;
  quietHoursStart: string; // HH:MM
  quietHoursEnd: string; // HH:MM
}

export interface UserSettings {
  theme: ThemePreference;
  focusMinutes: number;
  deepWorkMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  dailyFocusGoalMinutes: number;
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  notificationsEnabled: boolean;
  autoStartBreaks: boolean;
  notificationPreferences: NotificationPreferences;
}

export interface GoalMilestone {
  id: string;
  title: string;
  completed: boolean;
  targetDate: string | null; // Optional YYYY-MM-DD
}

export type GoalProgressMode = 'numeric' | 'milestones';

export interface ProductivityGoal {
  id: string;
  title: string;
  description: string;
  category: TaskCategory;
  currentValue: number;
  targetValue: number;
  unit: string;
  deadline: string; // YYYY-MM-DD
  milestones: GoalMilestone[];
  progressMode: GoalProgressMode;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

export type CreateGoalInput = Omit<
  ProductivityGoal,
  'id' | 'completed' | 'createdAt' | 'updatedAt' | 'description' | 'milestones' | 'progressMode'
> & {
  description?: string;
  milestones?: GoalMilestone[];
  progressMode?: GoalProgressMode;
};

export type CalendarEventColor = 'violet' | 'cyan' | 'emerald' | 'amber' | 'rose';

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  allDay: boolean;
  startMinute: number; // minutes from midnight (ignored when allDay is true)
  durationMinutes: number;
  category: TaskCategory;
  color: CalendarEventColor;
  location: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export type CreateEventInput = Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>;

export type NoteColorCategory = 'violet' | 'cyan' | 'emerald' | 'amber' | 'rose' | 'slate';

export interface SmartNote {
  id: string;
  title: string;
  contentHtml: string;
  plainText: string;
  color: NoteColorCategory;
  pinned: boolean;
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

export interface CreateNoteInput {
  title?: string;
  contentHtml?: string;
  color?: NoteColorCategory;
  pinned?: boolean;
}

export type ActivityEventType =
  | 'task_created'
  | 'task_completed'
  | 'block_scheduled'
  | 'block_completed'
  | 'session_logged'
  | 'goal_created'
  | 'goal_progress'
  | 'goal_completed'
  | 'milestone_completed'
  | 'note_created'
  | 'event_created';

export interface ActivityItem {
  id: string;
  type: ActivityEventType;
  title: string;
  detail: string;
  timestamp: string; // ISO timestamp
  route:
    | '/'
    | '/tasks'
    | '/notes'
    | '/goals'
    | '/calendar'
    | '/focus'
    | '/planner'
    | '/history'
    | '/analytics';
}

export interface WorkspaceData {
  tasks: PlannerTask[];
  timeBlocks: TimeBlock[];
  events: CalendarEvent[];
  sessions: FocusSession[];
  goals: ProductivityGoal[];
  notes: SmartNote[];
  activities: ActivityItem[];
  settings: UserSettings;
}

export interface ExportEnvelope {
  schemaVersion: 1;
  app: 'NEXORA';
  exportedAt: string;
  data: WorkspaceData;
}

export type WorkspaceCollectionKey =
  | 'tasks'
  | 'timeBlocks'
  | 'events'
  | 'sessions'
  | 'goals'
  | 'notes'
  | 'activities'
  | 'settings';

export interface BackupSnapshot {
  id: string;
  label: string;
  createdAt: string;
  source: 'manual' | 'pre-import' | 'auto-safety';
  sizeBytes: number;
  summary: {
    tasks: number;
    goals: number;
    events: number;
    notes: number;
    timeBlocks: number;
    sessions: number;
  };
  data: WorkspaceData;
}

export type ConflictResolutionStrategy = 'merge-by-id' | 'last-write-wins' | 'local-priority';

export interface SyncOutboxEntry {
  id: string;
  collection: WorkspaceCollectionKey;
  revision: number;
  timestamp: string;
  operation: 'upsert' | 'replace';
}

export interface SyncMetadata {
  localRevision: number;
  lastLocalWriteAt: string;
  lastSyncedRevision: number;
  lastSyncedAt: string | null;
  activeProviderId: string;
  conflictStrategy: ConflictResolutionStrategy;
  pendingOutbox: SyncOutboxEntry[];
}

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  tone: 'neutral' | 'success' | 'warning' | 'error';
}
