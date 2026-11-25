import React, { lazy, Suspense, useState } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { useWorkspace } from '../../store/WorkspaceContext';
import { ThemePreference } from '../../types/productivity';
import { GlassCard } from '../../components/ui/GlassCard';
import { PageTransition } from '../../components/ui/PageTransition';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { AccountProfileSection } from '../../components/settings/AccountProfileSection';
import { NotificationsFocusTab } from '../../components/settings/NotificationsFocusTab';
import { SyncArchitectureTab } from '../../components/settings/SyncArchitectureTab';
import { formatBytesCompact } from '../../utils/backup';

const DataBackupsTab = lazy(() =>
  import('../../components/settings/DataBackupsTab').then((m) => ({
    default: m.DataBackupsTab,
  }))
);

type SettingsTab = 'profile' | 'notifications' | 'backups' | 'sync';

const THEME_CARDS: Array<{
  value: ThemePreference;
  label: string;
  description: string;
  icon: React.FC<{ className?: string }>;
  swatchClass: string;
}> = [
  {
    value: 'dark',
    label: 'Midnight Navy',
    description: 'Deep navy glass with purple-cyan edge glow',
    icon: Moon,
    swatchClass: 'bg-[#070B19] border-cyan-400/40',
  },
  {
    value: 'light',
    label: 'Frosted Light',
    description: 'Airy porcelain glass for bright daylight',
    icon: Sun,
    swatchClass: 'bg-[#EFF4FC] border-purple-500/35',
  },
  {
    value: 'system',
    label: 'System Sync',
    description: 'Matches your OS or mobile display theme',
    icon: Monitor,
    swatchClass: 'bg-gradient-to-br from-[#070B19] via-[#1E293B] to-[#EFF4FC] border-slate-400/40',
  },
];

export const SettingsPage: React.FC = () => {
  const { settings, storageEngine, syncMeta, estimatedStorageBytes, updateSettings } =
    useWorkspace();
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

  return (
    <PageTransition className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-purple-600 dark:text-cyan-400">
            Profile, theme, notifications, local backups, and cloud-sync readiness
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-950 dark:text-white mt-1">
            Settings &amp; Data
          </h1>
        </div>

        <p className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
          {storageEngine} · r{syncMeta.localRevision} · {formatBytesCompact(estimatedStorageBytes)}
        </p>
      </div>

      {/* 4-Tab Settings Hub Navigation */}
      <div className="overflow-x-auto pb-1">
        <SegmentedControl
          ariaLabel="Settings workspace sections"
          value={activeTab}
          onChange={setActiveTab}
          options={[
            { value: 'profile', label: 'Profile & Theme' },
            { value: 'notifications', label: 'Notifications & Focus' },
            { value: 'backups', label: 'Data & Backups' },
            { value: 'sync', label: 'Sync Architecture' },
          ]}
        />
      </div>

      {/* Tab 1: Profile & Theme */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          <AccountProfileSection />

          <GlassCard as="section" className="p-5 sm:p-6 space-y-4">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-950 dark:text-white">
                Appearance &amp; Theme
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Switch between Midnight Navy Dark, Frosted Light, or automatic System Sync
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {THEME_CARDS.map((card) => {
                const Icon = card.icon;
                const active = settings.theme === card.value;
                return (
                  <button
                    key={card.value}
                    type="button"
                    onClick={() => updateSettings({ theme: card.value })}
                    aria-pressed={active}
                    className={`text-left p-4 rounded-xl border transition-all ${
                      active
                        ? 'border-purple-500/60 dark:border-cyan-400/60 bg-purple-500/10 dark:bg-cyan-400/10 shadow-sm'
                        : 'nx-input hover:border-cyan-500/40'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div
                        className={`w-8 h-8 rounded-lg border flex items-center justify-center ${card.swatchClass}`}
                      >
                        <Icon
                          className={`w-4 h-4 ${
                            card.value === 'light' ? 'text-purple-600' : 'text-cyan-300'
                          }`}
                        />
                      </div>
                      {active && (
                        <span className="text-[11px] font-medium text-purple-600 dark:text-cyan-300">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="mt-3 text-sm font-semibold text-slate-950 dark:text-white">
                      {card.label}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      {card.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </GlassCard>
        </div>
      )}

      {/* Tab 2: Notifications & Focus */}
      {activeTab === 'notifications' && <NotificationsFocusTab />}

      {/* Tab 3: Data & Backups (lazy-loaded to defer Google Drive / Firebase SDK until needed) */}
      {activeTab === 'backups' && (
        <Suspense
          fallback={
            <GlassCard className="p-6 space-y-4">
              <div className="h-5 w-48 rounded-lg bg-slate-900/10 dark:bg-white/10" />
              <div className="h-24 rounded-xl border nx-divider bg-slate-900/[0.03] dark:bg-white/[0.03]" />
            </GlassCard>
          }
        >
          <DataBackupsTab />
        </Suspense>
      )}

      {/* Tab 4: Sync Architecture */}
      {activeTab === 'sync' && <SyncArchitectureTab />}
    </PageTransition>
  );
};
