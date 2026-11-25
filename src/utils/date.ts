import { FocusSession } from '../types/productivity';

export function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getTodayISO(): string {
  return toISODate(new Date());
}

export function addDaysISO(isoDate: string, deltaDays: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + deltaDays);
  return toISODate(dt);
}

export function parseISODate(isoDate: string): Date {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function formatLongDate(isoDate: string): string {
  const dt = parseISODate(isoDate);
  return dt.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export function formatShortDate(isoDate: string): string {
  const dt = parseISODate(isoDate);
  return dt.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function getRelativeDayLabel(isoDate: string): string {
  const today = getTodayISO();
  if (isoDate === today) return 'Today';
  if (isoDate === addDaysISO(today, 1)) return 'Tomorrow';
  if (isoDate === addDaysISO(today, -1)) return 'Yesterday';
  return formatShortDate(isoDate);
}

export function getWeekStrip(centerISO: string): Array<{
  iso: string;
  weekdayShort: string;
  dayNumber: number;
  isToday: boolean;
}> {
  const today = getTodayISO();
  // Show 7 days centered around selected day (3 before, selected, 3 after) or Mon-Sun week
  const selected = parseISODate(centerISO);
  const dayOfWeek = selected.getDay(); // 0=Sun
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(selected);
  monday.setDate(selected.getDate() + diffToMonday);

  return Array.from({ length: 7 }, (_, i) => {
    const dt = new Date(monday);
    dt.setDate(monday.getDate() + i);
    const iso = toISODate(dt);
    return {
      iso,
      weekdayShort: dt.toLocaleDateString('en-US', { weekday: 'short' }),
      dayNumber: dt.getDate(),
      isToday: iso === today,
    };
  });
}

export function formatMinuteOfDay(minute: number): string {
  const clamped = Math.max(0, Math.min(24 * 60, Math.round(minute)));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function formatTimeRange(startMinute: number, durationMinutes: number): string {
  return `${formatMinuteOfDay(startMinute)}–${formatMinuteOfDay(startMinute + durationMinutes)}`;
}

export function formatClockSeconds(totalSeconds: number): string {
  const safe = Math.max(0, Math.ceil(totalSeconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function formatDurationCompact(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function getCurrentMinuteOfDay(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

export function calculateFocusStreak(sessions: FocusSession[]): number {
  const focusDays = new Set(
    sessions
      .filter((s) => s.completed && (s.mode === 'focus' || s.mode === 'deep'))
      .map((s) => s.date)
  );
  if (focusDays.size === 0) return 0;

  let streak = 0;
  let cursor = getTodayISO();
  if (!focusDays.has(cursor)) {
    // Allow streak to continue if yesterday had focus and today hasn't started yet
    cursor = addDaysISO(cursor, -1);
    if (!focusDays.has(cursor)) return 0;
  }

  while (focusDays.has(cursor)) {
    streak += 1;
    cursor = addDaysISO(cursor, -1);
  }
  return streak;
}

export function getTimeOfDayGreeting(now: Date = new Date()): string {
  const hour = now.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function formatRelativeTime(isoTimestamp: string, nowMs: number = Date.now()): string {
  const parsed = Date.parse(isoTimestamp);
  if (!Number.isFinite(parsed)) return 'Recently';
  const diffSec = Math.max(0, Math.floor((nowMs - parsed) / 1000));
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(parsed).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export type DeadlineStatus = 'completed' | 'overdue' | 'today' | 'tomorrow' | 'upcoming';

export function isTaskOverdue(
  dateISO: string,
  dueTime: string | null | undefined,
  completed: boolean,
  now: Date = new Date()
): boolean {
  if (completed) return false;
  const todayISO = toISODate(now);
  if (dateISO < todayISO) return true;
  if (dateISO > todayISO) return false;
  if (!dueTime || !/^\d{2}:\d{2}$/.test(dueTime)) return false;
  const [h, m] = dueTime.split(':').map(Number);
  const dueMinutes = h * 60 + m;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return dueMinutes < nowMinutes;
}

export function getDeadlineStatus(
  dateISO: string,
  dueTime: string | null | undefined,
  completed: boolean,
  now: Date = new Date()
): DeadlineStatus {
  if (completed) return 'completed';
  if (isTaskOverdue(dateISO, dueTime, completed, now)) return 'overdue';
  const todayISO = toISODate(now);
  if (dateISO === todayISO) return 'today';
  if (dateISO === addDaysISO(todayISO, 1)) return 'tomorrow';
  return 'upcoming';
}

export function formatDueTime(dueTime: string | null | undefined): string {
  if (!dueTime || !/^\d{2}:\d{2}$/.test(dueTime)) return '';
  const [rawH, rawM] = dueTime.split(':').map(Number);
  const period = rawH >= 12 ? 'PM' : 'AM';
  const hour12 = rawH % 12 === 0 ? 12 : rawH % 12;
  return `${hour12}:${String(rawM).padStart(2, '0')} ${period}`;
}

export interface MonthCalendarCell {
  iso: string;
  dayNumber: number;
  inCurrentMonth: boolean;
  isToday: boolean;
}

export function getMonthMatrix(year: number, monthIndex: number): MonthCalendarCell[] {
  const todayISO = getTodayISO();
  const firstOfMonth = new Date(year, monthIndex, 1);
  const firstDayOfWeek = firstOfMonth.getDay(); // 0=Sun..6=Sat
  const offsetToMonday = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
  const gridStart = new Date(year, monthIndex, 1 - offsetToMonday);

  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const totalCells = offsetToMonday + daysInMonth > 35 ? 42 : 35;

  return Array.from({ length: totalCells }, (_, idx) => {
    const dt = new Date(gridStart);
    dt.setDate(gridStart.getDate() + idx);
    const iso = toISODate(dt);
    return {
      iso,
      dayNumber: dt.getDate(),
      inCurrentMonth: dt.getMonth() === monthIndex && dt.getFullYear() === year,
      isToday: iso === todayISO,
    };
  });
}

export function formatMonthYear(year: number, monthIndex: number): string {
  return new Date(year, monthIndex, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

export function getDaysUntilISO(targetISO: string, baseISO: string = getTodayISO()): number {
  const target = parseISODate(targetISO);
  const base = parseISODate(baseISO);
  return Math.round((target.getTime() - base.getTime()) / (1000 * 60 * 60 * 24));
}

export function formatCountdownLabel(targetISO: string, completed: boolean = false): {
  label: string;
  tone: 'completed' | 'overdue' | 'soon' | 'normal';
} {
  if (completed) return { label: 'Completed', tone: 'completed' };
  const diff = getDaysUntilISO(targetISO);
  if (diff < 0) {
    return { label: `Overdue ${Math.abs(diff)}d`, tone: 'overdue' };
  }
  if (diff === 0) return { label: 'Due today', tone: 'soon' };
  if (diff === 1) return { label: 'Tomorrow', tone: 'soon' };
  if (diff <= 3) return { label: `In ${diff}d`, tone: 'soon' };
  return { label: `In ${diff}d`, tone: 'normal' };
}

export function generateId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}
