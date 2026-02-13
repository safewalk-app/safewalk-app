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
 * Polish: opacity 1.0 pour actif, 0.45 pour désactivé, shadow forte
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
    secondary: 'bg-blue-600',
  };

  const sizeStyles = {
    sm: 'px-4 py-2',
    md: 'px-6 py-3',
    lg: 'px-8 py-4',
  };

  const textSizeStyles = {
    sm: 'text-sm font-bold',
    md: 'text-lg font-bold',
    lg: 'text-2xl font-bold',
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
      style={{
        opacity: disabled ? 0.45 : 1.0,
      }}
      className="rounded-full overflow-hidden"
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
            transform: [{ scale: pressed ? 0.96 : 1 }],
            shadowColor: variant === 'danger' ? '#FF4D4D' : (variant === 'secondary' ? '#1E40AF' : '#6C63FF'),
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: pressed ? 0.2 : 0.15,
            shadowRadius: 10,
            elevation: pressed ? 5 : 4,
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
              'text-white drop-shadow-lg',
              textSizeStyles[size]
            )}
            numberOfLines={1}
            adjustsFontSizeToFit
            style={{
              textShadowColor: 'rgba(0, 0, 0, 0.3)',
              textShadowOffset: { width: 0, height: 1 },
              textShadowRadius: 2,
            }}
          >
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
