import { describe, it, expect, beforeEach } from "vitest";
import {
  OtpErrorCode,
  getErrorTitle,
  getErrorType,
  isRecoverableError,
  canResendOtp,
  shouldChangePhone,
} from "../lib/types/otp-errors";

describe("OTP Error Handling", () => {
  describe("getErrorTitle", () => {
    it("should return correct title for INVALID_PHONE_FORMAT", () => {
      const title = getErrorTitle(OtpErrorCode.INVALID_PHONE_FORMAT);
      expect(title).toBe("Numéro invalide");
    });

    it("should return correct title for OTP_EXPIRED", () => {
      const title = getErrorTitle(OtpErrorCode.OTP_EXPIRED);
      expect(title).toBe("Code expiré");
    });

    it("should return correct title for OTP_INVALID", () => {
      const title = getErrorTitle(OtpErrorCode.OTP_INVALID);
      expect(title).toBe("Code incorrect");
    });

    it("should return correct title for MAX_ATTEMPTS_EXCEEDED", () => {
      const title = getErrorTitle(OtpErrorCode.MAX_ATTEMPTS_EXCEEDED);
      expect(title).toBe("Trop de tentatives");
    });

    it("should return correct title for NETWORK_ERROR", () => {
      const title = getErrorTitle(OtpErrorCode.NETWORK_ERROR);
      expect(title).toBe("Erreur réseau");
    });

    it("should return default title for unknown error", () => {
      const title = getErrorTitle("UNKNOWN_ERROR" as OtpErrorCode);
      expect(title).toBe("Erreur");
    });
  });

  describe("getErrorType", () => {
    it("should return warning for OTP_EXPIRED", () => {
      const type = getErrorType(OtpErrorCode.OTP_EXPIRED);
      expect(type).toBe("warning");
    });

    it("should return warning for RATE_LIMIT", () => {
      const type = getErrorType(OtpErrorCode.RATE_LIMIT);
      expect(type).toBe("warning");
    });

    it("should return error for OTP_INVALID", () => {
      const type = getErrorType(OtpErrorCode.OTP_INVALID);
      expect(type).toBe("error");
    });

    it("should return error for NETWORK_ERROR", () => {
      const type = getErrorType(OtpErrorCode.NETWORK_ERROR);
      expect(type).toBe("error");
    });

    it("should return error for SERVER_ERROR", () => {
      const type = getErrorType(OtpErrorCode.SERVER_ERROR);
      expect(type).toBe("error");
    });
  });

  describe("isRecoverableError", () => {
    it("should return true for OTP_INVALID", () => {
      expect(isRecoverableError(OtpErrorCode.OTP_INVALID)).toBe(true);
    });

    it("should return true for OTP_EXPIRED", () => {
      expect(isRecoverableError(OtpErrorCode.OTP_EXPIRED)).toBe(true);
    });

    it("should return true for MAX_ATTEMPTS_EXCEEDED", () => {
      expect(isRecoverableError(OtpErrorCode.MAX_ATTEMPTS_EXCEEDED)).toBe(true);
    });

    it("should return true for NETWORK_ERROR", () => {
      expect(isRecoverableError(OtpErrorCode.NETWORK_ERROR)).toBe(true);
    });

    it("should return false for INVALID_PHONE_FORMAT", () => {
      expect(isRecoverableError(OtpErrorCode.INVALID_PHONE_FORMAT)).toBe(false);
    });

    it("should return false for INVALID_OTP_FORMAT", () => {
      expect(isRecoverableError(OtpErrorCode.INVALID_OTP_FORMAT)).toBe(false);
    });
  });

  describe("canResendOtp", () => {
    it("should return true for OTP_EXPIRED", () => {
      expect(canResendOtp(OtpErrorCode.OTP_EXPIRED)).toBe(true);
    });

    it("should return true for OTP_NOT_FOUND", () => {
      expect(canResendOtp(OtpErrorCode.OTP_NOT_FOUND)).toBe(true);
    });

    it("should return true for MAX_ATTEMPTS_EXCEEDED", () => {
      expect(canResendOtp(OtpErrorCode.MAX_ATTEMPTS_EXCEEDED)).toBe(true);
    });

    it("should return true for SMS_SEND_FAILED", () => {
      expect(canResendOtp(OtpErrorCode.SMS_SEND_FAILED)).toBe(true);
    });

    it("should return false for OTP_INVALID", () => {
      expect(canResendOtp(OtpErrorCode.OTP_INVALID)).toBe(false);
    });

    it("should return false for INVALID_PHONE_FORMAT", () => {
      expect(canResendOtp(OtpErrorCode.INVALID_PHONE_FORMAT)).toBe(false);
    });

    it("should return false for RATE_LIMIT", () => {
      expect(canResendOtp(OtpErrorCode.RATE_LIMIT)).toBe(false);
    });
  });

  describe("shouldChangePhone", () => {
    it("should return true for OTP_NOT_FOUND", () => {
      expect(shouldChangePhone(OtpErrorCode.OTP_NOT_FOUND)).toBe(true);
    });

    it("should return true for SMS_SEND_FAILED", () => {
      expect(shouldChangePhone(OtpErrorCode.SMS_SEND_FAILED)).toBe(true);
    });

    it("should return false for OTP_INVALID", () => {
      expect(shouldChangePhone(OtpErrorCode.OTP_INVALID)).toBe(false);
    });

    it("should return false for OTP_EXPIRED", () => {
      expect(shouldChangePhone(OtpErrorCode.OTP_EXPIRED)).toBe(false);
    });

    it("should return false for MAX_ATTEMPTS_EXCEEDED", () => {
      expect(shouldChangePhone(OtpErrorCode.MAX_ATTEMPTS_EXCEEDED)).toBe(false);
    });

    it("should return false for NETWORK_ERROR", () => {
      expect(shouldChangePhone(OtpErrorCode.NETWORK_ERROR)).toBe(false);
    });
  });

  describe("Error hierarchy", () => {
    it("should categorize validation errors correctly", () => {
      const validationErrors = [
        OtpErrorCode.INVALID_PHONE_FORMAT,
        OtpErrorCode.INVALID_OTP_FORMAT,
        OtpErrorCode.EMPTY_PHONE,
        OtpErrorCode.EMPTY_OTP,
      ];

      validationErrors.forEach((error) => {
        expect(isRecoverableError(error)).toBe(false);
        expect(getErrorType(error)).toBe("error");
      });
    });

    it("should categorize business logic errors correctly", () => {
      const businessLogicErrors = [
        OtpErrorCode.OTP_INVALID,
        OtpErrorCode.OTP_EXPIRED,
        OtpErrorCode.MAX_ATTEMPTS_EXCEEDED,
      ];

      businessLogicErrors.forEach((error) => {
        expect(isRecoverableError(error)).toBe(true);
      });
    });

    it("should categorize server errors correctly", () => {
      const serverErrors = [
        OtpErrorCode.SMS_SEND_FAILED,
        OtpErrorCode.DATABASE_ERROR,
        OtpErrorCode.SERVER_ERROR,
      ];

      serverErrors.forEach((error) => {
        expect(isRecoverableError(error)).toBe(true);
        expect(getErrorType(error)).toBe("error");
      });
    });

    it("should categorize network errors correctly", () => {
      const networkErrors = [
        OtpErrorCode.NETWORK_ERROR,
        OtpErrorCode.TIMEOUT,
      ];

      networkErrors.forEach((error) => {
        expect(isRecoverableError(error)).toBe(true);
        expect(getErrorType(error)).toBe("error");
      });
    });
  });

  describe("Error recovery paths", () => {
    it("should suggest resend for expired OTP", () => {
      expect(canResendOtp(OtpErrorCode.OTP_EXPIRED)).toBe(true);
      expect(shouldChangePhone(OtpErrorCode.OTP_EXPIRED)).toBe(false);
    });

    it("should suggest change phone for SMS send failure", () => {
      expect(canResendOtp(OtpErrorCode.SMS_SEND_FAILED)).toBe(true);
      expect(shouldChangePhone(OtpErrorCode.SMS_SEND_FAILED)).toBe(true);
    });

    it("should suggest retry for network error", () => {
      expect(isRecoverableError(OtpErrorCode.NETWORK_ERROR)).toBe(true);
      expect(canResendOtp(OtpErrorCode.NETWORK_ERROR)).toBe(false);
    });

    it("should suggest validation fix for invalid format", () => {
      expect(isRecoverableError(OtpErrorCode.INVALID_PHONE_FORMAT)).toBe(false);
      expect(canResendOtp(OtpErrorCode.INVALID_PHONE_FORMAT)).toBe(false);
    });
  });
});
