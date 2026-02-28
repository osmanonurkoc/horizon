interface CachedData<T> {
  timestamp: number;
  data: T;
}

const CACHE_PREFIX = 'horizon_cache_';

export async function cachedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  expiryMs: number
): Promise<T> {
  if (typeof window === 'undefined') return fetcher();

  const cacheKey = `${CACHE_PREFIX}${key}`;
  const stored = localStorage.getItem(cacheKey);

  if (stored) {
    const cached: CachedData<T> = JSON.parse(stored);
    const now = Date.now();
    if (now - cached.timestamp < expiryMs) {
      return cached.data;
    }
  }

  const data = await fetcher();
  const cacheEntry: CachedData<T> = {
    timestamp: Date.now(),
    data,
  };
  localStorage.setItem(cacheKey, JSON.stringify(cacheEntry));
  return data;
}

export const EXPIRY_TIMES = {
  WEATHER: 30 * 60 * 1000, // 30 mins
  MARKET: 30 * 60 * 1000, // 30 mins
  NEWS: 2 * 60 * 60 * 1000, // 2 hours
};