import {
  ActivityItem,
  CalendarEvent,
  FocusSession,
  PlannerTask,
  ProductivityGoal,
  SmartNote,
  TimeBlock,
  UserSettings,
  WorkspaceData,
} from '../types/productivity';
import { addDaysISO, getTodayISO } from '../utils/date';
import { extractPlainText } from '../utils/richText';

export const DEFAULT_SETTINGS: UserSettings = {
  theme: 'dark',
  focusMinutes: 25,
  deepWorkMinutes: 50,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  dailyFocusGoalMinutes: 180,
  soundEnabled: true,
  hapticsEnabled: true,
  notificationsEnabled: false,
  autoStartBreaks: false,
  notificationPreferences: {
    focusSessionAlerts: true,
    deadlineReminders: true,
    calendarEventReminders: true,
    eventLeadMinutes: 15,
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '07:00',
  },
};

export function createSeedWorkspaceData(): WorkspaceData {
  const today = getTodayISO();
  const yesterday = addDaysISO(today, -1);
  const twoDaysAgo = addDaysISO(today, -2);
  const threeDaysAgo = addDaysISO(today, -3);
  const fourDaysAgo = addDaysISO(today, -4);
  const tomorrow = addDaysISO(today, 1);

  const tasks: PlannerTask[] = [
    {
      id: 'task_arch_spec',
      title: 'Finalize Q4 system architecture specification',
      notes: 'Review storage adapter boundaries, offline sync invariants, and Android WebView memory targets.',
      date: today,
      dueTime: '17:00',
      priority: 'high',
      category: 'Deep Work',
      estimatedMinutes: 50,
      subtasks: [
        { id: 'sub_arch_1', title: 'Document offline storage contract', completed: true },
        { id: 'sub_arch_2', title: 'Benchmark IndexedDB vs Preferences latency', completed: true },
        { id: 'sub_arch_3', title: 'Sign off Android WebView memory budget', completed: false },
      ],
      completed: false,
      completedAt: null,
      createdAt: `${today}T07:30:00.000Z`,
    },
    {
      id: 'task_sprint_review',
      title: 'Prepare product roadmap briefing notes',
      notes: 'Summarize completed milestones and highlight Q1 engineering capacity trade-offs.',
      date: today,
      dueTime: '11:00',
      priority: 'medium',
      category: 'Planning',
      estimatedMinutes: 25,
      subtasks: [
        { id: 'sub_sprint_1', title: 'Collect completed sprint metrics', completed: true },
        { id: 'sub_sprint_2', title: 'Draft Q1 capacity trade-off slide', completed: true },
      ],
      completed: true,
      completedAt: `${today}T08:45:00.000Z`,
      createdAt: `${today}T07:35:00.000Z`,
    },
    {
      id: 'task_design_audit',
      title: 'Audit mobile touch targets & safe-area spacing',
      notes: 'Verify 44px minimum hitboxes across bottom bar and modal sheets on 390px viewport.',
      date: today,
      dueTime: '15:30',
      priority: 'high',
      category: 'Deep Work',
      estimatedMinutes: 50,
      subtasks: [
        { id: 'sub_audit_1', title: 'Check bottom navigation 44px touch targets', completed: true },
        { id: 'sub_audit_2', title: 'Verify drawer safe-area insets on iOS & Android', completed: false },
      ],
      completed: false,
      completedAt: null,
      createdAt: `${today}T08:00:00.000Z`,
    },
    {
      id: 'task_inbox_triage',
      title: 'Clear vendor invoices & sprint approvals',
      notes: 'Batch administrative replies inside a single 25-minute afternoon window.',
      date: today,
      dueTime: '18:00',
      priority: 'low',
      category: 'Admin',
      estimatedMinutes: 25,
      subtasks: [],
      completed: false,
      completedAt: null,
      createdAt: `${today}T08:15:00.000Z`,
    },
    {
      id: 'task_reading',
      title: 'Evening technical reading: local-first software',
      notes: 'Read chapter on conflict-free state snapshots and schema migrations.',
      date: today,
      dueTime: null,
      priority: 'low',
      category: 'Personal',
      estimatedMinutes: 30,
      subtasks: [],
      completed: false,
      completedAt: null,
      createdAt: `${today}T08:20:00.000Z`,
    },
    {
      id: 'task_overdue_sec',
      title: 'Review dependency security & bundle size report',
      notes: 'Inspect Vite production chunk sizes and prune unused polyfills before release.',
      date: yesterday,
      dueTime: '16:00',
      priority: 'high',
      category: 'Admin',
      estimatedMinutes: 30,
      subtasks: [
        { id: 'sub_sec_1', title: 'Run production bundle breakdown', completed: true },
        { id: 'sub_sec_2', title: 'Verify zero console warnings in strict mode', completed: false },
      ],
      completed: false,
      completedAt: null,
      createdAt: `${twoDaysAgo}T09:00:00.000Z`,
    },
    {
      id: 'task_tomorrow_proto',
      title: 'Build Capacitor Android build pipeline checklist',
      notes: 'Document Gradle signing steps, splash icon dimensions, and status bar color sync.',
      date: tomorrow,
      dueTime: '14:00',
      priority: 'high',
      category: 'Deep Work',
      estimatedMinutes: 50,
      subtasks: [
        { id: 'sub_cap_1', title: 'Verify adaptive maskable launcher icon', completed: true },
        { id: 'sub_cap_2', title: 'Test dark status bar color synchronization', completed: false },
        { id: 'sub_cap_3', title: 'Document signed APK build command', completed: false },
      ],
      completed: false,
      completedAt: null,
      createdAt: `${today}T08:30:00.000Z`,
    },
  ];

  const timeBlocks: TimeBlock[] = [
    {
      id: 'blk_morning_plan',
      date: today,
      title: 'Morning Briefing & Priority Alignment',
      category: 'Planning',
      startMinute: 8 * 60 + 30, // 08:30
      durationMinutes: 30,
      linkedTaskId: 'task_sprint_review',
      status: 'completed',
      notes: 'Confirm top three outcomes before opening email or chat.',
    },
    {
      id: 'blk_deep_arch',
      date: today,
      title: 'Architecture Specification Deep Work',
      category: 'Deep Work',
      startMinute: 9 * 60 + 30, // 09:30
      durationMinutes: 90,
      linkedTaskId: 'task_arch_spec',
      status: 'in-progress',
      notes: 'Two uninterrupted focus cycles with notifications silenced.',
    },
    {
      id: 'blk_mobile_audit',
      date: today,
      title: 'Mobile Ergonomics & Touch Audit',
      category: 'Deep Work',
      startMinute: 13 * 60 + 30, // 13:30
      durationMinutes: 60,
      linkedTaskId: 'task_design_audit',
      status: 'scheduled',
      notes: 'Test planner timeline and bottom sheet interactions on narrow viewports.',
    },
    {
      id: 'blk_admin_batch',
      date: today,
      title: 'Administrative Batch & Approvals',
      category: 'Admin',
      startMinute: 15 * 60 + 30, // 15:30
      durationMinutes: 45,
      linkedTaskId: 'task_inbox_triage',
      status: 'scheduled',
      notes: 'Process pending sign-offs and clear inbox to zero.',
    },
    {
      id: 'blk_tomorrow_cap',
      date: tomorrow,
      title: 'Android Release Pipeline Preparation',
      category: 'Deep Work',
      startMinute: 9 * 60, // 09:00
      durationMinutes: 90,
      linkedTaskId: 'task_tomorrow_proto',
      status: 'scheduled',
      notes: 'Verify Capacitor config and offline asset precaching.',
    },
  ];

  const sessions: FocusSession[] = [
    {
      id: 'sess_today_1',
      startedAt: `${today}T08:30:00.000Z`,
      endedAt: `${today}T08:55:00.000Z`,
      date: today,
      durationMinutes: 25,
      mode: 'focus',
      category: 'Planning',
      linkedTaskId: 'task_sprint_review',
      linkedBlockId: 'blk_morning_plan',
      linkedTitle: 'Prepare product roadmap briefing notes',
      intention: 'Outline Q1 priorities and trim non-essential scope',
      completed: true,
    },
    {
      id: 'sess_today_2',
      startedAt: `${today}T09:30:00.000Z`,
      endedAt: `${today}T10:20:00.000Z`,
      date: today,
      durationMinutes: 50,
      mode: 'deep',
      category: 'Deep Work',
      linkedTaskId: 'task_arch_spec',
      linkedBlockId: 'blk_deep_arch',
      linkedTitle: 'Finalize Q4 system architecture specification',
      intention: 'Draft offline storage contract and migration diagram',
      completed: true,
    },
    {
      id: 'sess_yest_1',
      startedAt: `${yesterday}T09:00:00.000Z`,
      endedAt: `${yesterday}T09:50:00.000Z`,
      date: yesterday,
      durationMinutes: 50,
      mode: 'deep',
      category: 'Deep Work',
      linkedTaskId: null,
      linkedBlockId: null,
      linkedTitle: 'Design token contrast & typography pass',
      intention: 'Audit WCAG AA ratios across light and dark themes',
      completed: true,
    },
    {
      id: 'sess_yest_2',
      startedAt: `${yesterday}T11:00:00.000Z`,
      endedAt: `${yesterday}T11:50:00.000Z`,
      date: yesterday,
      durationMinutes: 50,
      mode: 'deep',
      category: 'Deep Work',
      linkedTaskId: null,
      linkedBlockId: null,
      linkedTitle: 'Component architecture refactor',
      intention: 'Extract platform adapters for Android portability',
      completed: true,
    },
    {
      id: 'sess_yest_3',
      startedAt: `${yesterday}T14:30:00.000Z`,
      endedAt: `${yesterday}T14:55:00.000Z`,
      date: yesterday,
      durationMinutes: 25,
      mode: 'focus',
      category: 'Admin',
      linkedTaskId: null,
      linkedBlockId: null,
      linkedTitle: 'Weekly operations review',
      intention: 'Close open action items and reconcile schedule',
      completed: true,
    },
    {
      id: 'sess_d2_1',
      startedAt: `${twoDaysAgo}T09:15:00.000Z`,
      endedAt: `${twoDaysAgo}T10:05:00.000Z`,
      date: twoDaysAgo,
      durationMinutes: 50,
      mode: 'deep',
      category: 'Deep Work',
      linkedTaskId: null,
      linkedBlockId: null,
      linkedTitle: 'Time-block engine state modeling',
      intention: 'Validate overlap detection and timeline math',
      completed: true,
    },
    {
      id: 'sess_d2_2',
      startedAt: `${twoDaysAgo}T13:00:00.000Z`,
      endedAt: `${twoDaysAgo}T13:50:00.000Z`,
      date: twoDaysAgo,
      durationMinutes: 50,
      mode: 'deep',
      category: 'Planning',
      linkedTaskId: null,
      linkedBlockId: null,
      linkedTitle: 'Quarterly milestone sequencing',
      intention: 'Map dependencies across web and Android release tracks',
      completed: true,
    },
    {
      id: 'sess_d3_1',
      startedAt: `${threeDaysAgo}T10:00:00.000Z`,
      endedAt: `${threeDaysAgo}T10:50:00.000Z`,
      date: threeDaysAgo,
      durationMinutes: 50,
      mode: 'deep',
      category: 'Deep Work',
      linkedTaskId: null,
      linkedBlockId: null,
      linkedTitle: 'PWA caching strategy verification',
      intention: 'Configure Workbox asset precaching and offline shell',
      completed: true,
    },
    {
      id: 'sess_d4_1',
      startedAt: `${fourDaysAgo}T09:30:00.000Z`,
      endedAt: `${fourDaysAgo}T09:55:00.000Z`,
      date: fourDaysAgo,
      durationMinutes: 25,
      mode: 'focus',
      category: 'Personal',
      linkedTaskId: null,
      linkedBlockId: null,
      linkedTitle: 'Research notes synthesis',
      intention: 'Consolidate focus cadence experiments',
      completed: true,
    },
  ];

  const goals = createSeedGoals(today);
  const events = createSeedEvents(today);
  const notes = createSeedNotes();
  const activities = createSeedActivities(today, yesterday);

  return {
    tasks,
    timeBlocks,
    events,
    sessions,
    goals,
    notes,
    activities,
    settings: { ...DEFAULT_SETTINGS },
  };
}

