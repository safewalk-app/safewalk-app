/// <reference lib="deno.window" />

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const EXPO_PUSH_API = 'https://exp.host/--/api/v2/push/send';

interface SOSNotificationRequest {
  pushTokens: string[];
  userName: string;
  notificationType:
    | 'alert_triggered'
    | 'alert_confirmed'
    | 'alert_cancelled'
    | 'extension_granted'
    | 'session_ended';
  additionalInfo?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
}

interface ExpoNotification {
  to: string;
  sound: string;
  title: string;
  body: string;
  data: Record<string, string>;
  priority: 'default' | 'high' | 'max';
  badge?: number;
  channelId?: string;
}

/**
 * Créer le contenu de la notification en fonction du type
 */
function createNotificationContent(
  type: string,
  userName: string,
  additionalInfo?: string,
  location?: { latitude: number; longitude: number },
): { title: string; body: string; priority: 'default' | 'high' | 'max'; badge?: number } {
  const locationStr = location
    ? ` (${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)})`
    : '';

  switch (type) {
    case 'alert_triggered':
      return {
        title: '🚨 ALERTE SOS',
        body: `${userName} n'a pas confirmé son retour${locationStr}`,
        priority: 'max',
        badge: 1,
      };
    case 'alert_confirmed':
      return {
        title: '✅ Alerte annulée',
        body: `${userName} a confirmé son retour.`,
        priority: 'default',
      };
    case 'alert_cancelled':
      return {
        title: '⛔ Alerte annulée',
        body: `${userName} a annulé sa sortie.`,
        priority: 'default',
      };
    case 'extension_granted':
      return {
        title: '⏱️ Délai prolongé',
        body: `${userName} a demandé 15 minutes supplémentaires.`,
        priority: 'default',
      };
    case 'session_ended':
      return {
        title: '✔️ Sortie terminée',
        body: `${userName} est rentré en sécurité.${additionalInfo ? ` ${additionalInfo}` : ''}`,
        priority: 'default',
      };
    default:
      return {
        title: 'Notification SafeWalk',
        body: 'Vous avez une nouvelle notification.',
        priority: 'default',
      };
  }
}

/**
 * Envoyer une notification via Expo Push API
 */
async function sendExpoPushNotification(
  token: string,
  notification: ExpoNotification,
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(EXPO_PUSH_API, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(notification),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`❌ Erreur Expo Push API (${response.status}):`, error);
      return { success: false, error: `API Error: ${response.status}` };
    }

    const result = await response.json();
    console.log(`✅ Notification envoyée à ${token}:`, result);
    return { success: true };
  } catch (error) {
    console.error(`❌ Erreur lors de l'envoi de la notification:`, error);
    return { success: false, error: String(error) };
  }
}

/**
 * Handler principal de la Edge Function
 */
Deno.serve(async (req) => {
  // Vérifier la méthode HTTP
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body: SOSNotificationRequest = await req.json();

    // Valider les données
    if (!body.pushTokens || body.pushTokens.length === 0) {
      return new Response(JSON.stringify({ error: 'No push tokens provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!body.userName) {
      return new Response(JSON.stringify({ error: 'User name is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log(
      `📤 [send-sos-notification] Envoi de ${body.pushTokens.length} notifications (${body.notificationType})`,
    );

    // Créer le contenu de la notification
    const content = createNotificationContent(
      body.notificationType,
      body.userName,
      body.additionalInfo,
      body.location,
    );

    // Envoyer les notifications
    const results = await Promise.all(
      body.pushTokens.map((token) =>
        sendExpoPushNotification(token, {
          to: token,
          sound: body.notificationType === 'alert_triggered' ? 'default' : 'default',
          title: content.title,
          body: content.body,
          data: {
            type: body.notificationType,
            userName: body.userName,
            timestamp: new Date().toISOString(),
            ...(body.location && {
              latitude: body.location.latitude.toString(),
              longitude: body.location.longitude.toString(),
            }),
          },
          priority: content.priority,
          badge: content.badge,
          channelId: body.notificationType === 'alert_triggered' ? 'sos-alerts' : 'info',
        }),
      ),
    );

    // Compter les succès et les erreurs
    const successCount = results.filter((r) => r.success).length;
    const errorCount = results.filter((r) => !r.success).length;

    console.log(`✅ Résumé: ${successCount} envoyées, ${errorCount} échouées`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Notifications envoyées: ${successCount}/${body.pushTokens.length}`,
        results: {
          total: body.pushTokens.length,
          successful: successCount,
          failed: errorCount,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('❌ Erreur dans send-sos-notification:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: String(error),
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
});
