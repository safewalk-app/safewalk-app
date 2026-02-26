/**
 * Service de Notifications Centralisé
 * 
 * Gère l'affichage de toutes les notifications de l'app.
 * - Récupère la configuration depuis notifications.config.ts
 * - Injecte les variables dynamiques
 * - Gère les fallbacks
 * - Affiche via le bon composant (toast, banner, modal, alert)
 */

import { Alert } from 'react-native';
import {
  getNotificationConfig,
  NotificationType,
  NotificationDisplay,
} from '@/lib/config/notifications.config';
import { logger } from '@/lib/logger';

/**
 * Options d'affichage d'une notification
 */
export interface NotificationOptions {
  /** Variables à injecter dans le template */
  variables?: Record<string, string | number>;
  /** Callback quand la notification est fermée */
  onDismiss?: () => void;
  /** Durée personnalisée (override la config) */
  duration?: number;
  /** Type personnalisé (override la config) */
  type?: NotificationType;
  /** Mode d'affichage personnalisé (override la config) */
  display?: NotificationDisplay;
}

/**
 * Contexte global pour afficher les notifications
 * Doit être défini dans le composant racine (app/_layout.tsx)
 */
let notificationContext: {
  showToast: (message: string, type: NotificationType, duration: number) => void;
  showBanner: (message: string, type: NotificationType, onDismiss?: () => void) => void;
  showModal: (title: string, message: string, type: NotificationType, buttons?: any[]) => void;
} | null = null;

/**
 * Enregistre le contexte de notifications
 * À appeler depuis app/_layout.tsx
 */
export function registerNotificationContext(context: typeof notificationContext) {
  notificationContext = context;
}

/**
 * Remplace les variables dans un template
 * Exemple: "Bonjour {name}" avec {name: "Alice"} → "Bonjour Alice"
 * 
 * @param template - Template avec variables {var}
 * @param variables - Valeurs des variables
 * @param fallbacks - Valeurs par défaut si variable manquante
 * @returns Message avec variables remplacées
 */
export function interpolateVariables(
  template: string,
  variables?: Record<string, string | number>,
  fallbacks?: Record<string, string>
): string {
  let message = template;

  // Extraire toutes les variables du template
  const variableMatches = template.match(/\{(\w+)\}/g) || [];
  const variableNames = variableMatches.map(m => m.slice(1, -1));

  // Remplacer chaque variable
  for (const varName of variableNames) {
    const value = variables?.[varName] ?? fallbacks?.[varName];

    if (value === undefined || value === null) {
      logger.warn(`Variable manquante: ${varName}. Utilisation du fallback.`);
      continue;
    }

    message = message.replace(`{${varName}}`, String(value));
  }

  return message;
}

/**
 * Affiche une notification
 * 
 * @param key - Clé de la notification (ex: "trip.started")
 * @param options - Options d'affichage
 */
export function notify(key: string, options: NotificationOptions = {}): void {
  try {
    // Récupérer la configuration
    const config = getNotificationConfig(key);
    if (!config) {
      logger.error(`Notification non trouvée: ${key}`);
      return;
    }

    // Interpoler les variables
    const message = interpolateVariables(
      config.message,
      options.variables,
      config.fallback
    );

    // Déterminer le type et le mode d'affichage
    const type = options.type ?? config.type;
    const display = options.display ?? config.display;
    const duration = options.duration ?? config.duration;

    logger.info(`Notification: ${key} (${type}, ${display})`);

    // Afficher selon le mode
    switch (display) {
      case 'toast':
        showToastNotification(message, type, duration);
        break;

      case 'banner':
        showBannerNotification(message, type, options.onDismiss);
        break;

      case 'modal':
        showModalNotification(key, message, type);
        break;

      case 'alert':
        showAlertNotification(key, message, type);
        break;

      default:
        logger.warn(`Mode d'affichage inconnu: ${display}`);
    }
  } catch (error) {
    logger.error(`Erreur lors de l'affichage de la notification ${key}:`, error);
  }
}

/**
 * Affiche une notification toast
 */
function showToastNotification(
  message: string,
  type: NotificationType,
  duration: number
): void {
  if (!notificationContext?.showToast) {
    logger.warn('Contexte de toast non disponible');
    return;
  }

  notificationContext.showToast(message, type, duration);
}

/**
 * Affiche une notification banner
 */
function showBannerNotification(
  message: string,
  type: NotificationType,
  onDismiss?: () => void
): void {
  if (!notificationContext?.showBanner) {
    logger.warn('Contexte de banner non disponible');
    return;
  }

  notificationContext.showBanner(message, type, onDismiss);
}

