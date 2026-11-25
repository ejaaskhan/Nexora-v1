import {
  ConflictResolutionStrategy,
  SyncMetadata,
  WorkspaceData,
} from '../types/productivity';

export interface RemoteBackupRecord {
  id: string;
  name: string;
  updatedAt: string;
  sizeBytes?: number;
}

export interface SyncOperationResult {
  ok: boolean;
  syncedAt?: string;
  message: string;
}

export type SyncProviderStatus = 'active' | 'ready-to-connect' | 'coming-soon';

/**
 * Pluggable Cloud Synchronization Adapter Interface.
 * All NEXORA modules interact with this contract rather than a concrete cloud vendor,
 * allowing seamless plug-in of Google Drive, Firebase Firestore, Supabase, or custom REST sync.
 */
export interface CloudSyncAdapter {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly status: SyncProviderStatus;
  readonly supportsRealtime: boolean;
  readonly supportsSnapshots: boolean;
  pushWorkspace(data: WorkspaceData, meta: SyncMetadata): Promise<SyncOperationResult>;
  pullWorkspace(): Promise<{ ok: boolean; data?: WorkspaceData; message: string }>;
  listRemoteSnapshots(): Promise<RemoteBackupRecord[]>;
  deleteRemoteSnapshot(remoteId: string): Promise<SyncOperationResult>;
}

/**
 * Deterministic multi-device conflict resolver shared across all CloudSyncAdapter implementations.
 */
export function mergeWorkspaceData(
  local: WorkspaceData,
  remote: WorkspaceData,
  strategy: ConflictResolutionStrategy
): WorkspaceData {
  if (strategy === 'local-priority') {
    const mergeKeepingLocal = <T extends { id: string }>(l: T[], r: T[]): T[] => {
      const map = new Map<string, T>();
      r.forEach((item) => map.set(item.id, item));
      l.forEach((item) => map.set(item.id, item));
      return Array.from(map.values());
    };

    return {
      tasks: mergeKeepingLocal(local.tasks, remote.tasks),
      timeBlocks: mergeKeepingLocal(local.timeBlocks, remote.timeBlocks).sort(
        (a, b) => a.startMinute - b.startMinute
      ),
      events: mergeKeepingLocal(local.events, remote.events).sort((a, b) =>
        a.date !== b.date ? a.date.localeCompare(b.date) : a.startMinute - b.startMinute
      ),
      sessions: mergeKeepingLocal(local.sessions, remote.sessions).sort((a, b) =>
        b.startedAt.localeCompare(a.startedAt)
      ),
      goals: mergeKeepingLocal(local.goals, remote.goals),
      notes: mergeKeepingLocal(local.notes, remote.notes).sort((a, b) =>
        b.updatedAt.localeCompare(a.updatedAt)
      ),
      activities: mergeKeepingLocal(local.activities, remote.activities)
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
        .slice(0, 100),
      settings: local.settings,
    };
  }

  if (strategy === 'last-write-wins') {
    const mergeByUpdatedAt = <
      T extends { id: string; updatedAt?: string; createdAt?: string; timestamp?: string; endedAt?: string },
    >(
      l: T[],
      r: T[]
    ): T[] => {
      const getTs = (item: T): string =>
        item.updatedAt ?? item.endedAt ?? item.timestamp ?? item.createdAt ?? '';
      const map = new Map<string, T>();
      l.forEach((item) => map.set(item.id, item));
      r.forEach((item) => {
        const existing = map.get(item.id);
        if (!existing || getTs(item) >= getTs(existing)) {
          map.set(item.id, item);
        }
      });
      return Array.from(map.values());
    };

    return {
      tasks: mergeByUpdatedAt(local.tasks, remote.tasks),
      timeBlocks: mergeByUpdatedAt(local.timeBlocks, remote.timeBlocks).sort(
        (a, b) => a.startMinute - b.startMinute
      ),
      events: mergeByUpdatedAt(local.events, remote.events).sort((a, b) =>
        a.date !== b.date ? a.date.localeCompare(b.date) : a.startMinute - b.startMinute
      ),
      sessions: mergeByUpdatedAt(local.sessions, remote.sessions).sort((a, b) =>
        b.startedAt.localeCompare(a.startedAt)
      ),
      goals: mergeByUpdatedAt(local.goals, remote.goals),
      notes: mergeByUpdatedAt(local.notes, remote.notes).sort((a, b) =>
        b.updatedAt.localeCompare(a.updatedAt)
      ),
      activities: mergeByUpdatedAt(local.activities, remote.activities)
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
        .slice(0, 100),
      settings: {
        ...local.settings,
        ...remote.settings,
        notificationPreferences: {
          ...local.settings.notificationPreferences,
          ...remote.settings.notificationPreferences,
        },
      },
    };
  }

  // Default: 'merge-by-id' (remote additions combined with existing local records)
  const mergeById = <T extends { id: string }>(l: T[], r: T[]): T[] => {
    const map = new Map<string, T>();
    l.forEach((item) => map.set(item.id, item));
    r.forEach((item) => map.set(item.id, item));
    return Array.from(map.values());
  };

  return {
    tasks: mergeById(local.tasks, remote.tasks),
    timeBlocks: mergeById(local.timeBlocks, remote.timeBlocks).sort(
      (a, b) => a.startMinute - b.startMinute
    ),
    events: mergeById(local.events, remote.events).sort((a, b) =>
      a.date !== b.date ? a.date.localeCompare(b.date) : a.startMinute - b.startMinute
    ),
    sessions: mergeById(local.sessions, remote.sessions).sort((a, b) =>
      b.startedAt.localeCompare(a.startedAt)
    ),
    goals: mergeById(local.goals, remote.goals),
    notes: mergeById(local.notes, remote.notes).sort((a, b) =>
      b.updatedAt.localeCompare(a.updatedAt)
    ),
    activities: mergeById(local.activities, remote.activities)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      .slice(0, 100),
    settings: {
      ...local.settings,
      ...remote.settings,
      notificationPreferences: {
        ...local.settings.notificationPreferences,
        ...remote.settings.notificationPreferences,
      },
    },
  };
}

