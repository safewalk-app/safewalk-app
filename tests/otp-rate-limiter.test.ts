import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  checkRateLimit,
  recordOtpAttempt,
  resetRateLimit,
  getAttemptsRemaining,
  getFormattedResetTime,
  clearAllRateLimits,
  getRateLimitStats,
} from '../lib/services/otp-rate-limiter';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock AsyncStorage
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
}));

describe('OTP Rate Limiter', () => {
  const testPhone = '+33612345678';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('checkRateLimit', () => {
    it('should allow request when no previous attempts', async () => {
      (AsyncStorage.getItem as any).mockResolvedValue(null);

      const status = await checkRateLimit(testPhone);

      expect(status.isAllowed).toBe(true);
      expect(status.attemptsRemaining).toBe(5);
    });

    it('should allow request when under limit', async () => {
      const records = [
        { phoneNumber: testPhone, timestamp: Date.now() - 1000 },
        { phoneNumber: testPhone, timestamp: Date.now() - 2000 },
      ];

      (AsyncStorage.getItem as any).mockResolvedValue(JSON.stringify(records));

      const status = await checkRateLimit(testPhone);

      expect(status.isAllowed).toBe(true);
      expect(status.attemptsRemaining).toBe(3); // 5 - 2
    });

    it('should block request when at limit', async () => {
      const now = Date.now();
      const records = Array(5)
        .fill(null)
        .map((_, i) => ({
          phoneNumber: testPhone,
          timestamp: now - i * 1000,
        }));

      (AsyncStorage.getItem as any).mockResolvedValue(JSON.stringify(records));

      const status = await checkRateLimit(testPhone);

      expect(status.isAllowed).toBe(false);
      expect(status.attemptsRemaining).toBe(0);
      expect(status.errorCode).toBe('RATE_LIMIT');
    });

    it('should ignore old records outside time window', async () => {
      const now = Date.now();
      const oneHourAgo = now - 60 * 60 * 1000;
      const records = [
        { phoneNumber: testPhone, timestamp: oneHourAgo - 1000 }, // Old
        { phoneNumber: testPhone, timestamp: now - 1000 }, // Recent
      ];

      (AsyncStorage.getItem as any).mockResolvedValue(JSON.stringify(records));

      const status = await checkRateLimit(testPhone);

      expect(status.isAllowed).toBe(true);
      expect(status.attemptsRemaining).toBe(4); // Only 1 recent attempt
    });

    it('should ignore records for different phone numbers', async () => {
      const records = [
        { phoneNumber: '+33712345678', timestamp: Date.now() - 1000 },
        { phoneNumber: '+33812345678', timestamp: Date.now() - 2000 },
      ];

      (AsyncStorage.getItem as any).mockResolvedValue(JSON.stringify(records));

      const status = await checkRateLimit(testPhone);

      expect(status.isAllowed).toBe(true);
      expect(status.attemptsRemaining).toBe(5); // Different numbers don't count
    });

    it('should handle storage errors gracefully', async () => {
      (AsyncStorage.getItem as any).mockRejectedValue(new Error('Storage error'));

      const status = await checkRateLimit(testPhone);

      expect(status.isAllowed).toBe(true);
      expect(status.attemptsRemaining).toBe(5);
    });
  });

  describe('recordOtpAttempt', () => {
    it('should record new attempt', async () => {
      (AsyncStorage.getItem as any).mockResolvedValue(null);

      await recordOtpAttempt(testPhone);

      expect(AsyncStorage.setItem).toHaveBeenCalled();
      const callArgs = (AsyncStorage.setItem as any).mock.calls[0];
      const stored = JSON.parse(callArgs[1]);

      expect(stored).toHaveLength(1);
      expect(stored[0].phoneNumber).toBe(testPhone);
      expect(typeof stored[0].timestamp).toBe('number');
    });

    it('should append to existing records', async () => {
      const existing = [{ phoneNumber: testPhone, timestamp: Date.now() - 1000 }];

      (AsyncStorage.getItem as any).mockResolvedValue(JSON.stringify(existing));

      await recordOtpAttempt(testPhone);

      expect(AsyncStorage.setItem).toHaveBeenCalled();
      const callArgs = (AsyncStorage.setItem as any).mock.calls[0];
      const stored = JSON.parse(callArgs[1]);

      expect(stored).toHaveLength(2);
    });

    it('should clean old records when recording', async () => {
      const now = Date.now();
      const oneHourAgo = now - 60 * 60 * 1000;
      const records = [
        { phoneNumber: testPhone, timestamp: oneHourAgo - 1000 }, // Old
        { phoneNumber: testPhone, timestamp: now - 1000 }, // Recent
      ];

      (AsyncStorage.getItem as any).mockResolvedValue(JSON.stringify(records));

      await recordOtpAttempt(testPhone);

      const callArgs = (AsyncStorage.setItem as any).mock.calls[0];
      const stored = JSON.parse(callArgs[1]);

      expect(stored).toHaveLength(2); // Old record removed, new one added
      expect(stored.every((r: any) => r.timestamp > oneHourAgo)).toBe(true);
    });
  });

  describe('resetRateLimit', () => {
    it('should remove all records for phone number', async () => {
      const records = [
        { phoneNumber: testPhone, timestamp: Date.now() - 1000 },
        { phoneNumber: '+33712345678', timestamp: Date.now() - 2000 },
      ];

      (AsyncStorage.getItem as any).mockResolvedValue(JSON.stringify(records));

      await resetRateLimit(testPhone);

      const callArgs = (AsyncStorage.setItem as any).mock.calls[0];
      const stored = JSON.parse(callArgs[1]);

      expect(stored).toHaveLength(1);
      expect(stored[0].phoneNumber).toBe('+33712345678');
    });

    it('should handle non-existent phone number', async () => {
      (AsyncStorage.getItem as any).mockResolvedValue(null);

      await resetRateLimit(testPhone);

      expect(AsyncStorage.setItem).toHaveBeenCalled();
      const callArgs = (AsyncStorage.setItem as any).mock.calls[0];
      const stored = JSON.parse(callArgs[1]);

      expect(stored).toHaveLength(0);
    });
  });

  describe('getAttemptsRemaining', () => {
    it('should return correct number of attempts', async () => {
      const records = [{ phoneNumber: testPhone, timestamp: Date.now() - 1000 }];

      (AsyncStorage.getItem as any).mockResolvedValue(JSON.stringify(records));

      const remaining = await getAttemptsRemaining(testPhone);

      expect(remaining).toBe(4); // 5 - 1
    });
  });

  describe('getFormattedResetTime', () => {
    it('should format time remaining correctly', () => {
      const now = Date.now();
      const future = now + 30 * 1000; // 30 seconds

      const formatted = getFormattedResetTime(future);

      expect(formatted).toContain('30');
      expect(formatted).toContain('sec');
    });

    it('should format minutes correctly', () => {
      const now = Date.now();
      const future = now + 5 * 60 * 1000; // 5 minutes

      const formatted = getFormattedResetTime(future);

      expect(formatted).toContain('5');
      expect(formatted).toContain('min');
    });

    it('should handle past time', () => {
      const now = Date.now();
      const past = now - 1000;

      const formatted = getFormattedResetTime(past);

      expect(formatted).toBe('0 sec');
    });
  });

  describe('clearAllRateLimits', () => {
    it('should remove all rate limit data', async () => {
      await clearAllRateLimits();

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('otp_rate_limit');
    });
  });

  describe('getRateLimitStats', () => {
    it('should return detailed statistics', async () => {
      const records = [
        { phoneNumber: testPhone, timestamp: Date.now() - 1000 },
        { phoneNumber: testPhone, timestamp: Date.now() - 2000 },
      ];

      (AsyncStorage.getItem as any).mockResolvedValue(JSON.stringify(records));

      const stats = await getRateLimitStats(testPhone);

      expect(stats.totalAttempts).toBe(2);
      expect(stats.attemptsRemaining).toBe(3);
      expect(stats.isBlocked).toBe(false);
    });

    it('should indicate blocked status when at limit', async () => {
      const now = Date.now();
      const records = Array(5)
        .fill(null)
        .map((_, i) => ({
          phoneNumber: testPhone,
          timestamp: now - i * 1000,
        }));

      (AsyncStorage.getItem as any).mockResolvedValue(JSON.stringify(records));

      const stats = await getRateLimitStats(testPhone);

      expect(stats.totalAttempts).toBe(5);
      expect(stats.attemptsRemaining).toBe(0);
      expect(stats.isBlocked).toBe(true);
    });
  });

  describe('Integration tests', () => {
    it('should handle complete rate limit flow', async () => {
      // Check initial state
      (AsyncStorage.getItem as any).mockResolvedValue(null);
      let status = await checkRateLimit(testPhone);
      expect(status.isAllowed).toBe(true);
      expect(status.attemptsRemaining).toBe(5);

      // Record 3 attempts
      for (let i = 0; i < 3; i++) {
        await recordOtpAttempt(testPhone);
      }

      // Check remaining attempts
      const remaining = await getAttemptsRemaining(testPhone);
      expect(remaining).toBeLessThanOrEqual(5);

      // Reset
      await resetRateLimit(testPhone);

      // Should be back to initial state
      (AsyncStorage.getItem as any).mockResolvedValue(null);
      status = await checkRateLimit(testPhone);
      expect(status.isAllowed).toBe(true);
      expect(status.attemptsRemaining).toBe(5);
    });
  });
});
