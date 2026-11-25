import { SmartNote } from '../types/productivity';

const DB_NAME = 'nexora_notes_db';
const DB_VERSION = 1;
const STORE_NAME = 'notes';
const FALLBACK_KEY = 'nexora_notes_fallback_v1';

let activeEngine: 'IndexedDB' | 'LocalStorage' =
  typeof window !== 'undefined' && 'indexedDB' in window ? 'IndexedDB' : 'LocalStorage';

function openNotesDB(): Promise<IDBDatabase> {
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
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('updatedAt', 'updatedAt', { unique: false });
        }
      };

      request.onsuccess = () => {
        activeEngine = 'IndexedDB';
        resolve(request.result);
      };

      request.onerror = () => {
        activeEngine = 'LocalStorage';
        reject(request.error ?? new Error('Failed to open IndexedDB'));
      };
    } catch (err) {
      activeEngine = 'LocalStorage';
      reject(err);
    }
  });
}

function readFallbackNotes(): SmartNote[] | null {
  try {
    const raw = window.localStorage.getItem(FALLBACK_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SmartNote[]) : null;
  } catch {
    return null;
  }
}

function writeFallbackNotes(notes: SmartNote[]): void {
  try {
    window.localStorage.setItem(FALLBACK_KEY, JSON.stringify(notes));
  } catch {
    // Ignore storage quota errors in restricted sandboxes
  }
}

function sortNotesNewestFirst(notes: SmartNote[]): SmartNote[] {
  return [...notes].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return b.updatedAt.localeCompare(a.updatedAt);
  });
}

export const notesDb = {
  getEngine(): 'IndexedDB' | 'LocalStorage' {
    return activeEngine;
  },

  async loadAll(): Promise<SmartNote[] | null> {
    try {
      const db = await openNotesDB();
      return await new Promise<SmartNote[] | null>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();
        req.onsuccess = () => {
          const items = (req.result as SmartNote[]) ?? [];
          db.close();
          if (items.length === 0) {
            // Check whether this DB has ever been initialized
            const initializedFlag = window.localStorage.getItem(`${FALLBACK_KEY}_init`);
            if (!initializedFlag) {
              resolve(null);
              return;
            }
          }
          resolve(sortNotesNewestFirst(items));
        };
        req.onerror = () => {
          db.close();
          reject(req.error);
        };
      });
    } catch {
      return readFallbackNotes();
    }
  },

  async put(note: SmartNote): Promise<void> {
    try {
      const db = await openNotesDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(note);
        tx.oncomplete = () => {
          window.localStorage.setItem(`${FALLBACK_KEY}_init`, '1');
          db.close();
          resolve();
        };
        tx.onerror = () => {
          db.close();
          reject(tx.error);
        };
      });
    } catch {
      const existing = readFallbackNotes() ?? [];
      const next = [note, ...existing.filter((n) => n.id !== note.id)];
      writeFallbackNotes(next);
    }
  },

  async remove(id: string): Promise<void> {
    try {
      const db = await openNotesDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).delete(id);
        tx.oncomplete = () => {
          window.localStorage.setItem(`${FALLBACK_KEY}_init`, '1');
          db.close();
          resolve();
        };
        tx.onerror = () => {
          db.close();
          reject(tx.error);
        };
      });
    } catch {
      const existing = readFallbackNotes() ?? [];
      writeFallbackNotes(existing.filter((n) => n.id !== id));
    }
  },

  async replaceAll(notes: SmartNote[]): Promise<void> {
    try {
      const db = await openNotesDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.clear();
        notes.forEach((n) => store.put(n));
        tx.oncomplete = () => {
          window.localStorage.setItem(`${FALLBACK_KEY}_init`, '1');
          db.close();
          resolve();
        };
        tx.onerror = () => {
          db.close();
          reject(tx.error);
        };
      });
    } catch {
      writeFallbackNotes(notes);
    }
  },
};
