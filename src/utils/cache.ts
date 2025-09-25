const CACHE_PREFIX = "asset-curser:cache:";

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const isStorageAvailable = () => {
  try {
    if (typeof window === "undefined" || !window.localStorage) return false;
    const testKey = `${CACHE_PREFIX}test`;
    window.localStorage.setItem(testKey, "1");
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
};

export const getCachedData = <T>(key: string): T | null => {
  if (!isStorageAvailable()) return null;
  try {
    const raw = window.localStorage.getItem(`${CACHE_PREFIX}${key}`);
    if (!raw) return null;
    const payload = JSON.parse(raw) as CacheEntry<T>;
    if (Number.isFinite(payload.expiresAt) && payload.expiresAt > Date.now()) {
      return payload.data;
    }
    window.localStorage.removeItem(`${CACHE_PREFIX}${key}`);
  } catch (error) {
    console.warn(`Failed to read cache for ${key}`, error);
  }
  return null;
};

export const setCachedData = <T>(key: string, data: T, ttlMs: number) => {
  if (!isStorageAvailable()) return;
  try {
    const entry: CacheEntry<T> = {
      data,
      expiresAt: Date.now() + ttlMs,
    };
    window.localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(entry));
  } catch (error) {
    console.warn(`Failed to write cache for ${key}`, error);
  }
};

export const clearCachedData = (key: string) => {
  if (!isStorageAvailable()) return;
  try {
    window.localStorage.removeItem(`${CACHE_PREFIX}${key}`);
  } catch (error) {
    console.warn(`Failed to clear cache for ${key}`, error);
  }
};
