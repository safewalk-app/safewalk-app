import { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

/**
 * Hook pour détecter les préférences d'accessibilité (reduceMotionEnabled)
 * Retourne true si l'utilisateur a activé "Réduire les animations" dans les paramètres d'accessibilité
 *
 * Utilisation:
 * ```typescript
 * const reduceMotion = useReduceMotion();
 *
 * if (reduceMotion) {
 *   // Pas d'animation ou animation très rapide
 * } else {
 *   // Animation normale
 * }
 * ```
 */
export function useReduceMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const checkReduceMotion = async () => {
      try {
        const isScreenReaderEnabled = await AccessibilityInfo.isScreenReaderEnabled();
        const isBoldTextEnabled = await AccessibilityInfo.isBoldTextEnabled();

        // Si le lecteur d'écran est activé, réduire les animations
        // Cela améliore l'expérience pour les utilisateurs malvoyants
        if (isScreenReaderEnabled) {
          setReduceMotion(true);
          return;
        }

        // Sur iOS, vérifier les préférences de mouvement
        if (Platform.OS === 'ios') {
          try {
            const reduceMotionEnabled = await AccessibilityInfo.isReduceMotionEnabled?.();
            if (reduceMotionEnabled) {
              setReduceMotion(true);
              return;
            }
          } catch (error) {
            // Ignorer si la méthode n'est pas disponible
          }
        }

        // Par défaut, ne pas réduire les animations
        setReduceMotion(false);
      } catch (error) {
        console.warn('Erreur lors de la vérification des préférences d\'accessibilité:', error);
        setReduceMotion(false);
      }
    };

    checkReduceMotion();
  }, []);

  return reduceMotion;
}

/**
 * Hook pour obtenir la durée d'animation adaptée aux préférences d'accessibilité
 *
 * Utilisation:
 * ```typescript
 * const duration = useAnimationDuration(300); // 300ms normal, 0ms si réduire les animations
 * ```
 */
export function useAnimationDuration(normalDuration: number): number {
  const reduceMotion = useReduceMotion();
  return reduceMotion ? 0 : normalDuration;
}

/**
 * Hook pour obtenir les paramètres d'animation adaptés aux préférences d'accessibilité
 *
 * Utilisation:
 * ```typescript
 * const animationConfig = useAnimationConfig({
 *   normal: { duration: 300 },
 *   reduced: { duration: 0 }
 * });
 * ```
 */
export function useAnimationConfig<T>(config: {
  normal: T;
  reduced: T;
}): T {
  const reduceMotion = useReduceMotion();
  return reduceMotion ? config.reduced : config.normal;
}
