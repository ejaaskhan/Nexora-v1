import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityEventType,
  ActivityItem,
  BackupSnapshot,
  CalendarEvent,
  ConflictResolutionStrategy,
  CreateEventInput,
  CreateGoalInput,
  CreateNoteInput,
  CreateTaskInput,
  FocusSession,
  GoalMilestone,
  NotificationPreferences,
  PlannerTask,
  ProductivityGoal,
  SmartNote,
  SyncMetadata,
  TaskCategory,
  ThemePreference,
  TimeBlock,
  TimeBlockStatus,
  TimerMode,
  TimerRuntimeState,
  ToastMessage,
  UserSettings,
  WorkspaceCollectionKey,
  WorkspaceData,
} from '../types/productivity';
import {
  createSeedWorkspaceData,
  DEFAULT_SETTINGS,
} from '../data/seed';
import { storageAdapter } from '../platform/storage';
import { notesDb } from '../platform/notesDb';
import {
  createInitialSyncMetadata,
  workspaceDb,
} from '../platform/workspaceDb';
import {
  defaultLocalSyncAdapter,
  mergeWorkspaceData,
} from '../platform/syncAdapter';
import { hapticsAdapter } from '../platform/haptics';
import { playCompletionChime, sendSessionNotification } from '../platform/notifications';
import { generateId, getTodayISO } from '../utils/date';
import {
  createBackupSnapshot,
  triggerJsonDownload,
  triggerSelectiveJsonDownload,
} from '../utils/backup';
import { extractPlainText, sanitizeNoteHtml } from '../utils/richText';

const MAX_ACTIVITIES = 100;

function createActivity(
  type: ActivityEventType,
  title: string,
  detail: string,
  route: ActivityItem['route']
): ActivityItem {
  return {
    id: generateId('act'),
    type,
    title,
    detail,
    timestamp: new Date().toISOString(),
    route,
  };
}

const STORAGE_KEY = 'nexora_workspace_v1';
const POMODORO_ROUND_KEY = 'nexora_pomodoro_round_v1';

function getModeDurationMinutes(mode: TimerMode, settings: UserSettings): number {
  switch (mode) {
    case 'focus':
      return settings.focusMinutes;
    case 'deep':
      return settings.deepWorkMinutes;
    case 'short-break':
      return settings.shortBreakMinutes;
    case 'long-break':
      return settings.longBreakMinutes;
  }
}

function createInitialTimer(settings: UserSettings, pomodoroRoundCount: number = 0): TimerRuntimeState {
  const secs = settings.focusMinutes * 60;
  return {
    mode: 'focus',
    status: 'idle',
    durationSeconds: secs,
    remainingSeconds: secs,
    startedAtTimestamp: null,
    targetEndTimestamp: null,
    linkedTaskId: null,
    linkedBlockId: null,
    intention: '',
    pomodoroRoundCount: Math.max(0, Math.min(4, pomodoroRoundCount)),
  };
}

interface WorkspaceContextValue {
  hydrated: boolean;
  tasks: PlannerTask[];
  timeBlocks: TimeBlock[];
  events: CalendarEvent[];
  sessions: FocusSession[];
  goals: ProductivityGoal[];
  notes: SmartNote[];
  storageEngine: 'IndexedDB' | 'LocalStorage';
  notesStorageEngine: 'IndexedDB' | 'LocalStorage';
  activities: ActivityItem[];
  settings: UserSettings;
  snapshots: BackupSnapshot[];
  syncMeta: SyncMetadata;
  estimatedStorageBytes: number;
  timer: TimerRuntimeState;
  toasts: ToastMessage[];
  lastCompletedSession: FocusSession | null;
  resolvedTheme: 'light' | 'dark';

  // Task actions
  addTask: (input: CreateTaskInput) => PlannerTask;
  updateTask: (id: string, patch: Partial<Omit<PlannerTask, 'id' | 'createdAt'>>) => void;
  toggleTaskComplete: (id: string) => void;
  toggleTaskSubtask: (taskId: string, subtaskId: string) => void;
  deleteTask: (id: string) => void;

  // TimeBlock actions
  addTimeBlock: (input: Omit<TimeBlock, 'id'>) => TimeBlock;
  updateTimeBlock: (id: string, patch: Partial<Omit<TimeBlock, 'id'>>) => void;
  setTimeBlockStatus: (id: string, status: TimeBlockStatus) => void;
  deleteTimeBlock: (id: string) => void;

  // Calendar Event actions
  addEvent: (input: CreateEventInput) => CalendarEvent;
  updateEvent: (id: string, patch: Partial<Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>>) => void;
  deleteEvent: (id: string) => void;

  // Goal & Milestone actions
  addGoal: (input: CreateGoalInput) => ProductivityGoal;
  updateGoal: (
    id: string,
    patch: Partial<Omit<ProductivityGoal, 'id' | 'createdAt' | 'updatedAt'>>
  ) => void;
  incrementGoalProgress: (id: string, delta?: number) => void;
  setGoalProgress: (id: string, nextValue: number) => void;
  toggleGoalComplete: (id: string) => void;
  toggleGoalMilestone: (goalId: string, milestoneId: string) => void;
  addGoalMilestone: (goalId: string, title: string, targetDate?: string | null) => void;
  deleteGoalMilestone: (goalId: string, milestoneId: string) => void;
  deleteGoal: (id: string) => void;

  // Smart Notes actions (IndexedDB-persisted)
  addNote: (input?: CreateNoteInput) => SmartNote;
  updateNote: (
    id: string,
    patch: Partial<Pick<SmartNote, 'title' | 'contentHtml' | 'color' | 'pinned'>>
  ) => void;
  togglePinNote: (id: string) => void;
  duplicateNote: (id: string) => SmartNote | null;
  deleteNote: (id: string) => void;

  // Timer & Focus Session actions
  setTimerMode: (mode: TimerMode) => void;
  setCustomTimerMinutes: (minutes: number) => void;
  setTimerLink: (params: { taskId?: string | null; blockId?: string | null; intention?: string }) => void;
  launchFocusForItem: (params: { taskId?: string | null; blockId?: string | null; minutes?: number; intention?: string }) => void;
  startTimer: () => void;
  pauseTimer: () => void;
  resetTimer: () => void;
  resetPomodoroRound: () => void;
  nextRecommendedBreakMode: 'short-break' | 'long-break';
  completeTimerEarly: () => void;
  dismissCompletedSessionBanner: () => void;
  deleteSession: (id: string) => void;

  // Settings, Backups & Cloud Sync Abstraction actions
  updateSettings: (patch: Partial<UserSettings>) => void;
  updateNotificationPreferences: (patch: Partial<NotificationPreferences>) => void;
  toggleThemeQuick: () => void;
  exportBackup: () => void;
  exportSelectiveBackup: (
    collections: Array<'tasks' | 'notes' | 'goals' | 'events' | 'timeBlocks' | 'sessions' | 'settings'>
  ) => void;
  importBackup: (incoming: WorkspaceData, strategy: 'merge' | 'replace') => void;
  createSnapshot: (
    label?: string,
    source?: 'manual' | 'pre-import' | 'auto-safety'
  ) => Promise<BackupSnapshot>;
  restoreSnapshot: (snapshotId: string, strategy: 'merge' | 'replace') => void;
  deleteSnapshot: (snapshotId: string) => Promise<void>;
  setConflictStrategy: (strategy: ConflictResolutionStrategy) => void;
  checkpointSyncOutbox: () => Promise<void>;
  markExternalSyncComplete: (providerId: string, syncedAt?: string) => void;
  getWorkspaceSnapshot: () => WorkspaceData;
  resetToSampleData: () => void;
  clearAllData: () => void;

