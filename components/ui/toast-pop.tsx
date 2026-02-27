import React, { useEffect, useState } from 'react';
import { View, Text, Animated } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

export interface ToastPopProps {
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  onDismiss?: () => void;
}

/**
 * ToastPop - Notification toast avec haptic feedback
 * Types : success (vert), error (rouge), warning (orange), info (bleu)
 */
export function ToastPop({ message, type = 'info', duration = 3000, onDismiss }: ToastPopProps) {
  const [fadeAnim] = useState(new Animated.Value(0));

  const typeStyles = {
    success: {
      bg: '#2DE2A6',
      icon: 'check-circle',
      haptic: Haptics.NotificationFeedbackType.Success,
    },
    error: {
      bg: '#FF4D4D',
      icon: 'error',
      haptic: Haptics.NotificationFeedbackType.Error,
    },
    warning: {
      bg: '#F59E0B',
      icon: 'warning',
      haptic: Haptics.NotificationFeedbackType.Warning,
    },
    info: {
      bg: '#3A86FF',
      icon: 'info',
      haptic: Haptics.NotificationFeedbackType.Success,
    },
  };

  const style = typeStyles[type];

  useEffect(() => {
    // Trigger haptic
    Haptics.notificationAsync(style.haptic);

    // Animate in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Auto dismiss
    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        onDismiss?.();
      });
    }, duration);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View
      className="absolute bottom-24 left-4 right-4 rounded-2xl p-4 flex-row items-center gap-3"
      style={{
        opacity: fadeAnim,
        transform: [
          {
            translateY: fadeAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [20, 0],
            }),
          },
        ],
        backgroundColor: style.bg,
        shadowColor: style.bg,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
      }}
    >
      <MaterialIcons name={style.icon as any} size={20} color="#FFFFFF" />
      <Text className="flex-1 text-white font-semibold text-sm">{message}</Text>
    </Animated.View>
  );
}
