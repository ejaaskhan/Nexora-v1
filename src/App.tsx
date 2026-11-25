import React, { lazy, Suspense, useEffect, useRef } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'motion/react';
import { AuthProvider, useAuth } from './store/AuthContext';
import { WorkspaceProvider, useWorkspace } from './store/WorkspaceContext';
import { AppShell } from './components/layout/AppShell';
import { ToastContainer } from './components/ui/ToastContainer';
import { FullScreenLoadingShell, WorkspaceRouteSkeleton } from './components/ui/WorkspaceSkeleton';
import { SplashScreen } from './features/splash/SplashScreen';
import {
  exitNativeApp,
  hideNativeSplashScreen,
  registerAndroidBackButton,
  registerAppLifecycleSync,
  syncNativeStatusBar,
} from './platform/capacitor';

// Route-level code splitting for fast initial startup across web, PWA, and Capacitor WebView
const OnboardingPage = lazy(() =>
  import('./features/onboarding/OnboardingPage').then((m) => ({ default: m.OnboardingPage }))
);
const AuthPage = lazy(() =>
  import('./features/auth/AuthPage').then((m) => ({ default: m.AuthPage }))
);
const ProfileSetupPage = lazy(() =>
  import('./features/auth/ProfileSetupPage').then((m) => ({ default: m.ProfileSetupPage }))
);
const DashboardPage = lazy(() =>
  import('./features/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage }))
);
const TasksPage = lazy(() =>
  import('./features/tasks/TasksPage').then((m) => ({ default: m.TasksPage }))
);
const GoalsPage = lazy(() =>
  import('./features/goals/GoalsPage').then((m) => ({ default: m.GoalsPage }))
);
const CalendarPage = lazy(() =>
  import('./features/calendar/CalendarPage').then((m) => ({ default: m.CalendarPage }))
);
const NotesPage = lazy(() =>
  import('./features/notes/NotesPage').then((m) => ({ default: m.NotesPage }))
);
const FocusPage = lazy(() =>
  import('./features/focus/FocusPage').then((m) => ({ default: m.FocusPage }))
);
const HistoryPage = lazy(() =>
  import('./features/history/HistoryPage').then((m) => ({ default: m.HistoryPage }))
);
const SettingsPage = lazy(() =>
  import('./features/settings/SettingsPage').then((m) => ({ default: m.SettingsPage }))
);

interface ErrorBoundaryState {
  hasError: boolean;
}

class WorkspaceErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(): void {
    // Error boundary isolates render failures without disrupting local IndexedDB persistence
  }

  private handleReturnHome = () => {
    this.setState({ hasError: false });
    window.history.pushState({}, '', '/');
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className="min-h-screen flex items-center justify-center nx-ambient-backdrop p-6"
        >
          <div className="max-w-md w-full rounded-2xl nx-glass-elevated p-6 sm:p-7 text-center space-y-4">
            <h1 className="font-display text-lg font-semibold text-slate-950 dark:text-white">
              NEXORA encountered a display error
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Your tasks, notes, goals, calendar, and focus sessions remain safely stored in local
              IndexedDB. Reload to resume right where you left off.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="min-h-[44px] px-5 py-2 rounded-xl nx-glow-button text-white text-sm font-medium cursor-pointer"
              >
                Reload Workspace
              </button>
              <button
                type="button"
                onClick={this.handleReturnHome}
                className="min-h-[44px] px-4 py-2 rounded-xl nx-glass text-slate-800 dark:text-slate-100 text-sm font-medium hover:border-cyan-400/50 transition-colors cursor-pointer"
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * Coordinates Capacitor Android native bridges (hardware Back button, StatusBar theme sync,
 * SplashScreen handoff, foreground lifecycle resume) and route scroll reset.
 */
const NativeRuntimeController: React.FC = () => {
  const { authReady } = useAuth();
  const { hydrated, resolvedTheme, pushToast } = useWorkspace();
  const location = useLocation();
  const navigate = useNavigate();
  const lastBackPressRef = useRef<number>(0);

  // Reset viewport scroll on route transition
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [location.pathname]);

  // Sync native Android/iOS StatusBar colors whenever NEXORA theme switches
  useEffect(() => {
    void syncNativeStatusBar(resolvedTheme);
  }, [resolvedTheme]);

  // Dismiss native Capacitor SplashScreen once auth + IndexedDB hydration finishes
  useEffect(() => {
    if (authReady && hydrated) {
      void hideNativeSplashScreen();
    }
  }, [authReady, hydrated]);

  // Android hardware Back-button handling (close modals first, navigate back, or double-back exit)
  useEffect(() => {
    return registerAndroidBackButton((canGoBack) => {
      const activeDialog = document.querySelector('[role="dialog"], [role="alertdialog"]');
      if (activeDialog) {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        return;
      }

      if (location.pathname !== '/' && (canGoBack || window.history.length > 1)) {
        navigate(-1);
        return;
      }

      if (location.pathname !== '/') {
        navigate('/', { replace: true });
        return;
      }

      const now = Date.now();
      if (now - lastBackPressRef.current < 2000) {
        void exitNativeApp();
      } else {
        lastBackPressRef.current = now;
        pushToast({
          title: 'Press back again to exit NEXORA',
          tone: 'neutral',
        });
      }
    });
  }, [location.pathname, navigate, pushToast]);

  // Notify timer & state listeners when Android app returns to foreground
  useEffect(() => {
    return registerAppLifecycleSync(() => {
      window.dispatchEvent(new CustomEvent('nexora:app-resume'));
    });
  }, []);

  return null;
};

const ProtectedWorkspace: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, authReady, hasSeenOnboarding } = useAuth();
  const { hydrated } = useWorkspace();

  if (!authReady) {
    return <FullScreenLoadingShell />;
  }

  if (!user) {
    return <Navigate to={hasSeenOnboarding ? '/auth' : '/onboarding'} replace />;
  }

  if (!user.profileCompleted) {
    return <Navigate to="/profile-setup" replace />;
  }

  return (
    <AppShell>
      {!hydrated ? (
        <WorkspaceRouteSkeleton label="Restoring local workspace from IndexedDB" />
      ) : (
        <Suspense fallback={<WorkspaceRouteSkeleton />}>{children}</Suspense>
      )}
    </AppShell>
  );
};

