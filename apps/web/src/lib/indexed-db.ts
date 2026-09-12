// IndexedDB Client Cache utility for SeeLibrary Admin & App Data

const DB_NAME = 'seelibrary_admin_db';
const DB_VERSION = 1;
const STORE_NAME = 'admin_cache';

export interface CacheEntry<T = any> {
  key: string;
  data: T;
  updatedAt: number;
}

function openDB(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        console.warn('[IndexedDB] Failed to open database:', request.error);
        resolve(null);
      };
    } catch (e) {
      console.warn('[IndexedDB] Error initializing:', e);
      resolve(null);
    }
  });
}

export async function getAdminCache<T = any>(key: string): Promise<CacheEntry<T> | null> {
  try {
    const db = await openDB();
    if (!db) return null;

    return new Promise((resolve) => {
      try {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(key);

        request.onsuccess = () => {
          resolve(request.result || null);
        };

        request.onerror = () => {
          resolve(null);
        };
      } catch (err) {
        resolve(null);
      }
    });
  } catch (err) {
    console.warn(`[IndexedDB] Error reading key "${key}":`, err);
    return null;
  }
}

export async function setAdminCache<T = any>(key: string, data: T): Promise<void> {
  try {
    const db = await openDB();
    if (!db) return;

    return new Promise((resolve) => {
      try {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const entry: CacheEntry<T> = {
          key,
          data,
          updatedAt: Date.now(),
        };
        const request = store.put(entry);

        request.onsuccess = () => resolve();
        request.onerror = () => resolve();
      } catch (err) {
        resolve();
      }
    });
  } catch (err) {
    console.warn(`[IndexedDB] Error writing key "${key}":`, err);
  }
}

export async function deleteAdminCache(key: string): Promise<void> {
  try {
    const db = await openDB();
    if (!db) return;

    return new Promise((resolve) => {
      try {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(key);

        request.onsuccess = () => resolve();
        request.onerror = () => resolve();
      } catch (err) {
        resolve();
      }
    });
  } catch (err) {
    console.warn(`[IndexedDB] Error deleting key "${key}":`, err);
  }
}

export async function clearAllAdminCache(): Promise<void> {
  try {
    const db = await openDB();
    if (!db) return;

    return new Promise((resolve) => {
      try {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => resolve();
      } catch (err) {
        resolve();
      }
    });
  } catch (err) {
    console.warn('[IndexedDB] Error clearing cache:', err);
  }
}
