import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from '@/lib/services/supabase-client';

/**
 * Configurer les notifications push pour SafeWalk
 */
export async function setupPushNotifications() {
  try {
    // Vérifier si c'est un vrai appareil
    if (!Device.isDevice) {
      console.log('⚠️ Push notifications only work on physical devices');
      return;
    }

    // Demander les permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('❌ Push notification permissions denied');
      return;
    }

    // Configurer le comportement des notifications
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });

      // Canal pour les alertes de crédits
      await Notifications.setNotificationChannelAsync('credits', {
        name: 'Alertes de Crédits',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FFA500',
      });
    }

    // Définir le comportement par défaut
    Notifications.setNotificationHandler({
      handleNotification: async (notification) => {
        // Toujours afficher les notifications, même si l'app est en foreground
        return {
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        };
      },
    });

    console.log('✅ Push notifications configured');
  } catch (error) {
    console.error('❌ Failed to setup push notifications:', error);
  }
}

/**
 * Envoyer une notification de crédits faibles
 * @param userId - ID de l'utilisateur
 * @param creditsRemaining - Nombre de crédits restants
 */
export async function notifyLowCredits(userId: string, creditsRemaining: number) {
  try {
    // Envoyer via l'Edge Function Supabase
    const { error } = await supabase.functions.invoke('send-low-credits-notification', {
      body: {
        userId,
        creditsRemaining,
      },
    });

    if (error) throw error;

    console.log('✅ Low credits notification sent');
  } catch (error) {
    console.error('❌ Failed to send low credits notification:', error);
  }
}

/**
 * Envoyer une notification locale (pour les tests)
 */
export async function sendLocalNotification(
  title: string,
  body: string,
  channelId: string = 'default'
) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: 'default',
        badge: 1,
      },
      trigger: {
        seconds: 2,
      },
    });

    console.log('✅ Local notification scheduled');
  } catch (error) {
    console.error('❌ Failed to schedule local notification:', error);
  }
}

/**
 * Listener pour les notifications reçues en foreground
 */
export function setupNotificationListeners() {
  // Notification reçue en foreground
  const foregroundSubscription = Notifications.addNotificationReceivedListener((notification) => {
    console.log('📬 Notification received (foreground):', notification);

    // Vous pouvez ajouter une logique ici pour mettre à jour l'UI
    // Par exemple, afficher un badge ou recharger les crédits
  });

  // Utilisateur a cliqué sur la notification
  const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
    console.log('👆 Notification tapped:', response);

    // Vous pouvez ajouter une logique ici pour naviguer vers le paywall
    // Par exemple: router.push('/paywall')
  });

  return () => {
    foregroundSubscription.remove();
    responseSubscription.remove();
  };
}

/**
 * Envoyer une notification de succès de paiement
 */
export async function notifyPaymentSuccess(creditsAdded: number, totalCredits: number) {
  try {
    await sendLocalNotification(
      '💳 Paiement réussi',
      `${creditsAdded} alertes ajoutées. Total: ${totalCredits} alertes`,
      'credits'
    );
  } catch (error) {
    console.error('❌ Failed to send payment success notification:', error);
  }
}

/**
 * Envoyer une notification d'erreur de paiement
 */
export async function notifyPaymentError(error: string) {
  try {
    await sendLocalNotification(
      '❌ Erreur de paiement',
      error,
      'credits'
    );
  } catch (err) {
    console.error('❌ Failed to send payment error notification:', err);
  }
}
