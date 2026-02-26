/**
 * Redis Service
 * 
 * Gère la connexion et l'initialisation de Redis
 * Utilisé pour le caching côté serveur
 */

import { createClient, type RedisClientType } from 'redis';

let redisClient: RedisClientType | null = null;
let isConnecting = false;

/**
 * Initialiser la connexion Redis
 */
export async function initRedis(): Promise<RedisClientType> {
  if (redisClient?.isOpen) {
    return redisClient;
  }

  if (isConnecting) {
    // Attendre que la connexion précédente se termine
    let attempts = 0;
    while (!redisClient?.isOpen && attempts < 50) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    if (redisClient?.isOpen) {
      return redisClient;
    }
  }

  isConnecting = true;

  try {
    redisClient = createClient({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            console.error('[Redis] Max reconnection attempts reached');
            return new Error('Redis max retries exceeded');
          }
          return retries * 100;
        },
      },
    });

    redisClient.on('error', (err) => {
      console.error('[Redis] Connection error:', err);
    });

    redisClient.on('connect', () => {
      console.log('[Redis] Connected');
    });

    redisClient.on('ready', () => {
      console.log('[Redis] Ready');
    });

    redisClient.on('reconnecting', () => {
      console.log('[Redis] Reconnecting...');
    });

    await redisClient.connect();
    console.log('[Redis] Successfully initialized');
    
    return redisClient;
  } catch (error) {
    console.error('[Redis] Failed to initialize:', error);
    redisClient = null;
    throw error;
  } finally {
    isConnecting = false;
  }
}

/**
 * Fermer la connexion Redis
 */
export async function closeRedis(): Promise<void> {
  if (redisClient?.isOpen) {
    await redisClient.quit();
    redisClient = null;
    console.log('[Redis] Connection closed');
  }
}

/**
 * Obtenir le client Redis
 */
export function getRedisClient(): RedisClientType {
  if (!redisClient?.isOpen) {
    throw new Error('Redis client not initialized or connection closed');
  }
  return redisClient;
}

/**
 * Vérifier si Redis est connecté
 */
export function isRedisConnected(): boolean {
  return redisClient?.isOpen ?? false;
}
