import NetInfo from '@react-native-community/netinfo';
import { logger } from './logger';

/**
 * Utilitaires pour vérifier la connectivité réseau avant actions critiques
 */

export interface NetworkCheckResult {
  /** Est connecté à Internet */
  isConnected: boolean;
  /** Type de connexion */
  type: string;
  /** Peut envoyer des SMS (WiFi ou cellulaire) */
  canSendSMS: boolean;
  /** Message d'erreur si hors ligne */
  errorMessage?: string;
}

/**
 * Vérifie la connectivité réseau avant d'envoyer un SMS
 */
export async function checkNetworkForSMS(): Promise<NetworkCheckResult> {
  try {
    const state = await NetInfo.fetch();
    const isConnected = state.isConnected ?? false;
    const type = state.type || 'unknown';

    // On peut envoyer des SMS si connecté (WiFi ou cellulaire)
    const canSendSMS = isConnected && (type === 'wifi' || type === 'cellular');

    logger.debug('[NetworkChecker] État réseau:', {
      isConnected,
      type,
      canSendSMS,
    });

    if (!isConnected) {
      return {
        isConnected: false,
        type,
        canSendSMS: false,
        errorMessage: "📵 Aucune connexion Internet. Impossible d'envoyer l'alerte SMS.",
      };
    }

    if (!canSendSMS) {
      return {
        isConnected,
        type,
        canSendSMS: false,
        errorMessage: `⚠️ Connexion ${type} détectée. L'envoi de SMS peut échouer.`,
      };
    }

    return {
      isConnected: true,
      type,
      canSendSMS: true,
    };
  } catch (error) {
    logger.error('[NetworkChecker] Erreur lors de la vérification réseau:', error);
    return {
      isConnected: false,
      type: 'unknown',
      canSendSMS: false,
      errorMessage: '❌ Impossible de vérifier la connexion réseau.',
    };
  }
}

/**
 * Vérifie si l'appareil est en mode avion
 */
export async function isAirplaneModeEnabled(): Promise<boolean> {
  try {
    const state = await NetInfo.fetch();
    // Mode avion = pas de connexion et type "none"
    const isAirplaneMode = !state.isConnected && state.type === 'none';

    if (isAirplaneMode) {
      logger.warn('[NetworkChecker] ✈️ Mode avion détecté');
    }

    return isAirplaneMode;
  } catch (error) {
    logger.error('[NetworkChecker] Erreur détection mode avion:', error);
    return false;
  }
}

/**
 * Attend que la connexion réseau soit rétablie (avec timeout)
 */
export async function waitForNetworkConnection(timeoutMs: number = 10000): Promise<boolean> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      unsubscribe();
      logger.warn('[NetworkChecker] ⏱️ Timeout: connexion non rétablie');
      resolve(false);
    }, timeoutMs);

    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected) {
        clearTimeout(timeout);
        unsubscribe();
        logger.info('[NetworkChecker] ✅ Connexion rétablie');
        resolve(true);
      }
    });

    // Vérifier immédiatement l'état actuel
    NetInfo.fetch().then((state) => {
      if (state.isConnected) {
        clearTimeout(timeout);
        unsubscribe();
        logger.info('[NetworkChecker] ✅ Déjà connecté');
        resolve(true);
      }
    });
  });
}

/**
 * Formate un message d'erreur réseau pour l'utilisateur
 */
export function getNetworkErrorMessage(type: string, isConnected: boolean): string {
  if (!isConnected) {
    return "📵 Aucune connexion Internet.\n\nL'alerte SMS ne pourra pas être envoyée. Vérifiez votre connexion WiFi ou cellulaire.";
  }

  if (type === 'none') {
    return "✈️ Mode avion activé.\n\nDésactivez le mode avion pour permettre l'envoi d'alertes SMS.";
  }

  if (type === 'unknown') {
    return "⚠️ Connexion réseau instable.\n\nL'envoi de SMS peut échouer. Vérifiez votre connexion.";
  }

  return "⚠️ Problème de connexion réseau.\n\nL'envoi de SMS peut échouer.";
}
