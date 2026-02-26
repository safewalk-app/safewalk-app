import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Cache Service - Gestion du cache local et serveur
 * 
 * Architecture:
 * 1. Cache local (AsyncStorage) - Rapide, persistant
 * 2. Cache serveur (Redis) - Partagé, centralisé
 * 3. API - Source de vérité
 * 
 * Flow: Local → Server → API
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // en secondes
}

const CACHE_PREFIX = 'safewalk_cache_';
const DEFAULT_TTL = 3600; // 1 heure

/**
 * Clés de cache définies
 */
export const CACHE_KEYS = {
  // User
  USER_INFO: 'user_info',
  USER_CREDITS: 'user_credits',
  USER_CONTACTS: 'user_contacts',
  
  // Trip
  ACTIVE_TRIP: 'active_trip',
  TRIP_HISTORY: 'trip_history',
  
  // System
  SYSTEM_CONFIG: 'system_config',
  TARIFFS: 'tariffs',
  LIMITS: 'limits',
} as const;

/**
 * TTL par type de données
 */
const TTL_CONFIG: Record<string, number> = {
  [CACHE_KEYS.USER_INFO]: 3600, // 1 heure
  [CACHE_KEYS.USER_CREDITS]: 300, // 5 minutes
  [CACHE_KEYS.USER_CONTACTS]: 86400, // 24 heures
  [CACHE_KEYS.ACTIVE_TRIP]: 300, // 5 minutes
  [CACHE_KEYS.TRIP_HISTORY]: 3600, // 1 heure
  [CACHE_KEYS.SYSTEM_CONFIG]: 86400, // 24 heures
  [CACHE_KEYS.TARIFFS]: 86400, // 24 heures
  [CACHE_KEYS.LIMITS]: 86400, // 24 heures
};

/**
 * Obtenir une valeur du cache
 */
export async function getCached<T>(key: string): Promise<T | null> {
  try {
    const cacheKey = `${CACHE_PREFIX}${key}`;
    const cached = await AsyncStorage.getItem(cacheKey);
    
    if (!cached) return null;
    
    const entry: CacheEntry<T> = JSON.parse(cached);
    const now = Date.now();
    const age = (now - entry.timestamp) / 1000; // en secondes
    
    // Vérifier si le cache a expiré
    if (age > entry.ttl) {
      await AsyncStorage.removeItem(cacheKey);
      return null;
    }
    
    return entry.data;
  } catch (error) {
    console.error(`[CacheService] Error getting cache for ${key}:`, error);
    return null;
  }
}

/**
 * Stocker une valeur dans le cache
 */
export async function setCached<T>(
  key: string,
  data: T,
  ttl?: number
): Promise<void> {
  try {
    const cacheKey = `${CACHE_PREFIX}${key}`;
    const cacheTtl = ttl ?? TTL_CONFIG[key] ?? DEFAULT_TTL;
    
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: cacheTtl,
    };
    
    await AsyncStorage.setItem(cacheKey, JSON.stringify(entry));
  } catch (error) {
    console.error(`[CacheService] Error setting cache for ${key}:`, error);
  }
}

/**
 * Supprimer une valeur du cache
 */
export async function clearCache(key: string): Promise<void> {
  try {
    const cacheKey = `${CACHE_PREFIX}${key}`;
    await AsyncStorage.removeItem(cacheKey);
  } catch (error) {
    console.error(`[CacheService] Error clearing cache for ${key}:`, error);
  }
}

/**
 * Vider tout le cache
 */
export async function clearAllCache(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(k => k.startsWith(CACHE_PREFIX));
    await AsyncStorage.multiRemove(cacheKeys);
  } catch (error) {
    console.error('[CacheService] Error clearing all cache:', error);
  }
}

/**
 * Obtenir une valeur avec fallback API
 * 
 * Flow:
 * 1. Vérifier le cache local
 * 2. Si expiré, appeler l'API
 * 3. Mettre à jour le cache
 * 4. Retourner la valeur
 */
export async function getCachedOrFetch<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl?: number
): Promise<T> {
  // 1. Vérifier le cache
  const cached = await getCached<T>(key);
  if (cached !== null) {
    return cached;
  }
  
  // 2. Appeler l'API
  const data = await fetchFn();
  
  // 3. Mettre à jour le cache
  await setCached(key, data, ttl);
  
  // 4. Retourner
  return data;
}

/**
 * Invalider le cache (marquer comme expiré)
 */
export async function invalidateCache(key: string): Promise<void> {
  await clearCache(key);
}

/**
 * Invalider plusieurs clés de cache
 */
export async function invalidateCaches(keys: string[]): Promise<void> {
  await Promise.all(keys.map(key => clearCache(key)));
}

/**
 * Pré-charger le cache (pour les données critiques)
 */
export async function preloadCache<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl?: number
): Promise<void> {
  try {
    const data = await fetchFn();
    await setCached(key, data, ttl);
  } catch (error) {
    console.error(`[CacheService] Error preloading cache for ${key}:`, error);
  }
}

/**
 * Obtenir les statistiques du cache
 */
export async function getCacheStats(): Promise<{
  totalSize: number;
  entries: number;
  expired: number;
}> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(k => k.startsWith(CACHE_PREFIX));
    
    let totalSize = 0;
    let expired = 0;
    const now = Date.now();
    
    for (const key of cacheKeys) {
      const cached = await AsyncStorage.getItem(key);
      if (cached) {
        totalSize += cached.length;
        
        try {
          const entry: CacheEntry<any> = JSON.parse(cached);
          const age = (now - entry.timestamp) / 1000;
          if (age > entry.ttl) {
            expired++;
          }
        } catch {
          // Ignore parse errors
        }
      }
    }
    
    return {
      totalSize,
      entries: cacheKeys.length,
      expired,
    };
  } catch (error) {
    console.error('[CacheService] Error getting cache stats:', error);
    return { totalSize: 0, entries: 0, expired: 0 };
  }
}

/**
 * Nettoyer le cache expiré
 */
export async function cleanupExpiredCache(): Promise<number> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(k => k.startsWith(CACHE_PREFIX));
    
    let cleaned = 0;
    const now = Date.now();
    
    for (const key of cacheKeys) {
      const cached = await AsyncStorage.getItem(key);
      if (cached) {
        try {
          const entry: CacheEntry<any> = JSON.parse(cached);
          const age = (now - entry.timestamp) / 1000;
          if (age > entry.ttl) {
            await AsyncStorage.removeItem(key);
            cleaned++;
          }
        } catch {
          // Ignore parse errors
        }
      }
    }
    
    return cleaned;
  } catch (error) {
    console.error('[CacheService] Error cleaning up cache:', error);
    return 0;
  }
}

export const cacheService = {
  getCached,
  setCached,
  clearCache,
  clearAllCache,
  getCachedOrFetch,
  invalidateCache,
  invalidateCaches,
  preloadCache,
  getCacheStats,
  cleanupExpiredCache,
};
