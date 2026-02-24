import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { OtpInput } from "@/components/otp-input";
import { otpService } from "@/lib/services/otp-service";
import { logger } from "@/lib/logger";
import { useColors } from "@/hooks/use-colors";
import * as Haptics from "expo-haptics";

/**
 * OTP Verification Screen
 * Allows user to verify their phone number with a 6-digit code
 */
export default function OtpVerificationScreen() {
  const router = useRouter();
  const colors = useColors();
  const { phoneNumber, returnTo } = useLocalSearchParams<{
    phoneNumber: string;
    returnTo?: string;
  }>();

  const [otpCode, setOtpCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes
  const [error, setError] = useState<string | null>(null);
  const [attemptsRemaining, setAttemptsRemaining] = useState(3);

  // Countdown timer
  useEffect(() => {
    if (timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Handle OTP verification
  const handleVerify = async () => {
    if (!phoneNumber) {
      Alert.alert("Error", "Phone number not found");
      return;
    }

    if (otpCode.length !== 6) {
      setError("Please enter all 6 digits");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await otpService.verifyOtp(phoneNumber, otpCode);

      if (result.success && result.verified) {
        logger.info("[OTP] Verification successful");
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success
        );

        // Navigate back or to next screen
        if (returnTo) {
          router.push(returnTo as any);
        } else {
          router.back();
        }
      } else {
        setError(result.error || "Verification failed");
        setAttemptsRemaining(result.attemptsRemaining ?? 3);

        if (result.attemptsRemaining === 0) {
          await Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Error
          );
          Alert.alert(
            "Too Many Attempts",
            "Please request a new OTP code.",
            [{ text: "Request New Code", onPress: handleResend }]
          );
        } else {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      }
    } catch (err) {
      logger.error("[OTP] Verification error:", err);
      setError("Network error. Please try again.");
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  // Handle resend OTP
  const handleResend = async () => {
    if (!phoneNumber) {
      Alert.alert("Error", "Phone number not found");
      return;
    }

    setResendLoading(true);
    setError(null);
    setOtpCode("");

    try {
      const result = await otpService.sendOtp(phoneNumber);

      if (result.success) {
        logger.info("[OTP] Resend successful");
        setTimeLeft(result.expiresIn || 600);
        setAttemptsRemaining(3);
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success
        );
        Alert.alert("Success", "New OTP code sent to your phone");
      } else {
        setError(result.error || "Failed to send OTP");
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Error
        );
      }
    } catch (err) {
      logger.error("[OTP] Resend error:", err);
      setError("Network error. Please try again.");
      await Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Error
      );
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <ScreenContainer className="p-4">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-1 justify-between gap-8 py-4">
          {/* Header */}
          <View className="gap-2">
            <Text className="text-3xl font-bold text-foreground">
              Vérification
            </Text>
            <Text className="text-base text-muted">
              Entrez le code reçu par SMS
            </Text>
            <Text className="text-sm text-muted mt-2">
              Numéro: {phoneNumber}
            </Text>
          </View>

          {/* OTP Input */}
          <View className="gap-6">
            <OtpInput
              value={otpCode}
              onChangeText={setOtpCode}
              onComplete={handleVerify}
              disabled={loading}
              className="mb-4"
            />

            {/* Timer */}
            <View className="items-center">
              <Text className="text-sm text-muted">
                Code expire dans:{" "}
                <Text
                  className={timeLeft < 60 ? "text-error font-semibold" : ""}
                >
                  {formatTime(timeLeft)}
                </Text>
              </Text>
            </View>

            {/* Attempts */}
            {attemptsRemaining < 3 && (
              <View className="items-center">
                <Text className="text-xs text-warning">
                  {attemptsRemaining} tentative(s) restante(s)
                </Text>
              </View>
            )}

            {/* Error Message */}
            {error && (
              <View className="bg-error/10 rounded-lg p-3 border border-error/20">
                <Text className="text-sm text-error">{error}</Text>
              </View>
            )}
          </View>

          {/* Actions */}
          <View className="gap-3">
            {/* Verify Button */}
            <TouchableOpacity
              onPress={handleVerify}
              disabled={loading || otpCode.length !== 6}
              className={cn(
                "py-3 rounded-full items-center justify-center",
                otpCode.length === 6 && !loading
                  ? "bg-primary"
                  : "bg-primary/50"
              )}
              style={{
                opacity: loading || otpCode.length !== 6 ? 0.6 : 1,
              }}
            >
              {loading ? (
                <ActivityIndicator color={colors.background} size="small" />
              ) : (
                <Text className="text-base font-semibold text-background">
                  Vérifier
                </Text>
              )}
            </TouchableOpacity>

            {/* Resend Button */}
            <TouchableOpacity
              onPress={handleResend}
              disabled={resendLoading || timeLeft > 300}
              className="py-3 rounded-full items-center justify-center border border-border"
              style={{
                opacity: resendLoading || timeLeft > 300 ? 0.5 : 1,
              }}
            >
              {resendLoading ? (
                <ActivityIndicator color={colors.foreground} size="small" />
              ) : (
                <Text className="text-base font-semibold text-foreground">
                  {timeLeft > 300
                    ? `Renvoyer le code (${Math.floor(
                        (600 - timeLeft) / 60
                      )}:${((600 - timeLeft) % 60).toString().padStart(2, "0")})`
                    : "Renvoyer le code"}
                </Text>
              )}
            </TouchableOpacity>

            {/* Cancel Button */}
            <TouchableOpacity
              onPress={() => router.back()}
              disabled={loading}
              className="py-3 rounded-full items-center justify-center"
            >
              <Text className="text-base font-semibold text-muted">
                Annuler
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

// Helper function
function cn(...classes: (string | undefined | false)[]): string {
  return classes.filter(Boolean).join(" ");
}
