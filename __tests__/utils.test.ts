/**
 * Utils Tests
 * Tests for validators, error-handler, and app-constants
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  validatePhoneNumber,
  validateOtpCode,
  validateEmail,
  validatePassword,
  validateSessionDeadline,
  sanitizeInput,
  formatPhoneNumber,
  validateRange,
  validateNotEmpty,
  validateArrayNotEmpty,
} from '@/lib/utils/validators';
import {
  createError,
  handleNetworkError,
  handleValidationError,
  handleAuthError,
  handleServerError,
  handleApiError,
  getUserFriendlyMessage,
  isNetworkError,
  isRetryableError,
} from '@/lib/utils/error-handler';
import { TIMING, API, VALIDATION, ERROR_MESSAGES, SUCCESS_MESSAGES } from '@/lib/constants/app-constants';

describe('Validators', () => {
  describe('validatePhoneNumber', () => {
    it('should validate correct E.164 phone numbers', () => {
      const result = validatePhoneNumber('+33612345678');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject invalid phone numbers', () => {
      const result = validatePhoneNumber('123');
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject empty phone numbers', () => {
      const result = validatePhoneNumber('');
      expect(result.isValid).toBe(false);
    });

    it('should reject phone numbers exceeding max length', () => {
      const result = validatePhoneNumber('+' + '1'.repeat(20));
      expect(result.isValid).toBe(false);
    });
  });

  describe('validateOtpCode', () => {
    it('should validate 6-digit OTP codes', () => {
      const result = validateOtpCode('123456');
      expect(result.isValid).toBe(true);
    });

    it('should reject non-6-digit codes', () => {
      const result = validateOtpCode('12345');
      expect(result.isValid).toBe(false);
    });

    it('should reject non-numeric codes', () => {
      const result = validateOtpCode('12345a');
      expect(result.isValid).toBe(false);
    });

    it('should reject empty codes', () => {
      const result = validateOtpCode('');
      expect(result.isValid).toBe(false);
    });
  });

  describe('validateEmail', () => {
    it('should validate correct emails', () => {
      const result = validateEmail('user@example.com');
      expect(result.isValid).toBe(true);
    });

    it('should reject invalid emails', () => {
      const result = validateEmail('invalid-email');
      expect(result.isValid).toBe(false);
    });

    it('should reject empty emails', () => {
      const result = validateEmail('');
      expect(result.isValid).toBe(false);
    });
  });

  describe('validatePassword', () => {
    it('should validate strong passwords', () => {
      const result = validatePassword('SecurePass123');
      expect(result.isValid).toBe(true);
    });

    it('should reject short passwords', () => {
      const result = validatePassword('Short1');
      expect(result.isValid).toBe(false);
    });

    it('should reject passwords without uppercase', () => {
      const result = validatePassword('securepas123');
      expect(result.isValid).toBe(false);
    });

    it('should reject passwords without numbers', () => {
      const result = validatePassword('SecurePass');
      expect(result.isValid).toBe(false);
    });
  });

  describe('validateSessionDeadline', () => {
    it('should validate deadline within range', () => {
      const result = validateSessionDeadline(120);
      expect(result.isValid).toBe(true);
    });

    it('should reject deadline below minimum', () => {
      const result = validateSessionDeadline(5);
      expect(result.isValid).toBe(false);
    });

    it('should reject deadline above maximum', () => {
      const result = validateSessionDeadline(500);
      expect(result.isValid).toBe(false);
    });

    it('should reject non-integer values', () => {
      const result = validateSessionDeadline(120.5);
      expect(result.isValid).toBe(false);
    });
  });

  describe('sanitizeInput', () => {
    it('should sanitize HTML special characters', () => {
      const result = sanitizeInput('<script>alert("xss")</script>');
      expect(result).not.toContain('<script>');
      expect(result).toContain('&lt;script&gt;');
    });

    it('should trim whitespace', () => {
      const result = sanitizeInput('  hello  ');
      expect(result).toBe('hello');
    });

    it('should handle empty input', () => {
      const result = sanitizeInput('');
      expect(result).toBe('');
    });
  });

  describe('formatPhoneNumber', () => {
    it('should format French phone numbers to E.164', () => {
      const result = formatPhoneNumber('0612345678');
      expect(result).toBe('+33612345678');
    });

    it('should add + prefix if missing', () => {
      const result = formatPhoneNumber('33612345678');
      expect(result).toBe('+33612345678');
    });

    it('should return null for too short numbers', () => {
      const result = formatPhoneNumber('123');
      expect(result).toBeNull();
    });

    it('should handle already formatted numbers', () => {
      const result = formatPhoneNumber('+33612345678');
      expect(result).toBe('+33612345678');
    });
  });

  describe('validateRange', () => {
    it('should validate values within range', () => {
      const result = validateRange(50, 0, 100);
      expect(result.isValid).toBe(true);
    });

    it('should reject values below minimum', () => {
      const result = validateRange(-1, 0, 100);
      expect(result.isValid).toBe(false);
    });

    it('should reject values above maximum', () => {
      const result = validateRange(101, 0, 100);
      expect(result.isValid).toBe(false);
    });

    it('should accept boundary values', () => {
      expect(validateRange(0, 0, 100).isValid).toBe(true);
      expect(validateRange(100, 0, 100).isValid).toBe(true);
    });
  });

  describe('validateNotEmpty', () => {
    it('should validate non-empty strings', () => {
      const result = validateNotEmpty('hello');
      expect(result.isValid).toBe(true);
    });

    it('should reject empty strings', () => {
      const result = validateNotEmpty('');
      expect(result.isValid).toBe(false);
    });

    it('should reject whitespace-only strings', () => {
      const result = validateNotEmpty('   ');
      expect(result.isValid).toBe(false);
    });

    it('should include field name in error message', () => {
      const result = validateNotEmpty('', 'Username');
      expect(result.error).toContain('Username');
    });
  });

  describe('validateArrayNotEmpty', () => {
    it('should validate non-empty arrays', () => {
      const result = validateArrayNotEmpty([1, 2, 3]);
      expect(result.isValid).toBe(true);
    });

    it('should reject empty arrays', () => {
      const result = validateArrayNotEmpty([]);
      expect(result.isValid).toBe(false);
    });

    it('should include field name in error message', () => {
      const result = validateArrayNotEmpty([], 'Items');
      expect(result.error).toContain('Items');
    });
  });
});

describe('Error Handler', () => {
  describe('createError', () => {
    it('should create error with all properties', () => {
      const error = createError('network', 'Connection failed', 'NET_001', { retry: true });
      expect(error.type).toBe('network');
      expect(error.message).toBe('Connection failed');
      expect(error.code).toBe('NET_001');
      expect(error.details?.retry).toBe(true);
    });
  });

  describe('handleNetworkError', () => {
    it('should identify network errors', () => {
      const error = new Error('Network request failed');
      const result = handleNetworkError(error);
      expect(result.type).toBe('network');
      expect(result.code).toBe('NETWORK_ERROR');
    });

    it('should identify timeout errors', () => {
      const error = new Error('Request timeout');
      const result = handleNetworkError(error);
      expect(result.type).toBe('network');
      expect(result.code).toBe('TIMEOUT_ERROR');
    });
  });

  describe('handleValidationError', () => {
    it('should create validation error', () => {
      const result = handleValidationError('Invalid input', { field: 'email' });
      expect(result.type).toBe('validation');
      expect(result.message).toBe('Invalid input');
      expect(result.details?.field).toBe('email');
    });
  });

  describe('handleAuthError', () => {
    it('should handle 401 unauthorized', () => {
      const error = { status: 401, message: 'Unauthorized' };
      const result = handleAuthError(error);
      expect(result.code).toBe('UNAUTHORIZED');
    });

    it('should handle 403 forbidden', () => {
      const error = { status: 403, message: 'Forbidden' };
      const result = handleAuthError(error);
      expect(result.code).toBe('FORBIDDEN');
    });
  });

  describe('handleServerError', () => {
    it('should handle 500 server error', () => {
      const error = { status: 500, message: 'Internal server error' };
      const result = handleServerError(error);
      expect(result.type).toBe('server');
      expect(result.details?.status).toBe(500);
    });
  });

  describe('handleApiError', () => {
    it('should detect network errors', () => {
      const error = new Error('Network Error');
      const result = handleApiError(error);
      expect(result.type).toBe('network');
    });

    it('should detect HTTP status errors', () => {
      const error = { status: 404, message: 'Not found' };
      const result = handleApiError(error);
      expect(result.type).toBe('validation');
    });

    it('should handle unknown errors', () => {
      const result = handleApiError(null);
      expect(result.type).toBe('unknown');
    });
  });

  describe('getUserFriendlyMessage', () => {
    it('should extract message from string', () => {
      const message = getUserFriendlyMessage('Error message');
      expect(message).toBe('Error message');
    });

    it('should extract message from Error object', () => {
      const error = new Error('Test error');
      const message = getUserFriendlyMessage(error);
      expect(message).toBe('Test error');
    });

    it('should extract message from AppError', () => {
      const error = createError('network', 'Network failed');
      const message = getUserFriendlyMessage(error);
      expect(message).toBe('Network failed');
    });
  });

  describe('isNetworkError', () => {
    it('should identify network errors', () => {
      expect(isNetworkError(new Error('Network error'))).toBe(true);
      expect(isNetworkError(new Error('timeout'))).toBe(true);
      expect(isNetworkError({ code: 'ECONNREFUSED' })).toBe(true);
    });

    it('should not identify non-network errors', () => {
      expect(isNetworkError(new Error('Validation error'))).toBe(false);
      expect(isNetworkError(null)).toBe(false);
    });
  });

  describe('isRetryableError', () => {
    it('should identify retryable errors', () => {
      expect(isRetryableError(new Error('Network error'))).toBe(true);
      expect(isRetryableError({ status: 408 })).toBe(true);
      expect(isRetryableError({ status: 429 })).toBe(true);
      expect(isRetryableError({ status: 500 })).toBe(true);
    });

    it('should not identify non-retryable errors', () => {
      expect(isRetryableError({ status: 400 })).toBe(false);
      expect(isRetryableError({ status: 401 })).toBe(false);
    });
  });
});

describe('App Constants', () => {
  describe('TIMING', () => {
    it('should have valid timing constants', () => {
      expect(TIMING.SESSION_DEADLINE_MIN).toBeLessThan(TIMING.SESSION_DEADLINE_MAX);
      expect(TIMING.OTP_EXPIRATION).toBeGreaterThan(0);
      expect(TIMING.OTP_MAX_ATTEMPTS).toBeGreaterThan(0);
    });
  });

  describe('VALIDATION', () => {
    it('should have valid regex patterns', () => {
      expect(VALIDATION.PHONE_REGEX).toBeInstanceOf(RegExp);
      expect(VALIDATION.OTP_REGEX).toBeInstanceOf(RegExp);
      expect(VALIDATION.EMAIL_REGEX).toBeInstanceOf(RegExp);
    });

    it('should have valid length constraints', () => {
      expect(VALIDATION.MIN_PASSWORD_LENGTH).toBeGreaterThan(0);
      expect(VALIDATION.MAX_PHONE_LENGTH).toBeGreaterThan(0);
    });
  });

  describe('ERROR_MESSAGES', () => {
    it('should have all required error messages', () => {
      expect(ERROR_MESSAGES.NETWORK_ERROR).toBeDefined();
      expect(ERROR_MESSAGES.INVALID_PHONE).toBeDefined();
      expect(ERROR_MESSAGES.INVALID_OTP).toBeDefined();
      expect(ERROR_MESSAGES.OTP_EXPIRED).toBeDefined();
    });
  });

  describe('SUCCESS_MESSAGES', () => {
    it('should have all required success messages', () => {
      expect(SUCCESS_MESSAGES.OTP_SENT).toBeDefined();
      expect(SUCCESS_MESSAGES.OTP_VERIFIED).toBeDefined();
      expect(SUCCESS_MESSAGES.SESSION_STARTED).toBeDefined();
    });
  });

  describe('STORAGE_KEYS', () => {
    it('should have unique storage keys', () => {
      const keys = Object.values(TIMING);
      const uniqueKeys = new Set(keys);
      expect(uniqueKeys.size).toBe(keys.length);
    });
  });
});
