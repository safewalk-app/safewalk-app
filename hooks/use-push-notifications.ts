import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '@/lib/logger';
import {
  initializePushNotifications,
  getPushNotificationToken,
  onNotificationReceived,
  onNotificationResponse,
  PushNotificationToken,
} from '@/lib/services/push-notification-service';

export interface PushNotificationHandler {
  onNotificationReceived?: (notification: Notifications.Notification) => void;
  onNotificationResponse?: (response: Notifications.NotificationResponse) => void;
}

const PUSH_TOKEN_STORAGE_KEY = 'safewalk_push_token';

/**
 * Hook pour gérer les notifications push
 * À utiliser dans app/_layout.tsx
 */
export function usePushNotifications(handlers?: PushNotificationHandler) {
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  useEffect(() => {
    // Initialiser les notifications
    initializePushNotifications();

    // Enregistrer les listeners
    if (handlers?.onNotificationReceived) {
      notificationListener.current = onNotificationReceived(
        handlers.onNotificationReceived
      );
    }

    if (handlers?.onNotificationResponse) {
      responseListener.current = onNotificationResponse(
        handlers.onNotificationResponse
      );
    }

    // Nettoyer les listeners
    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [handlers]);

  return { notificationListener, responseListener };
}

/**
 * Hook pour obtenir et stocker le token push
 */
export function usePushToken() {
  const tokenRef = useRef<string | null>(null);

  useEffect(() => {
    const setupPushToken = async () => {
      try {
        // Vérifier si on a déjà un token stocké
        const storedToken = await AsyncStorage.getItem(PUSH_TOKEN_STORAGE_KEY);
        if (storedToken) {
          logger.info('✅ Token push récupéré du stockage:', storedToken);
          tokenRef.current = storedToken;
          return;
        }

        // Obtenir un nouveau token
        const tokenData = await getPushNotificationToken();
        if (tokenData) {
          await AsyncStorage.setItem(PUSH_TOKEN_STORAGE_KEY, tokenData.token);
          tokenRef.current = tokenData.token;
          logger.info('✅ Nouveau token push enregistré:', tokenData.token);
        }
      } catch (error) {
        logger.error('❌ Erreur lors de la configuration du token push:', error);
      }
    };

    setupPushToken();
  }, []);

  return tokenRef.current;
}

/**
 * Hook pour écouter les notifications SOS
 */
export function useSOSNotificationListener(
  onSOSAlert?: (data: Record<string, string>) => void
) {
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const { data } = response.notification.request.content;

        if (data?.type === 'alert_triggered') {
          logger.info('🚨 Notification SOS reçue:', data);
          onSOSAlert?.(data);
        }
      }
    );

    return () => subscription.remove();
  }, [onSOSAlert]);
}

/**
 * Envoyer les tokens push au serveur
 */
export async function registerPushTokenWithServer(
  supabaseClient: any,
  userId: string,
  token: string
) {
  try {
    logger.info('📤 Enregistrement du token push sur le serveur');

    const { error } = await supabaseClient
      .from('user_push_tokens')
      .upsert(
        {
          user_id: userId,
          token,
          platform: 'expo',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

    if (error) {
      logger.error('❌ Erreur lors de l\'enregistrement du token:', error);
      return false;
    }

    logger.info('✅ Token push enregistré sur le serveur');
    return true;
  } catch (error) {
    logger.error('❌ Exception lors de l\'enregistrement du token:', error);
    return false;
  }
}

/**
 * Récupérer les tokens push d'un utilisateur
 */
export async function getPushTokensForUser(
  supabaseClient: any,
  userId: string
): Promise<string[]> {
  try {
    const { data, error } = await supabaseClient
      .from('user_push_tokens')
      .select('token')
      .eq('user_id', userId);

    if (error) {
      logger.error('❌ Erreur lors de la récupération des tokens:', error);
      return [];
    }

    return data?.map((row: { token: string }) => row.token) || [];
  } catch (error) {
    logger.error('❌ Exception lors de la récupération des tokens:', error);
    return [];
  }
}

/**
 * Envoyer une notification push via la Edge Function
 */
export async function sendSOSPushNotification(
  supabaseClient: any,
  pushTokens: string[],
  userName: string,
  notificationType: string,
  additionalInfo?: string,
  location?: { latitude: number; longitude: number }
) {
  try {
    if (pushTokens.length === 0) {
      logger.warn('⚠️ Aucun token push disponible');
      return false;
    }

    logger.info(`📤 Envoi de ${pushTokens.length} notifications SOS`);

    const { data, error } = await supabaseClient.functions.invoke(
      'send-sos-notification',
      {
        body: {
          pushTokens,
          userName,
          notificationType,
          additionalInfo,
          location,
        },
      }
    );

    if (error) {
      logger.error('❌ Erreur lors de l\'envoi des notifications:', error);
      return false;
    }

    logger.info('✅ Notifications SOS envoyées:', data);
    return true;
  } catch (error) {
    logger.error('❌ Exception lors de l\'envoi des notifications:', error);
    return false;
  }
}
