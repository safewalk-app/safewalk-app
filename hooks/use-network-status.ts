import { useEffect, useState } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { logger } from '@/lib/utils/logger';

/**
 * Hook pour détecter l'état de la connectivité réseau
 * Détecte WiFi, cellulaire, hors ligne, et mode avion
 */

export interface NetworkStatus {
  /** Est connecté à Internet (WiFi ou cellulaire) */
  isConnected: boolean;
  /** Type de connexion: wifi, cellular, none, unknown */
  type: string;
  /** Est en mode avion ou hors ligne */
  isOffline: boolean;
  /** Détails de la connexion */
  details: NetInfoState | null;
}

export function useNetworkStatus(): NetworkStatus {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isConnected: true, // Optimiste par défaut
    type: 'unknown',
    isOffline: false,
    details: null,
  });

  useEffect(() => {
    // Récupérer l'état initial
    NetInfo.fetch().then((state) => {
      logger.debug('[Network] État initial:', state);
      updateNetworkStatus(state);
    });

    // S'abonner aux changements
    const unsubscribe = NetInfo.addEventListener((state) => {
      logger.debug('[Network] Changement détecté:', state);
      updateNetworkStatus(state);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const updateNetworkStatus = (state: NetInfoState) => {
    const isConnected = state.isConnected ?? false;
    const type = state.type || 'unknown';
    const isOffline = !isConnected || type === 'none';

    setNetworkStatus({
      isConnected,
      type,
      isOffline,
      details: state,
    });

    if (isOffline) {
      logger.warn('[Network] ⚠️ Appareil hors ligne ou en mode avion');
    } else {
      logger.info(`[Network] ✅ Connecté via ${type}`);
    }
  };

  return networkStatus;
}

/**
 * Fonction utilitaire pour vérifier la connectivité avant une action critique
 */
export async function checkNetworkBeforeAction(): Promise<{
  isConnected: boolean;
  type: string;
  canSendSMS: boolean;
}> {
  const state = await NetInfo.fetch();
  const isConnected = state.isConnected ?? false;
  const type = state.type || 'unknown';

  // On peut envoyer des SMS si connecté (WiFi ou cellulaire)
  const canSendSMS = isConnected && (type === 'wifi' || type === 'cellular');

  logger.debug('[Network] Vérification avant action:', {
    isConnected,
    type,
    canSendSMS,
  });

  return {
    isConnected,
    type,
    canSendSMS,
  };
}
