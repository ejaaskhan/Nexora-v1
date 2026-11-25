import {
  BackupSnapshot,
  SyncMetadata,
  WorkspaceCollectionKey,
  WorkspaceData,
} from '../types/productivity';
import {
  createSeedActivities,
  createSeedEvents,
  createSeedGoals,
  createSeedNotes,
  DEFAULT_SETTINGS,
} from '../data/seed';
import { storageAdapter } from './storage';
import { notesDb } from './notesDb';

const DB_NAME = 'nexora_workspace_db';
const DB_VERSION = 1;
const STORE_COLLECTIONS = 'collections';
const STORE_SNAPSHOTS = 'snapshots';
const STORE_SYNC_META = 'sync_meta';

const LEGACY_WORKSPACE_KEY = 'nexora_workspace_v1';
const FALLBACK_COLLECTIONS_KEY = 'nexora_unified_collections_v1';
const FALLBACK_SNAPSHOTS_KEY = 'nexora_unified_snapshots_v1';
const FALLBACK_SYNC_KEY = 'nexora_unified_sync_meta_v1';
const MAX_SNAPSHOTS = 12;

export const WORKSPACE_COLLECTION_KEYS: WorkspaceCollectionKey[] = [
  'tasks',
  'timeBlocks',
  'events',
  'sessions',
  'goals',
  'notes',
  'activities',
  'settings',
];

interface StoredCollectionRecord {
  key: WorkspaceCollectionKey;
  payload: unknown;
  updatedAt: string;
}

interface StoredSyncMetaRecord extends SyncMetadata {
  id: 'primary';
}

export function createInitialSyncMetadata(): SyncMetadata {
  return {
    localRevision: 1,
    lastLocalWriteAt: new Date().toISOString(),
    lastSyncedRevision: 0,
    lastSyncedAt: null,
    activeProviderId: 'local-only',
    conflictStrategy: 'merge-by-id',
    pendingOutbox: [],
  };
}

let activeEngine: 'IndexedDB' | 'LocalStorage' =
  typeof window !== 'undefined' && 'indexedDB' in window ? 'IndexedDB' : 'LocalStorage';

function openWorkspaceDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      activeEngine = 'LocalStorage';
      reject(new Error('IndexedDB unavailable'));
      return;
    }

    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_COLLECTIONS)) {
          db.createObjectStore(STORE_COLLECTIONS, { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains(STORE_SNAPSHOTS)) {
          const snapStore = db.createObjectStore(STORE_SNAPSHOTS, { keyPath: 'id' });
          snapStore.createIndex('createdAt', 'createdAt', { unique: false });
        }
        if (!db.objectStoreNames.contains(STORE_SYNC_META)) {
          db.createObjectStore(STORE_SYNC_META, { keyPath: 'id' });
        }
      };

      request.onsuccess = () => {
        activeEngine = 'IndexedDB';
        resolve(request.result);
      };

      request.onerror = () => {
        activeEngine = 'LocalStorage';
        reject(request.error ?? new Error('Failed to open unified IndexedDB'));
      };
    } catch (err) {
      activeEngine = 'LocalStorage';
      reject(err);
    }
  });
}

function normalizeHydratedWorkspace(raw: Partial<WorkspaceData>): WorkspaceData {
  const mergedSettings = {
    ...DEFAULT_SETTINGS,
    ...(raw.settings ?? {}),
    notificationPreferences: {
      ...DEFAULT_SETTINGS.notificationPreferences,
      ...(raw.settings?.notificationPreferences ?? {}),
    },
  };

  const tasks = Array.isArray(raw.tasks)
    ? raw.tasks.map((t) => ({
        ...t,
        dueTime: typeof t.dueTime === 'string' ? t.dueTime : null,
        subtasks: Array.isArray(t.subtasks) ? t.subtasks : [],
      }))
    : [];

  const goals = Array.isArray(raw.goals)
    ? raw.goals.map((g) => ({
        ...g,
        description: typeof g.description === 'string' ? g.description : '',
        milestones: Array.isArray(g.milestones) ? g.milestones : [],
        progressMode:
          g.progressMode === 'milestones' &&
          Array.isArray(g.milestones) &&
          g.milestones.length > 0
            ? ('milestones' as const)
            : ('numeric' as const),
      }))
    : createSeedGoals();

  const events = Array.isArray(raw.events) ? raw.events : createSeedEvents();
  const timeBlocks = Array.isArray(raw.timeBlocks) ? raw.timeBlocks : [];
  const sessions = Array.isArray(raw.sessions) ? raw.sessions : [];
  const notes = Array.isArray(raw.notes) ? raw.notes : createSeedNotes();
  const activities = Array.isArray(raw.activities)
    ? raw.activities
    : createSeedActivities();

  return {
    tasks,
    timeBlocks,
    events,
    sessions,
    goals,
    notes,
    activities,
    settings: mergedSettings,
  };
}

