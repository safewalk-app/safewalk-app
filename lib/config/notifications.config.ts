/**
 * Registre Central des Notifications SafeWalk
 *
 * Source unique de vérité pour tous les messages de l'app.
 * Chaque notification est définie par:
 * - Une clé unique (ex: trip.started)
 * - Un type (success, info, error, critical)
 * - Un template avec variables dynamiques
 * - Une durée d'affichage
 * - Un comportement (auto-dismiss, modal, etc.)
 */

export type NotificationType = 'success' | 'info' | 'error' | 'critical' | 'warning';
export type NotificationDisplay = 'toast' | 'banner' | 'modal' | 'alert';

export interface NotificationConfig {
  /** Clé unique pour identifier la notification */
  key: string;
  /** Type de notification (détermine l'apparence) */
  type: NotificationType;
  /** Mode d'affichage (toast, banner, modal, alert) */
  display: NotificationDisplay;
  /** Template du message avec variables {variable} */
  message: string;
  /** Durée d'affichage en ms (0 = persistant) */
  duration: number;
  /** Description pour la documentation */
  description: string;
  /** Variables attendues */
  variables?: string[];
  /** Message de fallback si variable manquante */
  fallback?: Record<string, string>;
}

/**
 * Registre complet des notifications
 * Organisé par catégorie pour meilleure maintenabilité
 */
