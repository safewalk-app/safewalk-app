/**
 * Device Binding Service
 * 
 * Lie les tokens au device ID pour prévenir les vols de tokens
 * et les utilisations non autorisées sur d'autres devices
 * 
 * Fonctionnalités:
 * - Génération d'un ID device unique
 * - Stockage sécurisé de l'ID device
 * - Validation des tokens liés au device
 * - Détection des changements de device
 * - Logging des violations
 */

import * as SecureStore from 'expo-secure-store';
import { Platform, getUniqueId } from 'react-native';
import Constants from 'expo-constants';
import { logger } from '@/lib/logger';
import * as Crypto from 'expo-crypto';

/**
 * Clés de stockage
 */
const STORAGE_KEYS = {
  DEVICE_ID: 'safewalk_device_id',
  DEVICE_FINGERPRINT: 'safewalk_device_fingerprint',
  DEVICE_BINDING_ENABLED: 'safewalk_device_binding_enabled',
};

/**
 * Interface pour les données de device
 */
export interface DeviceInfo {
  deviceId: string;
  fingerprint: string;
  platform: string;
  osVersion: string;
  appVersion: string;
  createdAt: number;
}

/**
 * Service de Device Binding
 */
class DeviceBindingService {
  private deviceId: string | null = null;
  private deviceFingerprint: string | null = null;
  private isInitialized = false;

  /**
   * Initialiser le service
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      if (Platform.OS === 'web') {
        logger.info('ℹ️ [Device Binding] Non disponible sur web');
        this.isInitialized = true;
        return;
      }

      // Obtenir ou créer l'ID device
      await this.initializeDeviceId();

      // Générer le fingerprint du device
      await this.generateDeviceFingerprint();

      logger.info('✅ [Device Binding] Service initialisé', {
        deviceId: this.deviceId?.substring(0, 16) + '...',
      });

      this.isInitialized = true;
    } catch (error) {
      logger.error('❌ [Device Binding] Erreur lors de l\'initialisation:', error);
    }
  }

  /**
   * Initialiser l'ID device
   */
  private async initializeDeviceId(): Promise<void> {
    try {
      // Essayer de récupérer l'ID device existant
      let deviceId = await SecureStore.getItemAsync(STORAGE_KEYS.DEVICE_ID);

      if (!deviceId) {
        // Générer un nouvel ID device
        deviceId = await this.generateDeviceId();
        await SecureStore.setItemAsync(STORAGE_KEYS.DEVICE_ID, deviceId);
        logger.info('✅ [Device Binding] Nouvel ID device généré');
      } else {
        logger.info('✅ [Device Binding] ID device récupéré');
      }

      this.deviceId = deviceId;
    } catch (error) {
      logger.error('❌ [Device Binding] Erreur lors de l\'initialisation de l\'ID device:', error);
      throw error;
    }
  }

