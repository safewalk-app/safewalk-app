import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { logger } from '@/lib/logger';

/**
 * Service de gestion des notifications push
 * Gère l'enregistrement des tokens, la configuration des canaux, et l'envoi de notifications
 */

export interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  sound?: string;
  priority?: 'default' | 'high';
}

export interface PushNotificationToken {
  token: string;
  platform: string;
  device: string;
}

/**
 * Initialiser les notifications push
 * À appeler au démarrage de l'app
 */
export async function initializePushNotifications() {
  try {
    logger.info('🔔 Initialisation des notifications push');

    // Vérifier si l'appareil supporte les notifications
    if (!Device.isDevice) {
      logger.warn('⚠️ Les notifications push ne fonctionnent que sur les appareils réels');
      return;
    }

    // Configurer le comportement des notifications
    await Notifications.setNotificationHandler({
      handleNotification: async (notification) => {
        logger.debug('📬 Notification reçue:', notification);

        // Afficher la notification même quand l'app est au premier plan
        return {
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        };
      },
    });

    // Configurer les canaux de notification (Android)
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('sos-alerts', {
        name: 'Alertes SOS',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF0000',
        enableVibrate: true,
        enableLights: true,
        sound: 'default',
        bypassDnd: true, // Ignorer le mode silencieux
      });

      await Notifications.setNotificationChannelAsync('urgent-alerts', {
        name: 'Alertes Urgentes',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 500, 250, 500],
        lightColor: '#FF6600',
        enableVibrate: true,
        enableLights: true,
        sound: 'default',
        bypassDnd: true,
      });

      await Notifications.setNotificationChannelAsync('info', {
        name: 'Informations',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 100],
        enableVibrate: true,
        sound: 'default',
      });
    }

    logger.info('✅ Notifications push initialisées');
  } catch (error) {
    logger.error("❌ Erreur lors de l'initialisation des notifications:", error);
  }
}

/**
 * Obtenir le token de notification push
 * À stocker et envoyer au serveur pour les notifications push
 */
export async function getPushNotificationToken(): Promise<PushNotificationToken | null> {
  try {
    // Vérifier si l'appareil supporte les notifications
    if (!Device.isDevice) {
      logger.warn('⚠️ Token push non disponible sur émulateur');
      return null;
    }

    // Demander les permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      logger.warn('⚠️ Permissions de notification refusées');
      return null;
    }

    // Obtenir le token
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) {
      logger.error('❌ Project ID EAS non trouvé');
      return null;
    }

    const token = await Notifications.getExpoPushTokenAsync({
      projectId,
    });

    logger.info('✅ Token push obtenu:', token.data);

    return {
      token: token.data,
      platform: Platform.OS,
      device: Device.modelName || 'unknown',
    };
  } catch (error) {
    logger.error("❌ Erreur lors de l'obtention du token push:", error);
    return null;
  }
}

/**
 * Envoyer une notification locale (pour les tests)
 */
export async function sendLocalNotification(payload: PushNotificationPayload) {
  try {
    logger.debug('📤 Envoi notification locale:', payload);

    await Notifications.scheduleNotificationAsync({
      content: {
        title: payload.title,
        body: payload.body,
        data: payload.data || {},
        sound: payload.sound || 'default',
        badge: 1,
        priority: payload.priority === 'high' ? 'max' : 'default',
      },
      trigger: null, // Immédiat
    });

    logger.info('✅ Notification locale envoyée');
  } catch (error) {
    logger.error("❌ Erreur lors de l'envoi de la notification locale:", error);
  }
}

/**
 * Listener pour les notifications reçues
 */
export function onNotificationReceived(
  callback: (notification: Notifications.Notification) => void,
) {
  const subscription = Notifications.addNotificationReceivedListener(callback);
  return subscription;
}

/**
 * Listener pour les réponses aux notifications (tap sur notification)
 */
export function onNotificationResponse(
  callback: (response: Notifications.NotificationResponse) => void,
) {
  const subscription = Notifications.addNotificationResponseReceivedListener(callback);
  return subscription;
}

/**
 * Obtenir les permissions de notification
 */
export async function getNotificationPermissions() {
  try {
    const permissions = await Notifications.getPermissionsAsync();
    return permissions;
  } catch (error) {
    logger.error('❌ Erreur lors de la vérification des permissions:', error);
    return null;
  }
}

/**
 * Demander les permissions de notification
 */
export async function requestNotificationPermissions() {
  try {
    const permissions = await Notifications.requestPermissionsAsync();
    logger.info('✅ Permissions demandées:', permissions.status);
    return permissions;
  } catch (error) {
    logger.error('❌ Erreur lors de la demande de permissions:', error);
    return null;
  }
}

/**
 * Types de notifications SOS
 */
export enum SOSNotificationType {
  ALERT_TRIGGERED = 'alert_triggered',
  ALERT_CONFIRMED = 'alert_confirmed',
  ALERT_CANCELLED = 'alert_cancelled',
  EXTENSION_GRANTED = 'extension_granted',
  SESSION_ENDED = 'session_ended',
}

/**
 * Créer une notification SOS
 */
export function createSOSNotification(
  type: SOSNotificationType,
  userName: string,
  additionalInfo?: string,
): PushNotificationPayload {
  const baseNotification = {
    data: {
      type,
      timestamp: new Date().toISOString(),
    },
  };

  switch (type) {
    case SOSNotificationType.ALERT_TRIGGERED:
      return {
        title: '🚨 ALERTE SOS',
        body: `${userName} n'a pas confirmé son retour. Position partagée.`,
        priority: 'high',
        ...baseNotification,
      };

    case SOSNotificationType.ALERT_CONFIRMED:
      return {
        title: '✅ Alerte annulée',
        body: `${userName} a confirmé son retour.`,
        priority: 'default',
        ...baseNotification,
      };

    case SOSNotificationType.ALERT_CANCELLED:
      return {
        title: '⛔ Alerte annulée',
        body: `${userName} a annulé sa sortie.`,
        priority: 'default',
        ...baseNotification,
      };

    case SOSNotificationType.EXTENSION_GRANTED:
      return {
        title: '⏱️ Délai prolongé',
        body: `${userName} a demandé 15 minutes supplémentaires.`,
        priority: 'default',
        ...baseNotification,
      };

    case SOSNotificationType.SESSION_ENDED:
      return {
        title: '✔️ Sortie terminée',
        body: `${userName} est rentré en sécurité.${additionalInfo ? ` ${additionalInfo}` : ''}`,
        priority: 'default',
        ...baseNotification,
      };

    default:
      return {
        title: 'Notification',
        body: 'Vous avez une nouvelle notification.',
        priority: 'default',
        ...baseNotification,
      };
  }
}
