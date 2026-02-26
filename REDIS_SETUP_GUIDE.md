# 🔴 Redis Setup Guide - SafeWalk V9.0

**Objectif:** Configurer Redis en production pour réduire la latence API de 60%
**Cible:** 500ms → 200ms

---

## 📋 Prérequis

- Node.js 18+
- Redis 7.0+
- Docker (optionnel)
- AWS ElastiCache ou Redis Cloud (production)

---

## 🚀 Installation Locale (Développement)

### Option 1: Installation directe

```bash
# macOS
brew install redis
brew services start redis

# Linux
sudo apt-get install redis-server
sudo systemctl start redis-server

# Vérifier l'installation
redis-cli ping
# Output: PONG
```

### Option 2: Docker

```bash
# Démarrer Redis en Docker
docker run -d -p 6379:6379 redis:7-alpine

# Vérifier la connexion
docker exec -it <container_id> redis-cli ping
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
import { createClient } from 'redis';

const redisClient = createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
});

redisClient.on('error', (err) => {
  console.error('[Redis] Connection error:', err);
});

redisClient.on('connect', () => {
  console.log('[Redis] Connected');
});

export async function initRedis() {
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }
}

export async function closeRedis() {
  await redisClient.quit();
}

export default redisClient;
```

### Étape 3: Implémenter le cache côté serveur

```typescript
// server/services/cache.service.ts
import redisClient from './redis.service';

const DEFAULT_TTL = 3600; // 1 heure

/**
 * Obtenir une valeur du cache Redis
 */
export async function getCache<T>(key: string): Promise<T | null> {
  try {
    const cached = await redisClient.get(key);
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
    await redisClient.setEx(key, ttl, JSON.stringify(data));
  } catch (error) {
    console.error(`[Cache] Error setting ${key}:`, error);
  }
}

/**
 * Supprimer une clé du cache
 */
export async function deleteCache(key: string): Promise<void> {
  try {
    await redisClient.del(key);
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
    return cached;
  }
  
  // 2. Appeler l'API
  const data = await fetchFn();
  
  // 3. Mettre en cache
  await setCache(key, data, ttl);
  
  return data;
}

/**
 * Invalider le cache
 */
export async function invalidateCache(pattern: string): Promise<void> {
  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
  } catch (error) {
    console.error(`[Cache] Error invalidating ${pattern}:`, error);
  }
}
```

### Étape 4: Utiliser le cache dans les routes

```typescript
// server/routes/user.ts
import { getCacheOrFetch, invalidateCache } from '../services/cache.service';
import { db } from '../db';

// GET /user/:id
export async function getUser(req, res) {
  const userId = req.params.id;
  const cacheKey = `user:${userId}`;
  
  const user = await getCacheOrFetch(
    cacheKey,
    async () => {
      return db.query('SELECT * FROM users WHERE id = ?', [userId]);
    },
    3600 // 1 heure
  );
  
  res.json(user);
}

// PUT /user/:id
export async function updateUser(req, res) {
  const userId = req.params.id;
  const cacheKey = `user:${userId}`;
  
  // Mettre à jour la base de données
  const user = await db.query('UPDATE users SET ... WHERE id = ?', [userId]);
  
  // Invalider le cache
  await invalidateCache(`user:${userId}*`);
  
  res.json(user);
}
```

---

## 📱 Intégration Client (React Native)

### Étape 1: Utiliser le cache service

```typescript
// lib/services/user-service.ts
import { cacheService } from './cache-service';
import { apiCall } from './api-client';

export async function getUserInfo(userId: string) {
  return cacheService.getCachedOrFetch(
    `user:${userId}`,
    async () => {
      return apiCall('/user-info', { userId });
    },
    3600 // 1 heure
  );
}

export async function getActiveTrip(userId: string) {
  return cacheService.getCachedOrFetch(
    `trip:${userId}:active`,
    async () => {
      return apiCall('/active-trip', { userId });
    },
    300 // 5 minutes
  );
}
```

### Étape 2: Invalider le cache après les mutations

```typescript
// Dans les écrans
import { cacheService } from '@/lib/services/cache-service';

export async function handleStartTrip() {
  try {
    const trip = await tripService.startTrip(...);
    
    // Invalider les caches affectés
    await cacheService.invalidateCaches([
      CACHE_KEYS.ACTIVE_TRIP,
      CACHE_KEYS.USER_CREDITS,
    ]);
    
    return trip;
  } catch (error) {
    // Handle error
  }
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
  --num-cache-nodes 1
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

## 📊 Données à Cacher

### 1. User Info (TTL: 1 heure)

```typescript
// Clé: user:{userId}
{
  id: string;
  name: string;
  email: string;
  phone: string;
  credits: number;
  createdAt: Date;
}
```

### 2. Active Trip (TTL: 5 minutes)

```typescript
// Clé: trip:{userId}:active
{
  id: string;
  userId: string;
  startTime: Date;
  deadline: Date;
  duration: number;
  status: 'active' | 'paused';
  location: { lat: number; lng: number };
}
```

### 3. User Contacts (TTL: 24 heures)

```typescript
// Clé: user:{userId}:contacts
[
  {
    id: string;
    name: string;
    phone: string;
    relationship: string;
  }
]
```

### 4. System Config (TTL: 24 heures)

```typescript
// Clé: system:config
{
  maxTripDuration: number;
  minTripDuration: number;
  creditCost: number;
  smsRate: number;
  maintenanceMode: boolean;
}
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
export async function getRedisMetrics() {
  const info = await redisClient.info();
  
  return {
    connectedClients: parseInt(info.connected_clients),
    usedMemory: parseInt(info.used_memory),
    totalCommands: parseInt(info.total_commands_processed),
    hitRate: calculateHitRate(info),
  };
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
// server/__tests__/redis.test.ts
import { describe, it, expect } from 'vitest';
import { setCache, getCache } from '../services/cache.service';

describe('Redis Cache', () => {
  it('should cache and retrieve data', async () => {
    const testData = { id: 1, name: 'Test' };
    
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
- [ ] Client cache-service.ts intégré
- [ ] Tests Redis créés
- [ ] Monitoring configuré
- [ ] Production Redis configuré
- [ ] Métriques de performance validées

---

**Fin du guide Redis**
