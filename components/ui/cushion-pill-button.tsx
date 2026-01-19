import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { cn } from '@/lib/utils';
import * as Haptics from 'expo-haptics';

export interface CushionPillButtonProps {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'success' | 'danger' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
}

/**
 * CushionPillButton - Bouton "gonflé" avec glossy highlight et relief
 * Variantes : primary (violet), success (vert mint), danger (rouge), secondary (bleu)
 */
export function CushionPillButton({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  className,
}: CushionPillButtonProps) {
  const variantStyles = {
    primary: 'bg-primary',
    success: 'bg-mint',
    danger: 'bg-danger',
    secondary: 'bg-secondary',
  };

  const sizeStyles = {
    sm: 'px-4 py-2',
    md: 'px-6 py-3',
    lg: 'px-8 py-4',
  };

  const textSizeStyles = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  const handlePress = () => {
    if (!disabled && onPress) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress();
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      className={cn(
        'rounded-full overflow-hidden',
        disabled && 'opacity-50'
      )}
    >
      {({ pressed }) => (
        <View
          className={cn(
            'rounded-full items-center justify-center',
            variantStyles[variant],
            sizeStyles[size],
            className
          )}
          style={{
            transform: [{ scale: pressed ? 0.97 : 1 }],
            shadowColor: variant === 'danger' ? '#FF4D4D' : '#6C63FF',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: pressed ? 0.15 : 0.1,
            shadowRadius: 8,
            elevation: pressed ? 4 : 3,
          }}
        >
          {/* Glossy highlight */}
          <View
            className="absolute top-0 left-0 right-0 h-1/3 rounded-full opacity-30"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.4)',
            }}
          />
          
          <Text
            className={cn(
              'font-semibold text-white',
              textSizeStyles[size]
            )}
          >
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
