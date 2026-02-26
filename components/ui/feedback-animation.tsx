import React from 'react';
import { View, ViewProps } from 'react-native';
import Animated from 'react-native-reanimated';
import { useStateAnimation, type AnimationState } from '@/hooks/use-state-animation';

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
 * Utilise le hook useStateAnimation pour fournir des animations subtiles
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
  const { animatedStyle } = useStateAnimation(state, {
    duration,
    successDuration,
    errorDuration,
  });

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
 * Composant pour afficher un indicateur de chargement avec animation
 */
export function LoadingIndicator() {
  const { animatedStyle } = useStateAnimation('loading');

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
  const { animatedStyle } = useStateAnimation('success');

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
  const { animatedStyle } = useStateAnimation('error');

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
