import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { otpService } from "@/lib/services/otp-service";
import { logger } from "@/lib/logger";
import { useColors } from "@/hooks/use-colors";
import * as Haptics from "expo-haptics";

/**
 * Phone Verification Screen
 * Allows user to enter their phone number to receive OTP
 */
export default function PhoneVerificationScreen() {
  const router = useRouter();
  const colors = useColors();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();

  const [phoneNumber, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Format phone number to E.164
  const formatPhoneNumber = (input: string): string => {
    // Remove all non-digits
    const digits = input.replace(/\D/g, "");

    // If starts with 0 (France), replace with 33
    if (digits.startsWith("0")) {
      return "+" + "33" + digits.slice(1);
    }

    // If already has country code
    if (digits.length >= 10) {
      return "+" + digits;
    }

    return "";
  };

  // Handle phone input change
  const handlePhoneChange = (text: string) => {
    // Format as user types
    const formatted = text.replace(/\D/g, "");
    setPhoneNumber(formatted);
    setError(null);
  };

  // Handle send OTP
  const handleSendOtp = async () => {
    const formattedPhone = formatPhoneNumber(phoneNumber);

    if (!formattedPhone) {
      setError("Please enter a valid phone number");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await otpService.sendOtp(formattedPhone);

      if (result.success) {
        logger.info("[OTP] OTP sent successfully");
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success
        );

        // Navigate to OTP verification screen
        router.push({
          pathname: "/otp-verification",
          params: {
            phoneNumber: formattedPhone,
            returnTo: returnTo || "/",
          },
        });
      } else {
        setError(result.error || "Failed to send OTP");
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Error
        );
      }
    } catch (err) {
      logger.error("[OTP] Send error:", err);
      setError("Network error. Please try again.");
      await Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Error
      );
    } finally {
      setLoading(false);
    }
  };

  // Display formatted phone number
  const displayPhone = phoneNumber
    ? `+33 ${phoneNumber.slice(1).replace(/(\d{1})(\d{2})(\d{2})(\d{2})(\d{2})/, "$1 $2 $3 $4 $5")}`
    : "";

  const isValidPhone = phoneNumber.length === 9; // 9 digits for France (without 0)

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

          {/* Phone Input */}
          <View className="gap-4">
            {/* Input Field */}
            <View className="gap-2">
              <Text className="text-sm font-semibold text-foreground">
                Numéro de téléphone
              </Text>
              <View className="flex-row items-center gap-2 bg-surface rounded-2xl px-4 py-3 border border-border">
                <Text className="text-foreground font-semibold">+33</Text>
                <TextInput
                  value={phoneNumber}
                  onChangeText={handlePhoneChange}
                  placeholder="6 12 34 56 78"
                  placeholderTextColor={colors.muted}
                  keyboardType="phone-pad"
                  maxLength={9}
                  editable={!loading}
                  className="flex-1 text-foreground font-semibold"
                  style={{ padding: 0 }}
                />
              </View>
              {displayPhone && (
                <Text className="text-xs text-muted">
                  Format: {displayPhone}
                </Text>
              )}
            </View>

            {/* Info */}
            <View className="bg-primary/10 rounded-lg p-3 border border-primary/20">
              <Text className="text-xs text-foreground">
                Nous enverrons un code de vérification par SMS. Les tarifs SMS
                standards s'appliquent.
              </Text>
            </View>

            {/* Error Message */}
            {error && (
              <View className="bg-error/10 rounded-lg p-3 border border-error/20">
                <Text className="text-sm text-error">{error}</Text>
              </View>
            )}
          </View>

          {/* Actions */}
          <View className="gap-3">
            {/* Send OTP Button */}
            <TouchableOpacity
              onPress={handleSendOtp}
              disabled={loading || !isValidPhone}
              className={cn(
                "py-3 rounded-full items-center justify-center",
                isValidPhone && !loading ? "bg-primary" : "bg-primary/50"
              )}
              style={{
                opacity: loading || !isValidPhone ? 0.6 : 1,
              }}
            >
              {loading ? (
                <ActivityIndicator color={colors.background} size="small" />
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

// Helper function
function cn(...classes: (string | undefined | false)[]): string {
  return classes.filter(Boolean).join(" ");
}
