# 🔴 Redis Implementation Guide - SafeWalk V12.0

**Objectif:** Configurer Redis en production pour réduire la latence API de 60%
**Cible:** 500ms → 200ms
**Effort:** 2-3h

---

## 📋 Architecture Redis

### Données à Cacher

1. **User Info** (TTL: 1 heure)
   - Clé: `user:{userId}`
   - Contenu: id, name, email, phone, credits, createdAt

2. **Active Trip** (TTL: 5 minutes)
   - Clé: `trip:{userId}:active`
   - Contenu: id, userId, startTime, deadline, duration, status, location

3. **User Contacts** (TTL: 24 heures)
   - Clé: `user:{userId}:contacts`
   - Contenu: Array de contacts d'urgence

4. **System Config** (TTL: 24 heures)
   - Clé: `system:config`
   - Contenu: maxTripDuration, minTripDuration, creditCost, smsRate

---

## 🚀 Installation Locale (Développement)

### Option 1: Installation directe sur Linux

```bash
# Installer Redis
sudo apt-get update
sudo apt-get install redis-server -y

# Démarrer Redis
sudo systemctl start redis-server

# Vérifier la connexion
redis-cli ping
# Output: PONG
```

### Option 2: Docker

```bash
# Démarrer Redis en Docker
docker run -d -p 6379:6379 --name safewalk-redis redis:7-alpine

# Vérifier la connexion
docker exec safewalk-redis redis-cli ping
# Output: PONG
```

---

## 🔧 Configuration Serveur (Node.js)

### Étape 1: Installer les dépendances

```bash
npm install redis
npm install --save-dev @types/redis
```

### Étape 2: Créer le service Redis

```typescript
// server/services/redis.service.ts
import { createClient, RedisClientType } from 'redis';

let redisClient: RedisClientType | null = null;

export async function initRedis() {
  if (redisClient?.isOpen) {
    return redisClient;
  }

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

  await redisClient.connect();
  return redisClient;
}

export async function closeRedis() {
  if (redisClient?.isOpen) {
    await redisClient.quit();
    redisClient = null;
  }
}

export function getRedisClient(): RedisClientType {
  if (!redisClient?.isOpen) {
    throw new Error('Redis client not initialized');
  }
  return redisClient;
}
```

### Étape 3: Créer le service de cache

```typescript
// server/services/cache.service.ts
import { getRedisClient } from './redis.service';

const DEFAULT_TTL = 3600; // 1 heure

/**
 * Obtenir une valeur du cache Redis
 */
export async function getCache<T>(key: string): Promise<T | null> {
  try {
    const client = getRedisClient();
    const cached = await client.get(key);
    if (!cached) return null;
    return JSON.parse(cached) as T;
  } catch (error) {
    console.error(`[Cache] Error getting ${key}:`, error);
    return null;
  }
}

/**
 * Stocker une valeur dans Redis
 */
export async function setCache<T>(
  key: string,
  data: T,
  ttl: number = DEFAULT_TTL
): Promise<void> {
  try {
    const client = getRedisClient();
    await client.setEx(key, ttl, JSON.stringify(data));
  } catch (error) {
    console.error(`[Cache] Error setting ${key}:`, error);
  }
}

/**
 * Supprimer une clé du cache
 */
export async function deleteCache(key: string): Promise<void> {
  try {
    const client = getRedisClient();
    await client.del(key);
  } catch (error) {
    console.error(`[Cache] Error deleting ${key}:`, error);
  }
}

/**
 * Obtenir avec fallback API
 */
export async function getCacheOrFetch<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl: number = DEFAULT_TTL
): Promise<T> {
  // 1. Vérifier le cache
  const cached = await getCache<T>(key);
  if (cached) {
    console.log(`[Cache] Hit: ${key}`);
    return cached;
  }

  console.log(`[Cache] Miss: ${key}`);
  
  // 2. Appeler l'API
  const data = await fetchFn();
  
  // 3. Mettre en cache
  await setCache(key, data, ttl);
  
  return data;
}

/**
 * Invalider le cache par pattern
 */
export async function invalidateCache(pattern: string): Promise<void> {
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
```

