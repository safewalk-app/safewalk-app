import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { OtpInput } from "@/components/otp-input";
import { ErrorAlert, ErrorMessage } from "@/components/error-alert";
import { otpService } from "@/lib/services/otp-service";
import { logger } from "@/lib/logger";
import { useColors } from "@/hooks/use-colors";
import { cn } from "@/lib/utils";
import {
  OtpErrorCode,
  getErrorTitle,
  getErrorType,
  canResendOtp,
  shouldChangePhone,
} from "@/lib/types/otp-errors";
import * as Haptics from "expo-haptics";
import { markSessionOtpVerified } from "@/lib/services/otp-session-guard";

/**
 * OTP Verification Screen
 * Allows user to verify their phone number with a 6-digit code
 * Includes comprehensive error handling for all failure cases
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
  const [error, setError] = useState<{
    code: OtpErrorCode;
    message: string;
    attemptsRemaining?: number;
  } | null>(null);
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
      setError({
        code: OtpErrorCode.EMPTY_PHONE,
        message: "Numéro de téléphone non trouvé",
      });
      return;
    }

    // Validation format
    if (otpCode.length !== 6) {
      setError({
        code: OtpErrorCode.INVALID_OTP_FORMAT,
        message: "Le code doit avoir 6 chiffres",
      });
      return;
    }

    if (!/^\d{6}$/.test(otpCode)) {
      setError({
        code: OtpErrorCode.INVALID_OTP_FORMAT,
        message: "Le code doit contenir uniquement des chiffres",
      });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await otpService.verifyOtp(phoneNumber, otpCode);

      if (result.success && result.verified) {
        logger.info("[OTP] Vérification réussie");
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success
        );

        // Marquer l'utilisateur comme vérifié OTP
        await markSessionOtpVerified(phoneNumber);
        logger.info("[OTP] Utilisateur marqué comme vérifié");

        // Navigate back or to next screen
        if (returnTo) {
          router.push(returnTo as any);
        } else {
          router.back();
        }
      } else {
        // Handle error response
        const errorCode = (result.errorCode ||
          OtpErrorCode.SERVER_ERROR) as OtpErrorCode;
        const message = result.error || "Vérification échouée";

        setError({
          code: errorCode,
          message,
          attemptsRemaining: result.attemptsRemaining,
        });

        setAttemptsRemaining(result.attemptsRemaining ?? 3);

        // Haptic feedback for error
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Error
        );

        logger.warn("[OTP] Vérification échouée:", {
          errorCode,
          attemptsRemaining: result.attemptsRemaining,
        });
      }
    } catch (err) {
      logger.error("[OTP] Erreur vérification:", err);
      setError({
        code: OtpErrorCode.NETWORK_ERROR,
        message: "Erreur réseau. Vérifiez votre connexion.",
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  // Handle resend OTP
  const handleResend = async () => {
    if (!phoneNumber) {
      setError({
        code: OtpErrorCode.EMPTY_PHONE,
        message: "Numéro de téléphone non trouvé",
      });
      return;
    }

    setResendLoading(true);
    setError(null);
    setOtpCode("");

    try {
      const result = await otpService.sendOtp(phoneNumber);

      if (result.success) {
        logger.info("[OTP] Renvoi réussi");
        setTimeLeft(result.expiresIn || 600);
        setAttemptsRemaining(3);
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success
        );
      } else {
        // Handle error response
        const errorCode = (result.errorCode ||
          OtpErrorCode.SERVER_ERROR) as OtpErrorCode;
        const message = result.error || "Impossible d'envoyer le code";

        setError({
          code: errorCode,
          message,
        });

        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Error
        );

        logger.warn("[OTP] Renvoi échoué:", { errorCode });
      }
    } catch (err) {
      logger.error("[OTP] Erreur renvoi:", err);
      setError({
        code: OtpErrorCode.NETWORK_ERROR,
        message: "Erreur réseau. Vérifiez votre connexion.",
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setResendLoading(false);
    }
  };

  // Handle change phone number
  const handleChangePhone = () => {
    router.push({
      pathname: "/phone-verification",
      params: { returnTo },
    });
  };

  // Determine if we can resend
  const canResend = error ? canResendOtp(error.code) : true;
  const shouldShowChangePhone = error
    ? shouldChangePhone(error.code)
    : false;

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

          {/* Content */}
          <View className="gap-6">
            {/* Error Alert */}
            {error && (
              <ErrorAlert
                title={getErrorTitle(error.code)}
                message={error.message}
                type={getErrorType(error.code)}
                icon="alert-circle"
                action={
                  canResend
                    ? {
                        label: "Renvoyer le code",
                        onPress: handleResend,
                        loading: resendLoading,
                      }
                    : undefined
                }
                onDismiss={() => setError(null)}
                dismissible
              />
            )}

            {/* OTP Input */}
            {!shouldShowChangePhone && (
              <>
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
                      className={
                        timeLeft < 60
                          ? "text-error font-semibold"
                          : "text-foreground"
                      }
                    >
                      {formatTime(timeLeft)}
                    </Text>
                  </Text>
                </View>

                {/* Attempts remaining */}
                {attemptsRemaining < 3 && (
                  <View className="items-center">
                    <Text className="text-xs text-warning font-semibold">
                      ⚠️ {attemptsRemaining} tentative(s) restante(s)
                    </Text>
                  </View>
                )}
              </>
            )}

            {/* Change phone suggestion */}
            {shouldShowChangePhone && (
              <View className="bg-warning/10 rounded-lg p-4 border border-warning/20">
                <Text className="text-sm text-warning font-semibold mb-2">
                  Impossible d'envoyer le SMS
                </Text>
                <Text className="text-sm text-warning mb-4">
                  Vérifiez que le numéro est correct et réessayez.
                </Text>
                <TouchableOpacity
                  onPress={handleChangePhone}
                  className="bg-warning rounded-lg px-4 py-2"
                >
                  <Text className="text-center font-semibold text-white">
                    Changer le numéro
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Actions */}
          {!shouldShowChangePhone && (
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
                        )}:${((600 - timeLeft) % 60)
                          .toString()
                          .padStart(2, "0")})`
                      : "Renvoyer le code"}
                  </Text>
                )}
              </TouchableOpacity>

              {/* Cancel Button */}
              <TouchableOpacity
                onPress={() => router.back()}
                className="py-3 rounded-full items-center justify-center"
              >
                <Text className="text-base font-semibold text-muted">
                  Annuler
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Change phone button (when shown) */}
          {shouldShowChangePhone && (
            <View className="gap-3">
              <TouchableOpacity
                onPress={handleChangePhone}
                className="py-3 rounded-full items-center justify-center bg-primary"
              >
                <Text className="text-base font-semibold text-background">
                  Changer le numéro
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.back()}
                className="py-3 rounded-full items-center justify-center"
              >
                <Text className="text-base font-semibold text-muted">
                  Annuler
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
