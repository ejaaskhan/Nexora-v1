import React, { useState } from 'react';
import { Bell, BellOff, Clock, Moon, Volume2 } from 'lucide-react';
import { useWorkspace } from '../../store/WorkspaceContext';
import {
  isWithinQuietHours,
  playCompletionChime,
  requestNotificationPermission,
} from '../../platform/notifications';
import { GlassCard } from '../ui/GlassCard';
import { GlowButton } from '../ui/GlowButton';

type PermissionStatus = 'granted' | 'denied' | 'default' | 'unsupported';

function getBrowserNotifPermission(): PermissionStatus {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission as PermissionStatus;
}

const ToggleSwitch: React.FC<{
  checked: boolean;
  onChange: () => void;
  ariaLabel: string;
  disabled?: boolean;
}> = ({ checked, onChange, ariaLabel, disabled = false }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={ariaLabel}
    disabled={disabled}
    onClick={onChange}
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 disabled:opacity-45 disabled:cursor-not-allowed ${
      checked ? 'nx-gradient-primary' : 'bg-slate-300 dark:bg-slate-700'
    }`}
  >
    <span
      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
        checked ? 'translate-x-6' : 'translate-x-1'
      }`}
    />
  </button>
);

export const NotificationsFocusTab: React.FC = () => {
  const { settings, updateSettings, updateNotificationPreferences, pushToast } = useWorkspace();
  const [permission, setPermission] = useState<PermissionStatus>(() =>
    getBrowserNotifPermission()
  );

  const prefs = settings.notificationPreferences;
  const quietNow = isWithinQuietHours(
    prefs.quietHoursEnabled,
    prefs.quietHoursStart,
    prefs.quietHoursEnd
  );

  const handleNumberSetting = (
    key:
      | 'focusMinutes'
      | 'deepWorkMinutes'
      | 'shortBreakMinutes'
      | 'longBreakMinutes'
      | 'dailyFocusGoalMinutes',
    rawValue: string,
    min: number,
    max: number
  ) => {
    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed)) return;
    updateSettings({ [key]: Math.max(min, Math.min(max, Math.round(parsed))) });
  };

  const handleToggleMasterNotifications = async () => {
    if (settings.notificationsEnabled) {
      updateSettings({ notificationsEnabled: false });
      pushToast({ title: 'System notifications paused', tone: 'neutral' });
      return;
    }

    const result = await requestNotificationPermission();
    setPermission(result);
    if (result === 'granted') {
      updateSettings({ notificationsEnabled: true });
      pushToast({
        title: 'System notifications enabled',
        description: 'Active alert channels will follow your preferences below.',
        tone: 'success',
      });
    } else if (result === 'unsupported') {
      pushToast({
        title: 'Notifications unavailable',
        description: 'This browser does not expose system notifications. Sound chimes remain active.',
        tone: 'warning',
      });
    } else {
      pushToast({
        title: 'Notification permission blocked',
        description: 'Allow notifications in your browser site settings to receive desktop alerts.',
        tone: 'warning',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Granular Notification Preferences */}
      <GlassCard as="section" className="p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-950 dark:text-white flex items-center gap-2">
              {settings.notificationsEnabled && permission === 'granted' ? (
                <Bell className="w-4 h-4 text-purple-600 dark:text-cyan-400" />
              ) : (
                <BellOff className="w-4 h-4 text-slate-400" />
              )}
              <span>Notification Preferences</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Control which workspace alerts fire and configure quiet hours
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="font-mono text-slate-500 dark:text-slate-400">
              {permission === 'unsupported'
                ? 'Browser unsupported'
                : permission === 'denied'
                  ? 'Permission blocked'
                  : settings.notificationsEnabled && permission === 'granted'
                    ? 'Alerts active'
                    : 'Alerts paused'}
            </span>
            <ToggleSwitch
              checked={settings.notificationsEnabled}
              onChange={() => void handleToggleMasterNotifications()}
              ariaLabel="Enable system notifications"
            />
          </div>
        </div>

        <div className="divide-y divide-slate-200/60 dark:divide-slate-800/70 border-t nx-divider">
          {/* Focus & Break Alerts */}
          <div className="py-3.5 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-950 dark:text-white">
                Pomodoro &amp; Break Completion Alerts
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Notify when a focus sprint, deep work block, or short/long break finishes
              </p>
            </div>
            <ToggleSwitch
              checked={prefs.focusSessionAlerts}
              disabled={!settings.notificationsEnabled}
              onChange={() =>
                updateNotificationPreferences({ focusSessionAlerts: !prefs.focusSessionAlerts })
              }
              ariaLabel="Toggle Pomodoro completion alerts"
            />
          </div>

          {/* Task & Goal Deadline Reminders */}
          <div className="py-3.5 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-950 dark:text-white">
                Task &amp; Goal Deadline Reminders
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Highlight approaching due tasks, overdue items, and milestone target dates
              </p>
            </div>
            <ToggleSwitch
              checked={prefs.deadlineReminders}
              disabled={!settings.notificationsEnabled}
              onChange={() =>
                updateNotificationPreferences({ deadlineReminders: !prefs.deadlineReminders })
              }
              ariaLabel="Toggle task and goal deadline reminders"
            />
          </div>

          {/* Calendar Event Reminders + Lead Time */}
          <div className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-slate-950 dark:text-white">
                Calendar Event Reminders
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Remind before scheduled calendar events and focus blocks begin
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <Clock className="w-3.5 h-3.5" />
                <select
                  aria-label="Calendar event reminder lead time"
                  disabled={!settings.notificationsEnabled || !prefs.calendarEventReminders}
                  value={prefs.eventLeadMinutes}
                  onChange={(e) =>
                    updateNotificationPreferences({
                      eventLeadMinutes: Number(e.target.value) as 5 | 10 | 15 | 30,
                    })
                  }
                  className="min-h-[38px] px-2.5 py-1 text-xs font-mono rounded-xl nx-input disabled:opacity-45"
                >
                  <option value={5} className="bg-white dark:bg-slate-900">
                    5 min before
                  </option>
                  <option value={10} className="bg-white dark:bg-slate-900">
                    10 min before
                  </option>
                  <option value={15} className="bg-white dark:bg-slate-900">
                    15 min before
                  </option>
                  <option value={30} className="bg-white dark:bg-slate-900">
                    30 min before
                  </option>
                </select>
              </div>
              <ToggleSwitch
                checked={prefs.calendarEventReminders}
                disabled={!settings.notificationsEnabled}
                onChange={() =>
                  updateNotificationPreferences({
                    calendarEventReminders: !prefs.calendarEventReminders,
                  })
                }
                ariaLabel="Toggle calendar event reminders"
              />
            </div>
          </div>

          {/* Quiet Hours */}
          <div className="py-3.5 space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-950 dark:text-white flex items-center gap-1.5">
                  <Moon className="w-3.5 h-3.5 text-purple-600 dark:text-cyan-400" />
                  <span>Quiet Hours</span>
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Suppress desktop alerts during your rest window
                  {quietNow && ' · Currently in quiet window'}
                </p>
              </div>
              <ToggleSwitch
                checked={prefs.quietHoursEnabled}
                onChange={() =>
                  updateNotificationPreferences({ quietHoursEnabled: !prefs.quietHoursEnabled })
                }
                ariaLabel="Toggle quiet hours"
              />
            </div>

            {prefs.quietHoursEnabled && (
              <div className="grid grid-cols-2 gap-3 max-w-xs pt-1">
                <div>
                  <label
                    htmlFor="quiet-hours-start"
                    className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1"
                  >
                    Starts at
                  </label>
                  <input
                    id="quiet-hours-start"
                    type="time"
                    value={prefs.quietHoursStart}
                    onChange={(e) =>
                      updateNotificationPreferences({ quietHoursStart: e.target.value })
                    }
                    className="w-full min-h-[40px] px-3 py-1.5 text-xs font-mono tabular-nums rounded-xl nx-input"
                  />
                </div>
                <div>
                  <label
                    htmlFor="quiet-hours-end"
                    className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1"
                  >
                    Ends at
                  </label>
                  <input
                    id="quiet-hours-end"
                    type="time"
                    value={prefs.quietHoursEnd}
                    onChange={(e) =>
                      updateNotificationPreferences({ quietHoursEnd: e.target.value })
                    }
                    className="w-full min-h-[40px] px-3 py-1.5 text-xs font-mono tabular-nums rounded-xl nx-input"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </GlassCard>

      {/* Pomodoro Intervals & Sensory Feedback */}
      <GlassCard as="section" className="p-5 sm:p-6 space-y-6">
        <div>
          <h2 className="font-display text-base font-semibold text-slate-950 dark:text-white">
            Focus Cadence &amp; Sensory Feedback
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Customize default Pomodoro intervals, daily focus goals, chimes, and haptics
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            {
              key: 'focusMinutes' as const,
              label: 'Pomodoro (min)',
              min: 5,
              max: 120,
              val: settings.focusMinutes,
            },
            {
              key: 'deepWorkMinutes' as const,
              label: 'Deep Work (min)',
              min: 15,
              max: 180,
              val: settings.deepWorkMinutes,
            },
            {
              key: 'shortBreakMinutes' as const,
              label: 'Short Break',
              min: 1,
              max: 30,
              val: settings.shortBreakMinutes,
            },
            {
              key: 'longBreakMinutes' as const,
              label: 'Long Break',
              min: 5,
              max: 60,
              val: settings.longBreakMinutes,
            },
            {
              key: 'dailyFocusGoalMinutes' as const,
              label: 'Daily Goal (min)',
              min: 30,
              max: 720,
              val: settings.dailyFocusGoalMinutes,
            },
          ].map((field) => (
            <div key={field.key}>
              <label
                htmlFor={`setting-${field.key}`}
                className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5"
              >
                {field.label}
              </label>
              <input
                id={`setting-${field.key}`}
                type="number"
                min={field.min}
                max={field.max}
                value={field.val}
                onChange={(e) =>
                  handleNumberSetting(field.key, e.target.value, field.min, field.max)
                }
                className="w-full min-h-[44px] px-3 py-2 text-sm font-mono tabular-nums rounded-xl nx-input"
              />
            </div>
          ))}
        </div>

        <div className="divide-y divide-slate-200/60 dark:divide-slate-800/70 border-t nx-divider">
          <div className="py-3.5 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-950 dark:text-white">
                Completion Chime
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Synthesized harmonic tone when a focus or break interval finishes
              </p>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <GlowButton
                variant="secondary"
                size="sm"
                onClick={() => playCompletionChime('focus-done')}
              >
                <Volume2 className="w-3.5 h-3.5 text-purple-600 dark:text-cyan-400" />
                <span>Test</span>
              </GlowButton>
              <ToggleSwitch
                checked={settings.soundEnabled}
                onChange={() => updateSettings({ soundEnabled: !settings.soundEnabled })}
                ariaLabel="Toggle completion chime"
              />
            </div>
          </div>

          <div className="py-3.5 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-950 dark:text-white">
                Haptic Feedback
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Subtle tactile pulse on mobile devices via Web Vibration / Capacitor Haptics
              </p>
            </div>
            <ToggleSwitch
              checked={settings.hapticsEnabled}
              onChange={() => updateSettings({ hapticsEnabled: !settings.hapticsEnabled })}
              ariaLabel="Toggle haptic feedback"
            />
          </div>

          <div className="py-3.5 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-950 dark:text-white">
                Auto-Start Breaks (4-Cycle Cadence)
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Automatically launch a Short Break after cycles 1–3 and a Long Break after cycle 4
              </p>
            </div>
            <ToggleSwitch
              checked={settings.autoStartBreaks}
              onChange={() => updateSettings({ autoStartBreaks: !settings.autoStartBreaks })}
              ariaLabel="Toggle auto-start breaks"
            />
          </div>
        </div>
      </GlassCard>
    </div>
  );
};