export function createSeedNotes(): SmartNote[] {
  const now = Date.now();
  const hoursAgo = (h: number) => new Date(now - h * 60 * 60 * 1000).toISOString();

  const rawNotes: Array<Omit<SmartNote, 'plainText'>> = [
    {
      id: 'note_arch_blueprint',
      title: 'Q4 Offline-First Architecture Notes',
      color: 'cyan',
      pinned: true,
      createdAt: hoursAgo(26),
      updatedAt: hoursAgo(1.5),
      contentHtml:
        '<h2>Core Storage Boundaries</h2>' +
        '<p>Keep structured productivity entities in fast key-value storage while dedicating <strong>IndexedDB</strong> to rich-text Smart Notes so large documents scale effortlessly offline.</p>' +
        '<blockquote>Every user mutation should complete instantaneously on-device with zero network blocking.</blockquote>' +
        '<ul data-checklist="true">' +
        '<li data-checked="true"><input type="checkbox" checked="checked" contenteditable="false" /> Isolate platform storage &amp; haptics adapters</li>' +
        '<li data-checked="true"><input type="checkbox" checked="checked" contenteditable="false" /> Verify IndexedDB fallback in restricted contexts</li>' +
        '<li><input type="checkbox" contenteditable="false" /> Benchmark Android Capacitor cold start under 600ms</li>' +
        '</ul>' +
        '<pre><code>// Versioned backup envelope\nconst snapshot = createExportEnvelope(workspace);</code></pre>',
    },
    {
      id: 'note_focus_ritual',
      title: 'Deep Work Pre-Flight Checklist',
      color: 'violet',
      pinned: true,
      createdAt: hoursAgo(50),
      updatedAt: hoursAgo(4),
      contentHtml:
        '<h2>Before Starting a 50-Minute Cycle</h2>' +
        '<ul data-checklist="true">' +
        '<li data-checked="true"><input type="checkbox" checked="checked" contenteditable="false" /> Define one concrete deliverable in the intention field</li>' +
        '<li data-checked="true"><input type="checkbox" checked="checked" contenteditable="false" /> Silence mobile notifications and close chat tabs</li>' +
        '<li><input type="checkbox" contenteditable="false" /> Capture stray thoughts directly in Smart Notes</li>' +
        '</ul>' +
        '<p>After finishing two consecutive cycles, take a full <em>15-minute reset walk</em> away from screens.</p>',
    },
    {
      id: 'note_sprint_brief',
      title: 'Product Roadmap & Release Briefing',
      color: 'amber',
      pinned: false,
      createdAt: hoursAgo(34),
      updatedAt: hoursAgo(9),
      contentHtml:
        '<h2>Key Milestones</h2>' +
        '<ul>' +
        '<li><strong>Dashboard Telemetry:</strong> Real-time 7-day focus cadence and category distribution live.</li>' +
        '<li><strong>Task Manager:</strong> Deadlines, due times, subtasks, and delete confirmation complete.</li>' +
        '<li><strong>Smart Notes:</strong> Rich text formatting, pinning, color categories, and IndexedDB persistence.</li>' +
        '</ul>' +
        '<p>Next priority: package Android release candidate using Capacitor and test hardware back-button navigation.</p>',
    },
    {
      id: 'note_local_first_reading',
      title: 'Reading Notes: Local-First Software',
      color: 'emerald',
      pinned: false,
      createdAt: hoursAgo(76),
      updatedAt: hoursAgo(22),
      contentHtml:
        '<h2>Seven Ideals Summary</h2>' +
        '<ol>' +
        '<li>No spinners — local reads and writes execute in milliseconds.</li>' +
        '<li>Your work is not trapped on one device — clean JSON portability matters.</li>' +
        '<li>The network is optional — full PWA offline caching keeps workflows uninterrupted.</li>' +
        '</ol>' +
        '<p><em>Reference:</em> Ink &amp; Switch local-first architecture essays.</p>',
    },
  ];

  return rawNotes.map((n) => ({
    ...n,
    plainText: extractPlainText(n.contentHtml),
  }));
}

