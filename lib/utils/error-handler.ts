/**
 * Error Handler Utilities
 * Centralized error handling and logging
 */

import { logger } from '@/lib/logger';
import { ERROR_MESSAGES } from '@/lib/constants/app-constants';

export type ErrorType = 'network' | 'validation' | 'auth' | 'server' | 'unknown';

export interface AppError {
  type: ErrorType;
  message: string;
  code?: string;
  details?: Record<string, any>;
  originalError?: Error;
}

/**
 * Create a standardized app error
 */
export function createError(
  type: ErrorType,
  message: string,
  code?: string,
  details?: Record<string, any>,
  originalError?: Error,
): AppError {
  return {
    type,
    message,
    code,
    details,
    originalError,
  };
}

/**
 * Handle network errors
 */
export function handleNetworkError(error: any): AppError {
  logger.error('Network error:', error);

  if (error?.message?.includes('Network')) {
    return createError('network', ERROR_MESSAGES.NETWORK_ERROR, 'NETWORK_ERROR', {}, error);
  }

  if (error?.message?.includes('timeout')) {
    return createError('network', ERROR_MESSAGES.TIMEOUT_ERROR, 'TIMEOUT_ERROR', {}, error);
  }

  return createError('network', ERROR_MESSAGES.NETWORK_ERROR, 'UNKNOWN_NETWORK_ERROR', {}, error);
}

/**
 * Handle validation errors
 */
export function handleValidationError(message: string, details?: Record<string, any>): AppError {
  logger.warn('Validation error:', message, details);
  return createError('validation', message, 'VALIDATION_ERROR', details);
}

/**
 * Handle authentication errors
 */
export function handleAuthError(error: any): AppError {
  logger.error('Auth error:', error);

  if (error?.status === 401) {
    return createError('auth', 'Non authentifié.', 'UNAUTHORIZED', {}, error);
  }

  if (error?.status === 403) {
    return createError('auth', 'Accès refusé.', 'FORBIDDEN', {}, error);
  }

  return createError('auth', "Erreur d'authentification.", 'AUTH_ERROR', {}, error);
}

/**
 * Handle server errors
 */
export function handleServerError(error: any): AppError {
  logger.error('Server error:', error);

  const status = error?.status || error?.response?.status;
  const message = error?.message || error?.response?.data?.message || 'Erreur serveur.';

  return createError('server', message, `SERVER_ERROR_${status}`, { status }, error);
}

/**
 * Handle API errors with proper type detection
 */
export function handleApiError(error: any): AppError {
  if (!error) {
    return createError('unknown', 'Erreur inconnue.', 'UNKNOWN_ERROR');
  }

  // Network errors
  if (error?.message?.includes('Network') || error?.code === 'NETWORK_ERROR') {
    return handleNetworkError(error);
  }

  // Timeout errors
  if (error?.message?.includes('timeout') || error?.code === 'ECONNABORTED') {
    return createError('network', ERROR_MESSAGES.TIMEOUT_ERROR, 'TIMEOUT_ERROR', {}, error);
  }

  // HTTP status errors
  const status = error?.status || error?.response?.status;
  if (status) {
    if (status >= 400 && status < 500) {
      if (status === 401 || status === 403) {
        return handleAuthError(error);
      }
      return handleValidationError(error?.message || 'Erreur de requête.', { status });
    }

    if (status >= 500) {
      return handleServerError(error);
    }
  }

  // Unknown error
  logger.error('Unknown error:', error);
  return createError('unknown', "Une erreur s'est produite.", 'UNKNOWN_ERROR', {}, error);
}

/**
 * Get user-friendly error message
 */
export function getUserFriendlyMessage(error: AppError | Error | string): string {
  if (typeof error === 'string') {
    return error;
  }

  if (error instanceof Error) {
    return error.message;
  }

  if ('message' in error) {
    return error.message;
  }

  return "Une erreur s'est produite.";
}

/**
 * Log error with context
 */
export function logError(error: any, context: string, additionalData?: Record<string, any>): void {
  const appError = error instanceof AppError ? error : handleApiError(error);

  logger.error(`[${context}] ${appError.message}`, {
    type: appError.type,
    code: appError.code,
    details: appError.details,
    additionalData,
  });
}

/**
 * Retry logic for failed operations
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxAttempts: number = 3,
  delayMs: number = 1000,
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      logger.warn(`Attempt ${attempt}/${maxAttempts} failed:`, lastError?.message);

      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
      }
    }
  }

  throw lastError || new Error('Operation failed after retries');
}

/**
 * Safe async operation wrapper
 */
export async function safeAsync<T>(
  operation: () => Promise<T>,
  fallback?: T,
): Promise<{ success: boolean; data?: T; error?: AppError }> {
  try {
    const data = await operation();
    return { success: true, data };
  } catch (error) {
    const appError = handleApiError(error);
    logger.error('Safe async operation failed:', appError.message);
    return { success: false, error: appError, data: fallback };
  }
}

/**
 * Check if error is network-related
 */
export function isNetworkError(error: any): boolean {
  if (!error) return false;

  const message = error?.message?.toLowerCase() || '';
  const code = error?.code?.toLowerCase() || '';

  return (
    message.includes('network') ||
    message.includes('timeout') ||
    message.includes('connection') ||
    code.includes('network') ||
    code.includes('econnrefused') ||
    code.includes('econnaborted')
  );
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: any): boolean {
  if (isNetworkError(error)) return true;

  const status = error?.status || error?.response?.status;
  if (status === 408 || status === 429 || status >= 500) return true;

  return false;
}
