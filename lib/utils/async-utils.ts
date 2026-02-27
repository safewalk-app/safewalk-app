/**
 * Async Utilities
 * Reusable async operations, caching, and debouncing
 */

import { logger } from '@/lib/logger';

/**
 * Simple in-memory cache with TTL
 */
export class Cache<T> {
  private cache: Map<string, { value: T; expiresAt: number }> = new Map();

  /**
   * Get value from cache
   */
  get(key: string): T | null {
    const item = this.cache.get(key);

    if (!item) {
      return null;
    }

    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  /**
   * Set value in cache with TTL
   */
  set(key: string, value: T, ttlSeconds: number = 300): void {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Delete key from cache
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }
}

/**
 * Debounce function calls
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delayMs: number,
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      func(...args);
      timeoutId = null;
    }, delayMs);
  };
}

/**
 * Throttle function calls
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  delayMs: number,
): (...args: Parameters<T>) => void {
  let lastCallTime = 0;
  let timeoutId: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    const now = Date.now();
    const timeSinceLastCall = now - lastCallTime;

    if (timeSinceLastCall >= delayMs) {
      func(...args);
      lastCallTime = now;
    } else {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(() => {
        func(...args);
        lastCallTime = Date.now();
        timeoutId = null;
      }, delayMs - timeSinceLastCall);
    }
  };
}

/**
 * Memoize function results
 */
export function memoize<T extends (...args: any[]) => any>(func: T, ttlSeconds: number = 300): T {
  const cache = new Cache<any>();

  return ((...args: Parameters<T>) => {
    const key = JSON.stringify(args);
    const cached = cache.get(key);

    if (cached !== null) {
      return cached;
    }

    const result = func(...args);
    cache.set(key, result, ttlSeconds);
    return result;
  }) as T;
}

/**
 * Delay execution
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Wait for condition to be true
 */
export async function waitFor(
  condition: () => boolean,
  maxWaitMs: number = 5000,
  checkIntervalMs: number = 100,
): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    if (condition()) {
      return true;
    }

    await delay(checkIntervalMs);
  }

  return false;
}

/**
 * Timeout a promise
 */
export function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs),
    ),
  ]);
}

/**
 * Execute multiple async operations in parallel with concurrency limit
 */
export async function executeWithConcurrency<T>(
  operations: (() => Promise<T>)[],
  concurrency: number = 3,
): Promise<T[]> {
  const results: T[] = [];
  const executing: Promise<void>[] = [];

  for (const operation of operations) {
    const promise = Promise.resolve().then(async () => {
      const result = await operation();
      results.push(result);
    });

    executing.push(promise);

    if (executing.length >= concurrency) {
      await Promise.race(executing);
      executing.splice(
        executing.findIndex((p) => p === promise),
        1,
      );
    }
  }

  await Promise.all(executing);
  return results;
}

/**
 * Batch operations into groups
 */
export async function batch<T, R>(
  items: T[],
  batchSize: number,
  processor: (batch: T[]) => Promise<R[]>,
): Promise<R[]> {
  const results: R[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await processor(batch);
    results.push(...batchResults);
  }

  return results;
}

/**
 * Retry async operation with exponential backoff
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxAttempts: number = 3,
  initialDelayMs: number = 1000,
  maxDelayMs: number = 10000,
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      logger.warn(`Attempt ${attempt}/${maxAttempts} failed:`, lastError?.message);

      if (attempt < maxAttempts) {
        const delayMs = Math.min(initialDelayMs * Math.pow(2, attempt - 1), maxDelayMs);
        await delay(delayMs);
      }
    }
  }

  throw lastError || new Error('Operation failed after retries');
}

/**
 * Execute operation with fallback
 */
export async function withFallback<T>(
  primary: () => Promise<T>,
  fallback: () => Promise<T> | T,
): Promise<T> {
  try {
    return await primary();
  } catch (error) {
    logger.warn('Primary operation failed, using fallback:', error);
    return await Promise.resolve(fallback());
  }
}

/**
 * Create a promise that resolves after all pending microtasks
 */
export function flushMicrotasks(): Promise<void> {
  return Promise.resolve();
}

/**
 * Execute function and measure execution time
 */
export async function measurePerformance<T>(
  operation: () => Promise<T>,
  label: string = 'Operation',
): Promise<{ result: T; durationMs: number }> {
  const startTime = performance.now();
  const result = await operation();
  const durationMs = performance.now() - startTime;

  logger.info(`${label} completed in ${durationMs.toFixed(2)}ms`);

  return { result, durationMs };
}

/**
 * Create a pool of reusable resources
 */
export class ResourcePool<T> {
  private available: T[] = [];
  private inUse: Set<T> = new Set();
  private factory: () => T | Promise<T>;
  private maxSize: number;

  constructor(factory: () => T | Promise<T>, maxSize: number = 10) {
    this.factory = factory;
    this.maxSize = maxSize;
  }

  async acquire(): Promise<T> {
    if (this.available.length > 0) {
      const resource = this.available.pop()!;
      this.inUse.add(resource);
      return resource;
    }

    if (this.inUse.size < this.maxSize) {
      const resource = await Promise.resolve(this.factory());
      this.inUse.add(resource);
      return resource;
    }

    throw new Error('Resource pool exhausted');
  }

  release(resource: T): void {
    this.inUse.delete(resource);
    this.available.push(resource);
  }

  clear(): void {
    this.available = [];
    this.inUse.clear();
  }

  getStats() {
    return {
      available: this.available.length,
      inUse: this.inUse.size,
      maxSize: this.maxSize,
    };
  }
}
