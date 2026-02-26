/**
 * Retry helper for API calls with exponential backoff
 * Reusable across all Edge Functions for consistent error handling
 */

export interface RetryOptions {
  maxRetries?: number; // Default: 3
  initialDelayMs?: number; // Default: 1000ms
  maxDelayMs?: number; // Default: 30000ms
  backoffMultiplier?: number; // Default: 2
  jitterFactor?: number; // Default: 0.1 (10%)
  shouldRetry?: (error: Error, attempt: number) => boolean; // Custom retry logic
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
 * @param attempt Attempt number (0-based)
 * @param options Retry options
 * @returns Delay in milliseconds
 */
export function calculateBackoffDelay(
  attempt: number,
  options: RetryOptions = {}
): number {
  const {
    initialDelayMs = 1000,
    maxDelayMs = 30000,
    backoffMultiplier = 2,
    jitterFactor = 0.1,
  } = options;

  // Exponential backoff: initialDelay * multiplier^attempt
  const exponentialDelay = initialDelayMs * Math.pow(backoffMultiplier, attempt);
  
  // Cap at maxDelay
  const cappedDelay = Math.min(exponentialDelay, maxDelayMs);
  
  // Add jitter (±jitterFactor) to prevent thundering herd
  const jitter = cappedDelay * jitterFactor * (Math.random() * 2 - 1);
  
  return Math.max(100, cappedDelay + jitter);
}

/**
 * Sleep utility for delays
 * @param ms Milliseconds to sleep
 */
export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if error is retryable (network/temporary errors)
 * @param error Error object
 * @returns true if error is temporary and should be retried
 */
export function isTemporaryError(error: Error): boolean {
  const message = error.message.toLowerCase();
  
  // Network errors
  if (message.includes('network') || message.includes('econnrefused')) return true;
  if (message.includes('timeout') || message.includes('etimedout')) return true;
  if (message.includes('econnreset')) return true;
  if (message.includes('fetch failed')) return true;
  
  // Server errors (5xx)
  if (message.includes('500') || message.includes('502') || message.includes('503')) return true;
  if (message.includes('429')) return true; // Rate limited
  
  return false;
}

/**
 * Retry a function with exponential backoff
 * @param fn Function to retry
 * @param options Retry options
 * @returns RetryResult with data or error
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<RetryResult<T>> {
  const {
    maxRetries = 3,
    shouldRetry = isTemporaryError,
  } = options;

  let lastError: Error | null = null;
  let totalDurationMs = 0;
  const startTime = Date.now();

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const data = await fn();
      totalDurationMs = Date.now() - startTime;
      
      return {
        success: true,
        data,
        retryCount: attempt,
        totalDurationMs,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if we should retry
      const shouldContinue = attempt < maxRetries && shouldRetry(lastError, attempt);
      
      if (!shouldContinue) {
        totalDurationMs = Date.now() - startTime;
        return {
          success: false,
          error: lastError,
          retryCount: attempt,
          totalDurationMs,
        };
      }

      // Calculate delay and retry
      const delayMs = calculateBackoffDelay(attempt, options);
      console.warn(
        `[Retry] Attempt ${attempt + 1}/${maxRetries + 1} failed, retrying in ${delayMs}ms: ${lastError.message}`
      );
      await sleep(delayMs);
    }
  }

  totalDurationMs = Date.now() - startTime;
  return {
    success: false,
    error: lastError || new Error('Unknown error'),
    retryCount: maxRetries,
    totalDurationMs,
  };
}

/**
 * Retry a function with custom error handling
 * @param fn Function to retry
 * @param isRetryableError Custom function to determine if error is retryable
 * @param options Retry options
 * @returns RetryResult with data or error
 */
export async function retryWithCustomLogic<T>(
  fn: () => Promise<T>,
  isRetryableError: (error: Error, attempt: number) => boolean,
  options: RetryOptions = {}
): Promise<RetryResult<T>> {
  return retryWithBackoff(fn, {
    ...options,
    shouldRetry: isRetryableError,
  });
}

/**
 * Retry a fetch request with exponential backoff
 * @param url URL to fetch
 * @param options Fetch options + retry options
 * @returns Response or throws error
 */
export async function retryFetch(
  url: string,
  options: RequestInit & RetryOptions = {}
): Promise<Response> {
  const {
    maxRetries,
    initialDelayMs,
    maxDelayMs,
    backoffMultiplier,
    jitterFactor,
    shouldRetry,
    ...fetchOptions
  } = options;

  const retryOptions: RetryOptions = {
    maxRetries,
    initialDelayMs,
    maxDelayMs,
    backoffMultiplier,
    jitterFactor,
    shouldRetry,
  };

  const result = await retryWithBackoff(
    () => fetch(url, fetchOptions),
    retryOptions
  );

  if (!result.success) {
    throw result.error;
  }

  return result.data!;
}

/**
 * Retry a function with exponential backoff (simple version)
 * @param fn Function to retry
 * @param maxRetries Maximum number of retries
 * @returns Data or throws error
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  const result = await retryWithBackoff(fn, { maxRetries });
  
  if (!result.success) {
    throw result.error;
  }

  return result.data!;
}
