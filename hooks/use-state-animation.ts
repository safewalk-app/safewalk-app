import { useRef } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import { useReduceMotion } from './use-reduce-motion';

export type AnimationState = 'idle' | 'loading' | 'success' | 'error';

interface UseStateAnimationOptions {
  duration?: number;
  successDuration?: number;
  errorDuration?: number;
}

/**
 * Hook pour animer les changements d'état (loading, success, error)
 * Respecte les préférences d'accessibilité (reduceMotionEnabled)
 * Fournit des valeurs animées pour opacity, scale et translateY
 */
export function useStateAnimation(state: AnimationState, options: UseStateAnimationOptions = {}) {
  const reduceMotion = useReduceMotion();
  const { duration = 300, successDuration = 500, errorDuration = 600 } = options;

  // Adapter les durées selon les préférences d'accessibilité
  const animationDuration = reduceMotion ? 0 : duration;
  const animationSuccessDuration = reduceMotion ? 0 : successDuration;
  const animationErrorDuration = reduceMotion ? 0 : errorDuration;

  // Valeurs animées
  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);
  const translateY = useSharedValue(0);

  // Styles animés
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }, { translateY: translateY.value }],
  }));

  // Animer selon l'état
  useEffect(() => {
    switch (state) {
      case 'loading':
        // Fade in + scale down légèrement
        opacity.value = withTiming(0.8, {
          duration: animationDuration,
          easing: Easing.inOut(Easing.ease),
        });
        scale.value = withTiming(0.98, {
          duration: animationDuration,
          easing: Easing.inOut(Easing.ease),
        });
        break;

      case 'success':
        // Pulse effect: scale up puis retour à la normale
        scale.value = withSequence(
          withTiming(1.05, {
            duration: animationSuccessDuration / 2,
            easing: Easing.out(Easing.ease),
          }),
          withTiming(1, {
            duration: animationSuccessDuration / 2,
            easing: Easing.in(Easing.ease),
          }),
        );
        opacity.value = withTiming(1, {
          duration: animationSuccessDuration,
          easing: Easing.inOut(Easing.ease),
        });
        break;

      case 'error':
        // Shake effect: translateY haut-bas
        translateY.value = withSequence(
          withTiming(-8, {
            duration: animationErrorDuration / 4,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(8, {
            duration: animationErrorDuration / 4,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(-4, {
            duration: animationErrorDuration / 4,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(0, {
            duration: animationErrorDuration / 4,
            easing: Easing.inOut(Easing.ease),
          }),
        );
        break;

      case 'idle':
      default:
        // Retour à l'état normal
        opacity.value = withTiming(1, {
          duration: animationDuration,
          easing: Easing.inOut(Easing.ease),
        });
        scale.value = withTiming(1, {
          duration: animationDuration,
          easing: Easing.inOut(Easing.ease),
        });
        translateY.value = withTiming(0, {
          duration: animationDuration,
          easing: Easing.inOut(Easing.ease),
        });
        break;
    }
  }, [
    state,
    opacity,
    scale,
    translateY,
    animationDuration,
    animationSuccessDuration,
    animationErrorDuration,
    reduceMotion,
  ]);

  return {
    animatedStyle,
    opacity,
    scale,
    translateY,
  };
}
