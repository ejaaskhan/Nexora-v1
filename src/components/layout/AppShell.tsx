import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import {
  BarChart3,
  CalendarDays,
  CheckSquare,
  FileText,
  LayoutDashboard,
  LogOut,
  Moon,
  Play,
  Settings,
  Sun,
  Target,
  Timer,
} from 'lucide-react';
import { useWorkspace } from '../../store/WorkspaceContext';
import { useAuth } from '../../store/AuthContext';
import { formatClockSeconds, formatLongDate, getTodayISO } from '../../utils/date';
import { NX_SPRINGS } from '../../design/tokens';
import { AvatarBadge } from '../ui/AvatarBadge';
import { PWAInstallButton } from '../ui/PWAInstallButton';
import { OfflineIndicator } from '../ui/OfflineIndicator';

interface NavItem {
  to: string;
  label: string;
  icon: React.FC<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/tasks', label: 'Tasks', icon: CheckSquare },
  { to: '/goals', label: 'Goals', icon: Target },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/notes', label: 'Notes', icon: FileText },
  { to: '/focus', label: 'Focus', icon: Timer },
  { to: '/history', label: 'Analytics', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: Settings },
];

const MOBILE_NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/tasks', label: 'Tasks', icon: CheckSquare },
  { to: '/goals', label: 'Goals', icon: Target },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/notes', label: 'Notes', icon: FileText },
];

const ROUTE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/tasks': 'Task Manager',
  '/goals': 'Goals & Milestones',
  '/calendar': 'Calendar & Schedule',
  '/planner': 'Calendar & Schedule',
  '/notes': 'Smart Notes',
  '/focus': 'Pomodoro Focus Studio',
  '/history': 'Productivity Analytics',
  '/analytics': 'Productivity Analytics',
  '/settings': 'Settings & Data',
};

