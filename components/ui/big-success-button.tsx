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
 */
export function BigSuccessButton({
  label,
  onPress,
  disabled = false,
}: BigSuccessButtonProps) {
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
      className={disabled ? 'opacity-50' : ''}
    >
      {({ pressed }) => (
        <View
          className="flex-row items-center justify-center gap-3 rounded-full bg-mint py-4 px-8"
          style={{
            transform: [{ scale: pressed ? 0.97 : 1 }],
            shadowColor: '#2DE2A6',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: pressed ? 0.2 : 0.15,
            shadowRadius: 12,
            elevation: pressed ? 5 : 4,
          }}
        >
          <MaterialIcons
            name="check-circle"
            size={24}
            color="#FFFFFF"
          />
          <Text className="text-white font-bold text-lg">
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
