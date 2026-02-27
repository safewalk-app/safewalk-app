import React, { useEffect } from 'react';
import { View, type ViewProps } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';

interface ScreenTransitionProps extends ViewProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
}

/**
 * ScreenTransition - Adds subtle fade-in and slide-up animation to screen content
 *
 * Usage:
 * ```tsx
 * <ScreenTransition>
 *   <Text>Content</Text>
 * </ScreenTransition>
 * ```
 */
export function ScreenTransition({
  children,
  delay = 0,
  duration = 350,
  style,
  ...props
}: ScreenTransitionProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);

  useEffect(() => {
    const timer = setTimeout(() => {
      opacity.value = withTiming(1, {
        duration,
        easing: Easing.out(Easing.cubic),
      });
      translateY.value = withTiming(0, {
        duration,
        easing: Easing.out(Easing.cubic),
      });
    }, delay);
    return () => clearTimeout(timer);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[animatedStyle, style]} {...props}>
      {children}
    </Animated.View>
  );
}
