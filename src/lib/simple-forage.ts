type ConfigOptions = {
  name?: string;
  storeName?: string;
  description?: string;
};

const memoryStore = new Map<string, string>();

let prefix = "forage::store::";

function getStorageKey(key: string) {
  return `${prefix}${key}`;
}

function supportsLocalStorage() {
  try {
    if (typeof window === "undefined" || !window.localStorage) return false;
    const probeKey = "__forage_probe__";
    window.localStorage.setItem(probeKey, "1");
    window.localStorage.removeItem(probeKey);
    return true;
  } catch {
    return false;
  }
}

const hasLocalStorage = supportsLocalStorage();

export const simpleForage = {
  config(options: ConfigOptions) {
    const name = options?.name ?? "forage";
    const store = options?.storeName ?? "store";
    prefix = `${name}::${store}::`;
  },
  async getItem<T>(key: string): Promise<T | null> {
    const storageKey = getStorageKey(key);
    const raw = hasLocalStorage
      ? window.localStorage.getItem(storageKey)
      : memoryStore.get(storageKey) ?? null;
    if (raw === null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },
  async setItem<T>(key: string, value: T): Promise<T> {
    const storageKey = getStorageKey(key);
    const raw = JSON.stringify(value);
    if (hasLocalStorage) {
      window.localStorage.setItem(storageKey, raw);
    } else {
      memoryStore.set(storageKey, raw);
    }
    return value;
  },
  async removeItem(key: string): Promise<void> {
    const storageKey = getStorageKey(key);
    if (hasLocalStorage) {
      window.localStorage.removeItem(storageKey);
    } else {
      memoryStore.delete(storageKey);
    }
  },
};

export type SimpleForage = typeof simpleForage;

export default simpleForage;
