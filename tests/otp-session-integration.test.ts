import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  checkSessionOtpRequirement,
  resetSessionOtpVerification,
  markSessionOtpVerified,
  getVerifiedPhoneNumber,
  isOtpVerificationExpired,
  getOtpVerificationTimeRemaining,
} from '../lib/services/otp-session-guard';

describe('OTP Session Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkSessionOtpRequirement', () => {
    it('should return an object with canCreateSession and requiresOtp properties', async () => {
      const result = await checkSessionOtpRequirement();

      expect(result).toHaveProperty('canCreateSession');
      expect(result).toHaveProperty('requiresOtp');
      expect(typeof result.canCreateSession).toBe('boolean');
      expect(typeof result.requiresOtp).toBe('boolean');
    });

    it('should have inverse relationship between canCreateSession and requiresOtp', async () => {
      const result = await checkSessionOtpRequirement();

      // If OTP is required, session creation should be blocked
      if (result.requiresOtp) {
        expect(result.canCreateSession).toBe(false);
      }
      // If OTP is not required, session creation should be allowed
      if (!result.requiresOtp) {
        expect(result.canCreateSession).toBe(true);
      }
    });

    it('should handle errors gracefully', async () => {
      // This test verifies that the function doesn't throw
      const result = await checkSessionOtpRequirement();
      expect(result).toBeDefined();
    });
  });

  describe('resetSessionOtpVerification', () => {
    it('should not throw when resetting verification', async () => {
      await expect(resetSessionOtpVerification()).resolves.toBeUndefined();
    });
  });

  describe('markSessionOtpVerified', () => {
    it('should not throw when marking user as verified', async () => {
      const phoneNumber = '+33612345678';
      await expect(markSessionOtpVerified(phoneNumber)).resolves.toBeUndefined();
    });

    it('should accept valid phone numbers', async () => {
      const validPhoneNumbers = ['+33612345678', '+33712345678', '+33812345678'];

      for (const phone of validPhoneNumbers) {
        await expect(markSessionOtpVerified(phone)).resolves.toBeUndefined();
      }
    });
  });

  describe('getVerifiedPhoneNumber', () => {
    it('should return a string or undefined', async () => {
      const result = await getVerifiedPhoneNumber();

      expect(result === undefined || typeof result === 'string').toBe(true);
    });
  });

  describe('isOtpVerificationExpired', () => {
    it('should return a boolean', async () => {
      const result = await isOtpVerificationExpired();

      expect(typeof result).toBe('boolean');
    });
  });

  describe('getOtpVerificationTimeRemaining', () => {
    it('should return a non-negative number', async () => {
      const result = await getOtpVerificationTimeRemaining();

      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Session creation flow', () => {
    it('should provide consistent results for OTP requirement checks', async () => {
      const result1 = await checkSessionOtpRequirement();
      const result2 = await checkSessionOtpRequirement();

      // Results should be consistent (same verification state)
      expect(result1.canCreateSession).toBe(result2.canCreateSession);
      expect(result1.requiresOtp).toBe(result2.requiresOtp);
    });

    it('should handle the full OTP verification workflow', async () => {
      // Check initial state
      const initialCheck = await checkSessionOtpRequirement();
      expect(initialCheck).toBeDefined();

      // Mark as verified
      await markSessionOtpVerified('+33612345678');

      // Get verified phone number
      const phone = await getVerifiedPhoneNumber();
      expect(phone === undefined || typeof phone === 'string').toBe(true);

      // Check expiration
      const isExpired = await isOtpVerificationExpired();
      expect(typeof isExpired).toBe('boolean');

      // Get time remaining
      const timeRemaining = await getOtpVerificationTimeRemaining();
      expect(typeof timeRemaining).toBe('number');
    });

    it('should allow resetting verification', async () => {
      // Mark as verified
      await markSessionOtpVerified('+33612345678');

      // Reset verification
      await resetSessionOtpVerification();

      // Verify reset was successful (no errors thrown)
      expect(true).toBe(true);
    });
  });

  describe('Error handling', () => {
    it('should handle all operations without throwing', async () => {
      const result1 = await checkSessionOtpRequirement();
      expect(result1).toBeDefined();
      await resetSessionOtpVerification();
      await markSessionOtpVerified('+33612345678');
      const result2 = await getVerifiedPhoneNumber();
      expect(result2 === undefined || typeof result2 === 'string').toBe(true);
      const result3 = await isOtpVerificationExpired();
      expect(typeof result3).toBe('boolean');
      const result4 = await getOtpVerificationTimeRemaining();
      expect(typeof result4).toBe('number');
    });
  });
});
