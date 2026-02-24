import { useEffect, useRef, useCallback } from 'react';
import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { logger } from '@/lib/logger';

// Configurer les catégories de notifications avec actions
if (Platform.OS !== 'web') {
  Notifications.setNotificationCategoryAsync('session_alert', [
    {
      identifier: 'confirm_safe',
      buttonTitle: '✅ Je suis rentré',
      options: {
        opensAppToForeground: false,
      },
    },
    {
      identifier: 'extend_session',
      buttonTitle: '⏰ +15 min',
      options: {
        opensAppToForeground: false,
      },
    },
    {
      identifier: 'trigger_sos',
      buttonTitle: '🚨 SOS',
      options: {
        opensAppToForeground: true,
      },
    },
  ]).catch(err => logger.error('⚠️ Erreur config catégories:', err));
}

// Configurer le gestionnaire de notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface NotificationOptions {
  title: string;
  body: string;
  data?: Record<string, any>;
  delay?: number; // en secondes
  categoryIdentifier?: string; // Catégorie pour actions (iOS/Android)
}

/**
 * Hook pour gérer les notifications push locales
 */
export function useNotifications() {
  const notificationListenerRef = useRef<any>(null);
  const responseListenerRef = useRef<any>(null);

  useEffect(() => {
    // Demander les permissions au montage
    (async () => {
      await requestNotificationPermissions();
    })();

    // Écouter les notifications reçues
    notificationListenerRef.current = (Notifications.addNotificationReceivedListener as any)(
      (notification: any) => {
        logger.info('📬 Notification reçue:', notification);
      }
    );

    // Écouter les réponses aux notifications (tap)
    responseListenerRef.current = (Notifications.addNotificationResponseReceivedListener as any)(
      (response: any) => {
        logger.info('👆 Notification tapée:', response.notification.request.content);
      }
    );

    return () => {
      if (notificationListenerRef.current) {
        notificationListenerRef.current.remove();
      }
      if (responseListenerRef.current) {
        responseListenerRef.current.remove();
      }
    };
  }, []);

  /**
   * Demander les permissions de notification
   */
  const requestNotificationPermissions = async (): Promise<boolean> => {
    try {
      const { status } = await (Notifications.requestPermissionsAsync as any)();
      if (status !== 'granted') {
        logger.warn('⚠️ Permission de notification refusée');
        return false;
      }
      logger.info('✅ Permission de notification accordée');
      return true;
    } catch (error) {
      logger.error('Erreur lors de la demande de permission:', error);
      return false;
    }
  };

  /**
   * Envoyer une notification locale immédiate
   */
  const sendNotification = useCallback(async (options: NotificationOptions): Promise<string | null> => {
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: options.title,
          body: options.body,
          data: options.data || {},
          sound: 'default',
          badge: 1,
          categoryIdentifier: options.categoryIdentifier,
        },
        trigger: null, // null = immédiate
      });

      logger.info('📤 Notification envoyée:', options.title);
      
      // Retour haptique subtil (uniquement sur mobile)
      if (Platform.OS !== 'web') {
        try {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch (hapticError) {
          // Ignorer les erreurs haptiques (simulateur, appareil sans support)
        }
      }
      
      return notificationId;
    } catch (error) {
      logger.error('Erreur lors de l\'envoi de la notification:', error);
      return null;
    }
  }, []);

  /**
   * Programmer une notification pour plus tard
   */
  const scheduleNotification = useCallback(async (
    options: NotificationOptions,
    triggerDate: Date | number
  ): Promise<string | null> => {
    try {
      const trigger = triggerDate instanceof Date 
        ? { type: 'date' as const, date: triggerDate } 
        : { type: 'timeInterval' as const, seconds: triggerDate, repeats: false };

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: options.title,
          body: options.body,
          data: options.data || {},
          sound: 'default',
          badge: 1,
          categoryIdentifier: options.categoryIdentifier,
        },
        trigger: trigger as any,
      });

      const delayInfo = triggerDate instanceof Date 
        ? `à ${triggerDate.toLocaleTimeString()}`
        : `dans ${triggerDate}s`;
      logger.info(`📅 Notification programmée ${delayInfo}:`, options.title);
      return notificationId;
    } catch (error) {
      logger.error('Erreur lors de la programmation de la notification:', error);
      return null;
    }
  }, []);

  /**
   * Annuler une notification programmée
   */
  const cancelNotification = useCallback(async (notificationId: string): Promise<void> => {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      logger.info('❌ Notification annulée:', notificationId);
    } catch (error) {
      logger.error('Erreur lors de l\'annulation de la notification:', error);
    }
  }, []);

  /**
   * Annuler toutes les notifications programmées
   */
  const cancelAllNotifications = useCallback(async (): Promise<void> => {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      logger.info('❌ Toutes les notifications annulées');
    } catch (error) {
      logger.error('Erreur lors de l\'annulation des notifications:', error);
    }
  }, []);

  /**
   * Envoyer une notification d'alerte timer expiré
   */
  const sendTimerExpiredNotification = async (): Promise<string | null> => {
    return sendNotification({
      title: '⏰ Temps écoulé',
      body: 'Ton heure limite est atteinte. Confirme ton retour ou une alerte sera envoyée.',
      data: { type: 'timer_expired' },
    });
  };

  /**
   * Envoyer une notification d'alerte imminente
   */
  const sendAlertImminent = async (minutesRemaining: number): Promise<string | null> => {
    return sendNotification({
      title: '⚠️ Alerte imminente',
      body: `Alerte dans ${minutesRemaining} minute(s). Confirme ton retour maintenant.`,
      data: { type: 'alert_imminent', minutesRemaining },
    });
  };

  /**
   * Programmer une notification d'alerte
   */
  const scheduleAlertNotification = async (
    secondsUntilAlert: number
  ): Promise<string | null> => {
    return scheduleNotification(
      {
        title: '🚨 Alerte envoyée',
        body: 'Ton contact d\'urgence a été notifié. Tout va bien ?',
        data: { type: 'alert_triggered' },
      },
      secondsUntilAlert
    );
  };

  return {
    sendNotification,
    scheduleNotification,
    cancelNotification,
    cancelAllNotifications,
    sendTimerExpiredNotification,
    sendAlertImminent,
    scheduleAlertNotification,
    requestNotificationPermissions,
  };
}
