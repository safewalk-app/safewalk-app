import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { ErrorAlert } from "@/components/error-alert";
import { RateLimitErrorAlert } from "@/components/rate-limit-error-alert";
import { useCooldown } from "@/lib/hooks/use-cooldown";
import { otpService } from "@/lib/services/otp-service";
import { logger } from "@/lib/logger";
import { useColors } from "@/hooks/use-colors";
import { cn } from "@/lib/utils";
import {
  validatePhoneNumber,
  formatPhoneForInput,
  getMissingDigits,
  isCompletePhoneNumber,
} from "@/lib/services/phone-validation-service";
import {
  checkRateLimit,
  recordOtpAttempt,
  getFormattedResetTime,
} from "@/lib/services/otp-rate-limiter";
import {
  OtpErrorCode,
  getErrorTitle,
  getErrorType,
} from "@/lib/types/otp-errors";
import * as Haptics from "expo-haptics";
import { showErrorToast, showSuccessToast, showSmsSendErrorToast, showSmsSentToast } from "@/lib/services/toast-service";

/**
 * Phone Verification Screen
 * Allows user to enter their phone number to receive OTP
 * Includes validation, rate limiting, and comprehensive error handling
 */
export default function PhoneVerificationScreen() {
  const router = useRouter();
  const colors = useColors();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();

  const [phoneInput, setPhoneInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{
    code: OtpErrorCode;
    message: string;
    resetTime?: number;
  } | null>(null);
  const [rateLimitError, setRateLimitError] = useState<{
    visible: boolean;
    message?: string;
    retryAfter?: number;
  }>({ visible: false });

  // Cooldown de 60 secondes entre les envois d'OTP
  const { trigger: triggerSendOtp, isOnCooldown, remainingTime } = useCooldown({
    duration: 60000,
  });

  // Validation en temps réel
  const validation = validatePhoneNumber(phoneInput);
  const isComplete = isCompletePhoneNumber(phoneInput);
  const missingDigits = getMissingDigits(phoneInput);

  // Handle phone input change
  const handlePhoneChange = (text: string) => {
    // Formater l'input pour l'affichage
    const formatted = formatPhoneForInput(text);
    setPhoneInput(formatted);
    setError(null);
  };

  // Handle send OTP
  const handleSendOtp = async () => {
    await triggerSendOtp(async () => {
      // Validation format
      if (!validation.isValid || !validation.formatted) {
      setError({
        code: validation.errorCode || OtpErrorCode.INVALID_PHONE_FORMAT,
        message:
          validation.message || "Format invalide. Utilisez +33... ou 06...",
      });
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      return;
    }

    // Vérifier le rate limit
    const rateLimitStatus = await checkRateLimit(validation.formatted);

    if (!rateLimitStatus.isAllowed) {
      setError({
        code: OtpErrorCode.RATE_LIMIT,
        message: `Trop de demandes. Réessayez dans ${getFormattedResetTime(rateLimitStatus.resetTime || Date.now())}`,
        resetTime: rateLimitStatus.resetTime,
      });
      await Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Warning
      );
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await otpService.sendOtp(validation.formatted);

      if (result.success) {
        logger.info("[OTP] OTP sent successfully");

        // Enregistrer la tentative pour le rate limiting
        await recordOtpAttempt(validation.formatted);

        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success
        );
        showSmsSentToast();

        // Navigate to OTP verification screen
        router.push({
          pathname: "/otp-verification",
          params: {
            phoneNumber: validation.formatted,
            returnTo: returnTo || "/",
          },
        });
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

        showSmsSendErrorToast();
        logger.warn("[OTP] Send failed:", { errorCode });
      }
    } catch (err) {
      logger.error("[OTP] Send error:", err);
      setError({
        code: OtpErrorCode.NETWORK_ERROR,
        message: "Erreur réseau. Vérifiez votre connexion.",
      });
      showErrorToast("🌐 Erreur réseau", "Impossible d'envoyer le code. Vérifiez votre connexion.");
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
    });
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
              Entrez votre numéro de téléphone
            </Text>
          </View>

          {/* Content */}
          <View className="gap-4">
            {/* Rate Limit Error Alert */}
            <RateLimitErrorAlert
              visible={rateLimitError.visible}
              message={rateLimitError.message}
              retryAfter={rateLimitError.retryAfter}
              onDismiss={() => setRateLimitError({ visible: false })}
            />

            {/* Error Alert */}
            {error && (
              <ErrorAlert
                title={getErrorTitle(error.code)}
                message={error.message}
                type={getErrorType(error.code)}
                icon="alert-circle"
                onDismiss={() => setError(null)}
                dismissible
              />
            )}

            {/* Phone Input Section */}
            <View className="gap-2">
              <Text className="text-sm font-semibold text-foreground">
                Numéro de téléphone
              </Text>

              {/* Input Field */}
              <View
                className={cn(
                  "flex-row items-center gap-2 rounded-2xl px-4 py-3 border",
                  error
                    ? "bg-error/5 border-error/30"
                    : "bg-surface border-border"
                )}
              >
                <Text className="text-foreground font-semibold">+33</Text>
                <TextInput
                  value={phoneInput}
                  onChangeText={handlePhoneChange}
                  placeholder="6 12 34 56 78"
                  placeholderTextColor={colors.muted}
                  keyboardType="phone-pad"
                  maxLength={14} // "6 12 34 56 78" = 14 caractères
                  editable={!loading}
                  className="flex-1 text-foreground font-semibold"
                  style={{ padding: 0 }}
                />
              </View>

              {/* Input Helper Text */}
              <View className="flex-row items-center justify-between">
                <Text className="text-xs text-muted">
                  {validation.displayFormat || "Entrez 9 chiffres"}
                </Text>
                {!isComplete && phoneInput && (
                  <Text className="text-xs text-warning font-semibold">
                    {missingDigits} chiffre(s) manquant(s)
                  </Text>
                )}
              </View>
            </View>

            {/* Info Box */}
            <View className="bg-primary/10 rounded-lg p-3 border border-primary/20">
              <Text className="text-xs text-foreground leading-relaxed">
                Nous enverrons un code de vérification par SMS. Les tarifs SMS
                standards s'appliquent.
              </Text>
            </View>

            {/* Validation Status */}
            {phoneInput && (
              <View
                className={cn(
                  "rounded-lg p-3 border",
                  validation.isValid
                    ? "bg-success/10 border-success/20"
                    : "bg-error/10 border-error/20"
                )}
              >
                <Text
                  className={cn(
                    "text-xs font-semibold",
                    validation.isValid ? "text-success" : "text-error"
                  )}
                >
                  {validation.isValid
                    ? "✓ Numéro valide"
                    : validation.message || "Numéro invalide"}
                </Text>
              </View>
            )}
          </View>

          {/* Actions */}
          <View className="gap-3">
            {/* Send OTP Button */}
            <TouchableOpacity
              onPress={handleSendOtp}
              disabled={loading || !isComplete || !validation.isValid || isOnCooldown}
              className={cn(
                "py-3 rounded-full items-center justify-center",
                isComplete && validation.isValid && !loading && !isOnCooldown
                  ? "bg-primary"
                  : "bg-primary/50"
              )}
              style={{
                opacity:
                  loading || !isComplete || !validation.isValid || isOnCooldown ? 0.6 : 1,
              }}
            >
              {loading ? (
                <ActivityIndicator color={colors.background} size="small" />
              ) : isOnCooldown ? (
                <Text className="text-base font-semibold text-background">
                  Attendre {Math.ceil(remainingTime / 1000)}s
                </Text>
              ) : (
                <Text className="text-base font-semibold text-background">
                  Envoyer le code
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
