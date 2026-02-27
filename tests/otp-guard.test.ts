import { describe, it, expect, beforeEach } from 'vitest';
import { otpGuard } from '../lib/services/otp-guard';

describe('OTP Guard Service', () => {
  beforeEach(() => {
    otpGuard.clear();
  });

  describe('shouldRequireOtp', () => {
    it('should require OTP when not verified', () => {
      expect(otpGuard.shouldRequireOtp()).toBe(true);
    });

    it('should not require OTP when verified', () => {
      otpGuard.markAsVerified('+33763458273');
      expect(otpGuard.shouldRequireOtp()).toBe(false);
    });

    it('should require OTP after 24 hours', () => {
      const now = Date.now();
      otpGuard.markAsVerified('+33763458273');

      // Mock time to 25 hours later
      const state = otpGuard.getState();
      otpGuard.restoreState({
        ...state,
        verifiedAt: now - 25 * 60 * 60 * 1000,
      });

      expect(otpGuard.shouldRequireOtp()).toBe(true);
    });
  });

  describe('markAsVerified', () => {
    it('should mark user as verified', () => {
      otpGuard.markAsVerified('+33763458273');
      const state = otpGuard.getState();

      expect(state.isVerified).toBe(true);
      expect(state.verifiedPhoneNumber).toBe('+33763458273');
      expect(state.verifiedAt).toBeDefined();
    });
  });

  describe('getState', () => {
    it('should return current state', () => {
      otpGuard.markAsVerified('+33763458273');
      const state = otpGuard.getState();

      expect(state.isVerified).toBe(true);
      expect(state.verifiedPhoneNumber).toBe('+33763458273');
      expect(state.verifiedAt).toBeGreaterThan(0);
    });

    it('should return default state when not verified', () => {
      const state = otpGuard.getState();

      expect(state.isVerified).toBe(false);
      expect(state.verifiedPhoneNumber).toBeNull();
      expect(state.verifiedAt).toBeNull();
    });
  });

  describe('clear', () => {
    it('should clear verification state', () => {
      otpGuard.markAsVerified('+33763458273');
      otpGuard.clear();

      const state = otpGuard.getState();
      expect(state.isVerified).toBe(false);
      expect(state.verifiedPhoneNumber).toBeNull();
      expect(state.verifiedAt).toBeNull();
    });
  });

  describe('restoreState', () => {
    it('should restore state from persisted data', () => {
      const persistedState = {
        isVerified: true,
        verifiedPhoneNumber: '+33763458273',
        verifiedAt: Date.now(),
      };

      otpGuard.restoreState(persistedState);
      const state = otpGuard.getState();

      expect(state.isVerified).toBe(true);
      expect(state.verifiedPhoneNumber).toBe('+33763458273');
      expect(state.verifiedAt).toBe(persistedState.verifiedAt);
    });
  });
});
