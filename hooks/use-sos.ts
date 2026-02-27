import { useCallback, useState } from 'react';
import { useNotifications } from './use-notifications';
import { useRealTimeLocation } from './use-real-time-location';
import { sendEmergencySMS } from '@/lib/services/sms-service';
import { useApp } from '@/lib/context/app-context';
import { logger } from '@/lib/logger';

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
  onSuccess?: (result: SOSResult) => void;
  onError?: (error: Error) => void;
  location?: { latitude: number; longitude: number; accuracy?: number };
}

/**
 * Hook pour déclencher une alerte SOS d'urgence
 * Envoie SMS immédiatement à tous les contacts d'urgence avec position GPS
 */
export function useSOS(options: UseSOSOptions) {
  const { sessionId, onSuccess, onError, location: initialLocation } = options;
  const { sendNotification } = useNotifications();
  const { getSnapshot } = useRealTimeLocation({ enabled: true });
  const { settings, currentSession } = useApp();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const triggerSOS = useCallback(async () => {
    logger.info('=== DÉBUT TRIGGER SOS ===');
    logger.info('Session ID:', sessionId);
    logger.info('Settings:', {
      contact1: settings.emergencyContactPhone,
      firstName: settings.firstName,
    });
    logger.info('Location initiale:', initialLocation);

    try {
      setIsLoading(true);
      setError(null);

      // CRITIQUE #3: Verifier que le contact d'urgence est configure et valide
      if (!settings.emergencyContactPhone || !settings.emergencyContactName) {
        const { Alert } = require('react-native');
        Alert.alert(
          "Contact d'urgence manquant",
          "Veuillez configurer un contact d'urgence avant de declencher SOS.",
        );
        throw new Error("Contact d'urgence non configure");
      }

      // CRITIQUE #7: Verifier que les credits sont disponibles pour SOS
      const hasCredits =
        currentSession?.subscription_active || (currentSession?.free_alerts_remaining || 0) > 0;
      if (!hasCredits) {
        const { Alert } = require('react-native');
        Alert.alert(
          'Credits insuffisants',
          "Vous n'avez pas assez de credits pour declencher une alerte SOS.",
        );
        throw new Error('Credits insuffisants');
      }

      logger.info('🚨 Déclenchement SOS pour session:', sessionId);

      // Envoyer notification locale immédiate
      try {
        logger.info('🔔 [Notification] Envoi notification SOS');
        sendNotification({
          title: '🚨 ALERTE SOS DÉCLENCHÉE',
          body: "Alerte d'urgence envoyée à vos contacts. Restez en sécurité.",
          data: { type: 'sos_triggered' },
        });
      } catch (notifErr) {
        logger.warn('Erreur notification:', notifErr);
      }

      // Utiliser la position passée en paramètre ou capturer une nouvelle
      logger.info('📍 Capture de la position GPS...');
      let currentLocation: { latitude: number; longitude: number; accuracy?: number } | undefined =
        initialLocation;
      if (!currentLocation) {
        const snapshot = await getSnapshot();
        if (snapshot) {
          currentLocation = snapshot;
        }
      }
      logger.info('📍 Position capturée pour SOS:', currentLocation);

      if (!currentLocation) {
        logger.warn('⚠️ Position non disponible, envoi SOS sans coordonnées');
      }

      // Vérifier qu'il y a au moins un contact
      if (!settings.emergencyContactPhone) {
        throw new Error("Aucun contact d'urgence configuré");
      }

      const smsResults: Array<{
        contact: string;
        phone: string;
        status: 'sent' | 'failed';
        messageSid?: string;
      }> = [];

      // Envoyer SMS au contact 1
      if (settings.emergencyContactPhone) {
        logger.info('📤 [SOS] Envoi SMS au contact 1...');
        const result1 = await sendEmergencySMS({
          reason: 'sos',
          contactName: settings.emergencyContactName || 'Contact',
          contactPhone: settings.emergencyContactPhone,
          firstName: settings.firstName,
          note: currentSession?.note,
          location: currentLocation,
        });

        smsResults.push({
          contact: settings.emergencyContactName || 'Contact 1',
          phone: settings.emergencyContactPhone,
          status: result1.ok ? 'sent' : 'failed',
          messageSid: result1.sid,
        });

        if (result1.ok) {
          logger.info('✅ [SOS] SMS envoyé au contact 1 (SID:', result1.sid, ')');
        } else {
          logger.error('❌ [SOS] Échec envoi SMS au contact 1:', result1.error);
        }
      }

      // Vérifier si au moins un SMS a été envoyé
      const successCount = smsResults.filter((r) => r.status === 'sent').length;
      if (successCount === 0) {
        throw new Error("Échec de l'envoi de tous les SMS");
      }

      const result: SOSResult = {
        success: true,
        message: `SOS envoyé à ${successCount} contact(s)`,
        smsResults,
      };

      logger.info('✅ Alerte SOS déclenchée avec succès:', result);
      onSuccess?.(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      logger.error('❌ Erreur SOS:', errorMessage);
      logger.error('Stack trace:', err);
      setError(errorMessage);

      // Afficher une alerte pour informer l'utilisateur
      const { Alert } = require('react-native');
      Alert.alert('❌ Erreur SOS', `Impossible d'envoyer l'alerte: ${errorMessage}`, [
        { text: 'OK' },
      ]);

      onError?.(err instanceof Error ? err : new Error(errorMessage));
    } finally {
      setIsLoading(false);
    }
  }, [
    sessionId,
    getSnapshot,
    sendNotification,
    settings,
    currentSession,
    onSuccess,
    onError,
    initialLocation,
  ]);

  return {
    triggerSOS,
    isLoading,
    error,
  };
}
