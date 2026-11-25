import React, { useMemo, useState } from 'react';
import { CheckCircle2, Cloud, Database, Layers, RefreshCw } from 'lucide-react';
import { useWorkspace } from '../../store/WorkspaceContext';
import { ConflictResolutionStrategy } from '../../types/productivity';
import { SYNC_PROVIDER_CATALOG } from '../../platform/syncAdapter';
import { detectPlatformCapabilities } from '../../platform/pwa';
import { getNativeBridgeReadiness } from '../../platform/capacitor';
import { formatBytesCompact } from '../../utils/backup';
import { formatRelativeTime } from '../../utils/date';
import { GlassCard } from '../ui/GlassCard';
import { GlowButton } from '../ui/GlowButton';
import { PWAInstallButton } from '../ui/PWAInstallButton';

const CONFLICT_STRATEGIES: Array<{
  value: ConflictResolutionStrategy;
  label: string;
  description: string;
}> = [
  {
    value: 'merge-by-id',
    label: 'Merge by ID',
    description: 'Combines local and incoming collections by unique ID without dropping records.',
  },
  {
    value: 'last-write-wins',
    label: 'Last Write Wins',
    description: 'Compares updatedAt timestamps and keeps the most recently modified version.',
  },
  {
    value: 'local-priority',
    label: 'Local Priority',
    description: 'Preserves on-device edits when conflicting IDs exist while adding new remote items.',
  },
];

