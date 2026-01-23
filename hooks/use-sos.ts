import { useCallback, useState } from 'react';
import { useNotifications } from './use-notifications';
import { useRealTimeLocation } from './use-real-time-location';
import { API_BASE_URL } from '@/lib/config/api';
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
  location?: { latitude: number; longitude: number; accuracy?: number };
}

/**
 * Hook pour déclencher une alerte SOS d'urgence
 * Envoie SMS immédiatement à tous les contacts d'urgence avec position GPS
 */
export function useSOS(options: UseSOSOptions) {
  const { sessionId, userId, onSuccess, onError, location: initialLocation } = options;
  const { sendNotification } = useNotifications();
  const { getSnapshot } = useRealTimeLocation({ enabled: true });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const triggerSOS = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Garde-fou anti-spam : bloquer si SOS envoyé il y a moins de 60s
      const { canSendSMS } = await import('@/lib/utils');
      if (!canSendSMS('sos', 60)) {
        console.warn('🚫 [SOS] SMS bloqué par anti-spam');
        setIsLoading(false);
        return;
      }

      console.log('🚨 Déclenchement SOS pour session:', sessionId);

      // Envoyer notification locale immédiate
      try {
        console.log('🔔 [Notification] Envoi notification SOS');
        sendNotification({
          title: '🚨 ALERTE SOS DÉCLENCHÉE',
          body: 'Alerte d\'urgence envoyée à vos contacts. Restez en sécurité.',
          data: { type: 'sos_triggered' },
        });
      } catch (notifErr) {
        console.warn('Erreur notification:', notifErr);
      }

      // Utiliser la position passée en paramètre ou capturer une nouvelle
      console.log('📍 Capture de la position GPS...');
      let currentLocation: { latitude: number; longitude: number; accuracy?: number } | undefined = initialLocation;
      if (!currentLocation) {
        const snapshot = await getSnapshot();
        if (snapshot) {
          currentLocation = snapshot;
        }
      }
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
      console.log('🔗 URL API:', API_BASE_URL);

      const response = await axios.post(
        `${API_BASE_URL}/api/sos/trigger`,
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
  }, [sessionId, userId, getSnapshot, sendNotification, onSuccess, onError, initialLocation]);

  return {
    triggerSOS,
    isLoading,
    error,
  };
}