/**
 * Default local-first sync adapter. Commits local revisions cleanly on-device without
 * network transmission while maintaining outbox hygiene for future cloud handoff.
 */
class LocalOnlySyncAdapter implements CloudSyncAdapter {
  readonly id = 'local-only';
  readonly name = 'Local Device Storage';
  readonly description =
    'All collections persist privately in unified IndexedDB with automatic LocalStorage fallback.';
  readonly status: SyncProviderStatus = 'active';
  readonly supportsRealtime = false;
  readonly supportsSnapshots = true;

  async pushWorkspace(): Promise<SyncOperationResult> {
    return {
      ok: true,
      syncedAt: new Date().toISOString(),
      message: 'Local revision checkpointed in IndexedDB.',
    };
  }

  async pullWorkspace(): Promise<{ ok: boolean; data?: WorkspaceData; message: string }> {
    return {
      ok: false,
      message: 'No remote cloud provider connected yet. Using local IndexedDB state.',
    };
  }

  async listRemoteSnapshots(): Promise<RemoteBackupRecord[]> {
    return [];
  }

  async deleteRemoteSnapshot(): Promise<SyncOperationResult> {
    return {
      ok: false,
      message: 'No remote snapshots in local-only mode.',
    };
  }
}

export interface SyncProviderDescriptor {
  id: string;
  name: string;
  summary: string;
  status: SyncProviderStatus;
  capabilities: string[];
}

export const SYNC_PROVIDER_CATALOG: SyncProviderDescriptor[] = [
  {
    id: 'local-only',
    name: 'Local Device Engine (Active)',
    summary:
      'Unified IndexedDB collections, offline restore-point snapshots, and versioned JSON portability.',
    status: 'active',
    capabilities: ['IndexedDB + Fallback', 'Offline Restore Points', 'Revision Outbox'],
  },
  {
    id: 'google-drive',
    name: 'Google Drive Backup Adapter',
    summary:
      'Live cloud JSON backup, versioned overwrite, and validated restore using least-privilege drive.file access.',
    status: 'active',
    capabilities: ['Cloud JSON Snapshots', 'Versioned Restore', 'Conflict Merge'],
  },
  {
    id: 'cloud-realtime',
    name: 'Multi-Device Realtime Sync (Firestore / REST)',
    summary:
      'Adapter contract wired to collection revisions and pending outbox queues for zero-refactor cloud sync.',
    status: 'ready-to-connect',
    capabilities: ['Collection Outbox', 'Last-Write-Wins', 'Multi-Device Delta Sync'],
  },
];

export const defaultLocalSyncAdapter: CloudSyncAdapter = new LocalOnlySyncAdapter();
