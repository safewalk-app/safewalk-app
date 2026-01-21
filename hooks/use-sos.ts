import { useCallback, useState } from 'react';
import { useNotifications } from './use-notifications';
import { useRealTimeLocation } from './use-real-time-location';
import axios from 'axios';

export interface SOSResult {
  success: boolean;
  message?: string;
  error?: string;
  smsResults?: Array<{
    contact: string;
    phone: string;
    status: 'sent' | 'failed';
    messageSid?: string;
  }>;
}

export interface UseSOSOptions {
  sessionId: string;
  userId: number;
  onSuccess?: (result: SOSResult) => void;
  onError?: (error: Error) => void;
}

/**
 * Hook pour déclencher une alerte SOS d'urgence
 * Envoie SMS immédiatement à tous les contacts d'urgence avec position GPS
 */
export function useSOS(options: UseSOSOptions) {
  const { sessionId, userId, onSuccess, onError } = options;
  const { sendNotification } = useNotifications();
  const { getSnapshot } = useRealTimeLocation({ enabled: true });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const triggerSOS = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('🚨 Déclenchement SOS pour session:', sessionId);

      // Envoyer notification locale immédiate
      try {
        sendNotification({
          title: '🚨 ALERTE SOS DÉCLENCHÉE',
          body: 'Alerte d\'urgence envoyée à vos contacts. Restez en sécurité.',
          data: { type: 'sos_triggered' },
        });
      } catch (notifErr) {
        console.warn('Erreur notification:', notifErr);
      }

      // Capturer la position actuelle (snapshot)
      console.log('📍 Capture de la position GPS...');
      const currentLocation = await getSnapshot();
      console.log('📍 Position capturée pour SOS:', currentLocation);

      if (!currentLocation) {
        console.warn('⚠️ Position non disponible, envoi SOS sans coordonnées');
      }

      // Préparer les données
      const sosData = {
        sessionId,
        userId,
        latitude: currentLocation?.latitude,
        longitude: currentLocation?.longitude,
        accuracy: currentLocation?.accuracy,
      };

      console.log('📤 Envoi SOS avec données:', sosData);

      // Appeler l'endpoint SOS
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
      console.log('🔗 URL API:', apiUrl);

      const response = await axios.post(
        `${apiUrl}/api/sos/trigger`,
        sosData,
        {
          timeout: 30000,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('✅ Réponse SOS:', response.data);

      if (response.data.success) {
        console.log('✅ Alerte SOS déclenchée avec succès:', response.data);
        onSuccess?.(response.data);
      } else {
        throw new Error(response.data.error || 'Erreur lors du déclenchement SOS');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      console.error('❌ Erreur SOS:', errorMessage);
      setError(errorMessage);
      onError?.(err instanceof Error ? err : new Error(errorMessage));
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, userId, getSnapshot, sendNotification, onSuccess, onError]);

  return {
    triggerSOS,
    isLoading,
    error,
  };
}