/**
 * Affiche une notification modal
 */
function showModalNotification(
  key: string,
  message: string,
  type: NotificationType
): void {
  if (!notificationContext?.showModal) {
    logger.warn('Contexte de modal non disponible');
    return;
  }

  // Déterminer le titre selon le type
  const titles: Record<NotificationType, string> = {
    success: '✅ Succès',
    info: 'ℹ️ Information',
    warning: '⚠️ Attention',
    error: '❌ Erreur',
    critical: '🚨 Alerte Critique',
  };

  const title = titles[type];
  notificationContext.showModal(title, message, type);
}

/**
 * Affiche une notification via Alert.alert (pour les confirmations)
 */
function showAlertNotification(
  key: string,
  message: string,
  type: NotificationType
): void {
  // Pour les alertes natives, utiliser Alert.alert
  const titles: Record<NotificationType, string> = {
    success: 'Succès',
    info: 'Information',
    warning: 'Attention',
    error: 'Erreur',
    critical: 'Alerte',
  };

  Alert.alert(titles[type], message);
}

/**
 * Affiche une notification de succès
 */
export function notifySuccess(message: string, duration: number = 2000): void {
  if (!notificationContext?.showToast) {
    logger.warn('Contexte de toast non disponible');
    return;
  }

  notificationContext.showToast(message, 'success', duration);
}

/**
 * Affiche une notification d'erreur
 */
export function notifyError(message: string, duration: number = 3000): void {
  if (!notificationContext?.showToast) {
    logger.warn('Contexte de toast non disponible');
    return;
  }

  notificationContext.showToast(message, 'error', duration);
}

/**
 * Affiche une notification d'avertissement
 */
export function notifyWarning(message: string, duration: number = 3000): void {
  if (!notificationContext?.showBanner) {
    logger.warn('Contexte de banner non disponible');
    return;
  }

  notificationContext.showBanner(message, 'warning');
}

/**
 * Affiche une notification d'information
 */
export function notifyInfo(message: string, duration: number = 2000): void {
  if (!notificationContext?.showToast) {
    logger.warn('Contexte de toast non disponible');
    return;
  }

  notificationContext.showToast(message, 'info', duration);
}

/**
 * Affiche une notification critique (modal)
 */
export function notifyCritical(message: string): void {
  if (!notificationContext?.showModal) {
    logger.warn('Contexte de modal non disponible');
    return;
  }

  notificationContext.showModal('🚨 Alerte Critique', message, 'critical');
}

/**
 * Affiche une notification de confirmation
 */
export function notifyConfirmation(
  key: string,
  options: {
    onConfirm: () => void;
    onCancel?: () => void;
    variables?: Record<string, string | number>;
  }
): void {
  const config = getNotificationConfig(key);
  if (!config) {
    logger.error(`Notification non trouvée: ${key}`);
    return;
  }

  const message = interpolateVariables(
    config.message,
    options.variables,
    config.fallback
  );

  Alert.alert('Confirmation', message, [
    {
      text: 'Annuler',
      onPress: options.onCancel,
      style: 'cancel',
    },
    {
      text: 'Confirmer',
      onPress: options.onConfirm,
      style: 'destructive',
    },
  ]);
}

/**
 * Affiche une notification de blocage
 */
export function notifyBlocked(
  key: string,
  options: {
    action?: string;
    onAction?: () => void;
    variables?: Record<string, string | number>;
  } = {}
): void {
  const config = getNotificationConfig(key);
  if (!config) {
    logger.error(`Notification non trouvée: ${key}`);
    return;
  }

  const message = interpolateVariables(
    config.message,
    options.variables,
    config.fallback
  );

  const buttons = [];

  if (options.action && options.onAction) {
    buttons.push({
      text: options.action,
      onPress: options.onAction,
      style: 'default',
    });
  }

  buttons.push({
    text: 'Fermer',
    style: 'cancel',
  });

  Alert.alert('Blocage', message, buttons);
}

/**
 * Affiche une notification d'erreur avec retry
 */
export function notifyErrorWithRetry(
  key: string,
  options: {
    onRetry: () => void;
    variables?: Record<string, string | number>;
  }
): void {
  const config = getNotificationConfig(key);
  if (!config) {
    logger.error(`Notification non trouvée: ${key}`);
    return;
  }

  const message = interpolateVariables(
    config.message,
    options.variables,
    config.fallback
  );

  Alert.alert('Erreur', message, [
    {
      text: 'Annuler',
      style: 'cancel',
    },
    {
      text: 'Réessayer',
      onPress: options.onRetry,
      style: 'default',
    },
  ]);
}