### Étape 4: Intégrer Redis dans le serveur

```typescript
// server/_core/index.ts
import { initRedis, closeRedis } from '../services/redis.service';

// Au démarrage
async function startServer() {
  try {
    // Initialiser Redis
    await initRedis();
    console.log('[Server] Redis initialized');

    // Démarrer le serveur Express
    app.listen(PORT, () => {
      console.log(`[Server] Listening on port ${PORT}`);
    });
  } catch (error) {
    console.error('[Server] Failed to start:', error);
    process.exit(1);
  }
}

// À l'arrêt
process.on('SIGTERM', async () => {
  console.log('[Server] SIGTERM received, shutting down...');
  await closeRedis();
  process.exit(0);
});

startServer();
```

### Étape 5: Utiliser le cache dans les routes

```typescript
// server/routes/user.ts
import { getCacheOrFetch, invalidateCaches } from '../services/cache.service';

// GET /api/user/:id
export async function getUser(req: Request, res: Response) {
  const userId = req.params.id;
  const cacheKey = `user:${userId}`;

  const user = await getCacheOrFetch(
    cacheKey,
    async () => {
      // Appel à Supabase ou base de données
      return db.query('SELECT * FROM users WHERE id = ?', [userId]);
    },
    3600 // 1 heure
  );

  res.json(user);
}

// PUT /api/user/:id
export async function updateUser(req: Request, res: Response) {
  const userId = req.params.id;

  // Mettre à jour la base de données
  const user = await db.query('UPDATE users SET ... WHERE id = ?', [userId]);

  // Invalider le cache
  await invalidateCaches([
    `user:${userId}`,
    `user:${userId}:*`,
  ]);

  res.json(user);
}

// GET /api/active-trip/:userId
export async function getActiveTrip(req: Request, res: Response) {
  const userId = req.params.userId;
  const cacheKey = `trip:${userId}:active`;

  const trip = await getCacheOrFetch(
    cacheKey,
    async () => {
      return db.query(
        'SELECT * FROM trips WHERE user_id = ? AND status = ?',
        [userId, 'active']
      );
    },
    300 // 5 minutes
  );

  res.json(trip);
}

// POST /api/start-trip
export async function startTrip(req: Request, res: Response) {
  const { userId, deadline } = req.body;

  // Créer la sortie
  const trip = await db.query(
    'INSERT INTO trips (user_id, deadline) VALUES (?, ?)',
    [userId, deadline]
  );

  // Invalider les caches affectés
  await invalidateCaches([
    `trip:${userId}:active`,
    `user:${userId}:*`,
  ]);

  res.json(trip);
}
```

---

## 📱 Intégration Client (React Native)

Le client utilise déjà `cache-service.ts` qui simule le caching local.
Avec Redis serveur, les données seront cachées côté serveur et retournées plus rapidement.

```typescript
// lib/services/user-service.ts
import { apiCall } from './api-client';

export async function getUserInfo(userId: string) {
  // Le serveur retourne les données du cache Redis si disponibles
  return apiCall('/user-info', { userId });
}

export async function getActiveTrip(userId: string) {
  // Le serveur retourne les données du cache Redis si disponibles
  return apiCall('/active-trip', { userId });
}

// Après une mutation, le serveur invalide le cache automatiquement
export async function startTrip(data: TripData) {
  return apiCall('/start-trip', data);
}
```

---

## 🌐 Configuration Production

### Option 1: AWS ElastiCache

```bash
# Créer un cluster Redis
aws elasticache create-cache-cluster \
  --cache-cluster-id safewalk-redis \
  --cache-node-type cache.t3.micro \
  --engine redis \
  --engine-version 7.0 \
  --num-cache-nodes 1 \
  --port 6379
```