export function createSeedEvents(today: string = getTodayISO()): CalendarEvent[] {
  const tomorrow = addDaysISO(today, 1);
  const inThreeDays = addDaysISO(today, 3);
  const inFiveDays = addDaysISO(today, 5);
  const inEightDays = addDaysISO(today, 8);
  const nowIso = new Date().toISOString();

  return [
    {
      id: 'evt_arch_sync',
      title: 'Q4 Architecture & Storage Sync',
      date: today,
      allDay: false,
      startMinute: 11 * 60 + 30, // 11:30
      durationMinutes: 45,
      category: 'Planning',
      color: 'cyan',
      location: 'Studio Room B / Meet',
      notes: 'Align on IndexedDB backup schema and Android offline sync benchmarks.',
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'evt_design_critique',
      title: 'Glassmorphism UI & Mobile Ergonomics Review',
      date: tomorrow,
      allDay: false,
      startMinute: 14 * 60, // 14:00
      durationMinutes: 60,
      category: 'Deep Work',
      color: 'violet',
      location: 'Design Desk',
      notes: 'Walk through Goals progress rings and Calendar responsiveness on 390px viewports.',
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'evt_sprint_demo',
      title: 'Weekly Product Milestone Demo',
      date: inThreeDays,
      allDay: false,
      startMinute: 10 * 60, // 10:00
      durationMinutes: 45,
      category: 'Planning',
      color: 'amber',
      location: 'Main Conference Link',
      notes: 'Demonstrate Task Manager, Smart Notes, Goals, and Calendar modules.',
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'evt_release_freeze',
      title: 'Android Release Candidate Feature Freeze',
      date: inFiveDays,
      allDay: true,
      startMinute: 9 * 60,
      durationMinutes: 60,
      category: 'Admin',
      color: 'rose',
      location: 'Release Pipeline',
      notes: 'Lock features and run full offline PWA + Capacitor regression checklist.',
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'evt_retrospective',
      title: 'Monthly Focus Cadence Retrospective',
      date: inEightDays,
      allDay: false,
      startMinute: 16 * 60, // 16:00
      durationMinutes: 45,
      category: 'Personal',
      color: 'emerald',
      location: 'Home Office',
      notes: 'Review 30-day deep work streaks, adjust daily targets, and map next month milestones.',
      createdAt: nowIso,
      updatedAt: nowIso,
    },
  ];
}

