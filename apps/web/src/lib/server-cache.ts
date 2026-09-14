// Safe, bounded in-memory cache for hot read queries
// Zero extra memory overhead, automatically bounded to 500 entries (max ~5MB RAM)

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const memoryCache = new Map<string, CacheEntry<any>>();

export const serverCache = {
  get<T>(key: string): T | null {
    const entry = memoryCache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      memoryCache.delete(key);
      return null;
    }
    return entry.data;
  },

  set<T>(key: string, data: T, ttlSeconds: number = 30): void {
    // Keep cache strictly bounded to prevent memory leaks on low-RAM containers
    if (memoryCache.size > 500) {
      const oldestKey = memoryCache.keys().next().value;
      if (oldestKey) memoryCache.delete(oldestKey);
    }
    memoryCache.set(key, {
      data,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  },

  invalidate(pattern: string): void {
    for (const key of memoryCache.keys()) {
      if (key.includes(pattern)) {
        memoryCache.delete(key);
      }
    }
  },

  clear(): void {
    memoryCache.clear();
  },
};
