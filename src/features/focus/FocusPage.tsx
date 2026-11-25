import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import {
  ArrowRight,
  Bell,
  BellOff,
  CheckCircle2,
  Coffee,
  FastForward,
  Minus,
  Pause,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Trash2,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { useWorkspace } from '../../store/WorkspaceContext';
import { FocusSession, TimerMode } from '../../types/productivity';
import {
  playCompletionChime,
  requestNotificationPermission,
} from '../../platform/notifications';
import { GlassCard } from '../../components/ui/GlassCard';
import { GlowButton } from '../../components/ui/GlowButton';
import { PageTransition } from '../../components/ui/PageTransition';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import {
  addDaysISO,
  formatClockSeconds,
  formatDurationCompact,
  formatRelativeTime,
  formatTimeRange,
  getTodayISO,
} from '../../utils/date';

const MODE_LABELS: Record<TimerMode, string> = {
  focus: 'Pomodoro Focus',
  deep: 'Deep Work',
  'short-break': 'Short Break',
  'long-break': 'Long Break',
};

type HistoryRangeTab = 'today' | '7d' | 'all';
type HistoryTypeFilter = 'all' | 'work' | 'breaks';

type NotificationState = 'granted' | 'denied' | 'default' | 'unsupported';

function readBrowserNotificationState(): NotificationState {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission as NotificationState;
}

export const FocusPage: React.FC = () => {
  const {
    tasks,
    timeBlocks,
    sessions,
    settings,
    timer,
    lastCompletedSession,
    nextRecommendedBreakMode,
    setTimerMode,
    setCustomTimerMinutes,
    setTimerLink,
    startTimer,
    pauseTimer,
    resetTimer,
    resetPomodoroRound,
    completeTimerEarly,
    dismissCompletedSessionBanner,
    toggleTaskComplete,
    deleteSession,
    updateSettings,
    pushToast,
  } = useWorkspace();

  const navigate = useNavigate();
  const prefersReduced = useReducedMotion();
  const todayISO = getTodayISO();

  const [historyRange, setHistoryRange] = useState<HistoryRangeTab>('today');
  const [historyType, setHistoryType] = useState<HistoryTypeFilter>('all');
  const [sessionToDelete, setSessionToDelete] = useState<FocusSession | null>(null);
  const [notifPerm, setNotifPerm] = useState<NotificationState>(() =>
    readBrowserNotificationState()
  );

  const todayTasks = useMemo(
    () => tasks.filter((t) => !t.completed || t.id === timer.linkedTaskId),
    [tasks, timer.linkedTaskId]
  );

  const todayBlocks = useMemo(
    () => timeBlocks.filter((b) => b.date === todayISO),
    [timeBlocks, todayISO]
  );

  const todaySessions = useMemo(
    () => sessions.filter((s) => s.date === todayISO),
    [sessions, todayISO]
  );

  const todayFocusTotal = useMemo(
    () =>
      todaySessions
        .filter((s) => s.completed && (s.mode === 'focus' || s.mode === 'deep'))
        .reduce((acc, s) => acc + s.durationMinutes, 0),
    [todaySessions]
  );

  const todayWorkCount = useMemo(
    () =>
      todaySessions.filter((s) => s.completed && (s.mode === 'focus' || s.mode === 'deep'))
        .length,
    [todaySessions]
  );

  const dailyGoalPct = useMemo(
    () =>
      settings.dailyFocusGoalMinutes > 0
        ? Math.min(100, Math.round((todayFocusTotal / settings.dailyFocusGoalMinutes) * 100))
        : 0,
    [todayFocusTotal, settings.dailyFocusGoalMinutes]
  );

  const filteredHistory = useMemo(() => {
    const cutoff7d = addDaysISO(todayISO, -6);
    return sessions.filter((s) => {
      if (historyRange === 'today' && s.date !== todayISO) return false;
      if (historyRange === '7d' && s.date < cutoff7d) return false;
      if (historyType === 'work' && s.mode !== 'focus' && s.mode !== 'deep') return false;
      if (historyType === 'breaks' && s.mode !== 'short-break' && s.mode !== 'long-break') {
        return false;
      }
      return true;
    });
  }, [sessions, historyRange, historyType, todayISO]);

  const filteredFocusMinutes = useMemo(
    () =>
      filteredHistory
        .filter((s) => s.mode === 'focus' || s.mode === 'deep')
        .reduce((sum, s) => sum + s.durationMinutes, 0),
    [filteredHistory]
  );

  const linkedTask = useMemo(
    () => tasks.find((t) => t.id === timer.linkedTaskId) ?? null,
    [tasks, timer.linkedTaskId]
  );

  const linkedBlock = useMemo(
    () => timeBlocks.find((b) => b.id === timer.linkedBlockId) ?? null,
    [timeBlocks, timer.linkedBlockId]
  );

  const completedBannerTask = useMemo(
    () =>
      lastCompletedSession?.linkedTaskId
        ? tasks.find((t) => t.id === lastCompletedSession.linkedTaskId) ?? null
        : null,
    [lastCompletedSession, tasks]
  );

  const progressRatio =
    timer.durationSeconds > 0
      ? Math.max(
          0,
          Math.min(1, (timer.durationSeconds - timer.remainingSeconds) / timer.durationSeconds)
        )
      : 0;

  const size = 296;
  const strokeWidth = 7;
  const radius = (size - 34) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progressRatio);
  const currentMinutesSetting = Math.round(timer.durationSeconds / 60);

  const modeOptions: Array<{ value: TimerMode; label: string }> = [
    { value: 'focus', label: `Pomodoro · ${settings.focusMinutes}m` },
    { value: 'deep', label: `Deep · ${settings.deepWorkMinutes}m` },
    { value: 'short-break', label: `Short · ${settings.shortBreakMinutes}m` },
    { value: 'long-break', label: `Long · ${settings.longBreakMinutes}m` },
  ];

  const isBreakMode = timer.mode === 'short-break' || timer.mode === 'long-break';
  const isRunning = timer.status === 'running';

  const handleToggleNotifications = async () => {
    if (settings.notificationsEnabled) {
      updateSettings({ notificationsEnabled: false });
      pushToast({
        title: 'Session notifications paused',
        description: 'You will still see in-app toasts when cycles finish.',
        tone: 'neutral',
      });
      return;
    }

    const result = await requestNotificationPermission();
    setNotifPerm(result);
    if (result === 'granted') {
      updateSettings({ notificationsEnabled: true });
      pushToast({
        title: 'Browser notifications enabled',
        description: 'NEXORA will alert you when focus and break intervals finish.',
        tone: 'success',
      });
    } else if (result === 'unsupported') {
      updateSettings({ notificationsEnabled: false });
      pushToast({
        title: 'System notifications unavailable',
        description: 'This browser context does not support desktop alerts. Sound chimes still work.',
        tone: 'warning',
      });
    } else {
      updateSettings({ notificationsEnabled: false });
      pushToast({
        title: 'Notification permission blocked',
        description: 'Allow notifications in your browser site settings to receive break alerts.',
        tone: 'warning',
      });
    }
  };

  const handlePreviewChime = () => {
    playCompletionChime(isBreakMode ? 'break-done' : 'focus-done');
  };

  const lastCompletedWasBreak =
    lastCompletedSession?.mode === 'short-break' ||
    lastCompletedSession?.mode === 'long-break';

  const activeCycleNumber =
    timer.pomodoroRoundCount >= 4 ? 4 : timer.pomodoroRoundCount + 1;

  return (
    <PageTransition className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-purple-600 dark:text-cyan-400">
            4-cycle Pomodoro timer with break cadence, alerts &amp; real focus history
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-950 dark:text-white mt-1">
            Pomodoro Focus Studio
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
          <span className="font-mono tabular-nums text-slate-950 dark:text-white font-semibold">
            {formatDurationCompact(todayFocusTotal)}
          </span>
          <span>
            / {formatDurationCompact(settings.dailyFocusGoalMinutes)} goal ({dailyGoalPct}%)
          </span>
          <span aria-hidden="true">·</span>
          <span className="font-mono tabular-nums">
            {todayWorkCount} {todayWorkCount === 1 ? 'cycle' : 'cycles'} today
          </span>
        </div>
      </div>

      {/* Post-Session Completion Confirmation Banner */}
      {lastCompletedSession && (
        <GlassCard
          variant="elevated"
          className="border-emerald-400/45 px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-slate-950 dark:text-white">
                {lastCompletedWasBreak
                  ? `Break Complete — ${lastCompletedSession.linkedTitle}`
                  : `Session Recorded — ${lastCompletedSession.linkedTitle}`}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                <span className="font-mono tabular-nums">
                  {lastCompletedSession.durationMinutes} min
                </span>{' '}
                saved to Analytics ({lastCompletedSession.category}).
                {!lastCompletedWasBreak &&
                  (nextRecommendedBreakMode === 'long-break'
                    ? ` Cycle 4/4 reached — take your ${settings.longBreakMinutes}m long break.`
                    : ` Cycle ${timer.pomodoroRoundCount}/4 complete — take a ${settings.shortBreakMinutes}m short break.`)}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {completedBannerTask && !completedBannerTask.completed && (
              <GlowButton
                variant="primary"
                size="sm"
                onClick={() => {
                  toggleTaskComplete(completedBannerTask.id);
                  dismissCompletedSessionBanner();
                }}
              >
                Mark Task Complete
              </GlowButton>
            )}
            {lastCompletedWasBreak ? (
              <GlowButton
                variant="primary"
                size="sm"
                onClick={() => {
                  setTimerMode('focus');
                  startTimer();
                }}
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Start {settings.focusMinutes}m Focus</span>
              </GlowButton>
            ) : (
              <GlowButton
                variant={nextRecommendedBreakMode === 'long-break' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => {
                  setTimerMode(nextRecommendedBreakMode);
                  startTimer();
                }}
              >
                <Coffee className="w-3.5 h-3.5" />
                <span>
                  {nextRecommendedBreakMode === 'long-break'
                    ? `Start ${settings.longBreakMinutes}m Long Break`
                    : `Start ${settings.shortBreakMinutes}m Break`}
                </span>
              </GlowButton>
            )}
            <button
              type="button"
              onClick={dismissCompletedSessionBanner}
              aria-label="Dismiss completion banner"
              className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </GlassCard>
      )}

      {/* Main 2-Column Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Luminous Dial + 4-Cycle Tracker + Alerts Bar */}
        <div className="lg:col-span-7 space-y-5">
          <GlassCard
            as="section"
            variant="spotlight"
            className="p-5 sm:p-8 flex flex-col items-center relative overflow-hidden"
          >
            {/* Mode Selector */}
            <div className="w-full flex justify-center relative z-10">
              <SegmentedControl
                options={modeOptions}
                value={timer.mode}
                onChange={(nextMode) => setTimerMode(nextMode)}
                ariaLabel="Pomodoro timer mode"
              />
            </div>

            {/* 4-Cycle Pomodoro Round Tracker */}
            <div className="w-full max-w-md mt-5 relative z-10 rounded-xl bg-slate-900/[0.035] dark:bg-white/[0.04] border nx-divider px-4 py-3">
              <div className="flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    Pomodoro Cycle
                  </span>
                  <span className="font-mono tabular-nums font-semibold text-purple-600 dark:text-cyan-300">
                    {timer.pomodoroRoundCount}/4
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    {timer.pomodoroRoundCount >= 4
                      ? `Long break ready (${settings.longBreakMinutes}m)`
                      : `Next: ${nextRecommendedBreakMode === 'long-break' ? 'Long' : 'Short'} break`}
                  </span>
                  {timer.pomodoroRoundCount > 0 && (
                    <button
                      type="button"
                      onClick={resetPomodoroRound}
                      aria-label="Reset 4-cycle Pomodoro counter"
                      title="Reset cycle counter"
                      className="min-h-[28px] px-2 rounded-lg text-[11px] font-medium text-slate-500 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white hover:bg-slate-900/5 dark:hover:bg-white/10 inline-flex items-center gap-1 transition-colors"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Reset</span>
                    </button>
                  )}
                </div>
              </div>

              <div
                className="mt-2.5 grid grid-cols-4 gap-2"
                role="progressbar"
                aria-label="Completed Pomodoro work cycles out of 4"
                aria-valuemin={0}
                aria-valuemax={4}
                aria-valuenow={timer.pomodoroRoundCount}
              >
                {[1, 2, 3, 4].map((slot) => {
                  const isDone = slot <= timer.pomodoroRoundCount;
                  const isCurrent =
                    !isBreakMode &&
                    slot === activeCycleNumber &&
                    !isDone;
                  return (
                    <div key={slot} className="space-y-1">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          isDone
                            ? 'nx-gradient-primary'
                            : isCurrent
                              ? 'bg-purple-500/25 dark:bg-cyan-400/25 ring-1 ring-purple-500/45 dark:ring-cyan-400/45'
                              : 'bg-slate-900/10 dark:bg-white/10'
                        }`}
                      />
                      <p
                        className={`text-[10px] font-mono tabular-nums text-center ${
                          isDone
                            ? 'text-purple-600 dark:text-cyan-300 font-medium'
                            : 'text-slate-400 dark:text-slate-500'
                        }`}
                      >
                        {slot === 4 ? '#4 · Rest' : `Cycle ${slot}`}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Precision Dial + Breathing Aura */}
            <div className="relative my-6 sm:my-7 flex items-center justify-center">
              <motion.div
                aria-hidden="true"
                animate={
                  isRunning && !prefersReduced
                    ? { opacity: [0.38, 0.72, 0.38], scale: [0.96, 1.05, 0.96] }
                    : { opacity: isRunning ? 0.52 : 0.22, scale: 1 }
                }
                transition={
                  isRunning && !prefersReduced
                    ? { duration: 4.5, repeat: Infinity, ease: 'easeInOut' }
                    : { duration: 0.4 }
                }
                className="absolute inset-4 rounded-full blur-3xl pointer-events-none"
                style={{
                  background: isBreakMode
                    ? 'radial-gradient(circle, rgba(16,185,129,0.45) 0%, rgba(6,182,212,0.22) 55%, transparent 75%)'
                    : 'radial-gradient(circle, rgba(139,92,246,0.48) 0%, rgba(6,182,212,0.28) 55%, transparent 75%)',
                }}
              />

              <svg
                width={size}
                height={size}
                viewBox={`0 0 ${size} ${size}`}
                className="relative z-10 w-[252px] h-[252px] sm:w-[296px] sm:h-[296px] -rotate-90"
                aria-hidden="true"
              >
                <defs>
                  <linearGradient id="nxFocusArc" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={isBreakMode ? '#10B981' : '#8B5CF6'} />
                    <stop offset="100%" stopColor="#06B6D4" />
                  </linearGradient>
                  <filter id="nxArcGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3.5" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {Array.from({ length: 60 }, (_, idx) => {
                  const angle = (idx / 60) * Math.PI * 2;
                  const isMajor = idx % 5 === 0;
                  const outer = radius + 13;
                  const inner = isMajor ? radius + 6 : radius + 9.5;
                  const cx = size / 2;
                  const cy = size / 2;
                  return (
                    <line
                      key={idx}
                      x1={cx + Math.cos(angle) * inner}
                      y1={cy + Math.sin(angle) * inner}
                      x2={cx + Math.cos(angle) * outer}
                      y2={cy + Math.sin(angle) * outer}
                      strokeWidth={isMajor ? 1.5 : 1}
                      className={
                        isMajor
                          ? 'stroke-slate-400/60 dark:stroke-slate-500/70'
                          : 'stroke-slate-300/60 dark:stroke-slate-700/70'
                      }
                    />
                  );
                })}

                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  strokeWidth={strokeWidth}
                  className="stroke-slate-900/8 dark:stroke-white/10"
                />

                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke="url(#nxFocusArc)"
                  strokeWidth={strokeWidth}
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={dashOffset}
                  filter={progressRatio > 0 ? 'url(#nxArcGlow)' : undefined}
                  className="transition-[stroke-dashoffset] duration-300 ease-out"
                />
              </svg>

              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center px-6">
                <span className="text-xs font-medium text-purple-600 dark:text-cyan-300">
                  {MODE_LABELS[timer.mode]}
                </span>
                <div
                  aria-live="off"
                  className="font-mono text-5xl sm:text-6xl font-semibold tracking-tight tabular-nums text-slate-950 dark:text-white mt-1.5"
                >
                  {formatClockSeconds(timer.remainingSeconds)}
                </div>
                <span className="mt-2 text-xs text-slate-600 dark:text-slate-400 max-w-[190px] truncate">
                  {linkedBlock?.title ?? linkedTask?.title ?? 'Unbound session'}
                </span>
              </div>
            </div>

            {/* Idle Duration Fine-Tuning */}
            {timer.status === 'idle' && (
              <div className="mb-6 flex items-center gap-3 relative z-10">
                <button
                  type="button"
                  onClick={() => setCustomTimerMinutes(Math.max(1, currentMinutesSetting - 5))}
                  aria-label="Decrease duration by 5 minutes"
                  className="min-h-[44px] min-w-[44px] rounded-xl nx-glass flex items-center justify-center text-slate-700 dark:text-slate-200 hover:border-cyan-400/50 transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="font-mono text-xs tabular-nums text-slate-600 dark:text-slate-300 min-w-[96px] text-center">
                  {currentMinutesSetting} min target
                </span>
                <button
                  type="button"
                  onClick={() => setCustomTimerMinutes(Math.min(120, currentMinutesSetting + 5))}
                  aria-label="Increase duration by 5 minutes"
                  className="min-h-[44px] min-w-[44px] rounded-xl nx-glass flex items-center justify-center text-slate-700 dark:text-slate-200 hover:border-cyan-400/50 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Transport Controls */}
            <div className="flex flex-wrap items-center justify-center gap-2.5 w-full relative z-10">
              {isRunning ? (
                <GlowButton
                  variant="secondary"
                  size="lg"
                  onClick={pauseTimer}
                  className="min-w-[152px] border-cyan-400/45"
                >
                  <Pause className="w-4 h-4 fill-current text-purple-600 dark:text-cyan-400" />
                  <span>Pause</span>
                </GlowButton>
              ) : (
                <GlowButton
                  variant="primary"
                  size="lg"
                  onClick={startTimer}
                  className="min-w-[152px]"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>
                    {timer.status === 'paused'
                      ? 'Resume'
                      : isBreakMode
                        ? 'Start Break'
                        : 'Start Focus'}
                  </span>
                </GlowButton>
              )}

              <GlowButton
                variant="secondary"
                size="lg"
                onClick={resetTimer}
                disabled={timer.status === 'idle'}
                aria-label="Reset timer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reset</span>
              </GlowButton>

              {(timer.status === 'running' || timer.status === 'paused') && (
                <GlowButton variant="secondary" size="lg" onClick={completeTimerEarly}>
                  <FastForward className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                  <span>Finish &amp; Log</span>
                </GlowButton>
              )}
            </div>
          </GlassCard>

          {/* Inline Alerts, Chime & Break Automation Controls */}
          <GlassCard className="p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h2 className="font-display text-sm font-semibold text-slate-950 dark:text-white">
                Alerts, Sound &amp; Break Cadence
              </h2>
              <button
                type="button"
                onClick={handlePreviewChime}
                className="min-h-[34px] px-2.5 rounded-lg text-xs font-medium text-purple-600 dark:text-cyan-400 hover:bg-purple-500/10 dark:hover:bg-cyan-400/10 transition-colors"
              >
                Test Chime
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* System Notifications */}
              <button
                type="button"
                onClick={() => void handleToggleNotifications()}
                className={`min-h-[54px] px-3.5 py-2.5 rounded-xl border text-left transition-colors flex items-center gap-3 ${
                  settings.notificationsEnabled && notifPerm === 'granted'
                    ? 'border-cyan-400/45 bg-cyan-400/10 text-slate-950 dark:text-white'
                    : 'nx-divider bg-slate-900/[0.025] dark:bg-white/[0.03] text-slate-700 dark:text-slate-300 hover:border-cyan-400/35'
                }`}
              >
                {settings.notificationsEnabled && notifPerm === 'granted' ? (
                  <Bell className="w-4 h-4 text-purple-600 dark:text-cyan-400 shrink-0" />
                ) : (
                  <BellOff className="w-4 h-4 text-slate-400 shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-xs font-semibold truncate">Notifications</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {notifPerm === 'unsupported'
                      ? 'Not supported'
                      : notifPerm === 'denied'
                        ? 'Blocked'
                        : settings.notificationsEnabled && notifPerm === 'granted'
                          ? 'Active alerts'
                          : 'Off · Tap to allow'}
                  </p>
                </div>
              </button>

              {/* Completion Sound */}
              <button
                type="button"
                onClick={() => updateSettings({ soundEnabled: !settings.soundEnabled })}
                className={`min-h-[54px] px-3.5 py-2.5 rounded-xl border text-left transition-colors flex items-center gap-3 ${
                  settings.soundEnabled
                    ? 'border-cyan-400/45 bg-cyan-400/10 text-slate-950 dark:text-white'
                    : 'nx-divider bg-slate-900/[0.025] dark:bg-white/[0.03] text-slate-700 dark:text-slate-300 hover:border-cyan-400/35'
                }`}
              >
                {settings.soundEnabled ? (
                  <Volume2 className="w-4 h-4 text-purple-600 dark:text-cyan-400 shrink-0" />
                ) : (
                  <VolumeX className="w-4 h-4 text-slate-400 shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-xs font-semibold truncate">Sound Chime</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {settings.soundEnabled ? 'Harmonic tone on' : 'Muted'}
                  </p>
                </div>
              </button>

              {/* Auto-Start Breaks */}
              <button
                type="button"
                onClick={() => updateSettings({ autoStartBreaks: !settings.autoStartBreaks })}
                className={`min-h-[54px] px-3.5 py-2.5 rounded-xl border text-left transition-colors flex items-center gap-3 ${
                  settings.autoStartBreaks
                    ? 'border-emerald-400/45 bg-emerald-400/10 text-slate-950 dark:text-white'
                    : 'nx-divider bg-slate-900/[0.025] dark:bg-white/[0.03] text-slate-700 dark:text-slate-300 hover:border-cyan-400/35'
                }`}
              >
                <Coffee
                  className={`w-4 h-4 shrink-0 ${
                    settings.autoStartBreaks
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-slate-400'
                  }`}
                />
                <div className="min-w-0">
                  <p className="text-xs font-semibold truncate">Auto Breaks</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {settings.autoStartBreaks ? 'Short 1–3 · Long #4' : 'Manual start'}
                  </p>
                </div>
              </button>
            </div>
          </GlassCard>
        </div>

        {/* Right Column: Session Context Binding + Filterable Focus History */}
        <section className="lg:col-span-5 space-y-5">
          <GlassCard className="p-5 space-y-4">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-950 dark:text-white">
                Session Context
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Link this Pomodoro to a scheduled block or active task
              </p>
            </div>

            <div>
              <label
                htmlFor="focus-block-select"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Linked Time Block (Today)
              </label>
              <select
                id="focus-block-select"
                value={timer.linkedBlockId ?? ''}
                onChange={(e) => {
                  const id = e.target.value || null;
                  const block = todayBlocks.find((b) => b.id === id);
                  setTimerLink({
                    blockId: id,
                    taskId: block?.linkedTaskId ?? timer.linkedTaskId,
                  });
                }}
                className="w-full min-h-[44px] px-3 py-2 text-sm rounded-xl nx-input"
              >
                <option value="" className="bg-white dark:bg-slate-900">
                  No time block linked
                </option>
                {todayBlocks.map((b) => (
                  <option key={b.id} value={b.id} className="bg-white dark:bg-slate-900">
                    {formatTimeRange(b.startMinute, b.durationMinutes)} — {b.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="focus-task-select"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Linked Task
              </label>
              <select
                id="focus-task-select"
                value={timer.linkedTaskId ?? ''}
                onChange={(e) => setTimerLink({ taskId: e.target.value || null })}
                className="w-full min-h-[44px] px-3 py-2 text-sm rounded-xl nx-input"
              >
                <option value="" className="bg-white dark:bg-slate-900">
                  No task linked
                </option>
                {todayTasks.map((t) => (
                  <option key={t.id} value={t.id} className="bg-white dark:bg-slate-900">
                    {t.title} ({t.estimatedMinutes}m)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="focus-intention-input"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Session Intention
              </label>
              <input
                id="focus-intention-input"
                type="text"
                value={timer.intention}
                onChange={(e) => setTimerLink({ intention: e.target.value })}
                placeholder="What concrete outcome defines success?"
                className="w-full min-h-[44px] px-3.5 py-2 text-sm rounded-xl nx-input placeholder:text-slate-400"
              />
            </div>
          </GlassCard>

          {/* Filterable Real Focus History */}
          <GlassCard className="overflow-hidden">
            <div className="px-5 py-4 border-b nx-divider space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h2 className="font-display text-sm font-semibold text-slate-950 dark:text-white">
                    Focus History
                  </h2>
                  <p className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400 mt-0.5">
                    {filteredHistory.length} {filteredHistory.length === 1 ? 'entry' : 'entries'} ·{' '}
                    {formatDurationCompact(filteredFocusMinutes)} focus
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/history')}
                  className="min-h-[34px] px-2.5 rounded-lg text-xs font-medium text-purple-600 dark:text-cyan-400 hover:bg-purple-500/10 dark:hover:bg-cyan-400/10 inline-flex items-center gap-1 transition-colors"
                >
                  <span>Analytics</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <SegmentedControl
                  ariaLabel="Focus history time range"
                  value={historyRange}
                  onChange={setHistoryRange}
                  options={[
                    { value: 'today', label: 'Today' },
                    { value: '7d', label: '7 Days' },
                    { value: 'all', label: 'All' },
                  ]}
                />
                <div className="inline-flex items-center gap-1 text-[11px]">
                  {(['all', 'work', 'breaks'] as HistoryTypeFilter[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setHistoryType(type)}
                      className={`min-h-[32px] px-2.5 rounded-lg font-medium capitalize transition-colors ${
                        historyType === type
                          ? 'bg-purple-500/15 dark:bg-cyan-400/15 text-purple-700 dark:text-cyan-300'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {filteredHistory.length === 0 ? (
              <div className="px-5 py-9 text-center text-xs text-slate-500 dark:text-slate-400">
                No recorded {historyType === 'all' ? 'sessions' : historyType} in this window yet.
                Complete a cycle to log real focus history.
              </div>
            ) : (
              <ul className="divide-y divide-slate-200/60 dark:divide-slate-800/70 max-h-[320px] overflow-y-auto">
                {filteredHistory.slice(0, 25).map((sess) => {
                  const isBreak = sess.mode === 'short-break' || sess.mode === 'long-break';
                  return (
                    <li
                      key={sess.id}
                      className="px-5 py-3 flex items-center justify-between gap-3 hover:bg-slate-900/[0.025] dark:hover:bg-white/[0.03] transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-950 dark:text-slate-100 truncate">
                          {sess.linkedTitle}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                          <span
                            className={
                              isBreak
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-slate-600 dark:text-slate-300'
                            }
                          >
                            {MODE_LABELS[sess.mode]}
                          </span>
                          {' · '}
                          {sess.category}
                          {' · '}
                          <span className="font-mono tabular-nums">
                            {formatRelativeTime(sess.endedAt)}
                          </span>
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono text-xs tabular-nums font-medium text-purple-600 dark:text-cyan-300">
                          {sess.durationMinutes}m
                        </span>
                        <button
                          type="button"
                          onClick={() => setSessionToDelete(sess)}
                          aria-label={`Delete ${sess.linkedTitle} session`}
                          className="min-h-[34px] min-w-[34px] inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </GlassCard>
        </section>
      </div>

      <ConfirmDialog
        open={sessionToDelete !== null}
        title="Delete focus session?"
        description={
          sessionToDelete
            ? `Remove "${sessionToDelete.linkedTitle}" (${sessionToDelete.durationMinutes}m) from your focus history?`
            : ''
        }
        detail="Your daily focus totals and analytics charts will immediately update."
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
