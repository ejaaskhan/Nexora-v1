import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Production Capacitor Android & iOS configuration for NEXORA.
 *
 * A-to-Z Android APK / AAB Build Commands:
 *   - Sync web bundle to Android:     npm run cap:sync
 *   - Build sideloadable Debug APK:   npm run android:apk:debug
 *   - Build signed Release APK:       npm run android:apk:release
 *   - Build Play Store Release AAB:   npm run android:aab:release
 *   - Open in Android Studio:         npm run cap:open:android
 */
const config: CapacitorConfig = {
  appId: 'app.nexora.productivity',
  appName: 'NEXORA',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: false,
  },
  android: {
    backgroundColor: '#070B19',
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: false,
      backgroundColor: '#070B19',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: false,
      splashImmersive: false,
    },
    StatusBar: {
      overlaysWebView: false,
      style: 'DARK',
      backgroundColor: '#070B19',
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_nexora',
      iconColor: '#8B5CF6',
    },
    Keyboard: {
      resizeOnFullScreen: true,
    },
  },
};

export default config;
