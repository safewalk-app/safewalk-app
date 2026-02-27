import { logger } from '../logger';

/**
 * Service de Toast Notifications
 * Gère les notifications temporaires pour informer l'utilisateur
 */

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message: string;
  duration?: number; // en ms, 0 = manuel
  action?: {
    label: string;
    onPress: () => void;
  };
}

export interface ToastContextType {
  toasts: Toast[];
  showToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  clearAllToasts: () => void;
}

// Store global des toasts (pour accès depuis services)
let toastStore: ToastContextType | null = null;

/**
 * Initialiser le store de toasts (appelé depuis le contexte app)
 */
export function initToastStore(store: ToastContextType) {
  toastStore = store;
  logger.info('✅ Toast store initialized');
}

/**
 * Afficher un toast de succès
 */
export function showSuccessToast(title: string, message?: string, duration = 3000) {
  if (!toastStore) {
    logger.warn('⚠️ Toast store not initialized');
    return;
  }

  toastStore.showToast({
    type: 'success',
    title,
    message: message || '',
    duration,
  });
}

/**
 * Afficher un toast d'erreur
 */
export function showErrorToast(
  title: string,
  message?: string,
  action?: { label: string; onPress: () => void },
) {
  if (!toastStore) {
    logger.warn('⚠️ Toast store not initialized');
    return;
  }

  toastStore.showToast({
    type: 'error',
    title,
    message: message || '',
    duration: 5000, // Erreurs restent plus longtemps
    action,
  });
}

/**
 * Afficher un toast d'avertissement
 */
export function showWarningToast(title: string, message?: string, duration = 4000) {
  if (!toastStore) {
    logger.warn('⚠️ Toast store not initialized');
    return;
  }

  toastStore.showToast({
    type: 'warning',
    title,
    message: message || '',
    duration,
  });
}

/**
 * Afficher un toast d'information
 */
export function showInfoToast(title: string, message?: string, duration = 3000) {
  if (!toastStore) {
    logger.warn('⚠️ Toast store not initialized');
    return;
  }

  toastStore.showToast({
    type: 'info',
    title,
    message: message || '',
    duration,
  });
}

/**
 * Afficher un toast pour erreur réseau
 */
export function showNetworkErrorToast(retry?: () => void) {
  showErrorToast(
    '🌐 Erreur réseau',
    'Impossible de se connecter. Vérifiez votre connexion.',
    retry ? { label: 'Réessayer', onPress: retry } : undefined,
  );
}

/**
 * Afficher un toast pour erreur serveur
 */
export function showServerErrorToast(statusCode?: number, retry?: () => void) {
  const message =
    statusCode === 401
      ? 'Authentification échouée. Veuillez vous reconnecter.'
      : statusCode === 403
        ? 'Accès refusé.'
        : 'Erreur serveur. Veuillez réessayer.';

  showErrorToast(
    '⚠️ Erreur serveur',
    message,
    retry ? { label: 'Réessayer', onPress: retry } : undefined,
  );
}

/**
 * Afficher un toast pour expiration OTP
 */
export function showOtpExpiredToast(onResend?: () => void) {
  showWarningToast(
    '⏰ Code OTP expiré',
    'Votre code OTP a expiré. Demandez un nouveau code.',
    5000,
  );

  if (onResend) {
    showInfoToast(
      '📨 Renvoyer le code',
      'Appuyez sur "Renvoyer" pour recevoir un nouveau code OTP.',
      0, // Manuel
    );
  }
}

/**
 * Afficher un toast pour trop de tentatives OTP
 */
export function showOtpTooManyAttemptsToast(waitMinutes: number) {
  showErrorToast(
    '🔒 Trop de tentatives',
    `Attendez ${waitMinutes} minutes avant de réessayer.`,
    0, // Manuel
  );
}

/**
 * Afficher un toast pour SMS non envoyé
 */
export function showSmsSendErrorToast(retry?: () => void) {
  showErrorToast(
    '📱 SMS non envoyé',
    "Impossible d'envoyer le SMS. Vérifiez votre connexion.",
    retry ? { label: 'Réessayer', onPress: retry } : undefined,
  );
}

/**
 * Afficher un toast pour SMS envoyé avec succès
 */
export function showSmsSentToast() {
  showSuccessToast('✅ SMS envoyé', 'Votre SMS a été envoyé avec succès.', 3000);
}

/**
 * Afficher un toast pour session expirée
 */
export function showSessionExpiredToast() {
  showWarningToast(
    '⏰ Session expirée',
    'Votre session de vérification OTP a expiré. Veuillez vous reconnecter.',
    0, // Manuel
  );
}

/**
 * Afficher un toast pour localisation non disponible
 */
export function showLocationUnavailableToast() {
  showWarningToast(
    '📍 Localisation non disponible',
    "Impossible d'accéder à votre localisation. Vérifiez les permissions.",
    4000,
  );
}

/**
 * Afficher un toast pour permission refusée
 */
export function showPermissionDeniedToast(permission: string) {
  showErrorToast(
    '🔒 Permission refusée',
    `Vous devez autoriser l'accès à ${permission} pour continuer.`,
    0, // Manuel
  );
}

/**
 * Afficher un toast générique
 */
export function showGenericToast(
  type: ToastType,
  title: string,
  message?: string,
  duration?: number,
) {
  if (!toastStore) {
    logger.warn('⚠️ Toast store not initialized');
    return;
  }

  toastStore.showToast({
    type,
    title,
    message: message || '',
    duration,
  });
}
