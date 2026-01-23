import { useCallback, useState } from 'react';
import { useNotifications } from './use-notifications';
import { useRealTimeLocation } from './use-real-time-location';
import { sendEmergencySMS } from '@/lib/services/sms-service';
import { useApp } from '@/lib/context/app-context';

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
  const { settings, currentSession } = useApp();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const triggerSOS = useCallback(async () => {
    console.log('=== DÉBUT TRIGGER SOS ===');
    console.log('Session ID:', sessionId);
    console.log('Settings:', {
      contact1: settings.emergencyContactPhone,
      contact2: settings.emergencyContact2Phone,
      firstName: settings.firstName,
    });
    console.log('Location initiale:', initialLocation);
    
    try {
      setIsLoading(true);
      setError(null);

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

      // Vérifier qu'il y a au moins un contact
      if (!settings.emergencyContactPhone && !settings.emergencyContact2Phone) {
        throw new Error('Aucun contact d\'urgence configuré');
      }

      const smsResults: Array<{
        contact: string;
        phone: string;
        status: 'sent' | 'failed';
        messageSid?: string;
      }> = [];

      // Envoyer SMS au contact 1
      if (settings.emergencyContactPhone) {
        console.log('📤 [SOS] Envoi SMS au contact 1...');
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
          console.log('✅ [SOS] SMS envoyé au contact 1 (SID:', result1.sid, ')');
        } else {
          console.error('❌ [SOS] Échec envoi SMS au contact 1:', result1.error);
        }
      }

      // Envoyer SMS au contact 2
      if (settings.emergencyContact2Phone) {
        console.log('📤 [SOS] Envoi SMS au contact 2...');
        const result2 = await sendEmergencySMS({
          reason: 'sos',
          contactName: settings.emergencyContact2Name || 'Contact 2',
          contactPhone: settings.emergencyContact2Phone,
          firstName: settings.firstName,
          note: currentSession?.note,
          location: currentLocation,
        });

        smsResults.push({
          contact: settings.emergencyContact2Name || 'Contact 2',
          phone: settings.emergencyContact2Phone,
          status: result2.ok ? 'sent' : 'failed',
          messageSid: result2.sid,
        });

        if (result2.ok) {
          console.log('✅ [SOS] SMS envoyé au contact 2 (SID:', result2.sid, ')');
        } else {
          console.error('❌ [SOS] Échec envoi SMS au contact 2:', result2.error);
        }
      }

      // Vérifier si au moins un SMS a été envoyé
      const successCount = smsResults.filter(r => r.status === 'sent').length;
      if (successCount === 0) {
        throw new Error('Échec de l\'envoi de tous les SMS');
      }

      const result: SOSResult = {
        success: true,
        message: `SOS envoyé à ${successCount} contact(s)`,
        smsResults,
      };

      console.log('✅ Alerte SOS déclenchée avec succès:', result);
      onSuccess?.(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      console.error('❌ Erreur SOS:', errorMessage);
      console.error('Stack trace:', err);
      setError(errorMessage);
      
      // Afficher une alerte pour informer l'utilisateur
      const { Alert } = require('react-native');
      Alert.alert(
        '❌ Erreur SOS',
        `Impossible d'envoyer l'alerte: ${errorMessage}`,
        [{ text: 'OK' }]
      );
      
      onError?.(err instanceof Error ? err : new Error(errorMessage));
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, userId, getSnapshot, sendNotification, settings, currentSession, onSuccess, onError, initialLocation]);

  return {
    triggerSOS,
    isLoading,
    error,
  };
}
