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
import { useReduceMotion } from '@/hooks/use-reduce-motion';

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
 * Respecte les préférences d'accessibilité (reduceMotionEnabled)
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
  const reduceMotion = useReduceMotion();
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(type === 'slideUp' ? 50 : type === 'slideDown' ? -50 : 0);

  // Adapter la durée selon les préférences d'accessibilité
  const animationDuration = reduceMotion ? 0 : duration;

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  useEffect(() => {
    // Si réduire les animations, afficher directement
    if (reduceMotion) {
      opacity.value = 1;
      translateY.value = 0;
      return;
    }

    // Délai avant l'animation
    const timer = setTimeout(() => {
      opacity.value = withTiming(1, {
        duration: animationDuration,
        easing: Easing.inOut(Easing.ease),
      });

      if (type !== 'fade') {
        translateY.value = withTiming(0, {
          duration: animationDuration,
          easing: Easing.inOut(Easing.ease),
        });
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [opacity, translateY, animationDuration, delay, type, reduceMotion]);

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
 * Respecte les préférences d'accessibilité (reduceMotionEnabled)
 */
export function ScreenTransitionExit({
  type = 'fade',
  duration = 300,
  children,
  style,
  ...props
}: Omit<ScreenTransitionWrapperProps, 'delay'>) {
  const reduceMotion = useReduceMotion();
  const opacity = useSharedValue(1);
  const translateY = useSharedValue(0);

  // Adapter la durée selon les préférences d'accessibilité
  const animationDuration = reduceMotion ? 0 : duration;

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  useEffect(() => {
    // Si réduire les animations, masquer directement
    if (reduceMotion) {
      opacity.value = 0;
      if (type !== 'fade') {
        const direction = type === 'slideUp' ? -50 : 50;
        translateY.value = direction;
      }
      return;
    }

    opacity.value = withTiming(0, {
      duration: animationDuration,
      easing: Easing.inOut(Easing.ease),
    });

    if (type !== 'fade') {
      const direction = type === 'slideUp' ? -50 : 50;
      translateY.value = withTiming(direction, {
        duration: animationDuration,
        easing: Easing.inOut(Easing.ease),
      });
    }
  }, [opacity, translateY, animationDuration, type, reduceMotion]);

  return (
    <Animated.View
      style={[animatedStyle, style]}
      {...props}
    >
      {children}
    </Animated.View>
  );
}
