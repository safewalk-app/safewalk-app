import AsyncStorage from '@react-native-async-storage/async-storage';
import { OtpErrorCode } from '../types/otp-errors';
import { logger } from '../logger';

/**
 * Service de rate limiting côté client pour OTP
 * Limite le nombre d'envois de code OTP par téléphone
 */

const RATE_LIMIT_KEY = 'otp_rate_limit';
const MAX_ATTEMPTS = 5; // Max 5 envois
const TIME_WINDOW = 60 * 60 * 1000; // 1 heure en millisecondes

interface RateLimitRecord {
  phoneNumber: string;
  timestamp: number;
}

interface RateLimitStatus {
  isAllowed: boolean;
  attemptsRemaining: number;
  resetTime?: number; // Timestamp quand le rate limit sera réinitialisé
  errorCode?: OtpErrorCode;
  message?: string;
}

/**
 * Vérifie si un numéro peut envoyer un OTP
 * @param phoneNumber Numéro de téléphone
 * @returns Status du rate limit
 */
export async function checkRateLimit(phoneNumber: string): Promise<RateLimitStatus> {
  try {
    const data = await AsyncStorage.getItem(RATE_LIMIT_KEY);
    const records: RateLimitRecord[] = data ? JSON.parse(data) : [];

    const now = Date.now();
    const oneHourAgo = now - TIME_WINDOW;

    // Filtrer les records valides (dans la fenêtre de temps)
    const validRecords = records.filter(
      (r) => r.timestamp > oneHourAgo && r.phoneNumber === phoneNumber,
    );

    // Nettoyer les anciens records
    const allValidRecords = records.filter((r) => r.timestamp > oneHourAgo);
    await AsyncStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(allValidRecords));

    const attemptsRemaining = MAX_ATTEMPTS - validRecords.length;

    if (attemptsRemaining <= 0) {
      // Calculer le temps de réinitialisation
      const oldestRecord = validRecords[0];
      const resetTime = oldestRecord.timestamp + TIME_WINDOW;

      return {
        isAllowed: false,
        attemptsRemaining: 0,
        resetTime,
        errorCode: OtpErrorCode.RATE_LIMIT,
        message: `Trop de demandes. Réessayez dans ${formatTimeRemaining(resetTime - now)}.`,
      };
    }

    return {
      isAllowed: true,
      attemptsRemaining,
    };
  } catch (error) {
    logger.error('[OTP] Rate limit check error:', error);
    // En cas d'erreur, autoriser l'envoi
    return {
      isAllowed: true,
      attemptsRemaining: MAX_ATTEMPTS,
    };
  }
}

/**
 * Enregistre une tentative d'envoi OTP
 * @param phoneNumber Numéro de téléphone
 */
export async function recordOtpAttempt(phoneNumber: string): Promise<void> {
  try {
    const data = await AsyncStorage.getItem(RATE_LIMIT_KEY);
    const records: RateLimitRecord[] = data ? JSON.parse(data) : [];

    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;

    // Garder seulement les records valides
    const validRecords = records.filter((r) => r.timestamp > oneHourAgo);

    // Ajouter le nouveau record
    validRecords.push({
      phoneNumber,
      timestamp: now,
    });

    await AsyncStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(validRecords));
  } catch (error) {
    logger.error('[OTP] Failed to record attempt:', error);
  }
}

/**
 * Réinitialise le rate limit pour un numéro
 * @param phoneNumber Numéro de téléphone
 */
export async function resetRateLimit(phoneNumber: string): Promise<void> {
  try {
    const data = await AsyncStorage.getItem(RATE_LIMIT_KEY);
    const records: RateLimitRecord[] = data ? JSON.parse(data) : [];

    // Supprimer les records pour ce numéro
    const filtered = records.filter((r) => r.phoneNumber !== phoneNumber);

    await AsyncStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(filtered));
  } catch (error) {
    logger.error('[OTP] Failed to reset rate limit:', error);
  }
}

/**
 * Obtient le nombre de tentatives restantes pour un numéro
 * @param phoneNumber Numéro de téléphone
 * @returns Nombre de tentatives restantes
 */
export async function getAttemptsRemaining(phoneNumber: string): Promise<number> {
  const status = await checkRateLimit(phoneNumber);
  return status.attemptsRemaining;
}

/**
 * Formate le temps restant avant réinitialisation
 * @param ms Millisecondes restantes
 * @returns Chaîne formatée (ex: "45 min", "30 sec")
 */
function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return '0 sec';

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours} h ${minutes % 60} min`;
  }

  if (minutes > 0) {
    return `${minutes} min ${seconds % 60} sec`;
  }

  return `${seconds} sec`;
}

/**
 * Obtient le temps de réinitialisation formaté
 * @param resetTime Timestamp de réinitialisation
 * @returns Chaîne formatée du temps restant
 */
export function getFormattedResetTime(resetTime: number): string {
  const now = Date.now();
  const remaining = resetTime - now;
  return formatTimeRemaining(remaining);
}

/**
 * Nettoie tous les records de rate limit
 * Utile pour les tests ou le reset complet
 */
export async function clearAllRateLimits(): Promise<void> {
  try {
    await AsyncStorage.removeItem(RATE_LIMIT_KEY);
  } catch (error) {
    logger.error('[OTP] Failed to clear rate limits:', error);
  }
}

/**
 * Obtient les statistiques de rate limit pour un numéro
 * @param phoneNumber Numéro de téléphone
 * @returns Statistiques détaillées
 */
export async function getRateLimitStats(phoneNumber: string): Promise<{
  totalAttempts: number;
  attemptsRemaining: number;
  resetTime?: number;
  isBlocked: boolean;
}> {
  const status = await checkRateLimit(phoneNumber);

  return {
    totalAttempts: MAX_ATTEMPTS - status.attemptsRemaining,
    attemptsRemaining: status.attemptsRemaining,
    resetTime: status.resetTime,
    isBlocked: !status.isAllowed,
  };
}
