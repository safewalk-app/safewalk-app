import React from 'react';
import { View, ViewProps } from 'react-native';
import { cn } from '@/lib/utils';

export interface GlassCardProps extends ViewProps {
  className?: string;
  children?: React.ReactNode;
  pressable?: boolean;
  onPress?: () => void;
}

/**
 * GlassCard - Card translucide avec radius 28-32 et shadow soft
 * Utilisé pour tous les conteneurs principaux
 */
export function GlassCard({
  className,
  children,
  pressable = false,
  onPress,
  style,
  ...props
}: GlassCardProps) {
  return (
    <View
      className={cn(
        'rounded-3xl p-4 bg-white',
        className
      )}
      style={[
        {
          backgroundColor: 'rgba(255, 255, 255, 0.94)',
          borderRadius: 28,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
          elevation: 3,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}
