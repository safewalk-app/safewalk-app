/**
 * Standardized error codes for SafeWalk Edge Functions
 * Used consistently across all functions for client-side handling
 */

export const ERROR_CODES = {
  // Authentication errors
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  
  // Validation errors
  PHONE_NOT_VERIFIED: 'phone_not_verified',
  INVALID_PHONE: 'invalid_phone',
  MISSING_CONTACT: 'missing_contact',
  
  // Credit/Quota errors
  NO_CREDITS: 'no_credits',
  QUOTA_REACHED: 'quota_reached',
  
  // Twilio errors
  TWILIO_FAILED: 'twilio_failed',
  TWILIO_INVALID_PHONE: 'twilio_invalid_phone',
  
  // Configuration errors
  CONFIG_ERROR: 'CONFIG_ERROR',
  
  // Generic errors
  FUNCTION_ERROR: 'FUNCTION_ERROR',
  EXCEPTION: 'EXCEPTION',
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];

export interface ErrorResponse {
  success: false;
  error: string;
  errorCode: ErrorCode;
  status?: number;
}

export interface SuccessResponse<T> {
  success: true;
  data?: T;
}

export function createErrorResponse(
  error: string,
  errorCode: ErrorCode,
  status: number = 400
): [ErrorResponse, number] {
  return [
    {
      success: false,
      error,
      errorCode,
      status,
    },
    status,
  ];
}

export function createSuccessResponse<T>(data?: T): SuccessResponse<T> {
  return {
    success: true,
    data,
  };
}
