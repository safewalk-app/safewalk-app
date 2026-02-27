import { useEffect, useState, useCallback } from 'react';

export interface CooldownState {
  isOnCooldown: boolean;
  secondsRemaining: number;
  displayText: string;
}

/**
 * Hook pour gérer les timers de cooldown sur les boutons
 * Affiche un countdown visible pendant le rate limiting
 *
 * Utilisation:
 * ```tsx
 * const cooldown = useCooldownTimer('otp', 60); // 60 secondes de cooldown
 *
 * <Pressable disabled={cooldown.isOnCooldown}>
 *   <Text>{cooldown.displayText}</Text>
 * </Pressable>
 * ```
 */
export function useCooldownTimer(
  key: string,
  durationSeconds: number,
  onCooldownEnd?: () => void,
): CooldownState {
  const [secondsRemaining, setSecondsRemaining] = useState(0);

  // Récupérer le cooldown depuis le localStorage (pour persister entre les montages)
  useEffect(() => {
    const storedCooldown = localStorage.getItem(`cooldown_${key}`);
    if (storedCooldown) {
      const expiresAt = parseInt(storedCooldown, 10);
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((expiresAt - now) / 1000));

      if (remaining > 0) {
        setSecondsRemaining(remaining);
      } else {
        localStorage.removeItem(`cooldown_${key}`);
      }
    }
  }, [key]);

  // Décrémenter le timer chaque seconde
  useEffect(() => {
    if (secondsRemaining <= 0) return;

    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        const next = prev - 1;

        if (next <= 0) {
          localStorage.removeItem(`cooldown_${key}`);
          onCooldownEnd?.();
          return 0;
        }

        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [secondsRemaining, key, onCooldownEnd]);

  // Fonction pour déclencher le cooldown
  const startCooldown = useCallback(() => {
    const expiresAt = Date.now() + durationSeconds * 1000;
    localStorage.setItem(`cooldown_${key}`, expiresAt.toString());
    setSecondsRemaining(durationSeconds);
  }, [key, durationSeconds]);

  // Fonction pour réinitialiser le cooldown
  const resetCooldown = useCallback(() => {
    localStorage.removeItem(`cooldown_${key}`);
    setSecondsRemaining(0);
  }, [key]);

  // Formater le texte d'affichage
  const displayText = secondsRemaining > 0 ? `Réessayer dans ${secondsRemaining}s` : 'Réessayer';

  return {
    isOnCooldown: secondsRemaining > 0,
    secondsRemaining,
    displayText,
    startCooldown,
    resetCooldown,
  } as CooldownState & {
    startCooldown: () => void;
    resetCooldown: () => void;
  };
}

/**
 * Hook pour gérer plusieurs cooldowns simultanément
 * Utile pour les écrans avec plusieurs boutons
 */
export function useMultipleCooldowns(
  cooldowns: Record<string, number>,
): Record<string, CooldownState & { startCooldown: () => void; resetCooldown: () => void }> {
  const result: Record<string, any> = {};

  for (const [key, duration] of Object.entries(cooldowns)) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const cooldown = useCooldownTimer(key, duration);
    result[key] = cooldown;
  }

  return result;
}
