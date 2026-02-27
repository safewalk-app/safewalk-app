import { useState, useCallback, useRef, useEffect } from 'react';

interface UseCooldownOptions {
  duration?: number; // millisecondes
}

interface UseCooldownResult {
  trigger: (callback: () => Promise<void>) => Promise<void>;
  isOnCooldown: boolean;
  remainingTime: number;
  reset: () => void;
}

/**
 * Hook pour ajouter un cooldown entre les requêtes
 * Utile pour éviter les clics multiples et les appels API dupliqués
 *
 * @param options - Options (duration en millisecondes)
 * @returns { trigger, isOnCooldown, remainingTime, reset }
 *
 * @example
 * const { trigger, isOnCooldown, remainingTime } = useCooldown({ duration: 2000 });
 *
 * const handleClick = async () => {
 *   await trigger(async () => {
 *     await api.doSomething();
 *   });
 * };
 *
 * <Button disabled={isOnCooldown}>
 *   {isOnCooldown ? `Attendre ${Math.ceil(remainingTime / 1000)}s` : "Cliquer"}
 * </Button>
 */
export function useCooldown(options: UseCooldownOptions = {}): UseCooldownResult {
  const { duration = 1000 } = options;
  const [isOnCooldown, setIsOnCooldown] = useState(false);
  const [remainingTime, setRemainingTime] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout>();
  const cooldownEndRef = useRef<number>(0);

  // Nettoyer l'intervalle au démontage
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const trigger = useCallback(
    async (callback: () => Promise<void>) => {
      if (isOnCooldown) {
        console.warn('Action is on cooldown');
        return;
      }

      try {
        // Exécuter la callback
        await callback();
      } catch (error) {
        console.error('Error in cooldown callback:', error);
      } finally {
        // Démarrer le cooldown
        setIsOnCooldown(true);
        cooldownEndRef.current = Date.now() + duration;

        // Mettre à jour le temps restant toutes les 100ms
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }

        intervalRef.current = setInterval(() => {
          const now = Date.now();
          const remaining = Math.max(0, cooldownEndRef.current - now);

          setRemainingTime(remaining);

          if (remaining <= 0) {
            clearInterval(intervalRef.current);
            setIsOnCooldown(false);
            setRemainingTime(0);
          }
        }, 100);
      }
    },
    [isOnCooldown, duration],
  );

  const reset = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    setIsOnCooldown(false);
    setRemainingTime(0);
  }, []);

  return { trigger, isOnCooldown, remainingTime, reset };
}
