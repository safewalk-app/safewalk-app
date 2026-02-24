import { useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { logger } from "@/lib/logger";

interface OtpVerificationState {
  isVerified: boolean;
  verifiedPhoneNumber: string | null;
  verifiedAt: number | null;
}

const OTP_STORAGE_KEY = "safewalk_otp_verification";

/**
 * Hook to manage OTP verification state
 * Persists verification status across app sessions
 */
export function useOtpVerification() {
  const [state, setState] = useState<OtpVerificationState>({
    isVerified: false,
    verifiedPhoneNumber: null,
    verifiedAt: null,
  });
  const [loading, setLoading] = useState(false);

  // Load verification state from storage
  const loadVerificationState = useCallback(async () => {
    try {
      setLoading(true);
      const stored = await AsyncStorage.getItem(OTP_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setState(parsed);
        logger.info("[OTP] Verification state loaded from storage");
      }
    } catch (error) {
      logger.error("[OTP] Failed to load verification state:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Mark as verified
  const markAsVerified = useCallback(
    async (phoneNumber: string) => {
      try {
        const newState: OtpVerificationState = {
          isVerified: true,
          verifiedPhoneNumber: phoneNumber,
          verifiedAt: Date.now(),
        };
        setState(newState);
        await AsyncStorage.setItem(OTP_STORAGE_KEY, JSON.stringify(newState));
        logger.info("[OTP] User marked as verified:", phoneNumber);
      } catch (error) {
        logger.error("[OTP] Failed to mark as verified:", error);
      }
    },
    []
  );

  // Clear verification (logout)
  const clearVerification = useCallback(async () => {
    try {
      setState({
        isVerified: false,
        verifiedPhoneNumber: null,
        verifiedAt: null,
      });
      await AsyncStorage.removeItem(OTP_STORAGE_KEY);
      logger.info("[OTP] Verification cleared");
    } catch (error) {
      logger.error("[OTP] Failed to clear verification:", error);
    }
  }, []);

  return {
    isVerified: state.isVerified,
    verifiedPhoneNumber: state.verifiedPhoneNumber,
    verifiedAt: state.verifiedAt,
    loading,
    loadVerificationState,
    markAsVerified,
    clearVerification,
  };
}
