/**
 * Async Utils Tests
 * Tests for Cache, debounce, throttle, memoize, and other async utilities
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  Cache,
  debounce,
  throttle,
  memoize,
  delay,
  waitFor,
  withTimeout,
  executeWithConcurrency,
  batch,
  retryWithBackoff,
  withFallback,
  measurePerformance,
  ResourcePool,
} from '@/lib/utils/async-utils';

describe('Cache', () => {
  let cache: Cache<string>;

  beforeEach(() => {
    cache = new Cache<string>();
  });

  it('should store and retrieve values', () => {
    cache.set('key1', 'value1');
    expect(cache.get('key1')).toBe('value1');
  });

  it('should return null for missing keys', () => {
    expect(cache.get('nonexistent')).toBeNull();
  });

  it('should expire values after TTL', async () => {
    cache.set('key1', 'value1', 1); // 1 second TTL
    expect(cache.get('key1')).toBe('value1');

    await delay(1100);
    expect(cache.get('key1')).toBeNull();
  });

  it('should check key existence', () => {
    cache.set('key1', 'value1');
    expect(cache.has('key1')).toBe(true);
    expect(cache.has('nonexistent')).toBe(false);
  });

  it('should delete keys', () => {
    cache.set('key1', 'value1');
    cache.delete('key1');
    expect(cache.get('key1')).toBeNull();
  });

  it('should clear all cache', () => {
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    cache.clear();
    expect(cache.size()).toBe(0);
  });

  it('should report cache size', () => {
    expect(cache.size()).toBe(0);
    cache.set('key1', 'value1');
    expect(cache.size()).toBe(1);
    cache.set('key2', 'value2');
    expect(cache.size()).toBe(2);
  });
});

describe('debounce', () => {
  it('should debounce function calls', async () => {
    const mockFn = vi.fn();
    const debouncedFn = debounce(mockFn, 100);

    debouncedFn('a');
    debouncedFn('b');
    debouncedFn('c');

    expect(mockFn).not.toHaveBeenCalled();

    await delay(150);
    expect(mockFn).toHaveBeenCalledOnce();
    expect(mockFn).toHaveBeenCalledWith('c');
  });

  it('should reset debounce timer on new call', async () => {
    const mockFn = vi.fn();
    const debouncedFn = debounce(mockFn, 100);

    debouncedFn('a');
    await delay(50);
    debouncedFn('b');
    await delay(50);
    expect(mockFn).not.toHaveBeenCalled();

    await delay(100);
    expect(mockFn).toHaveBeenCalledOnce();
    expect(mockFn).toHaveBeenCalledWith('b');
  });
});

describe('throttle', () => {
  it('should throttle function calls', async () => {
    const mockFn = vi.fn();
    const throttledFn = throttle(mockFn, 100);

    throttledFn('a');
    expect(mockFn).toHaveBeenCalledWith('a');

    throttledFn('b');
    throttledFn('c');
    expect(mockFn).toHaveBeenCalledTimes(1);

    await delay(150);
    expect(mockFn).toHaveBeenCalledTimes(2);
    expect(mockFn).toHaveBeenLastCalledWith('c');
  });
});

describe('memoize', () => {
  it('should cache function results', () => {
    const mockFn = vi.fn((x: number) => x * 2);
    const memoizedFn = memoize(mockFn, 300);

    expect(memoizedFn(5)).toBe(10);
    expect(memoizedFn(5)).toBe(10);
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('should expire cached results after TTL', async () => {
    const mockFn = vi.fn((x: number) => x * 2);
    const memoizedFn = memoize(mockFn, 1);

    expect(memoizedFn(5)).toBe(10);
    await delay(1100);
    expect(memoizedFn(5)).toBe(10);
    expect(mockFn).toHaveBeenCalledTimes(2);
  });
});

describe('delay', () => {
  it('should delay execution', async () => {
    const start = Date.now();
    await delay(100);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(100);
  });
});

describe('waitFor', () => {
  it('should wait for condition to be true', async () => {
    let value = false;
    setTimeout(() => {
      value = true;
    }, 100);

    const result = await waitFor(() => value, 1000, 10);
    expect(result).toBe(true);
  });

  it('should timeout if condition never becomes true', async () => {
    const result = await waitFor(() => false, 100, 10);
    expect(result).toBe(false);
  });
});

describe('withTimeout', () => {
  it('should resolve if promise completes within timeout', async () => {
    const promise = delay(50).then(() => 'success');
    const result = await withTimeout(promise, 100);
    expect(result).toBe('success');
  });

  it('should reject if promise exceeds timeout', async () => {
    const promise = delay(200);
    await expect(withTimeout(promise, 100)).rejects.toThrow();
  });
});

describe('executeWithConcurrency', () => {
  it('should execute operations with concurrency limit', async () => {
    const results: number[] = [];
    const operations = [
      () => delay(50).then(() => { results.push(1); return 1; }),
      () => delay(50).then(() => { results.push(2); return 2; }),
      () => delay(50).then(() => { results.push(3); return 3; }),
      () => delay(50).then(() => { results.push(4); return 4; }),
    ];

    const start = Date.now();
    await executeWithConcurrency(operations, 2);
    const elapsed = Date.now() - start;

    expect(results).toContain(1);
    expect(results).toContain(2);
    expect(results).toContain(3);
    expect(results).toContain(4);
    expect(elapsed).toBeGreaterThanOrEqual(100); // 2 batches of 50ms
  });
});

describe('batch', () => {
  it('should batch items for processing', async () => {
    const items = [1, 2, 3, 4, 5];
    const batches: number[][] = [];

    const results = await batch(items, 2, async (batch) => {
      batches.push(batch);
      return batch;
    });

    expect(batches).toHaveLength(3);
    expect(batches[0]).toEqual([1, 2]);
    expect(batches[1]).toEqual([3, 4]);
    expect(batches[2]).toEqual([5]);
  });
});

describe('retryWithBackoff', () => {
  it('should retry operation with exponential backoff', async () => {
    let attempts = 0;
    const operation = async () => {
      attempts++;
      if (attempts < 3) {
        throw new Error('Failed');
      }
      return 'success';
    };

    const result = await retryWithBackoff(operation, 5, 50, 100);
    expect(result).toBe('success');
    expect(attempts).toBe(3);
  });

  it('should throw after max attempts', async () => {
    const operation = async () => {
      throw new Error('Failed');
    };

    await expect(retryWithBackoff(operation, 2, 50, 100)).rejects.toThrow();
  });
});

describe('withFallback', () => {
  it('should use primary operation if successful', async () => {
    const result = await withFallback(
      async () => 'primary',
      async () => 'fallback'
    );
    expect(result).toBe('primary');
  });

  it('should use fallback if primary fails', async () => {
    const result = await withFallback(
      async () => {
        throw new Error('Primary failed');
      },
      async () => 'fallback'
    );
    expect(result).toBe('fallback');
  });

  it('should support sync fallback', async () => {
    const result = await withFallback(
      async () => {
        throw new Error('Primary failed');
      },
      () => 'sync fallback'
    );
    expect(result).toBe('sync fallback');
  });
});

describe('measurePerformance', () => {
  it('should measure operation execution time', async () => {
    const { result, durationMs } = await measurePerformance(
      async () => {
        await delay(50);
        return 'done';
      },
      'Test operation'
    );

    expect(result).toBe('done');
    expect(durationMs).toBeGreaterThanOrEqual(50);
  });
});

describe('ResourcePool', () => {
  it('should acquire and release resources', async () => {
    const pool = new ResourcePool(() => ({ id: Math.random() }), 2);

    const resource1 = await pool.acquire();
    expect(resource1).toBeDefined();

    const stats = pool.getStats();
    expect(stats.inUse).toBe(1);
    expect(stats.available).toBe(0);

    pool.release(resource1);
    const statsAfterRelease = pool.getStats();
    expect(statsAfterRelease.inUse).toBe(0);
    expect(statsAfterRelease.available).toBe(1);
  });

  it('should throw when pool is exhausted', async () => {
    const pool = new ResourcePool(() => ({ id: Math.random() }), 1);

    await pool.acquire();
    await expect(pool.acquire()).rejects.toThrow('Resource pool exhausted');
  });

  it('should clear pool resources', async () => {
    const pool = new ResourcePool(() => ({ id: Math.random() }), 2);

    await pool.acquire();
    pool.clear();

    const stats = pool.getStats();
    expect(stats.inUse).toBe(0);
    expect(stats.available).toBe(0);
  });
});
