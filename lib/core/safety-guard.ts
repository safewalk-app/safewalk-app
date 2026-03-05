import { logger } from '@/lib/utils/logger';

/**
 * Types pour le Safety Guard
 */

export type ActionType = 'start_trip' | 'test_sms' | 'trigger_sos' | 'send_late_alert';

export type BlockReason =
  | 'missing_contact'
  | 'otp_required'
  | 'no_credits'
  | 'quota_reached'
  | 'unknown';

export type NextStep =
  | 'go_settings_contact'
  | 'open_otp'
  | 'open_paywall'
  | null;

export interface GuardContext {
  // Paramètres utilisateur
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  userPhone?: string;

  // Données de profil
  phoneVerified: boolean;
  subscriptionActive: boolean;
  freeAlertsRemaining: number;
  dailyQuotaRemaining?: number;

  // Localisation
  locationEnabled: boolean;
  locationAvailable?: boolean;
}

export interface GuardResult {
  allowed: boolean;
  blockReason?: BlockReason;
  nextStep?: NextStep;
  messageKey: string; // Pour les notifications dynamiques
  message: string; // Message friendly pour l'utilisateur
  action?: string; // Label du bouton d'action
  resumePayload?: {
    actionType: ActionType;
    params?: Record<string, any>;
  };
}

/**
 * Messages friendly pour chaque blocage
 */
const MESSAGES: Record<BlockReason, { title: string; message: string; action: string }> = {
  missing_contact: {
    title: "Contact d'urgence manquant",
    message: 'Ajoute un contact d\'urgence pour continuer.',
    action: 'Aller aux Paramètres',
  },
  otp_required: {
    title: 'Téléphone non vérifié',
    message: 'Vérifie ton numéro pour activer les alertes.',
    action: 'Vérifier maintenant',
  },
  no_credits: {
    title: "Pas d'alertes disponibles",
    message: "Tu n'as plus d'alertes disponibles.",
    action: 'Ajouter des crédits',
  },
  quota_reached: {
    title: 'Limite atteinte',
    message: "Tu as atteint la limite d'aujourd'hui.",
    action: 'Réessayer demain',
  },
  unknown: {
    title: 'Erreur',
    message: 'Une erreur est survenue.',
    action: 'Réessayer',
  },
};

/**
 * Logique de vérification pour chaque étape
 */

function hasValidContact(context: GuardContext): boolean {
  return !!(
    context.emergencyContactName?.trim() &&
    context.emergencyContactPhone?.trim()
  );
}

function hasPhoneVerified(context: GuardContext): boolean {
  return context.phoneVerified === true;
}

function hasCredits(context: GuardContext): boolean {
  return (
    context.subscriptionActive === true ||
    (context.freeAlertsRemaining ?? 0) > 0
  );
}

function hasQuotaRemaining(context: GuardContext): boolean {
  // Si quotaRemaining n'est pas défini, on suppose qu'il y a du quota
  if (context.dailyQuotaRemaining === undefined) {
    return true;
  }
  return context.dailyQuotaRemaining > 0;
}

/**
 * Ordre de vérification obligatoire:
 * 1. Contact d'urgence
 * 2. OTP / Téléphone vérifié
 * 3. Crédits / Abonnement
 * 4. Quota quotidien (si applicable)
 */

export function runSafetyGuard(
  actionType: ActionType,
  context: GuardContext,
): GuardResult {
  logger.info(`[SafetyGuard] Checking ${actionType}`, { context });

  // Étape 1: Contact d'urgence
  if (!hasValidContact(context)) {
    logger.warn('[SafetyGuard] Missing contact', { actionType });
    return {
      allowed: false,
      blockReason: 'missing_contact',
      nextStep: 'go_settings_contact',
      messageKey: 'missing_contact',
      message: MESSAGES.missing_contact.message,
      action: MESSAGES.missing_contact.action,
      resumePayload: {
        actionType,
        params: {},
      },
    };
  }

  // Étape 2: OTP / Téléphone vérifié
  if (!hasPhoneVerified(context)) {
    logger.warn('[SafetyGuard] OTP required', { actionType });
    return {
      allowed: false,
      blockReason: 'otp_required',
      nextStep: 'open_otp',
      messageKey: 'otp_required',
      message: MESSAGES.otp_required.message,
      action: MESSAGES.otp_required.action,
      resumePayload: {
        actionType,
        params: {},
      },
    };
  }

  // Étape 3: Crédits / Abonnement
  if (!hasCredits(context)) {
    logger.warn('[SafetyGuard] No credits', { actionType });
    return {
      allowed: false,
      blockReason: 'no_credits',
      nextStep: 'open_paywall',
      messageKey: 'no_credits',
      message: MESSAGES.no_credits.message,
      action: MESSAGES.no_credits.action,
      resumePayload: {
        actionType,
        params: {},
      },
    };
  }

  // Étape 4: Quota quotidien (si applicable)
  if (!hasQuotaRemaining(context)) {
    logger.warn('[SafetyGuard] Quota reached', { actionType });
    return {
      allowed: false,
      blockReason: 'quota_reached',
      nextStep: null,
      messageKey: 'quota_reached',
      message: MESSAGES.quota_reached.message,
      action: MESSAGES.quota_reached.action,
      resumePayload: {
        actionType,
        params: {},
      },
    };
  }

  // Tout est OK - Action autorisée
  logger.info('[SafetyGuard] Action allowed', { actionType });

  // Avertissement si GPS est désactivé (non bloquant)
  let gpsWarning = '';
  if (!context.locationEnabled) {
    gpsWarning = 'Tu peux continuer sans partage de position.';
  }

  return {
    allowed: true,
    messageKey: 'allowed',
    message: gpsWarning || 'Tout est prêt!',
    resumePayload: {
      actionType,
      params: {},
    },
  };
}

/**
 * Utilitaire pour construire le contexte depuis les données de l'app
 */
export function buildGuardContext(options: {
  settings: any;
  profileData: any;
  locationEnabled: boolean;
}): GuardContext {
  return {
    emergencyContactName: options.settings.emergencyContactName,
    emergencyContactPhone: options.settings.emergencyContactPhone,
    userPhone: options.settings.userPhone,
    phoneVerified: options.profileData?.phone_verified ?? false,
    subscriptionActive: options.profileData?.subscription_active ?? false,
    freeAlertsRemaining: options.profileData?.free_alerts_remaining ?? 0,
    dailyQuotaRemaining: options.profileData?.daily_quota_remaining,
    locationEnabled: options.locationEnabled,
    locationAvailable: options.profileData?.location_available ?? true,
  };
}