export const NOTIFICATIONS: Record<string, NotificationConfig> = {
  // ============================================
  // VOYAGE (Trip)
  // ============================================

  'trip.started': {
    key: 'trip.started',
    type: 'success',
    display: 'toast',
    message: "C'est noté, ta sortie a commencé.",
    duration: 2000,
    description: "Confirmation du démarrage d'une sortie",
  },

  'trip.extended': {
    key: 'trip.extended',
    type: 'success',
    display: 'toast',
    message: 'Ta sortie a été prolongée de {minutes} min.',
    duration: 2000,
    description: 'Confirmation de prolongation de sortie',
    variables: ['minutes'],
    fallback: { minutes: '15' },
  },

  'trip.checked_in': {
    key: 'trip.checked_in',
    type: 'success',
    display: 'toast',
    message: 'Ton retour a bien été confirmé.',
    duration: 2000,
    description: 'Confirmation du check-in utilisateur',
  },

  'trip.stopped': {
    key: 'trip.stopped',
    type: 'success',
    display: 'toast',
    message: 'Ta sortie a été arrêtée.',
    duration: 2000,
    description: "Confirmation de l'arrêt d'une sortie",
  },

  'trip.cancelled': {
    key: 'trip.cancelled',
    type: 'info',
    display: 'toast',
    message: 'Ta sortie a été annulée.',
    duration: 2000,
    description: "Confirmation de l'annulation d'une sortie",
  },

  // ============================================
  // ALERTES (Alert)
  // ============================================

  'alert.warning': {
    key: 'alert.warning',
    type: 'warning',
    display: 'banner',
    message: 'Sans confirmation de ta part, {contactName} sera prévenu dans {minutes} min.',
    duration: 0, // Persistant
    description: 'Alerte imminente avant envoi automatique',
    variables: ['contactName', 'minutes'],
    fallback: { contactName: 'ton contact', minutes: '5' },
  },

  'alert.sent': {
    key: 'alert.sent',
    type: 'success',
    display: 'toast',
    message: '{contactName} a bien été prévenu.',
    duration: 3000,
    description: "Confirmation de l'envoi d'une alerte",
    variables: ['contactName'],
    fallback: { contactName: 'ton contact' },
  },

  'alert.failed': {
    key: 'alert.failed',
    type: 'error',
    display: 'banner',
    message: "On n'a pas réussi à envoyer l'alerte. Réessaie dès que possible.",
    duration: 0, // Persistant
    description: "Erreur lors de l'envoi d'une alerte",
  },

  'alert.quota_reached': {
    key: 'alert.quota_reached',
    type: 'critical',
    display: 'modal',
    message: "Tu as atteint la limite d'alertes pour aujourd'hui.",
    duration: 0,
    description: "Quota d'alertes dépassé",
  },

  // ============================================
  // SOS
  // ============================================

  'sos.sending': {
    key: 'sos.sending',
    type: 'critical',
    display: 'modal',
    message: "Envoi de l'alerte SOS...",
    duration: 0,
    description: "SOS en cours d'envoi",
  },

  'sos.sent': {
    key: 'sos.sent',
    type: 'success',
    display: 'modal',
    message: 'Alerte SOS envoyée. {contactName} a été prévenu.',
    duration: 3000,
    description: 'SOS envoyé avec succès',
    variables: ['contactName'],
    fallback: { contactName: 'ton contact' },
  },

  'sos.failed': {
    key: 'sos.failed',
    type: 'error',
    display: 'modal',
    message: "On n'a pas réussi à envoyer le SOS. Réessaie immédiatement.",
    duration: 0,
    description: "Échec de l'envoi du SOS",
  },

  'sos.quota_reached': {
    key: 'sos.quota_reached',
    type: 'critical',
    display: 'modal',
    message: "Tu as atteint la limite d'alertes SOS pour aujourd'hui.",
    duration: 0,
    description: 'Quota SOS dépassé',
  },

  // ============================================
  // CONTACT
  // ============================================

  'contact.saved': {
    key: 'contact.saved',
    type: 'success',
    display: 'toast',
    message: 'Contact sauvegardé.',
    duration: 2000,
    description: "Confirmation de sauvegarde d'un contact",
  },

  'contact.deleted': {
    key: 'contact.deleted',
    type: 'info',
    display: 'toast',
    message: 'Contact supprimé.',
    duration: 2000,
    description: "Confirmation de suppression d'un contact",
  },

  'contact.missing': {
    key: 'contact.missing',
    type: 'error',
    display: 'modal',
    message: "Ajoute un contact d'urgence pour démarrer une sortie.",
    duration: 0,
    description: "Blocage: contact d'urgence manquant",
  },

  'contact.invalid': {
    key: 'contact.invalid',
    type: 'error',
    display: 'toast',
    message: 'Format invalide. Utilisez +33 suivi de 9 chiffres (ex: +33612345678).',
    duration: 3000,
    description: 'Erreur de validation du numéro de téléphone',
  },

  // ============================================
  // AUTHENTIFICATION (Auth)
  // ============================================

  'auth.otp_required': {
    key: 'auth.otp_required',
    type: 'error',
    display: 'modal',
    message: 'Vérifie ton numéro pour activer les alertes SMS.',
    duration: 0,
    description: 'Blocage: OTP requis',
  },

  'auth.otp_sent': {
    key: 'auth.otp_sent',
    type: 'success',
    display: 'toast',
    message: 'Code OTP envoyé par SMS.',
    duration: 2000,
    description: "Confirmation de l'envoi du code OTP",
  },

  'auth.otp_verified': {
    key: 'auth.otp_verified',
    type: 'success',
    display: 'toast',
    message: 'Numéro vérifié ! Tu peux maintenant démarrer une sortie.',
    duration: 2000,
    description: 'Confirmation de la vérification OTP',
  },

  'auth.otp_failed': {
    key: 'auth.otp_failed',
    type: 'error',
    display: 'toast',
    message: 'Code OTP invalide. Réessaie.',
    duration: 3000,
    description: 'Erreur de vérification OTP',
  },

  // ============================================
  // CRÉDITS
  // ============================================

  'credits.empty': {
    key: 'credits.empty',
    type: 'error',
    display: 'modal',
    message: "Tu as atteint la limite d'aujourd'hui. Ajoute des crédits pour continuer.",
    duration: 0,
    description: 'Blocage: crédits épuisés',
  },

  'credits.low': {
    key: 'credits.low',
    type: 'warning',
    display: 'banner',
    message: 'Il te reste {remaining} alertes avant la limite.',
    duration: 0,
    description: 'Avertissement: crédits faibles',
    variables: ['remaining'],
    fallback: { remaining: '1' },
  },

  'credits.added': {
    key: 'credits.added',
    type: 'success',
    display: 'toast',
    message: 'Crédits ajoutés. Tu peux continuer.',
    duration: 2000,
    description: "Confirmation de l'ajout de crédits",
  },

  // ============================================
  // PERMISSIONS
  // ============================================

  'permission.location_required': {
    key: 'permission.location_required',
    type: 'error',
    display: 'modal',
    message: "Active la localisation dans Paramètres pour partager ta position en cas d'alerte.",
    duration: 0,
    description: 'Blocage: permission de localisation requise',
  },

  'permission.notifications_required': {
    key: 'permission.notifications_required',
    type: 'warning',
    display: 'banner',
    message: 'Active les notifications pour recevoir les alertes.',
    duration: 0,
    description: 'Avertissement: notifications désactivées',
  },

  'permission.phone_required': {
    key: 'permission.phone_required',
    type: 'error',
    display: 'modal',
    message: 'Ajoute un numéro de téléphone pour activer les alertes SMS.',
    duration: 0,
    description: 'Blocage: numéro de téléphone requis',
  },

  // ============================================
  // ERREURS RÉSEAU
  // ============================================

  'error.network': {
    key: 'error.network',
    type: 'error',
    display: 'banner',
    message: 'Pas de connexion internet. Réessaie dès que possible.',
    duration: 0,
    description: 'Erreur de connexion réseau',
  },

  'error.sms_failed': {
    key: 'error.sms_failed',
    type: 'error',
    display: 'banner',
    message: "Impossible d'envoyer le SMS. Réessaiera automatiquement.",
    duration: 0,
    description: "Erreur d'envoi SMS",
  },

  'error.unknown': {
    key: 'error.unknown',
    type: 'error',
    display: 'modal',
    message: 'Une erreur est survenue. Réessaie.',
    duration: 0,
    description: 'Erreur inconnue',
  },

  // ============================================
  // SMS
  // ============================================

  'sms.test_sent': {
    key: 'sms.test_sent',
    type: 'success',
    display: 'toast',
    message: 'SMS de test envoyé à {phone}.',
    duration: 2000,
    description: "Confirmation de l'envoi du SMS de test",
    variables: ['phone'],
    fallback: { phone: 'ton numéro' },
  },

  'sms.test_failed': {
    key: 'sms.test_failed',
    type: 'error',
    display: 'toast',
    message: "Impossible d'envoyer le SMS de test. Réessaie.",
    duration: 3000,
    description: "Erreur d'envoi du SMS de test",
  },

  // ============================================
  // CONFIRMATIONS
  // ============================================

  'confirm.stop_trip': {
    key: 'confirm.stop_trip',
    type: 'info',
    display: 'modal',
    message: 'Êtes-vous sûr de vouloir annuler cette sortie ?',
    duration: 0,
    description: "Confirmation d'annulation de sortie",
  },

  'confirm.delete_data': {
    key: 'confirm.delete_data',
    type: 'critical',
    display: 'modal',
    message: 'Supprimer toutes les données ? Cette action est irréversible.',
    duration: 0,
    description: 'Confirmation de suppression de données',
  },

  'confirm.trigger_sos': {
    key: 'confirm.trigger_sos',
    type: 'critical',
    display: 'modal',
    message: "Êtes-vous en danger ? Cette action alertera vos contacts d'urgence.",
    duration: 0,
    description: 'Confirmation de déclenchement du SOS',
  },
};

/**
 * Récupère une configuration de notification par clé
 * @param key - Clé de la notification
 * @returns Configuration ou undefined si non trouvée
 */
export function getNotificationConfig(key: string): NotificationConfig | undefined {
  return NOTIFICATIONS[key];
}

/**
 * Récupère toutes les clés de notifications d'un type donné
 * @param type - Type de notification
 * @returns Liste des clés
 */
export function getNotificationsByType(type: NotificationType): string[] {
  return Object.values(NOTIFICATIONS)
    .filter((n) => n.type === type)
    .map((n) => n.key);
}

/**
 * Récupère toutes les clés de notifications avec un mode d'affichage donné
 * @param display - Mode d'affichage
 * @returns Liste des clés
 */
export function getNotificationsByDisplay(display: NotificationDisplay): string[] {
  return Object.values(NOTIFICATIONS)
    .filter((n) => n.display === display)
    .map((n) => n.key);
}