  /**
   * Générer un ID device unique
   */
  private async generateDeviceId(): Promise<string> {
    try {
      // Utiliser l'ID unique du device
      const uniqueId = getUniqueId();

      // Générer un hash SHA-256 pour la sécurité
      const hash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        uniqueId + Date.now()
      );

      return `device_${hash.substring(0, 32)}`;
    } catch (error) {
      logger.error('❌ [Device Binding] Erreur lors de la génération de l\'ID device:', error);
      throw error;
    }
  }

  /**
   * Générer le fingerprint du device
   */
  private async generateDeviceFingerprint(): Promise<void> {
    try {
      const fingerprint = {
        platform: Platform.OS,
        osVersion: Platform.Version,
        appVersion: Constants.expoConfig?.version || 'unknown',
        buildNumber: Constants.expoConfig?.ios?.buildNumber || 'unknown',
        deviceId: this.deviceId,
      };

      // Générer un hash du fingerprint
      const fingerprintString = JSON.stringify(fingerprint);
      const hash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        fingerprintString
      );

      this.deviceFingerprint = hash;

      logger.info('✅ [Device Binding] Fingerprint du device généré');
    } catch (error) {
      logger.error('❌ [Device Binding] Erreur lors de la génération du fingerprint:', error);
    }
  }

  /**
   * Obtenir l'ID device
   */
  public getDeviceId(): string | null {
    return this.deviceId;
  }

  /**
   * Obtenir le fingerprint du device
   */
  public getDeviceFingerprint(): string | null {
    return this.deviceFingerprint;
  }

  /**
   * Obtenir les informations du device
   */
  public async getDeviceInfo(): Promise<DeviceInfo | null> {
    if (!this.deviceId || !this.deviceFingerprint) {
      return null;
    }

    return {
      deviceId: this.deviceId,
      fingerprint: this.deviceFingerprint,
      platform: Platform.OS,
      osVersion: String(Platform.Version),
      appVersion: Constants.expoConfig?.version || 'unknown',
      createdAt: Date.now(),
    };
  }

  /**
   * Valider que le token appartient à ce device
   */
  public async validateTokenBinding(tokenDeviceId: string): Promise<boolean> {
    try {
      if (!this.deviceId) {
        logger.warn('⚠️ [Device Binding] ID device non disponible');
        return false;
      }

      if (tokenDeviceId !== this.deviceId) {
        logger.error('❌ [Device Binding] VIOLATION: Token lié à un autre device!', {
          tokenDeviceId: tokenDeviceId.substring(0, 16) + '...',
          currentDeviceId: this.deviceId.substring(0, 16) + '...',
        });
        return false;
      }

      logger.info('✅ [Device Binding] Token valide pour ce device');
      return true;
    } catch (error) {
      logger.error('❌ [Device Binding] Erreur lors de la validation:', error);
      return false;
    }
  }

  /**
   * Vérifier si le device a changé
   */
  public async hasDeviceChanged(): Promise<boolean> {
    try {
      const currentFingerprint = this.deviceFingerprint;
      const storedFingerprint = await SecureStore.getItemAsync(
        STORAGE_KEYS.DEVICE_FINGERPRINT
      );

      if (!storedFingerprint) {
        // Première fois, stocker le fingerprint
        if (currentFingerprint) {
          await SecureStore.setItemAsync(
            STORAGE_KEYS.DEVICE_FINGERPRINT,
            currentFingerprint
          );
        }
        return false;
      }

      const hasChanged = currentFingerprint !== storedFingerprint;

      if (hasChanged) {
        logger.warn('⚠️ [Device Binding] Device a changé!', {
          previous: storedFingerprint.substring(0, 16) + '...',
          current: currentFingerprint?.substring(0, 16) + '...',
        });

        // Mettre à jour le fingerprint
        if (currentFingerprint) {
          await SecureStore.setItemAsync(
            STORAGE_KEYS.DEVICE_FINGERPRINT,
            currentFingerprint
          );
        }
      }

      return hasChanged;
    } catch (error) {
      logger.error('❌ [Device Binding] Erreur lors de la vérification du changement:', error);
      return false;
    }
  }

  /**
   * Créer un token lié au device
   */
  public createDeviceBoundToken(token: string): string {
    if (!this.deviceId) {
      logger.warn('⚠️ [Device Binding] ID device non disponible');
      return token;
    }

    // Format: token.deviceId (séparé par un point)
    return `${token}.${this.deviceId}`;
  }

  /**
   * Extraire le token et l'ID device
   */
  public extractDeviceBoundToken(boundToken: string): { token: string; deviceId: string } | null {
    const parts = boundToken.split('.');
    if (parts.length < 2) {
      return null;
    }

    const deviceId = parts.pop();
    const token = parts.join('.');

    return { token, deviceId: deviceId || '' };
  }

  /**
   * Réinitialiser le binding du device
   */
  public async resetDeviceBinding(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(STORAGE_KEYS.DEVICE_ID);
      await SecureStore.deleteItemAsync(STORAGE_KEYS.DEVICE_FINGERPRINT);
      this.deviceId = null;
      this.deviceFingerprint = null;
      logger.info('✅ [Device Binding] Binding du device réinitialisé');
    } catch (error) {
      logger.error('❌ [Device Binding] Erreur lors de la réinitialisation:', error);
    }
  }
}

export const deviceBindingService = new DeviceBindingService();

/**
 * Initialiser le service au démarrage
 */
export async function initializeDeviceBinding(): Promise<void> {
  await deviceBindingService.initialize();
}