const NexoraMark: React.FC<{ size?: number }> = ({ size = 26 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 512 512"
    fill="none"
    aria-hidden="true"
    className="shrink-0"
  >
    <defs>
      <linearGradient id="nxMarkGrad" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#8B5CF6" />
        <stop offset="100%" stopColor="#06B6D4" />
      </linearGradient>
    </defs>
    <rect
      width="512"
      height="512"
      rx="120"
      className="fill-slate-950 dark:fill-[#0D152D]"
      stroke="url(#nxMarkGrad)"
      strokeOpacity="0.55"
      strokeWidth="22"
    />
    <path d="M156 368V144H202L310 296V144H356V368H310L202 216V368H156Z" fill="#F8FAFC" />
    <rect x="310" y="144" width="46" height="46" rx="10" fill="url(#nxMarkGrad)" />
  </svg>
);

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const { tasks, goals, notes, timer, resolvedTheme, toggleThemeQuick, pushToast } = useWorkspace();
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const prefersReduced = useReducedMotion();

  const currentTitle = ROUTE_TITLES[location.pathname] ?? 'NEXORA';
  const isNavItemActive = (to: string): boolean => {
    if (to === '/') return location.pathname === '/';
    if (to === '/calendar') {
      return location.pathname === '/calendar' || location.pathname === '/planner';
    }
    if (to === '/history') {
      return location.pathname === '/history' || location.pathname === '/analytics';
    }
    return location.pathname === to;
  };
  const todayISO = getTodayISO();
  const todayLabel = formatLongDate(todayISO);
  const isTimerActive = timer.status === 'running' || timer.status === 'paused';
  const openTasksCount = tasks.filter((t) => !t.completed).length;
  const activeGoalsCount = goals.filter((g) => !g.completed).length;
  const totalNotesCount = notes.length;

  const handleQuickSignOut = async () => {
    await signOut();
    pushToast({ title: 'Signed out', description: 'See you next focus session.', tone: 'neutral' });
    navigate('/auth', { replace: true });
  };

  return (
    <div className="relative min-h-screen flex flex-col md:flex-row text-slate-900 dark:text-slate-100">
      {/* Keyboard Skip Link */}
      <a
        href="#nexora-main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:min-h-[44px] focus:px-4 focus:py-2.5 focus:rounded-xl focus:nx-glow-button focus:text-white focus:text-sm focus:font-medium focus:inline-flex focus:items-center"
      >
        Skip to main content
      </a>

      {/* Fixed GPU-composited Midnight Navy / Frosted Light Ambient Backdrop */}
      <div
        aria-hidden="true"
        className="fixed inset-0 -z-10 pointer-events-none nx-ambient-backdrop"
      />

      {/* Tablet Compact Glass Icon Rail (768px - 1023px) */}
      <aside
        aria-label="Tablet navigation"
        className="hidden md:flex lg:hidden flex-col items-center w-[76px] fixed inset-y-0 left-0 nx-glass-sidebar border-r nx-divider z-30 py-3.5 justify-between"
      >
        <div className="flex flex-col items-center gap-5 w-full">
          <NavLink
            to="/"
            aria-label="NEXORA Home"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl focus-visible:outline-2 focus-visible:outline-cyan-400"
          >
            <NexoraMark size={28} />
          </NavLink>

          <nav className="flex flex-col items-center gap-1.5 w-full px-2.5">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = isNavItemActive(item.to);
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  title={item.label}
                  aria-label={item.label}
                  aria-current={active ? 'page' : undefined}
                  className={`relative w-full min-h-[46px] rounded-xl flex items-center justify-center transition-colors focus-visible:outline-2 focus-visible:outline-cyan-400 ${
                    active
                      ? 'text-cyan-700 dark:text-cyan-300'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="nx-tablet-nav"
                      transition={prefersReduced ? { duration: 0 } : NX_SPRINGS.snappy}
                      className="absolute inset-0 rounded-xl border border-purple-500/35 dark:border-cyan-400/35 bg-purple-500/10 dark:bg-cyan-400/10"
                      aria-hidden="true"
                    />
                  )}
                  <Icon className="w-5 h-5 relative z-10" />
                </NavLink>
              );
            })}
          </nav>
        </div>

        <div className="flex flex-col items-center gap-2">
          <PWAInstallButton variant="rail" />
          <button
            type="button"
            onClick={toggleThemeQuick}
            title={resolvedTheme === 'dark' ? 'Switch to Frosted Light' : 'Switch to Midnight Dark'}
            aria-label={resolvedTheme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            className="min-h-[44px] min-w-[44px] rounded-xl nx-glass flex items-center justify-center text-slate-600 dark:text-slate-300 hover:border-cyan-400/50 transition-colors"
          >
            {resolvedTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          {user && (
            <button
              type="button"
              onClick={() => navigate('/settings')}
              title={`${user.displayName} — Account Settings`}
              aria-label="Open account profile"
              className="min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center hover:opacity-90 transition-opacity"
            >
              <AvatarBadge avatarId={user.avatarId} displayName={user.displayName} size="sm" />
            </button>
          )}
        </div>
      </aside>

      {/* Desktop Full Glass Sidebar (>= 1024px, 252px wide) */}
      <aside className="hidden lg:flex lg:flex-col lg:w-[252px] lg:fixed lg:inset-y-0 lg:left-0 nx-glass-sidebar border-r nx-divider z-30">
        <div className="h-14 px-5 flex items-center border-b nx-divider">
          <NavLink
            to="/"
            className="flex items-center gap-2.5 text-slate-950 dark:text-white whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-cyan-400 rounded-lg"
          >
            <NexoraMark size={26} />
            <span className="font-display text-base font-bold tracking-wider">NEXORA</span>
          </NavLink>
        </div>

        <nav aria-label="Primary navigation" className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isNavItemActive(item.to);
            const showLiveClock = item.to === '/focus' && isTimerActive;
            const showOpenTasks = item.to === '/tasks' && openTasksCount > 0;
            const showActiveGoals = item.to === '/goals' && activeGoalsCount > 0;
            const showNotesCount = item.to === '/notes' && totalNotesCount > 0;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                aria-current={active ? 'page' : undefined}
                className={`relative min-h-[44px] px-3.5 py-2 rounded-xl flex items-center justify-between gap-2 text-sm font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-cyan-400 ${
                  active
                    ? 'text-slate-950 dark:text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-slate-100'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="nx-desktop-nav"
                    transition={prefersReduced ? { duration: 0 } : NX_SPRINGS.snappy}
                    className="absolute inset-0 rounded-xl border border-purple-500/30 dark:border-cyan-400/30"
                    style={{ backgroundImage: 'var(--nx-gradient-soft)' }}
                    aria-hidden="true"
                  />
                )}
                <span className="relative z-10 flex items-center gap-3 min-w-0">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      active
                        ? 'text-purple-600 dark:text-cyan-400'
                        : 'text-slate-400 dark:text-slate-500'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </span>
                {showLiveClock && (
                  <span className="relative z-10 font-mono text-xs tabular-nums font-medium text-purple-600 dark:text-cyan-300">
                    {formatClockSeconds(timer.remainingSeconds)}
                  </span>
                )}
                {showOpenTasks && (
                  <span className="relative z-10 font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
                    {openTasksCount}
                  </span>
                )}
                {showActiveGoals && (
                  <span className="relative z-10 font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
                    {activeGoalsCount}
                  </span>
                )}
                {showNotesCount && (
                  <span className="relative z-10 font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
                    {totalNotesCount}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-3.5 border-t nx-divider space-y-2.5">
          <PWAInstallButton variant="sidebar" />

          <button
            type="button"
            onClick={toggleThemeQuick}
            aria-label={resolvedTheme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            className="w-full min-h-[40px] px-3.5 py-2 rounded-xl nx-glass flex items-center justify-between text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-cyan-400/45 transition-colors focus-visible:outline-2 focus-visible:outline-cyan-400"
          >
            <span className="flex items-center gap-2.5">
              {resolvedTheme === 'dark' ? (
                <Sun className="w-4 h-4 text-cyan-400" />
              ) : (
                <Moon className="w-4 h-4 text-purple-600" />
              )}
              <span>{resolvedTheme === 'dark' ? 'Frosted Light' : 'Midnight Dark'}</span>
            </span>
          </button>

          {user && (
            <div className="flex items-center justify-between gap-2 pt-2 border-t nx-divider">
              <button
                type="button"
                onClick={() => navigate('/settings')}
                className="flex items-center gap-2.5 min-w-0 text-left rounded-xl p-1 -ml-1 hover:bg-slate-900/5 dark:hover:bg-white/5 transition-colors flex-1"
              >
                <AvatarBadge avatarId={user.avatarId} displayName={user.displayName} size="sm" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-950 dark:text-white truncate">
                    {user.displayName}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {user.isAnonymous ? 'Local Guest' : user.role}
                  </p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => void handleQuickSignOut()}
                aria-label="Sign out"
                title="Sign out"
                className="min-h-[36px] min-w-[36px] rounded-xl flex items-center justify-center text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Compact Frosted Top Bar (< 768px, 52px + safe area) */}
      <header className="md:hidden sticky top-0 z-30 pt-safe nx-glass-sidebar border-b nx-divider">
        <div className="h-[52px] px-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <NexoraMark size={24} />
            <span className="font-display text-sm font-semibold text-slate-950 dark:text-white truncate">
              {currentTitle}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {isTimerActive && location.pathname !== '/focus' ? (
              <button
                type="button"
                onClick={() => navigate('/focus')}
                className="min-h-[40px] px-2.5 rounded-xl nx-glass flex items-center gap-1.5 text-xs font-mono tabular-nums font-medium text-purple-600 dark:text-cyan-300"
              >
                <Timer className="w-3.5 h-3.5" />
                <span>{formatClockSeconds(timer.remainingSeconds)}</span>
              </button>
            ) : (
              location.pathname !== '/focus' && (
                <button
                  type="button"
                  onClick={() => navigate('/focus')}
                  aria-label="Open Pomodoro Focus Studio"
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-200 hover:bg-slate-900/5 dark:hover:bg-white/10 transition-colors"
                >
                  <Timer className="w-4 h-4" />
                </button>
              )
            )}
            {location.pathname !== '/history' && location.pathname !== '/analytics' && (
              <button
                type="button"
                onClick={() => navigate('/history')}
                aria-label="Open Productivity Analytics"
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-200 hover:bg-slate-900/5 dark:hover:bg-white/10 transition-colors"
              >
                <BarChart3 className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={toggleThemeQuick}
              aria-label={resolvedTheme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-200 hover:bg-slate-900/5 dark:hover:bg-white/10 transition-colors"
            >
              {resolvedTheme === 'dark' ? (
                <Sun className="w-4 h-4 text-cyan-400" />
              ) : (
                <Moon className="w-4 h-4 text-purple-600" />
              )}
            </button>
            {user && (
              <button
                type="button"
                onClick={() => navigate('/settings')}
                aria-label="Account profile"
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl"
              >
                <AvatarBadge avatarId={user.avatarId} displayName={user.displayName} size="sm" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Responsive Content Frame */}
      <div className="flex-1 md:pl-[76px] lg:pl-[252px] flex flex-col min-w-0">
        {/* Tablet & Desktop Frosted Contextual Header */}
        <header className="hidden md:flex sticky top-0 z-20 h-14 px-6 lg:px-8 items-center justify-between gap-8 nx-glass-sidebar border-b nx-divider">
          <div className="flex items-center gap-2.5 text-sm min-w-0">
            <span className="font-display font-semibold text-slate-950 dark:text-white whitespace-nowrap">
              {currentTitle}
            </span>
            <span className="text-slate-400/70 dark:text-slate-600" aria-hidden="true">
              /
            </span>
            <span className="text-slate-600 dark:text-slate-400 truncate">{todayLabel}</span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {location.pathname !== '/focus' && (
              <button
                type="button"
                onClick={() => navigate('/focus')}
                className="min-h-[36px] px-4 py-1.5 rounded-xl nx-glow-button text-white text-xs font-medium border border-white/15 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>
                  {isTimerActive
                    ? `Resume ${formatClockSeconds(timer.remainingSeconds)}`
                    : 'Start Focus'}
                </span>
              </button>
            )}
          </div>
        </header>

        {/* Scrollable Workspace Viewport */}
        <main
          id="nexora-main-content"
          tabIndex={-1}
          className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 md:pt-7 pb-24 md:pb-12 focus:outline-none"
        >
          {children}
        </main>
      </div>

      {/* Mobile Fixed Frosted Bottom Tab Bar (< 768px, 56px + safe area) */}
      <nav
        aria-label="Mobile navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 pb-safe nx-glass-sidebar border-t nx-divider"
      >
        <div className="grid grid-cols-5 h-[56px]">
          {MOBILE_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isNavItemActive(item.to);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                aria-current={active ? 'page' : undefined}
                className={`relative min-h-[44px] flex flex-col items-center justify-center gap-1 transition-colors focus-visible:outline-2 focus-visible:outline-cyan-400 ${
                  active
                    ? 'text-purple-600 dark:text-cyan-400'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="nx-mobile-nav"
                    transition={prefersReduced ? { duration: 0 } : NX_SPRINGS.snappy}
                    className="absolute top-0 inset-x-3 h-[2px] rounded-full nx-gradient-primary"
                    aria-hidden="true"
                  />
                )}
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium leading-none tracking-tight whitespace-nowrap">
                  {item.label}
                </span>
              </NavLink>
            );
          })}
        </div>
      </nav>

      <OfflineIndicator />
    </div>
  );
};
