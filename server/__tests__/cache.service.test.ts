/**
 * Tests pour le service de cache Redis
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  getCache,
  setCache,
  deleteCache,
  getCacheOrFetch,
  invalidateCache,
  invalidateCaches,
  flushCache,
} from '../services/cache.service';
import { initRedis, closeRedis, isRedisConnected } from '../services/redis.service';

describe('Cache Service', () => {
  beforeAll(async () => {
    try {
      await initRedis();
      // Attendre que Redis soit prêt
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      console.log('Redis not available for tests, skipping...');
    }
  });

  afterAll(async () => {
    if (isRedisConnected()) {
      await flushCache();
      await closeRedis();
    }
  });

  it('should set and get cache', async () => {
    if (!isRedisConnected()) {
      console.log('Redis not connected, skipping test');
      return;
    }

    const testData = { id: 1, name: 'Test User', email: 'test@example.com' };

    await setCache('test:user:1', testData, 3600);
    const cached = await getCache('test:user:1');

    expect(cached).toEqual(testData);
  });

  it('should return null for non-existent key', async () => {
    if (!isRedisConnected()) {
      console.log('Redis not connected, skipping test');
      return;
    }

    const cached = await getCache('non:existent:key');
    expect(cached).toBeNull();
  });

  it('should delete cache', async () => {
    if (!isRedisConnected()) {
      console.log('Redis not connected, skipping test');
      return;
    }

    const testData = { id: 2, name: 'Test User 2' };

    await setCache('test:user:2', testData);
    await deleteCache('test:user:2');

    const cached = await getCache('test:user:2');
    expect(cached).toBeNull();
  });

  it('should fetch and cache data', async () => {
    if (!isRedisConnected()) {
      console.log('Redis not connected, skipping test');
      return;
    }

    const testData = { id: 3, name: 'Fetched User' };
    let fetchCount = 0;

    const fetchFn = async () => {
      fetchCount++;
      return testData;
    };

    // First call should fetch
    const result1 = await getCacheOrFetch('test:user:3', fetchFn, 3600);
    expect(result1).toEqual(testData);
    expect(fetchCount).toBe(1);

    // Second call should use cache
    const result2 = await getCacheOrFetch('test:user:3', fetchFn, 3600);
    expect(result2).toEqual(testData);
    expect(fetchCount).toBe(1); // Should not increment
  });

  it('should invalidate cache by pattern', async () => {
    if (!isRedisConnected()) {
      console.log('Redis not connected, skipping test');
      return;
    }

    // Set multiple keys
    await setCache('test:user:4', { id: 4 });
    await setCache('test:user:5', { id: 5 });
    await setCache('test:trip:1', { id: 1 });

    // Invalidate user keys
    await invalidateCache('test:user:*');

    // Check that user keys are deleted
    expect(await getCache('test:user:4')).toBeNull();
    expect(await getCache('test:user:5')).toBeNull();

    // Check that trip key still exists
    expect(await getCache('test:trip:1')).toEqual({ id: 1 });
  });

  it('should invalidate multiple patterns', async () => {
    if (!isRedisConnected()) {
      console.log('Redis not connected, skipping test');
      return;
    }

    // Set multiple keys
    await setCache('test:user:6', { id: 6 });
    await setCache('test:trip:2', { id: 2 });
    await setCache('test:contact:1', { id: 1 });

    // Invalidate multiple patterns
    await invalidateCaches(['test:user:*', 'test:trip:*']);

    // Check that keys are deleted
    expect(await getCache('test:user:6')).toBeNull();
    expect(await getCache('test:trip:2')).toBeNull();

    // Check that contact key still exists
    expect(await getCache('test:contact:1')).toEqual({ id: 1 });
  });

  it('should handle cache expiration', async () => {
    if (!isRedisConnected()) {
      console.log('Redis not connected, skipping test');
      return;
    }

    const testData = { id: 7, name: 'Expiring User' };

    // Set cache with 1 second TTL
    await setCache('test:user:7', testData, 1);

    // Should exist immediately
    let cached = await getCache('test:user:7');
    expect(cached).toEqual(testData);

    // Wait for expiration
    await new Promise((resolve) => setTimeout(resolve, 1100));

    // Should be expired
    cached = await getCache('test:user:7');
    expect(cached).toBeNull();
  });

  it('should handle concurrent operations', async () => {
    if (!isRedisConnected()) {
      console.log('Redis not connected, skipping test');
      return;
    }

    const operations = [];

    // Set 10 keys concurrently
    for (let i = 0; i < 10; i++) {
      operations.push(setCache(`test:concurrent:${i}`, { id: i }));
    }

    await Promise.all(operations);

    // Verify all keys exist
    for (let i = 0; i < 10; i++) {
      const cached = await getCache(`test:concurrent:${i}`);
      expect(cached).toEqual({ id: i });
    }
  });
});
