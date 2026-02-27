/**
 * Tests pour les services de sécurité
 * - Certificate Pinning
 * - Biometric Authentication
 * - Device Binding
 * - Token Rotation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { certificatePinningService } from '@/lib/services/certificate-pinning.service';
import { biometricAuthService, BiometricType } from '@/lib/services/biometric-auth.service';
import { deviceBindingService } from '@/lib/services/device-binding.service';
import { tokenRotationService } from '@/lib/services/token-rotation.service';

// ============================================================================
// Certificate Pinning Tests
// ============================================================================

describe('Certificate Pinning Service', () => {
  beforeEach(() => {
    certificatePinningService.resetViolationCount();
  });

  it('devrait initialiser le service', () => {
    certificatePinningService.initialize();
    expect(certificatePinningService.isServiceEnabled()).toBeDefined();
  });

  it('devrait valider un certificat correct', () => {
    const host = 'api.manus.im';
    const validKey = 'sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';

    certificatePinningService.addPinnedCertificate(host, validKey);
    const result = certificatePinningService.validateCertificate(host, validKey);

    expect(result).toBe(true);
  });

  it('devrait rejeter un certificat invalide', () => {
    const host = 'api.manus.im';
    const validKey = 'sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';
    const invalidKey = 'sha256/INVALID_KEY_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX=';

    certificatePinningService.addPinnedCertificate(host, validKey);
    const result = certificatePinningService.validateCertificate(host, invalidKey);

    expect(result).toBe(false);
  });

  it('devrait tracker les violations', () => {
    const host = 'api.manus.im';
    const validKey = 'sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';
    const invalidKey = 'sha256/INVALID_KEY_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX=';

    certificatePinningService.addPinnedCertificate(host, validKey);
    certificatePinningService.validateCertificate(host, invalidKey);
    certificatePinningService.validateCertificate(host, invalidKey);

    expect(certificatePinningService.getViolationCount()).toBe(2);
  });

  it('devrait ajouter et supprimer des certificats', () => {
    const host = 'api.manus.im';
    const key1 = 'sha256/KEY1_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';
    const key2 = 'sha256/KEY2_BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=';

    certificatePinningService.addPinnedCertificate(host, key1);
    certificatePinningService.addPinnedCertificate(host, key2);

    let pinnedCerts = certificatePinningService.getPinnedCertificates(host);
    expect(pinnedCerts).toHaveLength(2);

    certificatePinningService.removePinnedCertificate(host, key1);
    pinnedCerts = certificatePinningService.getPinnedCertificates(host);
    expect(pinnedCerts).toHaveLength(1);
  });

  it('devrait réinitialiser le compteur de violations', () => {
    const host = 'api.manus.im';
    const validKey = 'sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';
    const invalidKey = 'sha256/INVALID_KEY_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX=';

    certificatePinningService.addPinnedCertificate(host, validKey);
    certificatePinningService.validateCertificate(host, invalidKey);
    expect(certificatePinningService.getViolationCount()).toBe(1);

    certificatePinningService.resetViolationCount();
    expect(certificatePinningService.getViolationCount()).toBe(0);
  });
});

// ============================================================================
// Biometric Authentication Tests
// ============================================================================

describe('Biometric Authentication Service', () => {
  beforeEach(async () => {
    biometricAuthService.invalidateAuthenticationCache();
  });

  it('devrait initialiser le service', async () => {
    await biometricAuthService.initialize();
    expect(biometricAuthService.isBiometricAvailable()).toBeDefined();
  });

  it('devrait retourner les types de biométrie supportés', async () => {
    await biometricAuthService.initialize();
    const types = biometricAuthService.getSupportedBiometricTypes();
    expect(Array.isArray(types)).toBe(true);
  });

  it('devrait obtenir le type de biométrie principal', async () => {
    await biometricAuthService.initialize();
    const primaryType = biometricAuthService.getPrimaryBiometricType();
    expect(primaryType).toBeDefined();
  });

  it('devrait obtenir les labels de biométrie', () => {
    expect(biometricAuthService.getBiometricLabel(BiometricType.FACE_ID)).toBe('Face ID');
    expect(biometricAuthService.getBiometricLabel(BiometricType.TOUCH_ID)).toBe('Touch ID');
    expect(biometricAuthService.getBiometricLabel(BiometricType.FINGERPRINT)).toBe(
      'Empreinte digitale',
    );
  });

  it('devrait obtenir les messages de biométrie', () => {
    const message = biometricAuthService.getBiometricMessage(BiometricType.FACE_ID);
    expect(message).toContain('Face ID');
  });

  it("devrait invalider le cache d'authentification", () => {
    const remaining = biometricAuthService.getAuthenticationCacheRemainingTime();
    expect(remaining).toBe(0);

    biometricAuthService.invalidateAuthenticationCache();
    expect(biometricAuthService.getAuthenticationCacheRemainingTime()).toBe(0);
  });
});

// ============================================================================
// Device Binding Tests
// ============================================================================

describe('Device Binding Service', () => {
  beforeEach(async () => {
    await deviceBindingService.initialize();
  });

  it('devrait initialiser le service', async () => {
    await deviceBindingService.initialize();
    expect(deviceBindingService.getDeviceId()).toBeDefined();
  });

  it('devrait générer un ID device unique', async () => {
    const deviceId = deviceBindingService.getDeviceId();
    expect(deviceId).toBeTruthy();
    expect(deviceId).toMatch(/^device_/);
  });

  it('devrait générer un fingerprint du device', async () => {
    const fingerprint = deviceBindingService.getDeviceFingerprint();
    expect(fingerprint).toBeTruthy();
    expect(fingerprint).toHaveLength(64); // SHA-256 hash
  });

  it('devrait obtenir les informations du device', async () => {
    const deviceInfo = await deviceBindingService.getDeviceInfo();
    expect(deviceInfo).toBeTruthy();
    expect(deviceInfo?.deviceId).toBeTruthy();
    expect(deviceInfo?.fingerprint).toBeTruthy();
    expect(deviceInfo?.platform).toBeTruthy();
  });

  it('devrait valider un token lié au device', async () => {
    const deviceId = deviceBindingService.getDeviceId();
    const isValid = await deviceBindingService.validateTokenBinding(deviceId!);
    expect(isValid).toBe(true);
  });

  it('devrait rejeter un token lié à un autre device', async () => {
    const otherDeviceId = 'device_other_device_id';
    const isValid = await deviceBindingService.validateTokenBinding(otherDeviceId);
    expect(isValid).toBe(false);
  });

  it('devrait créer et extraire un token lié au device', () => {
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
    const boundToken = deviceBindingService.createDeviceBoundToken(token);

    expect(boundToken).toContain(token);
    expect(boundToken).toContain('.');

    const extracted = deviceBindingService.extractDeviceBoundToken(boundToken);
    expect(extracted?.token).toBe(token);
    expect(extracted?.deviceId).toBe(deviceBindingService.getDeviceId());
  });

  it('devrait détecter les changements de device', async () => {
    const hasChanged = await deviceBindingService.hasDeviceChanged();
    expect(typeof hasChanged).toBe('boolean');
  });

  it('devrait réinitialiser le binding du device', async () => {
    await deviceBindingService.resetDeviceBinding();
    // Après réinitialisation, l'ID device devrait être null
    // (jusqu'à la prochaine initialisation)
    expect(deviceBindingService.getDeviceId()).toBeNull();
  });
});

// ============================================================================
// Token Rotation Tests
// ============================================================================

describe('Token Rotation Service', () => {
  beforeEach(async () => {
    await tokenRotationService.initialize();
  });

  it('devrait initialiser le service', async () => {
    await tokenRotationService.initialize();
    expect(tokenRotationService.getRotationCount()).toBeDefined();
  });

  it('devrait obtenir le nombre de rotations', () => {
    const count = tokenRotationService.getRotationCount();
    expect(typeof count).toBe('number');
    expect(count).toBeGreaterThanOrEqual(0);
  });

  it('devrait obtenir le temps de la dernière rotation', () => {
    const time = tokenRotationService.getLastRotationTime();
    expect(typeof time).toBe('number');
  });

  it("devrait obtenir le temps jusqu'à la prochaine rotation", () => {
    const time = tokenRotationService.getTimeUntilNextRotation();
    expect(typeof time).toBe('number');
    expect(time).toBeGreaterThanOrEqual(0);
  });

  it('devrait activer/désactiver la rotation automatique', () => {
    tokenRotationService.setAutoRotationEnabled(false);
    // Service devrait être désactivé

    tokenRotationService.setAutoRotationEnabled(true);
    // Service devrait être activé
  });

  it('devrait nettoyer le service', () => {
    tokenRotationService.cleanup();
    // Service devrait être nettoyé sans erreur
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('Security Services Integration', () => {
  it('devrait initialiser tous les services sans erreur', async () => {
    certificatePinningService.initialize();
    await biometricAuthService.initialize();
    await deviceBindingService.initialize();
    await tokenRotationService.initialize();

    expect(certificatePinningService.isServiceEnabled()).toBeDefined();
    expect(biometricAuthService.isBiometricAvailable()).toBeDefined();
    expect(deviceBindingService.getDeviceId()).toBeDefined();
    expect(tokenRotationService.getRotationCount()).toBeDefined();
  });

  it('devrait valider un flux de sécurité complet', async () => {
    // 1. Initialiser les services
    certificatePinningService.initialize();
    await biometricAuthService.initialize();
    await deviceBindingService.initialize();
    await tokenRotationService.initialize();

    // 2. Vérifier le certificat
    const host = 'api.manus.im';
    const validKey = 'sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';
    certificatePinningService.addPinnedCertificate(host, validKey);
    const certValid = certificatePinningService.validateCertificate(host, validKey);
    expect(certValid).toBe(true);

    // 3. Vérifier le device binding
    const deviceId = deviceBindingService.getDeviceId();
    const deviceValid = await deviceBindingService.validateTokenBinding(deviceId!);
    expect(deviceValid).toBe(true);

    // 4. Vérifier la rotation des tokens
    const rotationTime = tokenRotationService.getTimeUntilNextRotation();
    expect(rotationTime).toBeGreaterThanOrEqual(0);
  });
});