export const SyncArchitectureTab: React.FC = () => {
  const {
    tasks,
    notes,
    goals,
    events,
    timeBlocks,
    sessions,
    activities,
    snapshots,
    storageEngine,
    syncMeta,
    estimatedStorageBytes,
    setConflictStrategy,
    checkpointSyncOutbox,
  } = useWorkspace();

  const [checkpointing, setCheckpointing] = useState(false);
  const capabilities = useMemo(() => detectPlatformCapabilities(), []);
  const nativeReadiness = useMemo(() => getNativeBridgeReadiness(), []);

  const collectionStats = [
    { label: 'Tasks', count: tasks.length },
    { label: 'Smart Notes', count: notes.length },
    { label: 'Goals', count: goals.length },
    { label: 'Calendar Events', count: events.length },
    { label: 'Time Blocks', count: timeBlocks.length },
    { label: 'Focus Sessions', count: sessions.length },
    { label: 'Activity Events', count: activities.length },
    { label: 'Restore Points', count: snapshots.length },
  ];

  const handleCheckpoint = async () => {
    setCheckpointing(true);
    try {
      await checkpointSyncOutbox();
    } finally {
      setCheckpointing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Unified Local Storage & Revision Telemetry */}
      <GlassCard as="section" className="p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-950 dark:text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-purple-600 dark:text-cyan-400" />
              <span>Unified Persistent Storage</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              All collections persist locally across browser refreshes and app restarts
            </p>
          </div>

          <GlowButton
            variant="secondary"
            size="sm"
            disabled={checkpointing}
            onClick={() => void handleCheckpoint()}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${checkpointing ? 'animate-spin' : ''}`} />
            <span>Checkpoint Revision</span>
          </GlowButton>
        </div>

        <dl className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-3 border-t nx-divider text-xs">
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Active Engine</dt>
            <dd className="mt-1 font-mono font-semibold text-purple-600 dark:text-cyan-300">
              {storageEngine}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Local Footprint</dt>
            <dd className="mt-1 font-mono tabular-nums font-semibold text-slate-950 dark:text-white">
              {formatBytesCompact(estimatedStorageBytes)}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Local Revision</dt>
            <dd className="mt-1 font-mono tabular-nums font-semibold text-slate-950 dark:text-white">
              r{syncMeta.localRevision} · {syncMeta.pendingOutbox.length} queued
            </dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">
              {syncMeta.lastSyncedAt && syncMeta.activeProviderId === 'google-drive'
                ? 'Last Google Drive Sync'
                : 'Last Local Write'}
            </dt>
            <dd className="mt-1 font-mono tabular-nums text-slate-800 dark:text-slate-200">
              {syncMeta.lastSyncedAt && syncMeta.activeProviderId === 'google-drive'
                ? formatRelativeTime(syncMeta.lastSyncedAt)
                : formatRelativeTime(syncMeta.lastLocalWriteAt)}
            </dd>
          </div>
        </dl>

        {/* Per-Collection Store Breakdown */}
        <div className="pt-4 border-t nx-divider">
          <p className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-3">
            Persisted Collection Inventory
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {collectionStats.map((item) => (
              <div
                key={item.label}
                className="rounded-xl border nx-divider bg-slate-900/[0.025] dark:bg-white/[0.03] px-3 py-2.5 flex items-center justify-between gap-2 text-xs"
              >
                <span className="text-slate-600 dark:text-slate-400 truncate">{item.label}</span>
                <span className="font-mono tabular-nums font-semibold text-slate-950 dark:text-white">
                  {item.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      </GlassCard>

      {/* Cloud Sync Abstraction Layer & Conflict Strategy */}
      <GlassCard as="section" className="p-5 sm:p-6 space-y-5">
        <div>
          <h2 className="font-display text-base font-semibold text-slate-950 dark:text-white flex items-center gap-2">
            <Cloud className="w-4 h-4 text-purple-600 dark:text-cyan-400" />
            <span>Cloud Sync Abstraction Layer</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Pluggable sync adapter interface with deterministic conflict resolution ready for future
            multi-device cloud providers
          </p>
        </div>

        {/* Conflict Resolution Policy */}
        <div className="space-y-2.5">
          <p className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-purple-600 dark:text-cyan-400" />
            <span>Conflict Resolution Strategy</span>
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {CONFLICT_STRATEGIES.map((strat) => {
              const active = syncMeta.conflictStrategy === strat.value;
              return (
                <button
                  key={strat.value}
                  type="button"
                  onClick={() => setConflictStrategy(strat.value)}
                  aria-pressed={active}
                  className={`text-left p-3.5 rounded-xl border transition-all ${
                    active
                      ? 'border-purple-500/55 dark:border-cyan-400/55 bg-purple-500/10 dark:bg-cyan-400/10'
                      : 'nx-input hover:border-cyan-500/40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-950 dark:text-white">
                      {strat.label}
                    </span>
                    {active && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 dark:text-cyan-400 shrink-0" />
                    )}
                  </div>
                  <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    {strat.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Sync Provider Readiness Catalog */}
        <div className="pt-4 border-t nx-divider space-y-3">
          <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
            Registered Sync Provider Adapters
          </p>
          <div className="divide-y divide-slate-200/60 dark:divide-slate-800/70 rounded-xl border nx-divider overflow-hidden">
            {SYNC_PROVIDER_CATALOG.map((provider) => (
              <div
                key={provider.id}
                className="px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-950 dark:text-white">
                    {provider.name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {provider.summary}
                  </p>
                  <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500 mt-1">
                    {provider.capabilities.join(' · ')}
                  </p>
                </div>
                <span
                  className={`text-xs font-mono shrink-0 ${
                    provider.status === 'active'
                      ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {provider.status === 'active' ? 'Active' : 'Adapter Ready'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </GlassCard>

      {/* PWA Install & Android Portability */}
      <GlassCard as="section" className="p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-950 dark:text-white">
              Installable App &amp; Android Portability
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Offline-ready PWA manifest with Capacitor-compatible storage, haptics, and
              notification adapters
            </p>
          </div>
          <PWAInstallButton variant="settings" />
        </div>

        <dl className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-3 border-t nx-divider text-xs">
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Active Runtime</dt>
            <dd className="mt-1 font-mono text-slate-950 dark:text-cyan-300">
              {capabilities.runtime}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Capacitor App ID</dt>
            <dd className="mt-1 font-mono text-slate-950 dark:text-cyan-300 truncate">
              {nativeReadiness.appId}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Service Worker</dt>
            <dd className="mt-1 font-mono text-slate-950 dark:text-cyan-300">
              {capabilities.serviceWorkerSupported ? 'Supported' : 'Unavailable'}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Storage Adapter</dt>
            <dd className="mt-1 font-mono text-slate-950 dark:text-cyan-300">
              {storageEngine} + {capabilities.storageDriver}
            </dd>
          </div>
        </dl>

        <div className="pt-4 border-t nx-divider space-y-2.5">
          <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
            Android Capacitor Native Bridges
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {nativeReadiness.bridges.map((bridge) => (
              <div
                key={bridge.name}
                className="rounded-xl border nx-divider bg-slate-900/[0.025] dark:bg-white/[0.03] px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs"
              >
                <span className="text-slate-700 dark:text-slate-300 font-medium truncate">
                  {bridge.name}
                </span>
                <span className="font-mono text-[11px] text-purple-600 dark:text-cyan-300 shrink-0">
                  {bridge.activeMode}
                </span>
              </div>
            ))}
          </div>
        </div>
      </GlassCard>
    </div>
  );
};
