import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, Dimensions } from 'react-native';
import { useColors } from '@/hooks/use-colors';

interface AnimatedAlertProps {
  visible: boolean;
  type: 'error' | 'warning' | 'info';
  title: string;
  message: string;
  icon?: string;
}

/**
 * Alerte animée qui glisse depuis le haut
 * Utilisée pour les messages de blocage du guard
 */
export function AnimatedAlert({
  visible,
  type,
  title,
  message,
  icon,
}: AnimatedAlertProps) {
  const colors = useColors();
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const screenHeight = Dimensions.get('window').height;

  useEffect(() => {
    if (visible) {
      // Animer l'entrée
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Animer la sortie
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -100,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  const bgColor =
    type === 'error' ? colors.error : type === 'warning' ? colors.warning : colors.primary;
  const textColor = '#ffffff';

  return (
    <Animated.View
      style={{
        transform: [{ translateY: slideAnim }],
        opacity: opacityAnim,
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
      }}
    >
      <View
        style={{ backgroundColor: bgColor }}
        className="px-4 py-3 flex-row items-start gap-3"
      >
        {icon && (
          <Text style={{ color: textColor }} className="text-xl mt-0.5">
            {icon}
          </Text>
        )}
        <View className="flex-1">
          <Text style={{ color: textColor }} className="font-bold text-sm">
            {title}
          </Text>
          <Text style={{ color: textColor }} className="text-xs mt-1 opacity-90">
            {message}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}
