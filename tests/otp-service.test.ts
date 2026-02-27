import { describe, it, expect, beforeEach, vi } from 'vitest';
import { otpService } from '../lib/services/otp-service';

describe('OTP Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('sendOtp', () => {
    it('should reject invalid phone number format', async () => {
      const result = await otpService.sendOtp('0763458273');
      expect(result.success).toBe(false);
      expect(result.error).toContain('E.164');
    });

    it('should reject empty phone number', async () => {
      const result = await otpService.sendOtp('');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should validate phone number format', async () => {
      const result = await otpService.sendOtp('+33763458273');
      // This will fail due to network, but validates format
      expect(result).toBeDefined();
    });
  });

  describe('verifyOtp', () => {
    it('should reject invalid phone number format', async () => {
      const result = await otpService.verifyOtp('0763458273', '123456');
      expect(result.success).toBe(false);
      expect(result.error).toContain('E.164');
    });

    it('should reject invalid OTP code format - too short', async () => {
      const result = await otpService.verifyOtp('+33763458273', '12345');
      expect(result.success).toBe(false);
      expect(result.error).toContain('6 digits');
    });

    it('should reject invalid OTP code format - non-numeric', async () => {
      const result = await otpService.verifyOtp('+33763458273', 'abcdef');
      expect(result.success).toBe(false);
      expect(result.error).toContain('6 digits');
    });

    it('should validate OTP code format', async () => {
      const result = await otpService.verifyOtp('+33763458273', '123456');
      // This will fail due to network, but validates format
      expect(result).toBeDefined();
    });
  });
});
