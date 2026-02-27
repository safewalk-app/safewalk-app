import React from 'react';
import { View, ViewProps } from 'react-native';
import Animated from 'react-native-reanimated';
import { useStateAnimation, type AnimationState } from '@/hooks/use-state-animation';
import { useReduceMotion } from '@/hooks/use-reduce-motion';

interface FeedbackAnimationProps extends ViewProps {
  /**
   * État de l'animation: 'idle' | 'loading' | 'success' | 'error'
   */
  state: AnimationState;
  /**
   * Contenu à animer
   */
  children: React.ReactNode;
  /**
   * Durée de l'animation en ms (défaut: 300)
   */
  duration?: number;
  /**
   * Durée de l'animation de succès en ms (défaut: 500)
   */
  successDuration?: number;
  /**
   * Durée de l'animation d'erreur en ms (défaut: 600)
   */
  errorDuration?: number;
}

/**
 * Composant pour animer les changements d'état
 * Respecte les préférences d'accessibilité (reduceMotionEnabled)
 *
 * Exemples:
 * ```tsx
 * <FeedbackAnimation state={isLoading ? 'loading' : 'idle'}>
 *   <Button>Démarrer</Button>
 * </FeedbackAnimation>
 *
 * <FeedbackAnimation state={submitState}>
 *   <Text>Résultat</Text>
 * </FeedbackAnimation>
 * ```
 */
export function FeedbackAnimation({
  state,
  children,
  duration = 300,
  successDuration = 500,
  errorDuration = 600,
  style,
  ...props
}: FeedbackAnimationProps) {
  const reduceMotion = useReduceMotion();

  // Adapter les durées selon les préférences d'accessibilité
  const animationDuration = reduceMotion ? 0 : duration;
  const animationSuccessDuration = reduceMotion ? 0 : successDuration;
  const animationErrorDuration = reduceMotion ? 0 : errorDuration;

  const { animatedStyle } = useStateAnimation(state, {
    duration: animationDuration,
    successDuration: animationSuccessDuration,
    errorDuration: animationErrorDuration,
  });

  return (
    <Animated.View style={[animatedStyle, style]} {...props}>
      {children}
    </Animated.View>
  );
}

/**
 * Composant pour afficher un indicateur de chargement avec animation
 */
export function LoadingIndicator() {
  const reduceMotion = useReduceMotion();
  const { animatedStyle } = useStateAnimation('loading', {
    duration: reduceMotion ? 0 : 300,
  });

  return (
    <Animated.View
      style={[
        animatedStyle,
        {
          width: 24,
          height: 24,
          borderRadius: 12,
          borderWidth: 2,
          borderColor: '#0a7ea4',
          borderTopColor: 'transparent',
        },
      ]}
    />
  );
}

/**
 * Composant pour afficher un message de succès avec animation
 */
export function SuccessIndicator() {
  const reduceMotion = useReduceMotion();
  const { animatedStyle } = useStateAnimation('success', {
    successDuration: reduceMotion ? 0 : 500,
  });

  return (
    <Animated.View
      style={[
        animatedStyle,
        {
          width: 24,
          height: 24,
          borderRadius: 12,
          backgroundColor: '#22C55E',
          justifyContent: 'center',
          alignItems: 'center',
        },
      ]}
    >
      <View style={{ color: 'white', fontSize: 14 }}>✓</View>
    </Animated.View>
  );
}

/**
 * Composant pour afficher un message d'erreur avec animation
 */
export function ErrorIndicator() {
  const reduceMotion = useReduceMotion();
  const { animatedStyle } = useStateAnimation('error', {
    errorDuration: reduceMotion ? 0 : 600,
  });

  return (
    <Animated.View
      style={[
        animatedStyle,
        {
          width: 24,
          height: 24,
          borderRadius: 12,
          backgroundColor: '#EF4444',
          justifyContent: 'center',
          alignItems: 'center',
        },
      ]}
    >
      <View style={{ color: 'white', fontSize: 14 }}>!</View>
    </Animated.View>
  );
}
