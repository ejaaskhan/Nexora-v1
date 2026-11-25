import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { storageAdapter } from './storage';
import { hapticsAdapter } from './haptics';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    const userAgent = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = async (): Promise<boolean> => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
      return true;
    }
    return false;
  };

  return {
    isInstallable: Boolean(deferredPrompt),
    isInstalled,
    isIOS,
    install,
  };
}

export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

export interface PlatformCapabilities {
  runtime: 'android-capacitor' | 'ios-capacitor' | 'pwa-standalone' | 'web-browser';
  storageDriver: string;
  hapticsAvailable: boolean;
  serviceWorkerSupported: boolean;
  notificationsSupported: boolean;
}

export function detectPlatformCapabilities(): PlatformCapabilities {
  if (typeof window === 'undefined') {
    return {
      runtime: 'web-browser',
      storageDriver: storageAdapter.driverName,
      hapticsAvailable: false,
      serviceWorkerSupported: false,
      notificationsSupported: false,
    };
  }

  let runtime: PlatformCapabilities['runtime'] = 'web-browser';
  if (Capacitor.isNativePlatform()) {
    runtime = Capacitor.getPlatform() === 'ios' ? 'ios-capacitor' : 'android-capacitor';
  } else if (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  ) {
    runtime = 'pwa-standalone';
  }

  return {
    runtime,
    storageDriver: storageAdapter.driverName,
    hapticsAvailable: hapticsAdapter.isSupported,
    serviceWorkerSupported: 'serviceWorker' in navigator,
    notificationsSupported:
      Capacitor.isNativePlatform()
        ? Capacitor.isPluginAvailable('LocalNotifications')
        : 'Notification' in window,
  };
}