  // Toast actions
  pushToast: (toast: Omit<ToastMessage, 'id'>) => void;
  dismissToast: (id: string) => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hydrated, setHydrated] = useState(false);
  const [workspace, setWorkspace] = useState<WorkspaceData>(() => createSeedWorkspaceData());
  const [snapshots, setSnapshots] = useState<BackupSnapshot[]>([]);
  const [syncMeta, setSyncMeta] = useState<SyncMetadata>(() => createInitialSyncMetadata());
  const [timer, setTimer] = useState<TimerRuntimeState>(() => createInitialTimer(DEFAULT_SETTINGS));
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [lastCompletedSession, setLastCompletedSession] = useState<FocusSession | null>(null);
  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(() =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
  );

  const workspaceRef = useRef(workspace);
  workspaceRef.current = workspace;
  const syncMetaRef = useRef(syncMeta);
  syncMetaRef.current = syncMeta;
  const skipFirstPersistRef = useRef(true);

  const pushToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = generateId('toast');
    setToasts((prev) => [...prev.slice(-2), { ...toast, id }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 3600);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  // Hydrate all collections, snapshots, and sync metadata from unified IndexedDB (with legacy migration)
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const [workspaceResult, loadedSnapshots, loadedSyncMeta, rawPomodoroRound] =
          await Promise.all([
            workspaceDb.loadWorkspace(),
            workspaceDb.loadSnapshots(),
            workspaceDb.loadSyncMeta(),
            storageAdapter.getItem(POMODORO_ROUND_KEY),
          ]);
        if (!active) return;

        let savedRoundCount = 0;
        if (rawPomodoroRound) {
          try {
            const parsedRound = JSON.parse(rawPomodoroRound) as { date?: string; count?: number };
            if (parsedRound.date === getTodayISO() && typeof parsedRound.count === 'number') {
              savedRoundCount = Math.max(0, Math.min(4, Math.floor(parsedRound.count)));
            }
          } catch {
            savedRoundCount = 0;
          }
        }

        if (workspaceResult.data) {
          setWorkspace(workspaceResult.data);
          setTimer(createInitialTimer(workspaceResult.data.settings, savedRoundCount));
        } else {
          const seed = createSeedWorkspaceData();
          setWorkspace(seed);
          setTimer(createInitialTimer(seed.settings, savedRoundCount));
          await workspaceDb.saveAllCollections(seed);
        }

        setSnapshots(loadedSnapshots);
        setSyncMeta(loadedSyncMeta);
      } catch {
        const seed = createSeedWorkspaceData();
        if (active) {
          setWorkspace(seed);
          setTimer(createInitialTimer(seed.settings, 0));
        }
      } finally {
        if (active) setHydrated(true);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  // Persist today's 4-cycle Pomodoro round progress
  useEffect(() => {
    if (!hydrated) return;
    void storageAdapter.setItem(
      POMODORO_ROUND_KEY,
      JSON.stringify({ date: getTodayISO(), count: timer.pomodoroRoundCount })
    );
  }, [timer.pomodoroRoundCount, hydrated]);

  // Persist all collections atomically to unified IndexedDB + track Sync Outbox revision
  useEffect(() => {
    if (!hydrated) return;
    if (skipFirstPersistRef.current) {
      skipFirstPersistRef.current = false;
      return;
    }

    void workspaceDb.saveAllCollections(workspace);

    // Keep legacy localStorage mirror compactly synced for cross-tab/emergency resilience
    const { notes: _omitNotes, ...restForStorage } = workspace;
    void storageAdapter.setItem(STORAGE_KEY, JSON.stringify(restForStorage));

    const nowIso = new Date().toISOString();
    setSyncMeta((prev) => {
      const nextRev = prev.localRevision + 1;
      const entry = {
        id: generateId('out'),
        collection: 'tasks' as WorkspaceCollectionKey,
        revision: nextRev,
        timestamp: nowIso,
        operation: 'upsert' as const,
      };
      const nextMeta: SyncMetadata = {
        ...prev,
        localRevision: nextRev,
        lastLocalWriteAt: nowIso,
        pendingOutbox: [entry, ...prev.pendingOutbox].slice(0, 25),
      };
      void workspaceDb.saveSyncMeta(nextMeta);
      return nextMeta;
    });
  }, [
    workspace.tasks,
    workspace.timeBlocks,
    workspace.events,
    workspace.sessions,
    workspace.goals,
    workspace.notes,
    workspace.activities,
    workspace.settings,
    hydrated,
  ]);

  // Watch system color scheme preference
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e: MediaQueryListEvent) => setSystemPrefersDark(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const resolvedTheme: 'light' | 'dark' = useMemo(() => {
    if (workspace.settings.theme === 'system') {
      return systemPrefersDark ? 'dark' : 'light';
    }
    return workspace.settings.theme;
  }, [workspace.settings.theme, systemPrefersDark]);

  // Synchronize HTML class + theme-color meta tag for PWA / Android status bar
  useEffect(() => {
    const root = document.documentElement;
    if (resolvedTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    const themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) {
      themeMeta.setAttribute('content', resolvedTheme === 'dark' ? '#070B19' : '#EFF4FC');
    }
  }, [resolvedTheme]);

  // Finalize a completed or manually finished timer session
  const finalizeSession = useCallback(
    (snapshot: TimerRuntimeState, elapsedOverrideSeconds?: number) => {
      const currentWorkspace = workspaceRef.current;
      const elapsedSecs =
        elapsedOverrideSeconds !== undefined
          ? elapsedOverrideSeconds
          : snapshot.durationSeconds - snapshot.remainingSeconds;
      const loggedMinutes = Math.max(1, Math.round(elapsedSecs / 60));

      const linkedTask = snapshot.linkedTaskId
        ? currentWorkspace.tasks.find((t) => t.id === snapshot.linkedTaskId) ?? null
        : null;
      const linkedBlock = snapshot.linkedBlockId
        ? currentWorkspace.timeBlocks.find((b) => b.id === snapshot.linkedBlockId) ?? null
        : null;

      const category: TaskCategory = linkedBlock?.category ?? linkedTask?.category ?? 'Deep Work';
      const linkedTitle =
        linkedBlock?.title ??
        linkedTask?.title ??
        (snapshot.mode === 'short-break'
          ? 'Short Break'
          : snapshot.mode === 'long-break'
            ? 'Long Break'
            : snapshot.mode === 'deep'
              ? 'Deep Work Cycle'
              : 'Focus Session');

      const endedAt = new Date().toISOString();
      const startedAt = snapshot.startedAtTimestamp
        ? new Date(snapshot.startedAtTimestamp).toISOString()
        : new Date(Date.now() - loggedMinutes * 60 * 1000).toISOString();

      const session: FocusSession = {
        id: generateId('sess'),
        startedAt,
        endedAt,
        date: getTodayISO(),
        durationMinutes: loggedMinutes,
        mode: snapshot.mode,
        category,
        linkedTaskId: linkedTask?.id ?? null,
        linkedBlockId: linkedBlock?.id ?? null,
        linkedTitle,
        intention: snapshot.intention.trim(),
        completed: true,
      };

      const isBreakSession = snapshot.mode === 'short-break' || snapshot.mode === 'long-break';
      const sessionActivity = createActivity(
        'session_logged',
        isBreakSession
          ? `Completed ${loggedMinutes}m break`
          : `Logged ${loggedMinutes}m ${snapshot.mode === 'deep' ? 'Deep Work' : 'Focus'} session`,
        linkedTitle,
        '/history'
      );

      setWorkspace((prev) => ({
        ...prev,
        sessions: [session, ...prev.sessions],
        timeBlocks: linkedBlock
          ? prev.timeBlocks.map((b) =>
              b.id === linkedBlock.id ? { ...b, status: 'completed' } : b
            )
          : prev.timeBlocks,
        activities: [sessionActivity, ...prev.activities].slice(0, MAX_ACTIVITIES),
      }));

      setLastCompletedSession(session);

      const isBreak = snapshot.mode === 'short-break' || snapshot.mode === 'long-break';
      const nextRoundCount = !isBreak
        ? snapshot.pomodoroRoundCount >= 4
          ? 1
          : snapshot.pomodoroRoundCount + 1
        : snapshot.mode === 'long-break'
          ? 0
          : snapshot.pomodoroRoundCount;
      const earnedLongBreak = !isBreak && nextRoundCount >= 4;

      if (currentWorkspace.settings.soundEnabled) {
        playCompletionChime(isBreak ? 'break-done' : 'focus-done');
      }
      hapticsAdapter.trigger('success', currentWorkspace.settings.hapticsEnabled);
      const notifPrefs = currentWorkspace.settings.notificationPreferences;
      sendSessionNotification(
        isBreak
          ? snapshot.mode === 'long-break'
            ? 'Long Break Complete — NEXORA'
            : 'Short Break Complete — NEXORA'
          : earnedLongBreak
            ? 'Pomodoro Set Complete (4/4) — NEXORA'
            : `Focus Cycle ${nextRoundCount}/4 Complete — NEXORA`,
        isBreak
          ? `${linkedTitle} (${loggedMinutes} min) finished. Ready for your next focus sprint.`
          : earnedLongBreak
            ? `${linkedTitle} (${loggedMinutes} min) recorded. You earned a ${currentWorkspace.settings.longBreakMinutes}m long break.`
            : `${linkedTitle} (${loggedMinutes} min) recorded. Take a ${currentWorkspace.settings.shortBreakMinutes}m short break.`,
        currentWorkspace.settings.notificationsEnabled && notifPrefs.focusSessionAlerts,
        {
          enabled: notifPrefs.quietHoursEnabled,
          start: notifPrefs.quietHoursStart,
          end: notifPrefs.quietHoursEnd,
        }
      );

      pushToast({
        title: isBreak
          ? snapshot.mode === 'long-break'
            ? 'Long break finished · Cycle reset'
            : 'Short break finished'
          : earnedLongBreak
            ? 'Cycle 4/4 complete · Long break earned'
            : `Focus cycle ${nextRoundCount}/4 logged`,
        description: `${linkedTitle} · ${loggedMinutes} min recorded`,
        tone: 'success',
      });

      // Optionally auto-start Short Break (rounds 1-3) or Long Break (round 4) after work session
      if (!isBreak && currentWorkspace.settings.autoStartBreaks) {
        const nextBreakMode: TimerMode = earnedLongBreak ? 'long-break' : 'short-break';
        const breakSecs =
          (earnedLongBreak
            ? currentWorkspace.settings.longBreakMinutes
            : currentWorkspace.settings.shortBreakMinutes) * 60;
        const now = Date.now();
        setTimer({
          mode: nextBreakMode,
          status: 'running',
          durationSeconds: breakSecs,
          remainingSeconds: breakSecs,
          startedAtTimestamp: now,
          targetEndTimestamp: now + breakSecs * 1000,
          linkedTaskId: snapshot.linkedTaskId,
          linkedBlockId: snapshot.linkedBlockId,
          intention: '',
          pomodoroRoundCount: nextRoundCount,
        });
      } else {
        setTimer((prev) => ({
          ...prev,
          status: 'completed',
          remainingSeconds: 0,
          targetEndTimestamp: null,
          pomodoroRoundCount: nextRoundCount,
        }));
      }
    },
    [pushToast]
  );

  // Timestamp-driven tick loop + visibilitychange sync (prevents mobile WebView drift)
  useEffect(() => {
    if (timer.status !== 'running' || !timer.targetEndTimestamp) {
      return;
    }

    const syncTick = () => {
      setTimer((prev) => {
        if (prev.status !== 'running' || !prev.targetEndTimestamp) return prev;
        const remainingMs = prev.targetEndTimestamp - Date.now();
        if (remainingMs <= 0) {
          // Schedule completion side effects outside state updater
          window.setTimeout(() => finalizeSession(prev, prev.durationSeconds), 0);
          return {
            ...prev,
            status: 'completed',
            remainingSeconds: 0,
            targetEndTimestamp: null,
          };
        }
        const nextSeconds = Math.ceil(remainingMs / 1000);
        if (nextSeconds === prev.remainingSeconds) return prev;
        return { ...prev, remainingSeconds: nextSeconds };
      });
    };

    const intervalId = window.setInterval(syncTick, 250);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        syncTick();
      }
    };
    const onNativeResume = () => {
      syncTick();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('nexora:app-resume', onNativeResume);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('nexora:app-resume', onNativeResume);
    };
  }, [timer.status, timer.targetEndTimestamp, finalizeSession]);

  // Update browser document title when timer is actively running
  useEffect(() => {
    if (timer.status === 'running') {
      const m = String(Math.floor(timer.remainingSeconds / 60)).padStart(2, '0');
      const s = String(timer.remainingSeconds % 60).padStart(2, '0');
      document.title = `${m}:${s} · NEXORA`;
    } else {
      document.title = 'NEXORA — Focus Timer & Daily Planner';
    }
  }, [timer.status, timer.remainingSeconds]);

  // Task handlers
  const addTask = useCallback(
    (input: CreateTaskInput): PlannerTask => {
      const created: PlannerTask = {
        ...input,
        id: generateId('task'),
        dueTime: input.dueTime ?? null,
        subtasks: input.subtasks ?? [],
        completed: false,
        completedAt: null,
        createdAt: new Date().toISOString(),
      };
      const event = createActivity('task_created', 'Added new task', created.title, '/tasks');
      setWorkspace((prev) => ({
        ...prev,
        tasks: [created, ...prev.tasks],
        activities: [event, ...prev.activities].slice(0, MAX_ACTIVITIES),
      }));
      hapticsAdapter.trigger('light', workspaceRef.current.settings.hapticsEnabled);
      pushToast({ title: 'Task added', description: created.title, tone: 'neutral' });
      return created;
    },
    [pushToast]
  );

  const updateTask = useCallback(
    (id: string, patch: Partial<Omit<PlannerTask, 'id' | 'createdAt'>>) => {
      setWorkspace((prev) => ({
        ...prev,
        tasks: prev.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
      }));
      pushToast({ title: 'Task updated', tone: 'neutral' });
    },
    [pushToast]
  );

  const toggleTaskComplete = useCallback((id: string) => {
    setWorkspace((prev) => {
      let completionEvent: ActivityItem | null = null;
      const nextTasks = prev.tasks.map((t) => {
        if (t.id !== id) return t;
        const nextCompleted = !t.completed;
        if (nextCompleted) {
          completionEvent = createActivity('task_completed', 'Completed task', t.title, '/tasks');
        }
        return {
          ...t,
          completed: nextCompleted,
          completedAt: nextCompleted ? new Date().toISOString() : null,
        };
      });
      return {
        ...prev,
        tasks: nextTasks,
        activities: completionEvent
          ? [completionEvent, ...prev.activities].slice(0, MAX_ACTIVITIES)
          : prev.activities,
      };
    });
    hapticsAdapter.trigger('light', workspaceRef.current.settings.hapticsEnabled);
  }, []);

  const toggleTaskSubtask = useCallback((taskId: string, subtaskId: string) => {
    setWorkspace((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) => {
        if (t.id !== taskId) return t;
        return {
          ...t,
          subtasks: t.subtasks.map((s) =>
            s.id === subtaskId ? { ...s, completed: !s.completed } : s
          ),
        };
      }),
    }));
    hapticsAdapter.trigger('light', workspaceRef.current.settings.hapticsEnabled);
  }, []);

  const deleteTask = useCallback(
    (id: string) => {
      setWorkspace((prev) => ({
        ...prev,
        tasks: prev.tasks.filter((t) => t.id !== id),
        timeBlocks: prev.timeBlocks.map((b) =>
          b.linkedTaskId === id ? { ...b, linkedTaskId: null } : b
        ),
      }));
      setTimer((prev) => (prev.linkedTaskId === id ? { ...prev, linkedTaskId: null } : prev));
      pushToast({ title: 'Task removed', tone: 'neutral' });
    },
    [pushToast]
  );

  // TimeBlock handlers
  const addTimeBlock = useCallback(
    (input: Omit<TimeBlock, 'id'>): TimeBlock => {
      const created: TimeBlock = {
        ...input,
        id: generateId('blk'),
      };
      const event = createActivity(
        'block_scheduled',
        'Scheduled time block',
        `${created.title} · ${created.durationMinutes}m`,
        '/calendar'
      );
      setWorkspace((prev) => ({
        ...prev,
        timeBlocks: [...prev.timeBlocks, created].sort((a, b) => a.startMinute - b.startMinute),
        activities: [event, ...prev.activities].slice(0, MAX_ACTIVITIES),
      }));
      hapticsAdapter.trigger('light', workspaceRef.current.settings.hapticsEnabled);
      pushToast({ title: 'Time block scheduled', description: created.title, tone: 'neutral' });
      return created;
    },
    [pushToast]
  );

  const updateTimeBlock = useCallback(
    (id: string, patch: Partial<Omit<TimeBlock, 'id'>>) => {
      setWorkspace((prev) => ({
        ...prev,
        timeBlocks: prev.timeBlocks
          .map((b) => (b.id === id ? { ...b, ...patch } : b))
          .sort((a, b) => a.startMinute - b.startMinute),
      }));
      pushToast({ title: 'Time block updated', tone: 'neutral' });
    },
    [pushToast]
  );

  const setTimeBlockStatus = useCallback((id: string, status: TimeBlockStatus) => {
    setWorkspace((prev) => {
      let blockEvent: ActivityItem | null = null;
      const nextBlocks = prev.timeBlocks.map((b) => {
        if (b.id !== id) return b;
        if (status === 'completed' && b.status !== 'completed') {
          blockEvent = createActivity(
            'block_completed',
            'Finished scheduled block',
            `${b.title} · ${b.durationMinutes}m`,
            '/calendar'
          );
        }
        return { ...b, status };
      });
      return {
        ...prev,
        timeBlocks: nextBlocks,
        activities: blockEvent
          ? [blockEvent, ...prev.activities].slice(0, MAX_ACTIVITIES)
          : prev.activities,
      };
    });
    hapticsAdapter.trigger('light', workspaceRef.current.settings.hapticsEnabled);
  }, []);

  const deleteTimeBlock = useCallback(
    (id: string) => {
      setWorkspace((prev) => ({
        ...prev,
        timeBlocks: prev.timeBlocks.filter((b) => b.id !== id),
      }));
      setTimer((prev) => (prev.linkedBlockId === id ? { ...prev, linkedBlockId: null } : prev));
      pushToast({ title: 'Time block removed', tone: 'neutral' });
    },
    [pushToast]
  );

  // Calendar Event handlers
  const addEvent = useCallback(
    (input: CreateEventInput): CalendarEvent => {
      const now = new Date().toISOString();
      const created: CalendarEvent = {
        ...input,
        id: generateId('evt'),
        createdAt: now,
        updatedAt: now,
      };
      const activity = createActivity(
        'event_created',
        'Scheduled calendar event',
        `${created.title} · ${created.date}`,
        '/calendar'
      );
      setWorkspace((prev) => ({
        ...prev,
        events: [...prev.events, created].sort((a, b) =>
          a.date !== b.date ? a.date.localeCompare(b.date) : a.startMinute - b.startMinute
        ),
        activities: [activity, ...prev.activities].slice(0, MAX_ACTIVITIES),
      }));
      hapticsAdapter.trigger('light', workspaceRef.current.settings.hapticsEnabled);
      pushToast({ title: 'Event scheduled', description: created.title, tone: 'success' });
      return created;
    },
    [pushToast]
  );

  const updateEvent = useCallback(
    (id: string, patch: Partial<Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>>) => {
      const now = new Date().toISOString();
      setWorkspace((prev) => ({
        ...prev,
        events: prev.events
          .map((ev) => (ev.id === id ? { ...ev, ...patch, updatedAt: now } : ev))
          .sort((a, b) =>
            a.date !== b.date ? a.date.localeCompare(b.date) : a.startMinute - b.startMinute
          ),
      }));
      pushToast({ title: 'Event updated', tone: 'neutral' });
    },
    [pushToast]
  );

  const deleteEvent = useCallback(
    (id: string) => {
      setWorkspace((prev) => ({
        ...prev,
        events: prev.events.filter((ev) => ev.id !== id),
      }));
      pushToast({ title: 'Event deleted', tone: 'neutral' });
    },
    [pushToast]
  );

  // Goal & Milestone handlers
  const addGoal = useCallback(
    (input: CreateGoalInput): ProductivityGoal => {
      const now = new Date().toISOString();
      const milestones: GoalMilestone[] = input.milestones ?? [];
      const progressMode =
        input.progressMode === 'milestones' && milestones.length > 0 ? 'milestones' : 'numeric';
      const target =
        progressMode === 'milestones'
          ? milestones.length
          : Math.max(1, Math.round(input.targetValue));
      const current =
        progressMode === 'milestones'
          ? milestones.filter((m) => m.completed).length
          : Math.max(0, Math.min(target, Math.round(input.currentValue)));
      const created: ProductivityGoal = {
        ...input,
        id: generateId('goal'),
        description: input.description?.trim() ?? '',
        milestones,
        progressMode,
        currentValue: current,
        targetValue: target,
        completed: current >= target,
        createdAt: now,
        updatedAt: now,
      };
      const event = createActivity(
        'goal_created',
        'Created goal',
        `${created.title} (${created.currentValue}/${created.targetValue} ${created.unit})`,
        '/goals'
      );
      setWorkspace((prev) => ({
        ...prev,
        goals: [created, ...prev.goals],
        activities: [event, ...prev.activities].slice(0, MAX_ACTIVITIES),
      }));
      hapticsAdapter.trigger('light', workspaceRef.current.settings.hapticsEnabled);
      pushToast({ title: 'Goal created', description: created.title, tone: 'success' });
      return created;
    },
    [pushToast]
  );

  const updateGoal = useCallback(
    (
      id: string,
      patch: Partial<Omit<ProductivityGoal, 'id' | 'createdAt' | 'updatedAt'>>
    ) => {
      setWorkspace((prev) => ({
        ...prev,
        goals: prev.goals.map((g) => {
          if (g.id !== id) return g;
          const nextMilestones = patch.milestones ?? g.milestones;
          const requestedMode = patch.progressMode ?? g.progressMode;
          const progressMode =
            requestedMode === 'milestones' && nextMilestones.length > 0
              ? 'milestones'
              : 'numeric';
          const target =
            progressMode === 'milestones'
              ? nextMilestones.length
              : Math.max(1, Math.round(patch.targetValue ?? g.targetValue));
          const current =
            progressMode === 'milestones'
              ? nextMilestones.filter((m) => m.completed).length
              : Math.max(0, Math.min(target, Math.round(patch.currentValue ?? g.currentValue)));
          const completed = patch.completed !== undefined ? patch.completed : current >= target;
          return {
            ...g,
            ...patch,
            milestones: nextMilestones,
            progressMode,
            targetValue: target,
            currentValue: current,
            completed,
            updatedAt: new Date().toISOString(),
          };
        }),
      }));
      pushToast({ title: 'Goal updated', tone: 'neutral' });
    },
    [pushToast]
  );

  const setGoalProgress = useCallback(
    (id: string, nextValue: number) => {
      const existing = workspaceRef.current.goals.find((g) => g.id === id);
      if (!existing) return;
      const clamped = Math.max(0, Math.min(existing.targetValue, Math.round(nextValue)));
      if (clamped === existing.currentValue) return;
      const justCompleted = clamped >= existing.targetValue && !existing.completed;

      const event = createActivity(
        justCompleted ? 'goal_completed' : 'goal_progress',
        justCompleted
          ? 'Achieved goal target'
          : `Updated goal to ${clamped} / ${existing.targetValue} ${existing.unit}`,
        existing.title,
        '/goals'
      );

      setWorkspace((prev) => ({
        ...prev,
        goals: prev.goals.map((g) =>
          g.id === id
            ? {
                ...g,
                currentValue: clamped,
                completed: clamped >= g.targetValue,
                updatedAt: new Date().toISOString(),
              }
            : g
        ),
        activities: [event, ...prev.activities].slice(0, MAX_ACTIVITIES),
      }));

      hapticsAdapter.trigger(
        justCompleted ? 'success' : 'light',
        workspaceRef.current.settings.hapticsEnabled
      );

      if (justCompleted) {
        pushToast({
          title: 'Goal completed',
          description: `${existing.title} (${clamped}/${existing.targetValue} ${existing.unit})`,
          tone: 'success',
        });
      }
    },
    [pushToast]
  );

  const incrementGoalProgress = useCallback(
    (id: string, delta: number = 1) => {
      const existing = workspaceRef.current.goals.find((g) => g.id === id);
      if (!existing) return;
      setGoalProgress(id, existing.currentValue + delta);
    },
    [setGoalProgress]
  );

  const toggleGoalMilestone = useCallback(
    (goalId: string, milestoneId: string) => {
      const existing = workspaceRef.current.goals.find((g) => g.id === goalId);
      if (!existing) return;
      const targetMilestone = existing.milestones.find((m) => m.id === milestoneId);
      if (!targetMilestone) return;

      const nextMilestones = existing.milestones.map((m) =>
        m.id === milestoneId ? { ...m, completed: !m.completed } : m
      );
      const completedCount = nextMilestones.filter((m) => m.completed).length;
      const nextCurrent =
        existing.progressMode === 'milestones' ? completedCount : existing.currentValue;
      const nextTarget =
        existing.progressMode === 'milestones'
          ? Math.max(1, nextMilestones.length)
          : existing.targetValue;
      const nextCompleted =
        existing.progressMode === 'milestones'
          ? completedCount >= nextMilestones.length && nextMilestones.length > 0
          : existing.completed;
      const milestoneJustDone = !targetMilestone.completed;
      const goalJustDone = nextCompleted && !existing.completed;

      const activity = goalJustDone
        ? createActivity('goal_completed', 'Achieved goal target', existing.title, '/goals')
        : milestoneJustDone
          ? createActivity(
              'milestone_completed',
              'Completed milestone',
              `${targetMilestone.title} · ${existing.title}`,
              '/goals'
            )
          : null;

      setWorkspace((prev) => ({
        ...prev,
        goals: prev.goals.map((g) =>
          g.id === goalId
            ? {
                ...g,
                milestones: nextMilestones,
                currentValue: nextCurrent,
                targetValue: nextTarget,
                completed: nextCompleted,
                updatedAt: new Date().toISOString(),
              }
            : g
        ),
        activities: activity
          ? [activity, ...prev.activities].slice(0, MAX_ACTIVITIES)
          : prev.activities,
      }));

      hapticsAdapter.trigger(
        goalJustDone ? 'success' : 'light',
        workspaceRef.current.settings.hapticsEnabled
      );

      if (goalJustDone) {
        pushToast({
          title: 'Goal completed',
          description: `All milestones achieved for ${existing.title}`,
          tone: 'success',
        });
      }
    },
    [pushToast]
  );

  const addGoalMilestone = useCallback(
    (goalId: string, title: string, targetDate: string | null = null) => {
      const clean = title.trim();
      if (!clean) return;
      const newMilestone: GoalMilestone = {
        id: generateId('ms'),
        title: clean,
        completed: false,
        targetDate,
      };
      setWorkspace((prev) => ({
        ...prev,
        goals: prev.goals.map((g) => {
          if (g.id !== goalId) return g;
          const nextMilestones = [...g.milestones, newMilestone];
          const isMilestoneMode = g.progressMode === 'milestones';
          const nextTarget = isMilestoneMode ? nextMilestones.length : g.targetValue;
          const nextCurrent = isMilestoneMode
            ? nextMilestones.filter((m) => m.completed).length
            : g.currentValue;
          return {
            ...g,
            milestones: nextMilestones,
            targetValue: nextTarget,
            currentValue: nextCurrent,
            completed: isMilestoneMode ? false : g.completed,
            updatedAt: new Date().toISOString(),
          };
        }),
      }));
      hapticsAdapter.trigger('light', workspaceRef.current.settings.hapticsEnabled);
    },
    []
  );

  const deleteGoalMilestone = useCallback((goalId: string, milestoneId: string) => {
    setWorkspace((prev) => ({
      ...prev,
      goals: prev.goals.map((g) => {
        if (g.id !== goalId) return g;
        const nextMilestones = g.milestones.filter((m) => m.id !== milestoneId);
        const stillMilestoneMode = g.progressMode === 'milestones' && nextMilestones.length > 0;
        const nextTarget = stillMilestoneMode ? nextMilestones.length : g.targetValue;
        const nextCurrent = stillMilestoneMode
          ? nextMilestones.filter((m) => m.completed).length
          : Math.min(g.currentValue, nextTarget);
        return {
          ...g,
          milestones: nextMilestones,
          progressMode: stillMilestoneMode ? 'milestones' : 'numeric',
          targetValue: nextTarget,
          currentValue: nextCurrent,
          completed: stillMilestoneMode
            ? nextCurrent >= nextTarget
            : g.completed,
          updatedAt: new Date().toISOString(),
        };
      }),
    }));
  }, []);

  const toggleGoalComplete = useCallback(
    (id: string) => {
      const existing = workspaceRef.current.goals.find((g) => g.id === id);
      if (!existing) return;
      const nextCompleted = !existing.completed;
      const nextMilestones =
        existing.progressMode === 'milestones'
          ? existing.milestones.map((m) => ({ ...m, completed: nextCompleted }))
          : existing.milestones;
      const nextValue = nextCompleted
        ? existing.targetValue
        : existing.progressMode === 'milestones'
          ? 0
          : Math.min(existing.currentValue, Math.max(0, existing.targetValue - 1));

      const event = nextCompleted
        ? createActivity('goal_completed', 'Achieved goal target', existing.title, '/goals')
        : null;

      setWorkspace((prev) => ({
        ...prev,
        goals: prev.goals.map((g) =>
          g.id === id
            ? {
                ...g,
                completed: nextCompleted,
                milestones: nextMilestones,
                currentValue: nextValue,
                updatedAt: new Date().toISOString(),
              }
            : g
        ),
        activities: event
          ? [event, ...prev.activities].slice(0, MAX_ACTIVITIES)
          : prev.activities,
      }));
      hapticsAdapter.trigger(
        nextCompleted ? 'success' : 'light',
        workspaceRef.current.settings.hapticsEnabled
      );
      if (nextCompleted) {
        pushToast({ title: 'Goal completed', description: existing.title, tone: 'success' });
      }
    },
    [pushToast]
  );

  const deleteGoal = useCallback(
    (id: string) => {
      setWorkspace((prev) => ({
        ...prev,
        goals: prev.goals.filter((g) => g.id !== id),
      }));
      pushToast({ title: 'Goal removed', tone: 'neutral' });
    },
    [pushToast]
  );

  // Smart Notes handlers (persisted immediately to IndexedDB)
  const addNote = useCallback(
    (input?: CreateNoteInput): SmartNote => {
      const now = new Date().toISOString();
      const contentHtml = sanitizeNoteHtml(input?.contentHtml ?? '');
      const created: SmartNote = {
        id: generateId('note'),
        title: input?.title?.trim() || 'Untitled note',
        contentHtml,
        plainText: extractPlainText(contentHtml),
        color: input?.color ?? 'violet',
        pinned: Boolean(input?.pinned),
        createdAt: now,
        updatedAt: now,
      };
      const event = createActivity('note_created', 'Created Smart Note', created.title, '/notes');
      setWorkspace((prev) => ({
        ...prev,
        notes: [created, ...prev.notes],
        activities: [event, ...prev.activities].slice(0, MAX_ACTIVITIES),
      }));
      void notesDb.put(created);
      hapticsAdapter.trigger('light', workspaceRef.current.settings.hapticsEnabled);
      return created;
    },
    []
  );

  const updateNote = useCallback(
    (
      id: string,
      patch: Partial<Pick<SmartNote, 'title' | 'contentHtml' | 'color' | 'pinned'>>
    ) => {
      const now = new Date().toISOString();
      let updatedSnapshot: SmartNote | null = null;
      setWorkspace((prev) => ({
        ...prev,
        notes: prev.notes.map((n) => {
          if (n.id !== id) return n;
          const nextHtml =
            patch.contentHtml !== undefined ? sanitizeNoteHtml(patch.contentHtml) : n.contentHtml;
          const nextNote: SmartNote = {
            ...n,
            ...patch,
            contentHtml: nextHtml,
            plainText:
              patch.contentHtml !== undefined ? extractPlainText(nextHtml) : n.plainText,
            updatedAt: now,
          };
          updatedSnapshot = nextNote;
          return nextNote;
        }),
      }));
      if (updatedSnapshot) {
        void notesDb.put(updatedSnapshot);
      }
    },
    []
  );

  const togglePinNote = useCallback(
    (id: string) => {
      const existing = workspaceRef.current.notes.find((n) => n.id === id);
      if (!existing) return;
      const nextPinned = !existing.pinned;
      const updated: SmartNote = {
        ...existing,
        pinned: nextPinned,
        updatedAt: new Date().toISOString(),
      };
      setWorkspace((prev) => ({
        ...prev,
        notes: prev.notes.map((n) => (n.id === id ? updated : n)),
      }));
      void notesDb.put(updated);
      hapticsAdapter.trigger('light', workspaceRef.current.settings.hapticsEnabled);
      pushToast({
        title: nextPinned ? 'Note pinned' : 'Note unpinned',
        description: existing.title || 'Untitled note',
        tone: 'neutral',
      });
    },
    [pushToast]
  );

  const duplicateNote = useCallback(
    (id: string): SmartNote | null => {
      const source = workspaceRef.current.notes.find((n) => n.id === id);
      if (!source) return null;
      const now = new Date().toISOString();
      const copy: SmartNote = {
        ...source,
        id: generateId('note'),
        title: `${source.title || 'Untitled note'} (Copy)`,
        pinned: false,
        createdAt: now,
        updatedAt: now,
      };
      setWorkspace((prev) => ({
        ...prev,
        notes: [copy, ...prev.notes],
      }));
      void notesDb.put(copy);
      pushToast({ title: 'Note duplicated', description: copy.title, tone: 'neutral' });
      return copy;
    },
    [pushToast]
  );

  const deleteNote = useCallback(
    (id: string) => {
      setWorkspace((prev) => ({
        ...prev,
        notes: prev.notes.filter((n) => n.id !== id),
      }));
      void notesDb.remove(id);
      pushToast({ title: 'Note deleted', tone: 'neutral' });
    },
    [pushToast]
  );

  // Timer handlers
  const setTimerMode = useCallback((mode: TimerMode) => {
    const mins = getModeDurationMinutes(mode, workspaceRef.current.settings);
    const secs = mins * 60;
    setLastCompletedSession(null);
    setTimer((prev) => ({
      ...prev,
      mode,
      status: 'idle',
      durationSeconds: secs,
      remainingSeconds: secs,
      startedAtTimestamp: null,
      targetEndTimestamp: null,
    }));
  }, []);

  const setCustomTimerMinutes = useCallback((minutes: number) => {
    const clamped = Math.max(1, Math.min(180, Math.round(minutes)));
    const secs = clamped * 60;
    setLastCompletedSession(null);
    setTimer((prev) => ({
      ...prev,
      status: 'idle',
      durationSeconds: secs,
      remainingSeconds: secs,
      startedAtTimestamp: null,
      targetEndTimestamp: null,
    }));
  }, []);

  const setTimerLink = useCallback(
    (params: { taskId?: string | null; blockId?: string | null; intention?: string }) => {
      setTimer((prev) => ({
        ...prev,
        linkedTaskId: params.taskId !== undefined ? params.taskId : prev.linkedTaskId,
        linkedBlockId: params.blockId !== undefined ? params.blockId : prev.linkedBlockId,
        intention: params.intention !== undefined ? params.intention : prev.intention,
      }));
    },
    []
  );

  const launchFocusForItem = useCallback(
    (params: { taskId?: string | null; blockId?: string | null; minutes?: number; intention?: string }) => {
      const targetMinutes =
        params.minutes && params.minutes >= 5
          ? Math.min(120, params.minutes)
          : workspaceRef.current.settings.focusMinutes;
      const mode: TimerMode = targetMinutes >= 45 ? 'deep' : 'focus';
      const secs = targetMinutes * 60;
      setLastCompletedSession(null);
      setTimer((prev) => ({
        mode,
        status: 'idle',
        durationSeconds: secs,
        remainingSeconds: secs,
        startedAtTimestamp: null,
        targetEndTimestamp: null,
        linkedTaskId: params.taskId ?? null,
        linkedBlockId: params.blockId ?? null,
        intention: params.intention ?? '',
        pomodoroRoundCount: prev.pomodoroRoundCount,
      }));
      if (params.blockId) {
        setWorkspace((prev) => ({
          ...prev,
          timeBlocks: prev.timeBlocks.map((b) =>
            b.id === params.blockId && b.status === 'scheduled'
              ? { ...b, status: 'in-progress' }
              : b
          ),
        }));
      }
    },
    []
  );

  const startTimer = useCallback(() => {
    setLastCompletedSession(null);
    setTimer((prev) => {
      const baseRemaining = prev.status === 'completed' || prev.remainingSeconds <= 0
        ? prev.durationSeconds
        : prev.remainingSeconds;
      const now = Date.now();
      return {
        ...prev,
        status: 'running',
        remainingSeconds: baseRemaining,
        startedAtTimestamp: prev.startedAtTimestamp ?? now,
        targetEndTimestamp: now + baseRemaining * 1000,
      };
    });
    hapticsAdapter.trigger('medium', workspaceRef.current.settings.hapticsEnabled);
  }, []);

  const pauseTimer = useCallback(() => {
    setTimer((prev) => {
      if (prev.status !== 'running') return prev;
      const remaining = prev.targetEndTimestamp
        ? Math.max(1, Math.ceil((prev.targetEndTimestamp - Date.now()) / 1000))
        : prev.remainingSeconds;
      return {
        ...prev,
        status: 'paused',
        remainingSeconds: remaining,
        targetEndTimestamp: null,
      };
    });
    hapticsAdapter.trigger('light', workspaceRef.current.settings.hapticsEnabled);
  }, []);

  const resetTimer = useCallback(() => {
    setLastCompletedSession(null);
    setTimer((prev) => ({
      ...prev,
      status: 'idle',
      remainingSeconds: prev.durationSeconds,
      startedAtTimestamp: null,
      targetEndTimestamp: null,
    }));
  }, []);

  const resetPomodoroRound = useCallback(() => {
    setTimer((prev) => ({
      ...prev,
      pomodoroRoundCount: 0,
    }));
    pushToast({
      title: 'Pomodoro cycle reset',
      description: 'Round counter restarted at 0 of 4.',
      tone: 'neutral',
    });
  }, [pushToast]);

  const nextRecommendedBreakMode: 'short-break' | 'long-break' =
    timer.pomodoroRoundCount >= 4 ? 'long-break' : 'short-break';

  const completeTimerEarly = useCallback(() => {
    setTimer((prev) => {
      const elapsed = Math.max(60, prev.durationSeconds - prev.remainingSeconds);
      window.setTimeout(() => finalizeSession(prev, elapsed), 0);
      return {
        ...prev,
        status: 'completed',
        remainingSeconds: 0,
        targetEndTimestamp: null,
      };
    });
  }, [finalizeSession]);

  const dismissCompletedSessionBanner = useCallback(() => {
    setLastCompletedSession(null);
  }, []);

  const deleteSession = useCallback(
    (id: string) => {
      setWorkspace((prev) => ({
        ...prev,
        sessions: prev.sessions.filter((s) => s.id !== id),
      }));
      pushToast({ title: 'Session entry deleted', tone: 'neutral' });
    },
    [pushToast]
  );

  // Settings, Backups & Cloud Sync Abstraction handlers
  const updateSettings = useCallback((patch: Partial<UserSettings>) => {
    setWorkspace((prev) => {
      const nextSettings: UserSettings = {
        ...prev.settings,
        ...patch,
        notificationPreferences: patch.notificationPreferences
          ? {
              ...prev.settings.notificationPreferences,
              ...patch.notificationPreferences,
            }
          : prev.settings.notificationPreferences,
      };
      setTimer((currentTimer) => {
        if (currentTimer.status !== 'idle') return currentTimer;
        const nextSecs = getModeDurationMinutes(currentTimer.mode, nextSettings) * 60;
        return {
          ...currentTimer,
          durationSeconds: nextSecs,
          remainingSeconds: nextSecs,
        };
      });
      return { ...prev, settings: nextSettings };
    });
  }, []);

  const updateNotificationPreferences = useCallback(
    (patch: Partial<NotificationPreferences>) => {
      setWorkspace((prev) => ({
        ...prev,
        settings: {
          ...prev.settings,
          notificationPreferences: {
            ...prev.settings.notificationPreferences,
            ...patch,
          },
        },
      }));
    },
    []
  );

  const toggleThemeQuick = useCallback(() => {
    const nextTheme: ThemePreference = resolvedTheme === 'dark' ? 'light' : 'dark';
    updateSettings({ theme: nextTheme });
    hapticsAdapter.trigger('light', workspaceRef.current.settings.hapticsEnabled);
  }, [resolvedTheme, updateSettings]);

  const exportBackup = useCallback(() => {
    const filename = triggerJsonDownload(workspaceRef.current);
    pushToast({
      title: 'Backup exported',
      description: `Downloaded ${filename}`,
      tone: 'success',
    });
  }, [pushToast]);

  const exportSelectiveBackup = useCallback(
    (
      collections: Array<
        'tasks' | 'notes' | 'goals' | 'events' | 'timeBlocks' | 'sessions' | 'settings'
      >
    ) => {
      if (collections.length === 0) return;
      const filename = triggerSelectiveJsonDownload(workspaceRef.current, collections);
      pushToast({
        title: 'Selective export ready',
        description: `Downloaded ${filename}`,
        tone: 'success',
      });
    },
    [pushToast]
  );

  const createSnapshot = useCallback(
    async (
      label?: string,
      source: 'manual' | 'pre-import' | 'auto-safety' = 'manual'
    ): Promise<BackupSnapshot> => {
      const snap = createBackupSnapshot(
        workspaceRef.current,
        label || `Restore Point · ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        source
      );
      const updated = await workspaceDb.saveSnapshot(snap);
      setSnapshots(updated);
      if (source === 'manual') {
        pushToast({
          title: 'Local restore point saved',
          description: snap.label,
          tone: 'success',
        });
      }
      return snap;
    },
    [pushToast]
  );

  const deleteSnapshot = useCallback(
    async (snapshotId: string) => {
      const updated = await workspaceDb.deleteSnapshot(snapshotId);
      setSnapshots(updated);
      pushToast({ title: 'Restore point deleted', tone: 'neutral' });
    },
    [pushToast]
  );

  const importBackup = useCallback(
    (incoming: WorkspaceData, strategy: 'merge' | 'replace') => {
      if (strategy === 'replace') {
        // Automatically save a safety restore point before replacing workspace data
        void createSnapshot('Pre-Import Safety Backup', 'pre-import');
        const nextNotes = incoming.notes ?? [];
        const nextEvents = incoming.events ?? [];
        setWorkspace({ ...incoming, notes: nextNotes, events: nextEvents });
        void notesDb.replaceAll(nextNotes);
        setTimer(createInitialTimer(incoming.settings));
        pushToast({
          title: 'Workspace restored',
          description: `Loaded ${incoming.tasks.length} tasks, ${incoming.goals.length} goals, ${nextEvents.length} events, and ${nextNotes.length} notes.`,
          tone: 'success',
        });
        return;
      }

      setWorkspace((prev) => {
        const merged = mergeWorkspaceData(
          prev,
          incoming,
          syncMetaRef.current.conflictStrategy
        );
        void notesDb.replaceAll(merged.notes);
        return merged;
      });
      pushToast({
        title: 'Backup merged',
        description: 'Imported items were combined with your existing workspace.',
        tone: 'success',
      });
    },
    [createSnapshot, pushToast]
  );

  const restoreSnapshot = useCallback(
    (snapshotId: string, strategy: 'merge' | 'replace') => {
      const target = snapshots.find((s) => s.id === snapshotId);
      if (!target) return;
      importBackup(target.data, strategy);
    },
    [snapshots, importBackup]
  );

  const setConflictStrategy = useCallback(
    (strategy: ConflictResolutionStrategy) => {
      setSyncMeta((prev) => {
        const next: SyncMetadata = { ...prev, conflictStrategy: strategy };
        void workspaceDb.saveSyncMeta(next);
        return next;
      });
      pushToast({
        title: 'Sync merge policy updated',
        description: `Conflict strategy set to ${strategy}.`,
        tone: 'neutral',
      });
    },
    [pushToast]
  );

  const checkpointSyncOutbox = useCallback(async () => {
    const res = await defaultLocalSyncAdapter.pushWorkspace(
      workspaceRef.current,
      syncMetaRef.current
    );
    if (res.ok) {
      setSyncMeta((prev) => {
        const next: SyncMetadata = {
          ...prev,
          lastSyncedRevision: prev.localRevision,
          lastSyncedAt: res.syncedAt ?? new Date().toISOString(),
          pendingOutbox: [],
        };
        void workspaceDb.saveSyncMeta(next);
        return next;
      });
      pushToast({
        title: 'Local revision checkpointed',
        description: res.message,
        tone: 'success',
      });
    }
  }, [pushToast]);

  const markExternalSyncComplete = useCallback((providerId: string, syncedAt?: string) => {
    const timestamp = syncedAt ?? new Date().toISOString();
    setSyncMeta((prev) => {
      const next: SyncMetadata = {
        ...prev,
        activeProviderId: providerId,
        lastSyncedRevision: prev.localRevision,
        lastSyncedAt: timestamp,
        pendingOutbox: [],
      };
      void workspaceDb.saveSyncMeta(next);
      return next;
    });
  }, []);

  const getWorkspaceSnapshot = useCallback((): WorkspaceData => workspaceRef.current, []);

  const resetToSampleData = useCallback(() => {
    void createSnapshot('Pre-Reset Safety Backup', 'auto-safety');
    const seed = createSeedWorkspaceData();
    seed.settings.theme = workspaceRef.current.settings.theme;
    setWorkspace(seed);
    void notesDb.replaceAll(seed.notes);
    setTimer(createInitialTimer(seed.settings));
    setLastCompletedSession(null);
    pushToast({
      title: 'Sample workspace restored',
      description: 'Loaded starter schedule, events, tasks, notes, goals, and focus sessions.',
      tone: 'neutral',
    });
  }, [createSnapshot, pushToast]);

  const clearAllData = useCallback(() => {
    void createSnapshot('Pre-Clear Safety Backup', 'auto-safety');
    const preservedTheme = workspaceRef.current.settings.theme;
    const empty: WorkspaceData = {
      tasks: [],
      timeBlocks: [],
      events: [],
      sessions: [],
      goals: [],
      notes: [],
      activities: [],
      settings: { ...DEFAULT_SETTINGS, theme: preservedTheme },
    };
    setWorkspace(empty);
    void notesDb.replaceAll([]);
    setTimer(createInitialTimer(empty.settings));
    setLastCompletedSession(null);
    pushToast({
      title: 'Workspace cleared',
      description: 'All local tasks, notes, goals, events, blocks, and session logs were removed.',
      tone: 'warning',
    });
  }, [createSnapshot, pushToast]);

  const estimatedStorageBytes = useMemo(
    () => workspaceDb.estimateStorageBytes(workspace, snapshots),
    [workspace, snapshots]
  );

  const value: WorkspaceContextValue = {
    hydrated,
    tasks: workspace.tasks,
    timeBlocks: workspace.timeBlocks,
    events: workspace.events,
    sessions: workspace.sessions,
    goals: workspace.goals,
    notes: workspace.notes,
    storageEngine: workspaceDb.getEngine(),
    notesStorageEngine: workspaceDb.getEngine(),
    activities: workspace.activities,
    settings: workspace.settings,
    snapshots,
    syncMeta,
    estimatedStorageBytes,
    timer,
    toasts,
    lastCompletedSession,
    resolvedTheme,
    addTask,
    updateTask,
    toggleTaskComplete,
    toggleTaskSubtask,
    deleteTask,
    addTimeBlock,
    updateTimeBlock,
    setTimeBlockStatus,
    deleteTimeBlock,
    addEvent,
    updateEvent,
    deleteEvent,
    addGoal,
    updateGoal,
    incrementGoalProgress,
    setGoalProgress,
    toggleGoalComplete,
    toggleGoalMilestone,
    addGoalMilestone,
    deleteGoalMilestone,
    deleteGoal,
    addNote,
    updateNote,
    togglePinNote,
    duplicateNote,
    deleteNote,
    setTimerMode,
    setCustomTimerMinutes,
    setTimerLink,
    launchFocusForItem,
    startTimer,
    pauseTimer,
    resetTimer,
    resetPomodoroRound,
    nextRecommendedBreakMode,
    completeTimerEarly,
    dismissCompletedSessionBanner,
    deleteSession,
    updateSettings,
    updateNotificationPreferences,
    toggleThemeQuick,
    exportBackup,
    exportSelectiveBackup,
    importBackup,
    createSnapshot,
    restoreSnapshot,
    deleteSnapshot,
    setConflictStrategy,
    checkpointSyncOutbox,
    markExternalSyncComplete,
    getWorkspaceSnapshot,
    resetToSampleData,
    clearAllData,
    pushToast,
    dismissToast,
  };

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
};

export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error('useWorkspace must be used within WorkspaceProvider');
  }
  return ctx;
}
