import { View, Text, Alert } from 'react-native';
import * as Battery from 'expo-battery';
import { useEffect, useState } from 'react';

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
            'Votre batterie est a ' + Math.round(level * 100) + '%. Votre telephone va s\'eteindre bientot.',
            [{ text: 'OK' }]
          );
        } else {
          setIsCriticalBattery(false);
        }

        // HAUTE #10: Alerte batterie faible (<20%)
        if (level < 0.2 && !isLowBattery) {
          setIsLowBattery(true);
          Alert.alert(
            '⚠️ Batterie faible',
            'Votre batterie est a ' + Math.round(level * 100) + '%. Veuillez charger votre telephone.',
            [{ text: 'OK' }]
          );
        } else if (level >= 0.2) {
          setIsLowBattery(false);
        }
      } catch (error) {
        console.warn('Erreur lecture batterie:', error);
      }
    };

    checkBattery();
    const interval = setInterval(checkBattery, 60000); // Verifier chaque minute
    return () => clearInterval(interval);
  }, [isLowBattery]);

  return {
    batteryLevel,
    isLowBattery,
    isCriticalBattery,
  };
}

export function BatteryWarningBanner({ batteryLevel, isLowBattery, isCriticalBattery }: {
  batteryLevel: number;
  isLowBattery: boolean;
  isCriticalBattery: boolean;
}) {
  if (!isLowBattery && !isCriticalBattery) {
    return null;
  }

  return (
    <View className={isCriticalBattery ? 'bg-error p-3' : 'bg-warning p-3'}>
      <Text className={isCriticalBattery ? 'text-white font-bold' : 'text-black font-bold'}>
        {isCriticalBattery ? '🔴 BATTERIE CRITIQUE' : '⚠️ Batterie faible'} ({Math.round(batteryLevel * 100)}%)
      </Text>
    </View>
  );
}