async function readFallbackWorkspace(): Promise<WorkspaceData | null> {
  const raw = await storageAdapter.getItem(FALLBACK_COLLECTIONS_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<WorkspaceData>;
    return normalizeHydratedWorkspace(parsed);
  } catch {
    return null;
  }
}

async function writeFallbackWorkspace(data: WorkspaceData): Promise<void> {
  await storageAdapter.setItem(FALLBACK_COLLECTIONS_KEY, JSON.stringify(data));
}

async function migrateLegacyStoresIfPresent(): Promise<WorkspaceData | null> {
  const [legacyRaw, legacyNotes] = await Promise.all([
    storageAdapter.getItem(LEGACY_WORKSPACE_KEY),
    notesDb.loadAll(),
  ]);

  if (!legacyRaw && legacyNotes === null) {
    return null;
  }

  let partial: Partial<WorkspaceData> = {};
  if (legacyRaw) {
    try {
      partial = JSON.parse(legacyRaw) as Partial<WorkspaceData>;
    } catch {
      partial = {};
    }
  }

  if (legacyNotes !== null) {
    partial.notes = legacyNotes;
  }

  return normalizeHydratedWorkspace(partial);
}

export const workspaceDb = {
  getEngine(): 'IndexedDB' | 'LocalStorage' {
    return activeEngine;
  },

  async loadWorkspace(): Promise<{ data: WorkspaceData | null; migratedFromLegacy: boolean }> {
    try {
      const db = await openWorkspaceDB();
      const records = await new Promise<StoredCollectionRecord[]>((resolve, reject) => {
        const tx = db.transaction(STORE_COLLECTIONS, 'readonly');
        const req = tx.objectStore(STORE_COLLECTIONS).getAll();
        req.onsuccess = () => {
          const rows = (req.result as StoredCollectionRecord[]) ?? [];
          db.close();
          resolve(rows);
        };
        req.onerror = () => {
          db.close();
          reject(req.error);
        };
      });

      if (records.length > 0) {
        const assembled: Record<string, unknown> = {};
        for (const rec of records) {
          assembled[rec.key] = rec.payload;
        }
        return {
          data: normalizeHydratedWorkspace(assembled as Partial<WorkspaceData>),
          migratedFromLegacy: false,
        };
      }

      // Unified DB is empty — check legacy stores for seamless migration
      const migrated = await migrateLegacyStoresIfPresent();
      if (migrated) {
        await this.saveAllCollections(migrated);
        return { data: migrated, migratedFromLegacy: true };
      }

      return { data: null, migratedFromLegacy: false };
    } catch {
      const fallback = await readFallbackWorkspace();
      if (fallback) return { data: fallback, migratedFromLegacy: false };

      const migrated = await migrateLegacyStoresIfPresent();
      if (migrated) {
        await writeFallbackWorkspace(migrated);
        return { data: migrated, migratedFromLegacy: true };
      }

      return { data: null, migratedFromLegacy: false };
    }
  },

  async saveCollection<K extends WorkspaceCollectionKey>(
    key: K,
    payload: WorkspaceData[K],
    fullFallbackData?: WorkspaceData
  ): Promise<void> {
    const updatedAt = new Date().toISOString();
    try {
      const db = await openWorkspaceDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_COLLECTIONS, 'readwrite');
        const record: StoredCollectionRecord = { key, payload, updatedAt };
        tx.objectStore(STORE_COLLECTIONS).put(record);
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => {
          db.close();
          reject(tx.error);
        };
      });
    } catch {
      if (fullFallbackData) {
        await writeFallbackWorkspace(fullFallbackData);
      }
    }
  },

  async saveAllCollections(data: WorkspaceData): Promise<void> {
    const updatedAt = new Date().toISOString();
    try {
      const db = await openWorkspaceDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_COLLECTIONS, 'readwrite');
        const store = tx.objectStore(STORE_COLLECTIONS);
        for (const key of WORKSPACE_COLLECTION_KEYS) {
          const record: StoredCollectionRecord = {
            key,
            payload: data[key],
            updatedAt,
          };
          store.put(record);
        }
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => {
          db.close();
          reject(tx.error);
        };
      });
    } catch {
      await writeFallbackWorkspace(data);
    }
  },

  async loadSnapshots(): Promise<BackupSnapshot[]> {
    try {
      const db = await openWorkspaceDB();
      return await new Promise<BackupSnapshot[]>((resolve, reject) => {
        const tx = db.transaction(STORE_SNAPSHOTS, 'readonly');
        const req = tx.objectStore(STORE_SNAPSHOTS).getAll();
        req.onsuccess = () => {
          const items = ((req.result as BackupSnapshot[]) ?? []).sort((a, b) =>
            b.createdAt.localeCompare(a.createdAt)
          );
          db.close();
          resolve(items);
        };
        req.onerror = () => {
          db.close();
          reject(req.error);
        };
      });
    } catch {
      const raw = await storageAdapter.getItem(FALLBACK_SNAPSHOTS_KEY);
      if (!raw) return [];
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed)
          ? (parsed as BackupSnapshot[]).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          : [];
      } catch {
        return [];
      }
    }
  },

  async saveSnapshot(snapshot: BackupSnapshot): Promise<BackupSnapshot[]> {
    const existing = await this.loadSnapshots();
    const next = [snapshot, ...existing.filter((s) => s.id !== snapshot.id)].slice(
      0,
      MAX_SNAPSHOTS
    );

    try {
      const db = await openWorkspaceDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_SNAPSHOTS, 'readwrite');
        const store = tx.objectStore(STORE_SNAPSHOTS);
        store.clear();
        next.forEach((s) => store.put(s));
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => {
          db.close();
          reject(tx.error);
        };
      });
    } catch {
      await storageAdapter.setItem(FALLBACK_SNAPSHOTS_KEY, JSON.stringify(next));
    }

    return next;
  },

  async deleteSnapshot(id: string): Promise<BackupSnapshot[]> {
    const existing = await this.loadSnapshots();
    const next = existing.filter((s) => s.id !== id);
    try {
      const db = await openWorkspaceDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_SNAPSHOTS, 'readwrite');
        tx.objectStore(STORE_SNAPSHOTS).delete(id);
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => {
          db.close();
          reject(tx.error);
        };
      });
    } catch {
      await storageAdapter.setItem(FALLBACK_SNAPSHOTS_KEY, JSON.stringify(next));
    }
    return next;
  },

  async loadSyncMeta(): Promise<SyncMetadata> {
    try {
      const db = await openWorkspaceDB();
      const record = await new Promise<StoredSyncMetaRecord | undefined>((resolve, reject) => {
        const tx = db.transaction(STORE_SYNC_META, 'readonly');
        const req = tx.objectStore(STORE_SYNC_META).get('primary');
        req.onsuccess = () => {
          const val = req.result as StoredSyncMetaRecord | undefined;
          db.close();
          resolve(val);
        };
        req.onerror = () => {
          db.close();
          reject(req.error);
        };
      });
      if (record) {
        const { id: _ignore, ...meta } = record;
        return {
          ...createInitialSyncMetadata(),
          ...meta,
          pendingOutbox: Array.isArray(meta.pendingOutbox) ? meta.pendingOutbox : [],
        };
      }
      return createInitialSyncMetadata();
    } catch {
      const raw = await storageAdapter.getItem(FALLBACK_SYNC_KEY);
      if (!raw) return createInitialSyncMetadata();
      try {
        const parsed = JSON.parse(raw) as Partial<SyncMetadata>;
        return {
          ...createInitialSyncMetadata(),
          ...parsed,
          pendingOutbox: Array.isArray(parsed.pendingOutbox) ? parsed.pendingOutbox : [],
        };
      } catch {
        return createInitialSyncMetadata();
      }
    }
  },

  async saveSyncMeta(meta: SyncMetadata): Promise<void> {
    try {
      const db = await openWorkspaceDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_SYNC_META, 'readwrite');
        const record: StoredSyncMetaRecord = { id: 'primary', ...meta };
        tx.objectStore(STORE_SYNC_META).put(record);
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => {
          db.close();
          reject(tx.error);
        };
      });
    } catch {
      await storageAdapter.setItem(FALLBACK_SYNC_KEY, JSON.stringify(meta));
    }
  },

  estimateStorageBytes(data: WorkspaceData, snapshots: BackupSnapshot[]): number {
    try {
      const encoder = new TextEncoder();
      const dataBytes = encoder.encode(JSON.stringify(data)).length;
      const snapBytes = encoder.encode(JSON.stringify(snapshots)).length;
      return dataBytes + snapBytes;
    } catch {
      return JSON.stringify(data).length;
    }
  },
};
