import React from 'react';
import { View, type ViewProps } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  FadeInDown,
  FadeOutUp,
} from 'react-native-reanimated';
import { useEffect } from 'react';

interface ScreenTransitionWrapperProps extends ViewProps {
  /**
   * Type de transition: 'fade' | 'slideUp' | 'slideDown'
   */
  type?: 'fade' | 'slideUp' | 'slideDown';
  /**
   * Durée de l'animation en ms (défaut: 300)
   */
  duration?: number;
  /**
   * Délai avant le début de l'animation en ms (défaut: 0)
   */
  delay?: number;
  /**
   * Contenu à animer
   */
  children: React.ReactNode;
}

/**
 * Composant pour animer les transitions entre écrans
 * Fournit des animations subtiles et fluides
 *
 * Exemples:
 * ```tsx
 * <ScreenTransitionWrapper type="fade" duration={300}>
 *   <HomeScreen />
 * </ScreenTransitionWrapper>
 *
 * <ScreenTransitionWrapper type="slideUp" delay={100}>
 *   <ModalContent />
 * </ScreenTransitionWrapper>
 * ```
 */
export function ScreenTransitionWrapper({
  type = 'fade',
  duration = 300,
  delay = 0,
  children,
  style,
  ...props
}: ScreenTransitionWrapperProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(type === 'slideUp' ? 50 : type === 'slideDown' ? -50 : 0);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  useEffect(() => {
    // Délai avant l'animation
    const timer = setTimeout(() => {
      opacity.value = withTiming(1, {
        duration,
        easing: Easing.inOut(Easing.ease),
      });

      if (type !== 'fade') {
        translateY.value = withTiming(0, {
          duration,
          easing: Easing.inOut(Easing.ease),
        });
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [opacity, translateY, duration, delay, type]);

  return (
    <Animated.View
      style={[animatedStyle, style]}
      {...props}
    >
      {children}
    </Animated.View>
  );
}

/**
 * Composant pour animer la sortie d'un écran
 */
export function ScreenTransitionExit({
  type = 'fade',
  duration = 300,
  children,
  style,
  ...props
}: Omit<ScreenTransitionWrapperProps, 'delay'>) {
  const opacity = useSharedValue(1);
  const translateY = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  useEffect(() => {
    opacity.value = withTiming(0, {
      duration,
      easing: Easing.inOut(Easing.ease),
    });

    if (type !== 'fade') {
      const direction = type === 'slideUp' ? -50 : 50;
      translateY.value = withTiming(direction, {
        duration,
        easing: Easing.inOut(Easing.ease),
      });
    }
  }, [opacity, translateY, duration, type]);

  return (
    <Animated.View
      style={[animatedStyle, style]}
      {...props}
    >
      {children}
    </Animated.View>
  );
}
