import { Redis } from "@upstash/redis";

// Initialize Redis client - will use REST API
// Requires UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN env vars
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || "",
  token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
});

// Key prefixes
const CACHE_PREFIX = "cache:";
const STATS_PREFIX = "stats:";
const STATS_LIST_KEY = "stats:all_figures";

interface CachedResult {
  places: Array<{
    name: string;
    years: string;
    description: string;
    lat: number;
    lng: number;
  }>;
  model: string;
  cachedAt: string;
}

interface FigureStats {
  name: string;
  normalizedName: string;
  requestCount: number;
  model: string;
  lastRequested: string;
}

// Normalize name for consistent caching (lowercase, trimmed)
export function normalizeName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, " ");
}

// Get cached result for a figure
export async function getCachedResult(
  name: string,
  model: string
): Promise<CachedResult | null> {
  const key = `${CACHE_PREFIX}${normalizeName(name)}:${model}`;
  try {
    const cached = await redis.get<CachedResult>(key);
    return cached;
  } catch (error) {
    console.error("Redis get error:", error);
    return null;
  }
}

// Cache a result
export async function cacheResult(
  name: string,
  model: string,
  places: CachedResult["places"]
): Promise<void> {
  const normalizedName = normalizeName(name);
  const key = `${CACHE_PREFIX}${normalizedName}:${model}`;

  const result: CachedResult = {
    places,
    model,
    cachedAt: new Date().toISOString(),
  };

  try {
    // Cache for 7 days
    await redis.set(key, result, { ex: 60 * 60 * 24 * 7 });
  } catch (error) {
    console.error("Redis set error:", error);
  }
}

// Update stats for a figure request
export async function updateStats(
  name: string,
  model: string
): Promise<void> {
  const normalizedName = normalizeName(name);
  const statsKey = `${STATS_PREFIX}${normalizedName}`;

  try {
    // Get existing stats or create new
    const existing = await redis.get<FigureStats>(statsKey);
    const currentCount = typeof existing?.requestCount === 'number' ? existing.requestCount : 0;

    const stats: FigureStats = {
      name: existing?.name || name, // Keep original casing from first request
      normalizedName,
      requestCount: currentCount + 1,
      model,
      lastRequested: new Date().toISOString(),
    };

    // Set stats first, then add to the list (avoid race condition)
    await redis.set(statsKey, stats);
    await redis.sadd(STATS_LIST_KEY, normalizedName);
  } catch (error) {
    console.error("Redis stats update error:", error);
  }
}

// Get all stats
export async function getAllStats(): Promise<FigureStats[]> {
  try {
    // Get all figure names from the set
    const figureNames = await redis.smembers(STATS_LIST_KEY);

    if (!figureNames || figureNames.length === 0) {
      return [];
    }

    // Get stats for each figure
    const statsPromises = figureNames.map((name) =>
      redis.get<FigureStats>(`${STATS_PREFIX}${name}`)
    );

    const statsResults = await Promise.all(statsPromises);

    // Filter out nulls, ensure requestCount exists, and sort
    const stats = statsResults
      .filter((s): s is FigureStats => s !== null && typeof s === 'object')
      .map((s) => ({
        ...s,
        requestCount: typeof s.requestCount === 'number' ? s.requestCount : 1,
      }))
      .sort((a, b) => b.requestCount - a.requestCount);

    return stats;
  } catch (error) {
    console.error("Redis get all stats error:", error);
    return [];
  }
}

// Check if any cache entries exist for a name (across all models)
export async function hasCacheEntries(name: string): Promise<boolean> {
  const normalizedName = normalizeName(name);
  try {
    const keys = await redis.keys(`${CACHE_PREFIX}${normalizedName}:*`);
    return keys.length > 0;
  } catch (error) {
    console.error("Redis hasCacheEntries error:", error);
    return false;
  }
}

// Purge all cache entries for a name (across all models)
export async function purgeCacheEntries(name: string): Promise<boolean> {
  const normalizedName = normalizeName(name);
  try {
    const keys = await redis.keys(`${CACHE_PREFIX}${normalizedName}:*`);
    if (keys.length === 0) return true;
    await redis.del(...keys);
    return true;
  } catch (error) {
    console.error("Redis purgeCacheEntries error:", error);
    return false;
  }
}

// Check if Redis is configured
export function isRedisConfigured(): boolean {
  return !!(
    process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN
  );
}
