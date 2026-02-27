/**
 * Cache Service
 *
 * Gère le caching côté serveur avec Redis
 * Fournit des fonctions pour get, set, delete, et invalidate
 */

import { getRedisClient, isRedisConnected } from './redis.service';

const DEFAULT_TTL = 3600; // 1 heure

/**
 * Obtenir une valeur du cache Redis
 */
export async function getCache<T>(key: string): Promise<T | null> {
  if (!isRedisConnected()) {
    return null;
  }

  try {
    const client = getRedisClient();
    const cached = await client.get(key);

    if (!cached) {
      return null;
    }

    return JSON.parse(cached) as T;
  } catch (error) {
    console.error(`[Cache] Error getting ${key}:`, error);
    return null;
  }
}

/**
 * Stocker une valeur dans Redis
 */
export async function setCache<T>(key: string, data: T, ttl: number = DEFAULT_TTL): Promise<void> {
  if (!isRedisConnected()) {
    return;
  }

  try {
    const client = getRedisClient();
    await client.setEx(key, ttl, JSON.stringify(data));
    console.log(`[Cache] Set: ${key} (TTL: ${ttl}s)`);
  } catch (error) {
    console.error(`[Cache] Error setting ${key}:`, error);
  }
}

/**
 * Supprimer une clé du cache
 */
export async function deleteCache(key: string): Promise<void> {
  if (!isRedisConnected()) {
    return;
  }

  try {
    const client = getRedisClient();
    await client.del(key);
    console.log(`[Cache] Deleted: ${key}`);
  } catch (error) {
    console.error(`[Cache] Error deleting ${key}:`, error);
  }
}

/**
 * Obtenir avec fallback API
 * Retourne la valeur du cache si disponible, sinon appelle la fonction et met en cache
 */
export async function getCacheOrFetch<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl: number = DEFAULT_TTL,
): Promise<T> {
  // 1. Vérifier le cache
  const cached = await getCache<T>(key);
  if (cached) {
    console.log(`[Cache] Hit: ${key}`);
    return cached;
  }

  console.log(`[Cache] Miss: ${key}`);

  // 2. Appeler l'API
  const startTime = Date.now();
  const data = await fetchFn();
  const fetchTime = Date.now() - startTime;
  console.log(`[Cache] Fetched: ${key} (${fetchTime}ms)`);

  // 3. Mettre en cache
  await setCache(key, data, ttl);

  return data;
}

/**
 * Invalider le cache par pattern
 */
export async function invalidateCache(pattern: string): Promise<void> {
  if (!isRedisConnected()) {
    return;
  }

  try {
    const client = getRedisClient();
    const keys = await client.keys(pattern);

    if (keys.length > 0) {
      await client.del(keys);
      console.log(`[Cache] Invalidated ${keys.length} keys matching ${pattern}`);
    }
  } catch (error) {
    console.error(`[Cache] Error invalidating ${pattern}:`, error);
  }
}

/**
 * Invalider plusieurs patterns
 */
export async function invalidateCaches(patterns: string[]): Promise<void> {
  for (const pattern of patterns) {
    await invalidateCache(pattern);
  }
}

/**
 * Vider tout le cache
 */
export async function flushCache(): Promise<void> {
  if (!isRedisConnected()) {
    return;
  }

  try {
    const client = getRedisClient();
    await client.flushDb();
    console.log('[Cache] Flushed all cache');
  } catch (error) {
    console.error('[Cache] Error flushing cache:', error);
  }
}

/**
 * Obtenir les statistiques du cache
 */
export async function getCacheStats(): Promise<{
  keys: number;
  memory: number;
  hitRate: number;
} | null> {
  if (!isRedisConnected()) {
    return null;
  }

  try {
    const client = getRedisClient();
    const info = await client.info('stats');
    const keyspace = await client.info('keyspace');

    const lines = info.split('\r\n');
    const stats: Record<string, string> = {};

    for (const line of lines) {
      const [key, value] = line.split(':');
      if (key && value) {
        stats[key] = value;
      }
    }

    const hits = parseInt(stats.keyspace_hits || '0');
    const misses = parseInt(stats.keyspace_misses || '0');
    const total = hits + misses;
    const hitRate = total > 0 ? (hits / total) * 100 : 0;

    // Compter les clés
    const keyspaceLines = keyspace.split('\r\n');
    let keyCount = 0;
    for (const line of keyspaceLines) {
      if (line.startsWith('db')) {
        const match = line.match(/keys=(\d+)/);
        if (match) {
          keyCount += parseInt(match[1]);
        }
      }
    }

    // Obtenir la mémoire utilisée
    const memInfo = await client.info('memory');
    const memLines = memInfo.split('\r\n');
    let usedMemory = 0;
    for (const line of memLines) {
      if (line.startsWith('used_memory:')) {
        usedMemory = parseInt(line.split(':')[1]);
        break;
      }
    }

    return {
      keys: keyCount,
      memory: usedMemory,
      hitRate,
    };
  } catch (error) {
    console.error('[Cache] Error getting stats:', error);
    return null;
  }
}
