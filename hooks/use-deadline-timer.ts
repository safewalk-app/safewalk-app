import { useEffect, useState, useCallback } from 'react';

export interface DeadlineTimerState {
  timeRemaining: number; // en secondes
  displayText: string; // "HH:MM:SS restantes"
  isExpired: boolean;
  isAlertImminent: boolean; // true si < 5 minutes
  percentage: number; // 0-100 pour barre de progression
}

/**
 * Hook pour afficher un countdown jusqu'à une deadline
 * Affiche le temps restant en format HH:MM:SS
 * Alerte si < 5 minutes
 *
 * Utilisation:
 * ```tsx
 * const deadline = useDeadlineTimer(new Date(deadlineISO));
 *
 * <Text className={deadline.isAlertImminent ? "text-error" : "text-foreground"}>
 *   {deadline.displayText}
 * </Text>
 * ```
 */
export function useDeadlineTimer(
  deadline: Date | null | undefined,
  onExpired?: () => void,
  onAlertImminent?: () => void,
): DeadlineTimerState {
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isAlertImminent, setIsAlertImminent] = useState(false);
  const [wasAlertSent, setWasAlertSent] = useState(false);

  // Mettre à jour le temps restant chaque seconde
  useEffect(() => {
    if (!deadline) return;

    const updateTimer = () => {
      const now = Date.now();
      const deadlineTime = deadline.getTime();
      const remaining = Math.max(0, deadlineTime - now);
      const remainingSeconds = Math.floor(remaining / 1000);

      setTimeRemaining(remainingSeconds);

      // Vérifier si alerte imminente (< 5 minutes = 300 secondes)
      const isImminent = remainingSeconds > 0 && remainingSeconds <= 300;
      setIsAlertImminent(isImminent);

      // Appeler le callback une seule fois quand alerte devient imminente
      if (isImminent && !wasAlertSent) {
        onAlertImminent?.();
        setWasAlertSent(true);
      }

      // Vérifier si expiré
      if (remainingSeconds === 0) {
        onExpired?.();
      }
    };

    // Mise à jour immédiate
    updateTimer();

    // Mettre à jour chaque seconde
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [deadline, onExpired, onAlertImminent, wasAlertSent]);

  // Formater le temps en HH:MM:SS
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    const pad = (num: number) => String(num).padStart(2, '0');

    if (hours > 0) {
      return `${pad(hours)}:${pad(minutes)}:${pad(secs)} restantes`;
    }
    return `${pad(minutes)}:${pad(secs)} restantes`;
  };

  // Calculer le pourcentage (pour barre de progression)
  const calculatePercentage = (): number => {
    if (!deadline) return 100;

    const now = Date.now();
    const deadlineTime = deadline.getTime();
    const createdTime = deadlineTime - timeRemaining * 1000; // Estimer le temps de création
    const totalDuration = deadlineTime - createdTime;
    const elapsed = now - createdTime;

    return Math.max(0, Math.min(100, (elapsed / totalDuration) * 100));
  };

  return {
    timeRemaining,
    displayText: formatTime(timeRemaining),
    isExpired: timeRemaining === 0,
    isAlertImminent,
    percentage: calculatePercentage(),
  };
}

/**
 * Hook pour gérer plusieurs deadlines (pour futures extensions)
 */
export function useMultipleDeadlines(
  deadlines: Record<string, Date | null | undefined>,
): Record<string, DeadlineTimerState> {
  const result: Record<string, DeadlineTimerState> = {};

  for (const [key, deadline] of Object.entries(deadlines)) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const timer = useDeadlineTimer(deadline);
    result[key] = timer;
  }

  return result;
}
