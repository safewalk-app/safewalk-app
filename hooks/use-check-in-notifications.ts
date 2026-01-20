import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { useApp } from '@/lib/context/app-context';

/**
 * Hook pour gérer les notifications de check-in automatique
 * 
 * Logic:
 * 1. À la création d'une sortie, calculer midTime = now + (limitTime - now)/2
 * 2. Programmer une notification locale à midTime: "Tout va bien ?"
 * 3. Si l'utilisateur ouvre depuis la notif:
 *    - Afficher modal avec 2 actions:
 *      a) "Je vais bien ✅" => close, log checkInOk=true
 *      b) "+15 min" => extend limitTime by 15min
 * 4. Si aucune action 10 min après la 1ère notif:
 *    - Envoyer 2e notif: "On confirme que tout va bien ?"
 * 5. Pas d'alerte automatique à ce stade (alerte uniquement sur deadline)
 */

export function useCheckInNotifications() {
  const { currentSession, confirmCheckIn } = useApp();
  const notificationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const secondNotificationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!currentSession || currentSession.status !== 'active') {
      // Nettoyer les timeouts si pas de session active
      if (notificationTimeoutRef.current) {
        clearTimeout(notificationTimeoutRef.current);
      }
      if (secondNotificationTimeoutRef.current) {
        clearTimeout(secondNotificationTimeoutRef.current);
      }
      return;
    }

    // Calculer midTime = now + (limitTime - now)/2
    const now = Date.now();
    const midTime = now + (currentSession.limitTime - now) / 2;
    const delayMs = midTime - now;

    // Programmer la 1ère notification
    if (delayMs > 0) {
      notificationTimeoutRef.current = setTimeout(async () => {
        try {
          // Envoyer notification locale
          await Notifications.scheduleNotificationAsync({
            content: {
              title: 'Tout va bien ?',
              body: 'Confirme que tu vas bien ou ajoute 15 minutes',
              data: { type: 'check-in', sessionId: currentSession.id },
            },
            trigger: null, // Envoyer immédiatement
          });

          // Programmer la 2e notification (10 min après la 1ère)
          secondNotificationTimeoutRef.current = setTimeout(async () => {
            try {
              // Vérifier que la session est toujours active et pas de check-in confirmé
              if (currentSession.status === 'active' && !currentSession.checkInOk) {
                await Notifications.scheduleNotificationAsync({
                  content: {
                    title: 'On confirme que tout va bien ?',
                    body: 'Réponds rapidement pour éviter une alerte',
                    data: { type: 'check-in-reminder', sessionId: currentSession.id },
                  },
                  trigger: null, // Envoyer immédiatement
                });
              }
            } catch (error) {
              console.error('Error sending 2nd check-in notification:', error);
            }
          }, 10 * 60 * 1000); // 10 minutes
        } catch (error) {
          console.error('Error sending check-in notification:', error);
        }
      }, delayMs);
    }

    return () => {
      if (notificationTimeoutRef.current) {
        clearTimeout(notificationTimeoutRef.current);
      }
      if (secondNotificationTimeoutRef.current) {
        clearTimeout(secondNotificationTimeoutRef.current);
      }
    };
  }, [currentSession]);

  return {
    confirmCheckIn,
  };
}
