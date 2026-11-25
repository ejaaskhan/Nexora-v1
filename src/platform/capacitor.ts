import { Capacitor, PluginListenerHandle } from '@capacitor/core';
import { App } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';

/**
 * Official Capacitor Native Bridge for NEXORA Android & iOS builds.
 * Uses @capacitor/core, @capacitor/app, @capacitor/status-bar, and @capacitor/splash-screen
 * when running natively on Android/iOS, while remaining a zero-overhead no-op in web browsers.
 */

export function isCapacitorNative(): boolean {
  return Capacitor.isNativePlatform();
}

export function getCapacitorPlatform(): 'android' | 'ios' | 'web' {
  const platform = Capacitor.getPlatform();
  if (platform === 'android') return 'android';
  if (platform === 'ios') return 'ios';
  return 'web';
}

export async function syncNativeStatusBar(resolvedTheme: 'light' | 'dark'): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    await StatusBar.setOverlaysWebView({ overlay: false });
    // Style.Dark renders light icons on dark background; Style.Light renders dark icons on light background.
    await StatusBar.setStyle({
      style: resolvedTheme === 'dark' ? Style.Dark : Style.Light,
    });
    if (Capacitor.getPlatform() === 'android') {
      await StatusBar.setBackgroundColor({
        color: resolvedTheme === 'dark' ? '#070B19' : '#EFF4FC',
      });
    }
  } catch {
    // Ignore on platforms where StatusBar API is unavailable
  }
}

export async function hideNativeSplashScreen(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await SplashScreen.hide({ fadeOutDuration: 260 });
  } catch {
    // Ignore if SplashScreen plugin is unavailable
  }
}

export function registerAndroidBackButton(
  onBack: (canGoBack: boolean) => void
): () => void {
  if (!Capacitor.isNativePlatform()) {
    return () => {};
  }

  let handle: PluginListenerHandle | null = null;
  let disposed = false;

  void App.addListener('backButton', ({ canGoBack }) => {
    onBack(canGoBack);
  })
    .then((resolved) => {
      if (disposed) {
        void resolved.remove();
      } else {
        handle = resolved;
      }
    })
    .catch(() => {
      // Ignore bridge listener errors
    });

  return () => {
    disposed = true;
    void handle?.remove();
  };
}

export function registerAppLifecycleSync(onResume: () => void): () => void {
  if (!Capacitor.isNativePlatform()) {
    return () => {};
  }

  let handle: PluginListenerHandle | null = null;
  let disposed = false;

  void App.addListener('appStateChange', ({ isActive }) => {
    if (isActive) {
      onResume();
    }
  })
    .then((resolved) => {
      if (disposed) {
        void resolved.remove();
      } else {
        handle = resolved;
      }
    })
    .catch(() => {
      // Ignore bridge listener errors
    });

  return () => {
    disposed = true;
    void handle?.remove();
  };
}

export async function exitNativeApp(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await App.exitApp();
  } catch {
    // Ignore exit failures
  }
}

export interface NativeBridgeReadiness {
  appId: string;
  platform: 'android' | 'ios' | 'web';
  isNative: boolean;
  bridges: Array<{
    name: string;
    activeMode: string;
  }>;
}

export function getNativeBridgeReadiness(): NativeBridgeReadiness {
  const isNative = Capacitor.isNativePlatform();

  return {
    appId: 'app.nexora.productivity',
    platform: getCapacitorPlatform(),
    isNative,
    bridges: [
      {
        name: 'Hardware Back Navigation',
        activeMode:
          isNative && Capacitor.isPluginAvailable('App')
            ? 'Native Android Bridge'
            : 'Capacitor Ready (Web)',
      },
      {
        name: 'Status Bar Theme Sync',
        activeMode:
          isNative && Capacitor.isPluginAvailable('StatusBar')
            ? 'Native StatusBar'
            : 'Theme-Color Meta',
      },
      {
        name: 'Splash & Lifecycle Sync',
        activeMode:
          isNative && Capacitor.isPluginAvailable('SplashScreen')
            ? 'Native Splash Handoff'
            : 'Web Visibility API',
      },
      {
        name: 'Haptics & Local Alerts',
        activeMode:
          isNative &&
          (Capacitor.isPluginAvailable('Haptics') ||
            Capacitor.isPluginAvailable('LocalNotifications'))
            ? 'Native Capacitor Plugins'
            : 'Web Audio / Vibration',
      },
    ],
  };
}
