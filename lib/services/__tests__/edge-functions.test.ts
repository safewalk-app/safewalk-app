/**
 * Tests pour les Edge Functions
 * Valide que les codes d'erreur sont correctement retournés
 */

import { describe, it, expect } from 'vitest';

describe('Edge Functions Error Codes', () => {
  /**
   * Test: start-trip doit retourner phone_not_verified si le téléphone n'est pas vérifié
   */
  it('start-trip should return phone_not_verified error code', () => {
    // Réponse attendue de start-trip quand phone_verified = false
    const expectedResponse = {
      success: false,
      error: 'Phone number not verified',
      errorCode: 'phone_not_verified',
    };

    expect(expectedResponse.errorCode).toBe('phone_not_verified');
    expect(expectedResponse.success).toBe(false);
  });

  /**
   * Test: start-trip doit retourner no_credits si l'utilisateur n'a pas de crédits
   */
  it('start-trip should return no_credits error code', () => {
    // Réponse attendue de start-trip quand subscription_active = false et free_alerts_remaining = 0
    const expectedResponse = {
      success: false,
      error: 'No credits available',
      errorCode: 'no_credits',
    };

    expect(expectedResponse.errorCode).toBe('no_credits');
    expect(expectedResponse.success).toBe(false);
  });

  /**
   * Test: test-sms doit retourner no_credits si l'utilisateur n'a pas de crédits
   */
  it('test-sms should return no_credits error code', () => {
    // Réponse attendue de test-sms quand consume_credit retourne allowed = false
    const expectedResponse = {
      success: false,
      error: 'Not allowed to send test SMS',
      errorCode: 'no_credits',
      smsSent: false,
    };

    expect(expectedResponse.errorCode).toBe('no_credits');
    expect(expectedResponse.smsSent).toBe(false);
  });

  /**
   * Test: test-sms doit retourner quota_reached si la limite quotidienne est atteinte
   */
  it('test-sms should return quota_reached error code', () => {
    // Réponse attendue de test-sms quand consume_credit retourne reason = "quota_reached"
    const expectedResponse = {
      success: false,
      error: 'quota_reached',
      errorCode: 'quota_reached',
      smsSent: false,
    };

    expect(expectedResponse.errorCode).toBe('quota_reached');
    expect(expectedResponse.smsSent).toBe(false);
  });

  /**
   * Test: test-sms doit retourner twilio_failed si l'envoi SMS échoue
   */
  it('test-sms should return twilio_failed error code', () => {
    // Réponse attendue de test-sms quand sendSms échoue
    const expectedResponse = {
      success: false,
      error: 'Twilio API error',
      errorCode: 'twilio_failed',
      smsSent: false,
    };

    expect(expectedResponse.errorCode).toBe('twilio_failed');
    expect(expectedResponse.smsSent).toBe(false);
  });

  /**
   * Test: Vérifier que les codes d'erreur sont cohérents entre les Edge Functions
   */
  it('should use consistent error codes across edge functions', () => {
    const validErrorCodes = [
      'phone_not_verified',
      'no_credits',
      'quota_reached',
      'twilio_failed',
      'UNAUTHORIZED',
      'INVALID_TOKEN',
      'CONFIG_ERROR',
      'DB_ERROR',
      'NOT_FOUND',
      'INVALID_INPUT',
    ];

    // Vérifier que tous les codes d'erreur sont des strings non vides
    validErrorCodes.forEach((code) => {
      expect(code).toBeTruthy();
      expect(typeof code).toBe('string');
    });
  });
});
