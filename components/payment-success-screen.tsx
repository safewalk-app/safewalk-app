import React, { useEffect } from "react";
import { View, Text, TouchableOpacity, Animated } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import * as Haptics from "expo-haptics";

interface PaymentSuccessScreenProps {
  productName: string;
  amount: number;
  creditsAdded?: number;
  onContinue: () => void;
}

export function PaymentSuccessScreen({
  productName,
  amount,
  creditsAdded,
  onContinue,
}: PaymentSuccessScreenProps) {
  const colors = useColors();
  const scaleAnim = new Animated.Value(0);
  const opacityAnim = new Animated.Value(0);

  useEffect(() => {
    // Trigger success haptic
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Animate checkmark
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <ScreenContainer className="flex-1 justify-center items-center px-6">
      {/* Success Checkmark Animation */}
      <Animated.View
        style={{
          transform: [{ scale: scaleAnim }],
          opacity: opacityAnim,
          marginBottom: 24,
        }}
      >
        <View
          className="w-24 h-24 rounded-full items-center justify-center"
          style={{ backgroundColor: colors.success }}
        >
          <MaterialIcons name="check" size={56} color={colors.background} />
        </View>
      </Animated.View>

      {/* Success Message */}
      <Text className="text-3xl font-bold text-foreground text-center mb-2">
        Paiement réussi!
      </Text>

      {/* Product Details */}
      <View className="bg-surface p-6 rounded-2xl w-full mb-6 border border-border">
        <View className="mb-4">
          <Text className="text-sm text-muted mb-1">Vous avez acheté</Text>
          <Text className="text-xl font-bold text-foreground">{productName}</Text>
        </View>

        <View className="border-t border-border pt-4">
          <View className="flex-row justify-between items-center">
            <Text className="text-sm text-muted">Montant payé</Text>
            <Text className="text-lg font-bold text-primary">
              ${amount.toFixed(2)}
            </Text>
          </View>

          {creditsAdded && (
            <View className="flex-row justify-between items-center mt-3">
              <View className="flex-row items-center gap-2">
                <MaterialIcons name="star" size={16} color={colors.primary} />
                <Text className="text-sm text-muted">Crédits ajoutés</Text>
              </View>
              <Text className="text-lg font-bold text-primary">
                +{creditsAdded}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Benefits */}
      <View className="w-full mb-8">
        <Text className="text-sm font-semibold text-foreground mb-3">
          Vous pouvez maintenant:
        </Text>

        <View className="gap-2">
          <View className="flex-row items-center gap-3 bg-surface p-3 rounded-lg border border-border">
            <View
              className="w-8 h-8 rounded-full items-center justify-center"
              style={{ backgroundColor: colors.primary }}
            >
              <MaterialIcons name="check" size={16} color={colors.background} />
            </View>
            <Text className="text-sm text-foreground flex-1">
              Créer des sorties avec alertes SMS
            </Text>
          </View>

          <View className="flex-row items-center gap-3 bg-surface p-3 rounded-lg border border-border">
            <View
              className="w-8 h-8 rounded-full items-center justify-center"
              style={{ backgroundColor: colors.primary }}
            >
              <MaterialIcons name="check" size={16} color={colors.background} />
            </View>
            <Text className="text-sm text-foreground flex-1">
              Alerter vos proches en cas d'urgence
            </Text>
          </View>

          <View className="flex-row items-center gap-3 bg-surface p-3 rounded-lg border border-border">
            <View
              className="w-8 h-8 rounded-full items-center justify-center"
              style={{ backgroundColor: colors.primary }}
            >
              <MaterialIcons name="check" size={16} color={colors.background} />
            </View>
            <Text className="text-sm text-foreground flex-1">
              Partager votre localisation GPS
            </Text>
          </View>
        </View>
      </View>

      {/* Continue Button */}
      <TouchableOpacity
        onPress={onContinue}
        className="w-full py-4 rounded-lg items-center"
        style={{ backgroundColor: colors.primary }}
      >
        <Text className="text-lg font-bold text-background">
          Continuer
        </Text>
      </TouchableOpacity>

      {/* Receipt Info */}
      <Text className="text-xs text-muted text-center mt-6">
        Un reçu a été envoyé à votre email.{"\n"}
        Vous pouvez gérer votre abonnement dans les paramètres.
      </Text>
    </ScreenContainer>
  );
}
