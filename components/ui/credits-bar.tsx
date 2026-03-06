import React, { useEffect, useRef } from 'react';
import { View, Text, Animated } from 'react-native';
import { useColors } from '@/hooks/use-colors';

interface CreditsBarProps {
  current: number;
  total: number;
  label?: string;
  showPercentage?: boolean;
}

/**
 * Barre de progression animée pour afficher les crédits/alertes restantes
 * Utilise Animated pour une transition fluide
 */
export function CreditsBar({
  current,
  total,
  label = 'Alertes',
  showPercentage = true,
}: CreditsBarProps) {
  const colors = useColors();
  const animatedWidth = useRef(new Animated.Value(0)).current;
  const animatedColor = useRef(new Animated.Value(0)).current;

  const percentage = total > 0 ? (current / total) * 100 : 0;
  const isLow = current <= Math.ceil(total * 0.25);
  const isCritical = current === 0;

  useEffect(() => {
    // Animer la largeur de la barre
    Animated.timing(animatedWidth, {
      toValue: percentage,
      duration: 500,
      useNativeDriver: false,
    }).start();

    // Animer la couleur (0 = vert, 1 = rouge)
    const colorValue = isCritical ? 1 : isLow ? 0.5 : 0;
    Animated.timing(animatedColor, {
      toValue: colorValue,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [percentage, isLow, isCritical]);

  // Interpoler la couleur
  const backgroundColor = animatedColor.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [colors.success, colors.warning, colors.error],
  });

  // Interpoler la largeur en pourcentage
  const widthStyle = animatedWidth.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View className="gap-2">
      {/* Label et nombre */}
      <View className="flex-row justify-between items-center">
        <Text className="text-sm font-medium text-foreground">{label}</Text>
        <Text className={`text-sm font-semibold ${isCritical ? 'text-error' : isLow ? 'text-warning' : 'text-success'}`}>
          {current} / {total}
          {showPercentage && ` (${Math.round(percentage)}%)`}
        </Text>
      </View>

      {/* Barre de progression */}
      <View className="h-2 bg-surface rounded-full overflow-hidden border border-border">
        <Animated.View
          style={{
            height: '100%',
            width: widthStyle,
            backgroundColor,
          }}
          className="rounded-full"
        />
      </View>

      {/* Message d'avertissement */}
      {isCritical && (
        <Text className="text-xs text-error font-medium">
          ⚠️ Plus d'alertes disponibles. Ajoute un abonnement pour continuer.
        </Text>
      )}
      {isLow && !isCritical && (
        <Text className="text-xs text-warning font-medium">
          ⚡ Alertes faibles. Considère un abonnement.
        </Text>
      )}
    </View>
  );
}
