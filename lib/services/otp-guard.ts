import { logger } from '../logger';

/**
 * OTP Guard Service
 * Manages OTP verification before triggering alerts
 */

interface OtpGuardState {
  isVerified: boolean;
  verifiedPhoneNumber: string | null;
  verifiedAt: number | null;
}

class OtpGuardService {
  private state: OtpGuardState = {
    isVerified: false,
    verifiedPhoneNumber: null,
    verifiedAt: null,
  };

  /**
   * Check if user needs OTP verification
   * Returns true if user must verify before sending alerts
   */
  shouldRequireOtp(): boolean {
    // Always require OTP verification for first alert
    if (!this.state.isVerified) {
      logger.info('[OTP Guard] OTP verification required');
      return true;
    }

    // Check if verification is still valid (24 hours)
    if (this.state.verifiedAt) {
      const hoursElapsed = (Date.now() - this.state.verifiedAt) / (1000 * 60 * 60);
      if (hoursElapsed > 24) {
        logger.warn('[OTP Guard] OTP verification expired after 24 hours');
        this.state.isVerified = false;
        return true;
      }
    }

    return false;
  }

  /**
   * Mark user as verified
   */
  markAsVerified(phoneNumber: string) {
    this.state = {
      isVerified: true,
      verifiedPhoneNumber: phoneNumber,
      verifiedAt: Date.now(),
    };
    logger.info('[OTP Guard] User verified:', phoneNumber);
  }

  /**
   * Get current verification state
   */
  getState(): OtpGuardState {
    return { ...this.state };
  }

  /**
   * Clear verification (logout)
   */
  clear() {
    this.state = {
      isVerified: false,
      verifiedPhoneNumber: null,
      verifiedAt: null,
    };
    logger.info('[OTP Guard] Verification cleared');
  }

  /**
   * Restore state from persisted data
   */
  restoreState(state: OtpGuardState) {
    this.state = state;
    logger.info('[OTP Guard] State restored');
  }
}

export const otpGuard = new OtpGuardService();
