/**
 * Validation Utilities
 * Centralized validation functions used across the app
 */

import { VALIDATION, ERROR_MESSAGES } from '@/lib/constants/app-constants';

/**
 * Validate phone number in E.164 format
 * @param phoneNumber - Phone number to validate
 * @returns Object with isValid and error message
 */
export function validatePhoneNumber(phoneNumber: string): { isValid: boolean; error?: string } {
  if (!phoneNumber) {
    return { isValid: false, error: ERROR_MESSAGES.INVALID_PHONE };
  }

  const trimmed = phoneNumber.trim();

  if (!VALIDATION.PHONE_REGEX.test(trimmed)) {
    return { isValid: false, error: ERROR_MESSAGES.INVALID_PHONE };
  }

  if (trimmed.length > VALIDATION.MAX_PHONE_LENGTH) {
    return { isValid: false, error: ERROR_MESSAGES.INVALID_PHONE };
  }

  return { isValid: true };
}

/**
 * Validate OTP code (6 digits)
 * @param code - OTP code to validate
 * @returns Object with isValid and error message
 */
export function validateOtpCode(code: string): { isValid: boolean; error?: string } {
  if (!code) {
    return { isValid: false, error: ERROR_MESSAGES.INVALID_OTP };
  }

  if (!VALIDATION.OTP_REGEX.test(code)) {
    return { isValid: false, error: ERROR_MESSAGES.INVALID_OTP };
  }

  return { isValid: true };
}

/**
 * Validate email address
 * @param email - Email to validate
 * @returns Object with isValid and error message
 */
export function validateEmail(email: string): { isValid: boolean; error?: string } {
  if (!email) {
    return { isValid: false, error: 'Email requis.' };
  }

  if (!VALIDATION.EMAIL_REGEX.test(email)) {
    return { isValid: false, error: 'Email invalide.' };
  }

  return { isValid: true };
}

/**
 * Validate password strength
 * @param password - Password to validate
 * @returns Object with isValid and error message
 */
export function validatePassword(password: string): { isValid: boolean; error?: string } {
  if (!password) {
    return { isValid: false, error: 'Mot de passe requis.' };
  }

  if (password.length < VALIDATION.MIN_PASSWORD_LENGTH) {
    return {
      isValid: false,
      error: `Le mot de passe doit contenir au moins ${VALIDATION.MIN_PASSWORD_LENGTH} caractères.`,
    };
  }

  // Check for at least one uppercase, one lowercase, one number
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  if (!hasUpperCase || !hasLowerCase || !hasNumber) {
    return {
      isValid: false,
      error: 'Le mot de passe doit contenir des majuscules, minuscules et chiffres.',
    };
  }

  return { isValid: true };
}

/**
 * Validate session deadline (in minutes)
 * @param minutes - Deadline in minutes
 * @returns Object with isValid and error message
 */
export function validateSessionDeadline(minutes: number): { isValid: boolean; error?: string } {
  const { SESSION_DEADLINE_MIN, SESSION_DEADLINE_MAX } = VALIDATION;

  if (!Number.isInteger(minutes)) {
    return { isValid: false, error: 'La durée doit être un nombre entier.' };
  }

  if (minutes < SESSION_DEADLINE_MIN) {
    return { isValid: false, error: `La durée minimale est ${SESSION_DEADLINE_MIN} minutes.` };
  }

  if (minutes > SESSION_DEADLINE_MAX) {
    return { isValid: false, error: `La durée maximale est ${SESSION_DEADLINE_MAX} minutes.` };
  }

  return { isValid: true };
}

/**
 * Sanitize user input to prevent XSS
 * @param input - User input to sanitize
 * @returns Sanitized string
 */
export function sanitizeInput(input: string): string {
  if (!input) return '';

  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .trim();
}

/**
 * Format phone number to E.164 format
 * @param phoneNumber - Phone number to format
 * @returns Formatted phone number or null if invalid
 */
export function formatPhoneNumber(phoneNumber: string): string | null {
  const cleaned = phoneNumber.replace(/\D/g, '');

  if (cleaned.length < 10) {
    return null;
  }

  // If starts with 0 (French format), replace with +33
  if (cleaned.startsWith('0')) {
    return '+33' + cleaned.substring(1);
  }

  // If doesn't start with +, add it
  if (!cleaned.startsWith('+')) {
    return '+' + cleaned;
  }

  return '+' + cleaned;
}

/**
 * Validate if value is within range
 * @param value - Value to validate
 * @param min - Minimum value (inclusive)
 * @param max - Maximum value (inclusive)
 * @returns Object with isValid and error message
 */
export function validateRange(
  value: number,
  min: number,
  max: number,
): { isValid: boolean; error?: string } {
  if (value < min || value > max) {
    return { isValid: false, error: `La valeur doit être entre ${min} et ${max}.` };
  }

  return { isValid: true };
}

/**
 * Validate if string is not empty
 * @param value - String to validate
 * @param fieldName - Field name for error message
 * @returns Object with isValid and error message
 */
export function validateNotEmpty(
  value: string,
  fieldName: string = 'Champ',
): { isValid: boolean; error?: string } {
  if (!value || value.trim().length === 0) {
    return { isValid: false, error: `${fieldName} est requis.` };
  }

  return { isValid: true };
}

/**
 * Validate if array is not empty
 * @param array - Array to validate
 * @param fieldName - Field name for error message
 * @returns Object with isValid and error message
 */
export function validateArrayNotEmpty<T>(
  array: T[],
  fieldName: string = 'Liste',
): { isValid: boolean; error?: string } {
  if (!Array.isArray(array) || array.length === 0) {
    return { isValid: false, error: `${fieldName} ne peut pas être vide.` };
  }

  return { isValid: true };
}
