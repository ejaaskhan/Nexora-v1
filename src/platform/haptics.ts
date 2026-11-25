import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

export type HapticStyle = 'light' | 'medium' | 'success' | 'warning';

export interface HapticsAdapter {
  readonly isSupported: boolean;
  trigger(style: HapticStyle, enabled: boolean): void;
}

export const hapticsAdapter: HapticsAdapter = {
  get isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    if (Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('Haptics')) {
      return true;
    }
    return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
  },

  trigger(style: HapticStyle, enabled: boolean): void {
    if (!enabled || typeof window === 'undefined') return;

    if (Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('Haptics')) {
      if (style === 'success' || style === 'warning') {
        void Haptics.notification({
          type: style === 'success' ? NotificationType.Success : NotificationType.Warning,
        }).catch(() => {});
      } else {
        void Haptics.impact({
          style: style === 'light' ? ImpactStyle.Light : ImpactStyle.Medium,
        }).catch(() => {});
      }
      return;
    }

    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      const patterns: Record<HapticStyle, number | number[]> = {
        light: 12,
        medium: 24,
        success: [18, 45, 28],
        warning: [30, 40, 30],
      };
      try {
        navigator.vibrate(patterns[style]);
      } catch {
        // Ignore vibration rejections
      }
    }
  },
};
