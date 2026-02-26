/**
 * Biometric Authentication Service
 * 
 * Implémente l'authentification biométrique (Face ID/Touch ID)
 * pour protéger l'accès aux tokens sensibles
 * 
 * Fonctionnalités:
 * - Détection des capacités biométriques
 * - Authentification Face ID (iOS)
 * - Authentification Touch ID (iOS)
 * - Authentification Biometric (Android)
 * - Fallback sur PIN/Password
 * - Caching sécurisé du statut d'authentification
 */

import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { logger } from '@/lib/logger';

/**
 * Types de biométrie disponibles
 */
export enum BiometricType {
  FACE_ID = 'faceId',
  TOUCH_ID = 'touchId',
  FINGERPRINT = 'fingerprint',
  IRIS = 'iris',
  NONE = 'none',
}

/**
 * Résultat d'authentification biométrique
 */
export interface BiometricAuthResult {
  success: boolean;
  biometricType: BiometricType;
  error?: string;
  timestamp: number;
}

/**
 * Service d'authentification biométrique
 */
class BiometricAuthService {
  private isAvailable = false;
  private supportedTypes: BiometricType[] = [];
  private lastAuthTime = 0;
  private authCacheDuration = 5 * 60 * 1000; // 5 minutes

  /**
   * Initialiser le service
   */
  public async initialize(): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        logger.info('ℹ️ [Biometric Auth] Non disponible sur web');
        this.isAvailable = false;
        return;
      }

      // Vérifier la disponibilité de l'authentification locale
      this.isAvailable = await LocalAuthentication.hasHardwareAsync();

      if (!this.isAvailable) {
        logger.warn('⚠️ [Biometric Auth] Matériel biométrique non disponible');
        return;
      }

      // Obtenir les types de biométrie disponibles
      const compatible = await LocalAuthentication.compatibleAuthenticationTypesAsync();
      this.supportedTypes = compatible.map((type) => {
        switch (type) {
          case LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION:
            return BiometricType.FACE_ID;
          case LocalAuthentication.AuthenticationType.FINGERPRINT:
            return BiometricType.TOUCH_ID;
          default:
            return BiometricType.NONE;
        }
      });

      logger.info('✅ [Biometric Auth] Service initialisé', {
        available: this.isAvailable,
        supportedTypes: this.supportedTypes,
      });
    } catch (error) {
      logger.error('❌ [Biometric Auth] Erreur lors de l\'initialisation:', error);
      this.isAvailable = false;
    }
  }

  /**
   * Vérifier si la biométrie est disponible
   */
  public isBiometricAvailable(): boolean {
    return this.isAvailable && this.supportedTypes.length > 0;
  }

  /**
   * Obtenir les types de biométrie disponibles
   */
  public getSupportedBiometricTypes(): BiometricType[] {
    return this.supportedTypes;
  }

  /**
   * Authentifier avec la biométrie
   */
  public async authenticate(reason: string = 'Authentification requise'): Promise<BiometricAuthResult> {
    try {
      if (!this.isBiometricAvailable()) {
        logger.warn('⚠️ [Biometric Auth] Biométrie non disponible');
        return {
          success: false,
          biometricType: BiometricType.NONE,
          error: 'Biometric not available',
          timestamp: Date.now(),
        };
      }

      // Vérifier le cache d'authentification
      if (this.isAuthenticationCached()) {
        logger.info('✅ [Biometric Auth] Authentification en cache valide');
        return {
          success: true,
          biometricType: this.supportedTypes[0],
          timestamp: this.lastAuthTime,
        };
      }

      logger.info('🔐 [Biometric Auth] Demande d\'authentification biométrique');

      // Effectuer l'authentification
      const result = await LocalAuthentication.authenticateAsync({
        disableDeviceFallback: false, // Permettre le fallback PIN/Password
        reason,
        fallbackLabel: 'Utiliser le code PIN',
      });

      if (result.success) {
        this.lastAuthTime = Date.now();
        logger.info('✅ [Biometric Auth] Authentification réussie');

        return {
          success: true,
          biometricType: this.supportedTypes[0],
          timestamp: this.lastAuthTime,
        };
      } else {
        logger.warn('❌ [Biometric Auth] Authentification échouée:', result.error);
        return {
          success: false,
          biometricType: this.supportedTypes[0],
          error: result.error || 'Authentication failed',
          timestamp: Date.now(),
        };
      }
    } catch (error) {
      logger.error('❌ [Biometric Auth] Erreur lors de l\'authentification:', error);
      return {
        success: false,
        biometricType: BiometricType.NONE,
        error: String(error),
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Vérifier si l'authentification est en cache
   */
  private isAuthenticationCached(): boolean {
    const timeSinceAuth = Date.now() - this.lastAuthTime;
    return timeSinceAuth < this.authCacheDuration && this.lastAuthTime > 0;
  }

  /**
   * Invalider le cache d'authentification
   */
  public invalidateAuthenticationCache(): void {
    this.lastAuthTime = 0;
    logger.info('✅ [Biometric Auth] Cache d\'authentification invalidé');
  }

  /**
   * Obtenir le temps restant du cache
   */
  public getAuthenticationCacheRemainingTime(): number {
    const remaining = this.authCacheDuration - (Date.now() - this.lastAuthTime);
    return Math.max(0, remaining);
  }

  /**
   * Obtenir le type de biométrie principal
   */
  public getPrimaryBiometricType(): BiometricType {
    if (this.supportedTypes.length === 0) {
      return BiometricType.NONE;
    }

    // Préférer Face ID sur Touch ID
    if (this.supportedTypes.includes(BiometricType.FACE_ID)) {
      return BiometricType.FACE_ID;
    }

    return this.supportedTypes[0];
  }

  /**
   * Obtenir le label pour le type de biométrie
   */
  public getBiometricLabel(type: BiometricType): string {
    switch (type) {
      case BiometricType.FACE_ID:
        return 'Face ID';
      case BiometricType.TOUCH_ID:
        return 'Touch ID';
      case BiometricType.FINGERPRINT:
        return 'Empreinte digitale';
      case BiometricType.IRIS:
        return 'Reconnaissance iris';
      default:
        return 'Biométrie';
    }
  }

  /**
   * Obtenir le message pour le type de biométrie
   */
  public getBiometricMessage(type: BiometricType): string {
    switch (type) {
      case BiometricType.FACE_ID:
        return 'Utilisez Face ID pour vérifier votre identité';
      case BiometricType.TOUCH_ID:
        return 'Utilisez Touch ID pour vérifier votre identité';
      case BiometricType.FINGERPRINT:
        return 'Utilisez votre empreinte digitale pour vérifier votre identité';
      case BiometricType.IRIS:
        return 'Utilisez la reconnaissance iris pour vérifier votre identité';
      default:
        return 'Vérifiez votre identité';
    }
  }
}

export const biometricAuthService = new BiometricAuthService();

/**
 * Initialiser le service au démarrage
 */
export async function initializeBiometricAuth(): Promise<void> {
  await biometricAuthService.initialize();
}
