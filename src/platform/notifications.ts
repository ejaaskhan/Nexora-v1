import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

/**
 * Platform-agnostic Notification & Audio Chime Adapter.
 * Uses synthesized Web Audio harmonic tones (zero external audio files),
 * Capacitor LocalNotifications on Android/iOS (including Android 13+ POST_NOTIFICATIONS),
 * and the Web Notification API on browsers.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  if (!audioCtx) {
    audioCtx = new Ctx();
  }
  if (audioCtx.state === 'suspended') {
    void audioCtx.resume();
  }
  return audioCtx;
}

export function playCompletionChime(kind: 'focus-done' | 'break-done' = 'focus-done'): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const notes = kind === 'focus-done' ? [523.25, 659.25, 783.99] : [587.33, 440.0];

  notes.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now + idx * 0.14);

    gain.gain.setValueAtTime(0.0001, now + idx * 0.14);
    gain.gain.exponentialRampToValueAtTime(0.12, now + idx * 0.14 + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.14 + 0.55);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + idx * 0.14);
    osc.stop(now + idx * 0.14 + 0.6);
  });
}

export async function requestNotificationPermission(): Promise<'granted' | 'denied' | 'unsupported'> {
  if (Capacitor.isNativePlatform()) {
    try {
      const current = await LocalNotifications.checkPermissions();
      if (current.display === 'granted') return 'granted';
      const requested = await LocalNotifications.requestPermissions();
      return requested.display === 'granted' ? 'granted' : 'denied';
    } catch {
      return 'denied';
    }
  }

  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  try {
    const result = await Notification.requestPermission();
    return result === 'granted' ? 'granted' : 'denied';
  } catch {
    return 'denied';
  }
}

function parseHHMMToMinutes(hhmm: string): number | null {
  if (!/^\d{2}:\d{2}$/.test(hhmm)) return null;
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export function isWithinQuietHours(
  enabled: boolean,
  startHHMM: string,
  endHHMM: string,
  now: Date = new Date()
): boolean {
  if (!enabled) return false;
  const start = parseHHMMToMinutes(startHHMM);
  const end = parseHHMMToMinutes(endHHMM);
  if (start === null || end === null || start === end) return false;
  const current = now.getHours() * 60 + now.getMinutes();
  if (start < end) {
    return current >= start && current < end;
  }
  // Overnight window (e.g. 22:00 -> 07:00)
  return current >= start || current < end;
}

export function sendSessionNotification(
  title: string,
  body: string,
  enabled: boolean,
  quietOptions?: { enabled: boolean; start: string; end: string }
): void {
  if (!enabled || typeof window === 'undefined') return;
  if (
    quietOptions &&
    isWithinQuietHours(quietOptions.enabled, quietOptions.start, quietOptions.end)
  ) {
    return;
  }

  if (Capacitor.isNativePlatform()) {
    void LocalNotifications.schedule({
      notifications: [
        {
          id: Math.floor(Date.now() % 2147483000),
          title,
          body,
          smallIcon: 'ic_stat_nexora',
          iconColor: '#8B5CF6',
        },
      ],
    }).catch(() => {
      // Ignore notification delivery errors if permission was revoked
    });
    return;
  }

  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: '/pwa-192x192.png',
        silent: true,
      });
    } catch {
      // Ignore notification delivery error in restricted frames
    }
  }
}
