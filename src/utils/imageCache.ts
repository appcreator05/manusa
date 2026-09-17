/**
 * IndexedDB Image Caching Engine
 * Automatically stores movie posters and thumbnails in browser IndexedDB
 * Prevents re-fetching images from network on every reload, supports instant offline viewing.
 */

const DB_NAME = 'VDOSKy_ImageCache_v1';
const STORE_NAME = 'posters';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

// Initialize or get the IndexedDB database instance
export const getImageCacheDB = (): Promise<IDBDatabase> => {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.reject(new Error('IndexedDB not supported in this environment'));
  }

  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'url' });
        }
      };

      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        resolve(db);
      };

      request.onerror = (event) => {
        console.warn('IndexedDB image cache open error:', (event.target as IDBOpenDBRequest).error);
        reject((event.target as IDBOpenDBRequest).error);
      };
    } catch (err) {
      reject(err);
    }
  });

  return dbPromise;
};

// In-memory cache for ObjectURLs so we don't recreate them multiple times per session
const memoryObjectURLCache = new Map<string, string>();

/**
 * Synchronous in-memory lookup for immediate render without state update delay
 */
export const getCachedImageSync = (url: string): string | null => {
  if (!url) return null;
  return memoryObjectURLCache.get(url) || null;
};

/**
 * Get cached image data from IndexedDB
 * Returns ObjectURL string if found, or null if not yet cached.
 */
export const getCachedImage = async (url: string): Promise<string | null> => {
  if (!url) return null;

  // Check in-memory object URL cache first (0ms latency)
  if (memoryObjectURLCache.has(url)) {
    return memoryObjectURLCache.get(url)!;
  }

  try {
    const db = await getImageCacheDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(url);

      req.onsuccess = () => {
        const result = req.result;
        if (result && result.blob) {
          try {
            const objectUrl = URL.createObjectURL(result.blob);
            memoryObjectURLCache.set(url, objectUrl);
            resolve(objectUrl);
          } catch {
            resolve(null);
          }
        } else if (result && result.dataUrl) {
          resolve(result.dataUrl);
        } else {
          resolve(null);
        }
      };

      req.onerror = () => {
        resolve(null);
      };
    });
  } catch {
    return null;
  }
};

/**
 * Save image blob into IndexedDB
 */
export const setCachedImage = async (url: string, blob: Blob): Promise<void> => {
  if (!url || !blob) return;

  try {
    const db = await getImageCacheDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put({
        url,
        blob,
        cachedAt: Date.now()
      });

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // Non-blocking failover
  }
};

/**
 * Fetch image from network, save into IndexedDB, and return local object URL
 */
export const fetchAndCacheImage = async (url: string): Promise<string | null> => {
  if (!url) return null;

  // Check if already in cache
  const cached = await getCachedImage(url);
  if (cached) return cached;

  try {
    const response = await fetch(url, {
      mode: 'cors',
      cache: 'force-cache'
    });

    if (!response.ok) {
      return null;
    }

    const blob = await response.blob();
    // Cache in IndexedDB
    await setCachedImage(url, blob);

    const objectUrl = URL.createObjectURL(blob);
    memoryObjectURLCache.set(url, objectUrl);
    return objectUrl;
  } catch {
    // If CORS or network prevents fetch, return null and let <img> tag load it directly
    return null;
  }
};

/**
 * Preload and cache a list of movie image URLs in IndexedDB
 * Runs in the background in batches of 4 to keep rendering 100% fluid.
 */
export const preloadImagesToIndexedDB = async (urls: string[]): Promise<void> => {
  if (typeof window === 'undefined' || !urls || urls.length === 0) return;

  const validUrls = Array.from(new Set(urls.filter(Boolean)));
  const batchSize = 4;

  for (let i = 0; i < validUrls.length; i += batchSize) {
    const batch = validUrls.slice(i, i + batchSize);
    await Promise.allSettled(
      batch.map(async (url) => {
        const cached = await getCachedImage(url);
        if (!cached) {
          await fetchAndCacheImage(url);
        }
      })
    );
    // Yield to main thread
    await new Promise((r) => setTimeout(r, 60));
  }
};