### Option 2: Redis Cloud

1. Créer un compte sur [redis.com](https://redis.com)
2. Créer une base de données
3. Copier la connexion string

### Configuration d'environnement

```bash
# .env.production
REDIS_HOST=your-redis-host.redis.cloud
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
REDIS_DB=0
REDIS_TLS=true
```

---

## 🔍 Monitoring

### Commandes Redis utiles

```bash
# Vérifier la connexion
redis-cli ping

# Voir les clés
redis-cli keys '*'

# Voir les informations
redis-cli info

# Monitorer en temps réel
redis-cli monitor

# Vider le cache
redis-cli flushdb
redis-cli flushall
```

### Métriques à surveiller

```typescript
// server/monitoring/redis-metrics.ts
import { getRedisClient } from '../services/redis.service';

export async function getRedisMetrics() {
  const client = getRedisClient();
  const info = await client.info();

  const lines = info.split('\r\n');
  const metrics: Record<string, string> = {};

  for (const line of lines) {
    const [key, value] = line.split(':');
    if (key && value) {
      metrics[key] = value;
    }
  }

  return {
    connectedClients: parseInt(metrics.connected_clients || '0'),
    usedMemory: parseInt(metrics.used_memory || '0'),
    totalCommands: parseInt(metrics.total_commands_processed || '0'),
    hitRate: calculateHitRate(metrics),
    evictions: parseInt(metrics.evicted_keys || '0'),
  };
}

function calculateHitRate(metrics: Record<string, string>): number {
  const hits = parseInt(metrics.keyspace_hits || '0');
  const misses = parseInt(metrics.keyspace_misses || '0');
  const total = hits + misses;
  return total > 0 ? (hits / total) * 100 : 0;
}
```

---

## 🧪 Tests

### Test de performance

```bash
# Benchmark Redis
redis-benchmark -h localhost -p 6379 -c 50 -n 100000

# Résultats attendus:
# SET: ~50,000 ops/sec
# GET: ~100,000 ops/sec
```

### Test d'intégration

```typescript
// server/__tests__/cache.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setCache, getCache, deleteCache, initRedis, closeRedis } from '../services/cache.service';

describe('Redis Cache', () => {
  beforeAll(async () => {
    await initRedis();
  });

  afterAll(async () => {
    await closeRedis();
  });

  it('should cache and retrieve data', async () => {
    const testData = { id: 1, name: 'Test User' };
    
    await setCache('test:1', testData, 3600);
    const cached = await getCache('test:1');
    
    expect(cached).toEqual(testData);
  });

  it('should expire cache', async () => {
    await setCache('test:2', { data: 'test' }, 1);
    
    await new Promise(resolve => setTimeout(resolve, 1100));
    
    const cached = await getCache('test:2');
    expect(cached).toBeNull();
  });

  it('should delete cache', async () => {
    await setCache('test:3', { data: 'test' });
    await deleteCache('test:3');
    
    const cached = await getCache('test:3');
    expect(cached).toBeNull();
  });
});
```

---

## 📈 Résultats Attendus

### Avant Redis
```
API Latency: 500ms
├── Database query: 300ms
├── Network: 100ms
└── Processing: 100ms

Server CPU: 75%
Memory: 2GB
```

### Après Redis
```
API Latency: 200ms (-60%)
├── Cache hit: 50ms
├── Database query: 300ms (cache miss)
├── Network: 100ms
└── Processing: 50ms

Server CPU: 45% (-40%)
Memory: 2.5GB
```

---

## 🎯 Checklist

- [ ] Redis installé et en cours d'exécution
- [ ] redis.service.ts créé
- [ ] cache.service.ts implémenté
- [ ] Routes mises en cache
- [ ] Cache invalidation implémentée
- [ ] Tests Redis créés
- [ ] Monitoring configuré
- [ ] Production Redis configuré
- [ ] Métriques de performance validées

---

**Fin du guide Redis**
