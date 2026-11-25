import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

/**
 * Platform-agnostic Storage Adapter.
 * Uses localStorage in standard web / PWA environments and automatically
 * delegates to @capacitor/preferences when executed inside a Capacitor Android/iOS shell.
 */
export interface StorageAdapter {
  readonly driverName: 'localStorage' | 'capacitor-preferences' | 'memory';
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

class MemoryStorageAdapter implements StorageAdapter {
  readonly driverName = 'memory' as const;
  private store = new Map<string, string>();

  async getItem(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }

  async setItem(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }

  async removeItem(key: string): Promise<void> {
    this.store.delete(key);
  }
}

class WebLocalStorageAdapter implements StorageAdapter {
  readonly driverName = 'localStorage' as const;

  async getItem(key: string): Promise<string | null> {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // Storage quota or private browsing fallback handled silently
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Ignore removal errors
    }
  }
}

class CapacitorPreferencesAdapter implements StorageAdapter {
  readonly driverName = 'capacitor-preferences' as const;

  async getItem(key: string): Promise<string | null> {
    const result = await Preferences.get({ key });
    return result.value ?? null;
  }

  async setItem(key: string, value: string): Promise<void> {
    await Preferences.set({ key, value });
  }

  async removeItem(key: string): Promise<void> {
    await Preferences.remove({ key });
  }
}

export function createStorageAdapter(): StorageAdapter {
  if (typeof window === 'undefined') {
    return new MemoryStorageAdapter();
  }

  if (Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('Preferences')) {
    return new CapacitorPreferencesAdapter();
  }

  try {
    const probeKey = '__nexora_storage_probe__';
    window.localStorage.setItem(probeKey, '1');
    window.localStorage.removeItem(probeKey);
    return new WebLocalStorageAdapter();
  } catch {
    return new MemoryStorageAdapter();
  }
}

export const storageAdapter: StorageAdapter = createStorageAdapter();
