/**
 * Helper for retrying API calls with exponential backoff
 * Used for critical trip operations (start, checkin, extend, sos)
 */

import { logger } from '@/lib/logger';

export interface RetryOptions {
  maxRetries?: number; // Default: 3
  initialDelayMs?: number; // Default: 1000ms
  backoffMultiplier?: number; // Default: 2
  jitterFactor?: number; // Default: 0.1 (10%)
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  retryCount: number;
  totalDurationMs: number;
}

/**
 * Calculate exponential backoff delay with jitter
 */
export function calculateBackoffDelay(attempt: number, options: RetryOptions = {}): number {
  const { initialDelayMs = 1000, backoffMultiplier = 2, jitterFactor = 0.1 } = options;

  // Exponential backoff: initialDelay * multiplier^attempt
  const exponentialDelay = initialDelayMs * Math.pow(backoffMultiplier, attempt);

  // Add jitter (±jitterFactor) to prevent thundering herd
  const jitter = exponentialDelay * jitterFactor * (Math.random() * 2 - 1);

  return Math.max(100, exponentialDelay + jitter);
}

/**
 * Sleep utility
 */
export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if error is retryable (network/temporary errors)
 */
export function isTemporaryError(error: any): boolean {
  // Network errors
  if (error?.message?.includes('network')) return true;
  if (error?.message?.includes('timeout')) return true;
  if (error?.message?.includes('ECONNREFUSED')) return true;
  if (error?.message?.includes('ECONNRESET')) return true;
  if (error?.message?.includes('fetch failed')) return true;

  // Server errors (5xx)
  if (error?.status >= 500) return true;

  // Rate limit (429) - retry with backoff
  if (error?.status === 429) return true;

  // Request timeout (408)
  if (error?.status === 408) return true;

  // Service unavailable (503)
  if (error?.status === 503) return true;

  return false;
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions & { shouldRetry?: (error: any) => boolean } = {},
): Promise<RetryResult<T>> {
  const { maxRetries = 3, shouldRetry = isTemporaryError } = options;

  let lastError: Error | null = null;
  const startTime = Date.now();

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const data = await fn();
      const totalDurationMs = Date.now() - startTime;

      return {
        success: true,
        data,
        retryCount: attempt,
        totalDurationMs,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if we should retry
      const shouldContinue = attempt < maxRetries && shouldRetry(error);

      if (!shouldContinue) {
        const totalDurationMs = Date.now() - startTime;
        logger.warn(`[API Retry] Failed after ${attempt} attempts: ${lastError.message}`);
        return {
          success: false,
          error: lastError,
          retryCount: attempt,
          totalDurationMs,
        };
      }

      // Calculate delay and retry
      const delayMs = calculateBackoffDelay(attempt, options);
      logger.warn(
        `[API Retry] Attempt ${attempt + 1}/${maxRetries + 1} failed, retrying in ${delayMs}ms: ${lastError.message}`,
      );
      await sleep(delayMs);
    }
  }

  const totalDurationMs = Date.now() - startTime;
  return {
    success: false,
    error: lastError || new Error('Unknown error'),
    retryCount: maxRetries,
    totalDurationMs,
  };
}

/**
 * Retry an async function with exponential backoff (simple version)
 */
export async function retry<T>(fn: () => Promise<T>, maxRetries: number = 3): Promise<T> {
  const result = await retryWithBackoff(fn, { maxRetries });

  if (!result.success) {
    throw result.error;
  }

  return result.data!;
}
