import { View, Text, Alert } from 'react-native';
import * as Battery from 'expo-battery';
import { useEffect, useState } from 'react';
import { GlassCard } from '@/components/ui/glass-card';

export function useBatteryWarning() {
  const [batteryLevel, setBatteryLevel] = useState(1);
  const [isLowBattery, setIsLowBattery] = useState(false);
  const [isCriticalBattery, setIsCriticalBattery] = useState(false);

  useEffect(() => {
    const checkBattery = async () => {
      try {
        const level = await Battery.getBatteryLevelAsync();
        setBatteryLevel(level);

        // HAUTE #10: Alerte batterie critique (<5%)
        if (level < 0.05) {
          setIsCriticalBattery(true);
          Alert.alert(
            '🔴 BATTERIE CRITIQUE',
            'Votre batterie est à ' +
              Math.round(level * 100) +
              "%. Votre téléphone va s'éteindre bientôt.",
            [{ text: 'OK' }],
          );
        } else {
          setIsCriticalBattery(false);
        }

        // HAUTE #10: Alerte batterie faible (<20%)
        if (level < 0.2 && !isLowBattery) {
          setIsLowBattery(true);
          Alert.alert(
            '⚠️ Batterie faible',
            'Votre batterie est à ' +
              Math.round(level * 100) +
              '%. Veuillez charger votre téléphone.',
            [{ text: 'OK' }],
          );
        } else if (level >= 0.2) {
          setIsLowBattery(false);
        }
      } catch (error) {
        console.warn('Erreur lecture batterie:', error);
      }
    };

    checkBattery();
    const interval = setInterval(checkBattery, 60000); // Vérifier chaque minute
    return () => clearInterval(interval);
  }, [isLowBattery]);

  return {
    batteryLevel,
    isLowBattery,
    isCriticalBattery,
  };
}

export function BatteryWarningBanner({
  batteryLevel,
  isLowBattery,
  isCriticalBattery,
}: {
  batteryLevel: number;
  isLowBattery: boolean;
  isCriticalBattery: boolean;
}) {
  if (!isLowBattery && !isCriticalBattery) {
    return null;
  }

  const percentage = Math.round(batteryLevel * 100);
  const isCritical = isCriticalBattery;

  return (
    <GlassCard
      className="mb-4"
      style={{
        backgroundColor: isCritical ? 'rgba(255, 77, 77, 0.15)' : 'rgba(245, 158, 11, 0.12)',
        borderLeftWidth: 4,
        borderLeftColor: isCritical ? '#FF4D4D' : '#F59E0B',
        paddingHorizontal: 16,
        paddingVertical: 12,
      }}
    >
      <View className="flex-row items-start gap-3">
        <Text style={{ fontSize: 24, marginTop: -2 }}>{isCritical ? '🔴' : '⚠️'}</Text>
        <View className="flex-1">
          <Text className="text-sm font-bold text-foreground mb-1">
            {isCritical ? 'Batterie critique' : 'Batterie faible'}
          </Text>
          <Text className="text-xs text-muted leading-relaxed">
            {isCritical
              ? `Votre batterie est à ${percentage}%. Votre téléphone va s'éteindre bientôt. Veuillez le charger immédiatement.`
              : `Votre batterie est à ${percentage}%. Veuillez charger votre téléphone pour éviter une interruption de la session.`}
          </Text>
        </View>
      </View>

      {/* Barre de progression batterie */}
      <View className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
        <View
          className={isCritical ? 'bg-error' : 'bg-warning'}
          style={{
            height: '100%',
            width: `${percentage}%`,
          }}
        />
      </View>
    </GlassCard>
  );
}