export function createSeedGoals(today: string = getTodayISO()): ProductivityGoal[] {
  const inTwoDays = addDaysISO(today, 2);
  const inFiveDays = addDaysISO(today, 5);
  const inSevenDays = addDaysISO(today, 7);
  const inTenDays = addDaysISO(today, 10);
  const inFourteenDays = addDaysISO(today, 14);
  const nowIso = new Date().toISOString();

  return [
    {
      id: 'goal_deep_sprints',
      title: 'Complete 12 uninterrupted deep work cycles',
      description: 'Build sustained morning focus momentum by logging 50-minute distraction-free engineering cycles.',
      category: 'Deep Work',
      currentValue: 8,
      targetValue: 12,
      unit: 'cycles',
      deadline: inFiveDays,
      progressMode: 'numeric',
      milestones: [
        { id: 'ms_deep_1', title: 'Complete 4 baseline cycles', completed: true, targetDate: addDaysISO(today, -2) },
        { id: 'ms_deep_2', title: 'Maintain 5-day focus streak', completed: true, targetDate: today },
        { id: 'ms_deep_3', title: 'Finish final 4 deep work blocks', completed: false, targetDate: inFiveDays },
      ],
      completed: false,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'goal_android_prep',
      title: 'Ship Android PWA & Capacitor readiness milestones',
      description: 'Verify offline asset precaching, adaptive icons, safe-area padding, and signed Android build flow.',
      category: 'Planning',
      currentValue: 3,
      targetValue: 5,
      unit: 'milestones',
      deadline: inTenDays,
      progressMode: 'milestones',
      milestones: [
        { id: 'ms_and_1', title: 'Configure PWA manifest & maskable icons', completed: true, targetDate: addDaysISO(today, -3) },
        { id: 'ms_and_2', title: 'Isolate platform storage & haptics adapters', completed: true, targetDate: addDaysISO(today, -1) },
        { id: 'ms_and_3', title: 'Audit 44px touch targets across mobile bar', completed: true, targetDate: today },
        { id: 'ms_and_4', title: 'Validate Capacitor Android status bar sync', completed: false, targetDate: inTwoDays },
        { id: 'ms_and_5', title: 'Produce signed release candidate APK', completed: false, targetDate: inTenDays },
      ],
      completed: false,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'goal_tech_reading',
      title: 'Read local-first architecture monograph chapters',
      description: 'Study CRDTs, IndexedDB resilience, and snapshot portability to apply directly to NEXORA.',
      category: 'Personal',
      currentValue: 3,
      targetValue: 5,
      unit: 'chapters',
      deadline: inFourteenDays,
      progressMode: 'numeric',
      milestones: [
        { id: 'ms_read_1', title: 'Chapters 1–2: Seven ideals of local-first', completed: true, targetDate: addDaysISO(today, -2) },
        { id: 'ms_read_2', title: 'Chapter 3: Browser persistence engines', completed: true, targetDate: today },
        { id: 'ms_read_3', title: 'Chapters 4–5: Conflict resolution & backup', completed: false, targetDate: inSevenDays },
      ],
      completed: false,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
  ];
}

export function createSeedActivities(
  today: string = getTodayISO(),
  yesterday: string = addDaysISO(today, -1)
): ActivityItem[] {
  const now = Date.now();
  const minutesAgo = (m: number) => new Date(now - m * 60 * 1000).toISOString();

  return [
    {
      id: 'act_seed_1',
      type: 'session_logged',
      title: 'Logged 50m Deep Work session',
      detail: 'Finalize Q4 system architecture specification',
      timestamp: minutesAgo(28),
      route: '/history',
    },
    {
      id: 'act_seed_2',
      type: 'task_completed',
      title: 'Completed task',
      detail: 'Prepare product roadmap briefing notes',
      timestamp: minutesAgo(74),
      route: '/tasks',
    },
    {
      id: 'act_seed_3',
      type: 'block_completed',
      title: 'Finished scheduled block',
      detail: 'Morning Briefing & Priority Alignment · 30m',
      timestamp: minutesAgo(95),
      route: '/calendar',
    },
    {
      id: 'act_seed_4',
      type: 'goal_progress',
      title: 'Advanced goal to 8 / 12 cycles',
      detail: 'Complete 12 uninterrupted deep work cycles',
      timestamp: minutesAgo(140),
      route: '/goals',
    },
    {
      id: 'act_seed_5',
      type: 'session_logged',
      title: 'Logged 50m Deep Work session',
      detail: 'Design token contrast & typography pass',
      timestamp: `${yesterday}T16:50:00.000Z`,
      route: '/history',
    },
  ];
}
