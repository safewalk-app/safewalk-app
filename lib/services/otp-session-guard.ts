import { otpGuard } from './otp-guard';
import { logger } from '../logger';

/**
 * Service de protection de session avec OTP
 * Vérifie que l'utilisateur est authentifié OTP avant de créer une session
 */

interface SessionGuardResult {
  canCreateSession: boolean;
  requiresOtp: boolean;
  phoneNumber?: string;
  message?: string;
}

/**
 * Vérifie si l'utilisateur peut créer une session
 * Retourne true si l'utilisateur est vérifié OTP
 * @returns Résultat de la vérification
 */
export async function checkSessionOtpRequirement(): Promise<SessionGuardResult> {
  try {
    // Vérifier si l'utilisateur est déjà vérifié OTP
    const isVerified = await otpGuard.isVerified();

    if (isVerified) {
      logger.info('[OTP Session Guard] Utilisateur déjà vérifié OTP');
      return {
        canCreateSession: true,
        requiresOtp: false,
      };
    }

    // Utilisateur non vérifié, demander vérification OTP
    logger.info('[OTP Session Guard] Vérification OTP requise');
    return {
      canCreateSession: false,
      requiresOtp: true,
      message: 'Vérification OTP requise avant de démarrer une session',
    };
  } catch (error) {
    logger.error('[OTP Session Guard] Erreur lors de la vérification:', error);
    // En cas d'erreur, autoriser la création de session (fallback)
    return {
      canCreateSession: true,
      requiresOtp: false,
      message: 'Erreur de vérification OTP, session autorisée',
    };
  }
}

/**
 * Réinitialise la vérification OTP (après déconnexion ou suppression de données)
 */
export async function resetSessionOtpVerification(): Promise<void> {
  try {
    await otpGuard.resetVerification();
    logger.info('[OTP Session Guard] Vérification OTP réinitialisée');
  } catch (error) {
    logger.error('[OTP Session Guard] Erreur lors de la réinitialisation:', error);
  }
}

/**
 * Marque l'utilisateur comme vérifié OTP après une vérification réussie
 * @param phoneNumber Numéro de téléphone vérifié
 */
export async function markSessionOtpVerified(phoneNumber: string): Promise<void> {
  try {
    await otpGuard.markVerified(phoneNumber);
    logger.info('[OTP Session Guard] Utilisateur marqué comme vérifié OTP');
  } catch (error) {
    logger.error('[OTP Session Guard] Erreur lors du marquage de vérification:', error);
  }
}

/**
 * Obtient le numéro de téléphone vérifié
 * @returns Numéro de téléphone ou undefined
 */
export async function getVerifiedPhoneNumber(): Promise<string | undefined> {
  try {
    return await otpGuard.getVerifiedPhoneNumber();
  } catch (error) {
    logger.error('[OTP Session Guard] Erreur lors de la récupération du numéro:', error);
    return undefined;
  }
}

/**
 * Vérifie si la vérification OTP est expirée (24h)
 * @returns true si expirée, false sinon
 */
export async function isOtpVerificationExpired(): Promise<boolean> {
  try {
    return await otpGuard.isExpired();
  } catch (error) {
    logger.error('[OTP Session Guard] Erreur lors de la vérification d\'expiration:', error);
    return false;
  }
}

/**
 * Obtient le temps restant avant expiration de la vérification OTP
 * @returns Temps restant en millisecondes, ou 0 si expiré
 */
export async function getOtpVerificationTimeRemaining(): Promise<number> {
  try {
    return await otpGuard.getTimeRemaining();
  } catch (error) {
    logger.error('[OTP Session Guard] Erreur lors de la récupération du temps restant:', error);
    return 0;
  }
}