const AuthRouteGuard: React.FC = () => {
  const { user, authReady } = useAuth();

  if (!authReady) {
    return <FullScreenLoadingShell />;
  }

  if (user) {
    return <Navigate to={user.profileCompleted ? '/' : '/profile-setup'} replace />;
  }

  return (
    <Suspense fallback={<FullScreenLoadingShell />}>
      <AuthPage />
    </Suspense>
  );
};

const ProfileSetupGuard: React.FC = () => {
  const { user, authReady } = useAuth();

  if (!authReady) {
    return <FullScreenLoadingShell />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <Suspense fallback={<FullScreenLoadingShell />}>
      <ProfileSetupPage />
    </Suspense>
  );
};

const AppRoutes: React.FC = () => {
  const { showSplash, dismissSplash } = useAuth();

  return (
    <>
      <NativeRuntimeController />

      <AnimatePresence>
        {showSplash && <SplashScreen onComplete={dismissSplash} />}
      </AnimatePresence>

      <Routes>
        <Route
          path="/onboarding"
          element={
            <Suspense fallback={<FullScreenLoadingShell />}>
              <OnboardingPage />
            </Suspense>
          }
        />
        <Route path="/auth" element={<AuthRouteGuard />} />
        <Route path="/profile-setup" element={<ProfileSetupGuard />} />

        <Route
          path="/"
          element={
            <ProtectedWorkspace>
              <DashboardPage />
            </ProtectedWorkspace>
          }
        />
        <Route
          path="/tasks"
          element={
            <ProtectedWorkspace>
              <TasksPage />
            </ProtectedWorkspace>
          }
        />
        <Route
          path="/goals"
          element={
            <ProtectedWorkspace>
              <GoalsPage />
            </ProtectedWorkspace>
          }
        />
        <Route
          path="/calendar"
          element={
            <ProtectedWorkspace>
              <CalendarPage />
            </ProtectedWorkspace>
          }
        />
        <Route
          path="/notes"
          element={
            <ProtectedWorkspace>
              <NotesPage />
            </ProtectedWorkspace>
          }
        />
        <Route
          path="/focus"
          element={
            <ProtectedWorkspace>
              <FocusPage />
            </ProtectedWorkspace>
          }
        />
        <Route
          path="/planner"
          element={
            <ProtectedWorkspace>
              <CalendarPage />
            </ProtectedWorkspace>
          }
        />
        <Route
          path="/history"
          element={
            <ProtectedWorkspace>
              <HistoryPage />
            </ProtectedWorkspace>
          }
        />
        <Route
          path="/analytics"
          element={
            <ProtectedWorkspace>
              <HistoryPage />
            </ProtectedWorkspace>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedWorkspace>
              <SettingsPage />
            </ProtectedWorkspace>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <ToastContainer />
    </>
  );
};

export default function App() {
  return (
    <WorkspaceErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <WorkspaceProvider>
            <AppRoutes />
          </WorkspaceProvider>
        </AuthProvider>
      </BrowserRouter>
    </WorkspaceErrorBoundary>
  );
}
