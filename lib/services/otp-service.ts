import Constants from "expo-constants";
import { logger } from "../logger";

interface SendOtpResponse {
  success: boolean;
  message: string;
  expiresIn?: number;
  error?: string;
  errorCode?: string;
}

interface VerifyOtpResponse {
  success: boolean;
  message: string;
  verified?: boolean;
  error?: string;
  attemptsRemaining?: number;
  errorCode?: string;
}

class OtpService {
  private supabaseUrl: string;

  constructor() {
    this.supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || "";
    if (!this.supabaseUrl) {
      logger.warn("[OTP] Supabase URL not configured");
    }
  }

  /**
   * Send OTP code to phone number
   * @param phoneNumber Phone number in E.164 format (e.g., +33763458273)
   * @returns Promise with success status and expiration time
   */
  async sendOtp(phoneNumber: string): Promise<SendOtpResponse> {
    try {
      if (!phoneNumber || !phoneNumber.startsWith("+")) {
        return {
          success: false,
          message: "Phone number must be in E.164 format (e.g., +33...)",
          error: "Phone number must be in E.164 format (e.g., +33...)",
        };
      }

      logger.info("[OTP] Sending OTP to", phoneNumber);

      const response = await fetch(
        `${this.supabaseUrl}/functions/v1/send-otp`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            phoneNumber,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        logger.error("[OTP] Send failed:", error);
        return {
          success: false,
          message: "Failed to send OTP. Please try again.",
          error: "Failed to send OTP. Please try again.",
        };
      }

      const data: SendOtpResponse = await response.json();
      logger.info("[OTP] Send successful");
      return data;
    } catch (error) {
      logger.error("[OTP] Send exception:", error);
      return {
        success: false,
        message: "Network error. Please check your connection.",
        error: "Network error. Please check your connection.",
      };
    }
  }

  /**
   * Verify OTP code
   * @param phoneNumber Phone number in E.164 format
   * @param otpCode 6-digit OTP code
   * @returns Promise with verification status
   */
  async verifyOtp(phoneNumber: string, otpCode: string): Promise<VerifyOtpResponse> {
    try {
      if (!phoneNumber || !phoneNumber.startsWith("+")) {
        return {
          success: false,
          message: "Phone number must be in E.164 format",
          error: "Phone number must be in E.164 format",
        };
      }

      if (!otpCode || !/^\d{6}$/.test(otpCode)) {
        return {
          success: false,
          message: "OTP code must be 6 digits",
          error: "OTP code must be 6 digits",
        };
      }

      logger.info("[OTP] Verifying OTP for", phoneNumber);

      const response = await fetch(
        `${this.supabaseUrl}/functions/v1/verify-otp`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            phoneNumber,
            otpCode,
          }),
        }
      );

      const data: VerifyOtpResponse = await response.json();

      if (!response.ok) {
        logger.warn("[OTP] Verification failed:", data.error);
        return data;
      }

      logger.info("[OTP] Verification successful");
      return data;
    } catch (error) {
      logger.error("[OTP] Verify exception:", error);
      return {
        success: false,
        message: "Network error. Please check your connection.",
        error: "Network error. Please check your connection.",
      };
    }
  }
}

export const otpService = new OtpService();
