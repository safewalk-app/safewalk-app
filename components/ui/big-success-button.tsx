import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

export interface BigSuccessButtonProps {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
}

/**
 * BigSuccessButton - Grand bouton vert mint pour "Je suis rentré"
 * Avec icône checkmark et haptic feedback
 * Polish: opacity 1.0, height 66, shadow forte, scale press 0.96
 */
export function BigSuccessButton({ label, onPress, disabled = false }: BigSuccessButtonProps) {
  const handlePress = () => {
    if (!disabled && onPress) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onPress();
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      style={{
        opacity: disabled ? 0.45 : 1.0,
      }}
    >
      {({ pressed }) => (
        <View
          className="flex-row items-center justify-center gap-3 rounded-full px-8"
          style={{
            backgroundColor: '#2DE2A6',
            height: 66,
            transform: [{ scale: pressed ? 0.96 : 1 }],
            shadowColor: '#2DE2A6',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: pressed ? 0.25 : 0.2,
            shadowRadius: 14,
            elevation: pressed ? 6 : 5,
          }}
        >
          <MaterialIcons name="check-circle" size={28} color="#FFFFFF" />
          <Text className="text-white font-bold text-xl" numberOfLines={1} adjustsFontSizeToFit>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
