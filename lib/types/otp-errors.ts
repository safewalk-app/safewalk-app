/**
 * Types pour la gestion des erreurs OTP
 */

export enum OtpErrorCode {
  // Validation (400)
  INVALID_PHONE_FORMAT = 'INVALID_PHONE_FORMAT',
  INVALID_OTP_FORMAT = 'INVALID_OTP_FORMAT',
  EMPTY_PHONE = 'EMPTY_PHONE',
  EMPTY_OTP = 'EMPTY_OTP',

  // Logique métier (4xx)
  OTP_NOT_FOUND = 'OTP_NOT_FOUND', // 404
  OTP_EXPIRED = 'OTP_EXPIRED', // 410
  OTP_INVALID = 'OTP_INVALID', // 401
  MAX_ATTEMPTS_EXCEEDED = 'MAX_ATTEMPTS_EXCEEDED', // 429
  RATE_LIMIT = 'RATE_LIMIT', // 429

  // Serveur (5xx)
  SMS_SEND_FAILED = 'SMS_SEND_FAILED', // 500
  DATABASE_ERROR = 'DATABASE_ERROR', // 500
  SERVER_ERROR = 'SERVER_ERROR', // 500

  // Réseau
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
}

export type OtpErrorType = 'error' | 'warning' | 'info';

export interface OtpError {
  code: OtpErrorCode;
  message: string;
  type: OtpErrorType;
  attemptsRemaining?: number;
  retryAfter?: number; // secondes
  action?: {
    label: string;
    onPress: () => void;
  };
}

export interface SendOtpErrorResponse {
  success: false;
  errorCode: OtpErrorCode;
  message: string;
  retryAfter?: number;
}

export interface VerifyOtpErrorResponse {
  success: false;
  errorCode: OtpErrorCode;
  message: string;
  attemptsRemaining?: number;
  retryAfter?: number;
}

/**
 * Mapper les codes d'erreur à des titres
 */
export function getErrorTitle(code: OtpErrorCode): string {
  const titles: Record<OtpErrorCode, string> = {
    [OtpErrorCode.INVALID_PHONE_FORMAT]: 'Numéro invalide',
    [OtpErrorCode.INVALID_OTP_FORMAT]: 'Code invalide',
    [OtpErrorCode.EMPTY_PHONE]: 'Numéro requis',
    [OtpErrorCode.EMPTY_OTP]: 'Code requis',
    [OtpErrorCode.OTP_NOT_FOUND]: 'Code non trouvé',
    [OtpErrorCode.OTP_EXPIRED]: 'Code expiré',
    [OtpErrorCode.OTP_INVALID]: 'Code incorrect',
    [OtpErrorCode.MAX_ATTEMPTS_EXCEEDED]: 'Trop de tentatives',
    [OtpErrorCode.RATE_LIMIT]: 'Trop de demandes',
    [OtpErrorCode.SMS_SEND_FAILED]: 'SMS non envoyé',
    [OtpErrorCode.DATABASE_ERROR]: 'Erreur base de données',
    [OtpErrorCode.SERVER_ERROR]: 'Erreur serveur',
    [OtpErrorCode.NETWORK_ERROR]: 'Erreur réseau',
    [OtpErrorCode.TIMEOUT]: 'Délai dépassé',
  };

  return titles[code] || 'Erreur';
}

/**
 * Mapper les codes d'erreur à des types visuels
 */
export function getErrorType(code: OtpErrorCode): OtpErrorType {
  switch (code) {
    case OtpErrorCode.OTP_EXPIRED:
    case OtpErrorCode.RATE_LIMIT:
      return 'warning';

    case OtpErrorCode.INVALID_PHONE_FORMAT:
    case OtpErrorCode.INVALID_OTP_FORMAT:
    case OtpErrorCode.EMPTY_PHONE:
    case OtpErrorCode.EMPTY_OTP:
    case OtpErrorCode.OTP_NOT_FOUND:
    case OtpErrorCode.OTP_INVALID:
    case OtpErrorCode.MAX_ATTEMPTS_EXCEEDED:
    case OtpErrorCode.SMS_SEND_FAILED:
    case OtpErrorCode.DATABASE_ERROR:
    case OtpErrorCode.SERVER_ERROR:
    case OtpErrorCode.NETWORK_ERROR:
    case OtpErrorCode.TIMEOUT:
      return 'error';

    default:
      return 'error';
  }
}

/**
 * Déterminer si l'erreur est récupérable
 */
export function isRecoverableError(code: OtpErrorCode): boolean {
  const recoverableErrors = [
    OtpErrorCode.OTP_INVALID,
    OtpErrorCode.OTP_EXPIRED,
    OtpErrorCode.OTP_NOT_FOUND,
    OtpErrorCode.MAX_ATTEMPTS_EXCEEDED,
    OtpErrorCode.RATE_LIMIT,
    OtpErrorCode.NETWORK_ERROR,
    OtpErrorCode.TIMEOUT,
    OtpErrorCode.SERVER_ERROR,
    OtpErrorCode.SMS_SEND_FAILED,
    OtpErrorCode.DATABASE_ERROR,
  ];

  return recoverableErrors.includes(code);
}

/**
 * Déterminer si l'utilisateur peut renvoyer le code
 */
export function canResendOtp(code: OtpErrorCode): boolean {
  const resendableErrors = [
    OtpErrorCode.OTP_EXPIRED,
    OtpErrorCode.OTP_NOT_FOUND,
    OtpErrorCode.MAX_ATTEMPTS_EXCEEDED,
    OtpErrorCode.SMS_SEND_FAILED,
  ];

  return resendableErrors.includes(code);
}

/**
 * Déterminer si l'utilisateur doit changer de numéro
 */
export function shouldChangePhone(code: OtpErrorCode): boolean {
  const changePhoneErrors = [OtpErrorCode.OTP_NOT_FOUND, OtpErrorCode.SMS_SEND_FAILED];

  return changePhoneErrors.includes(code);
}
