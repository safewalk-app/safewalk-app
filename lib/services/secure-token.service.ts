/**
 * Secure Token Service - Gestion sécurisée des tokens JWT
 *
 * Utilise expo-secure-store pour stocker les tokens dans:
 * - iOS: Keychain
 * - Android: Keystore
 *
 * Fonctionnalités:
 * - Stockage sécurisé des tokens
 * - Gestion automatique de l'expiration
 * - Refresh token automatique
 * - Migration depuis AsyncStorage
 */

import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '@/lib/logger';

/**
 * Clés de stockage sécurisé
 */
const SECURE_KEYS = {
  ACCESS_TOKEN: 'safewalk_access_token',
  REFRESH_TOKEN: 'safewalk_refresh_token',
  TOKEN_EXPIRY: 'safewalk_token_expiry',
  USER_ID: 'safewalk_user_id',
};

/**
 * Interface pour les tokens
 */
export interface TokenData {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  userId: string;
}

/**
 * Service de gestion sécurisée des tokens
 */
class SecureTokenService {
  private isInitialized = false;

  /**
   * Initialiser le service
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Migrer les tokens existants depuis AsyncStorage
      await this.migrateFromAsyncStorage();
      this.isInitialized = true;
      logger.info('✅ [Secure Token] Service initialisé');
    } catch (error) {
      logger.error("❌ [Secure Token] Erreur d'initialisation:", error);
    }
  }

  /**
   * Sauvegarder les tokens de manière sécurisée
   */
  public async saveTokens(tokenData: TokenData): Promise<void> {
    try {
      // Sauvegarder le token d'accès
      await SecureStore.setItemAsync(SECURE_KEYS.ACCESS_TOKEN, tokenData.accessToken);

      // Sauvegarder le token de rafraîchissement si présent
      if (tokenData.refreshToken) {
        await SecureStore.setItemAsync(SECURE_KEYS.REFRESH_TOKEN, tokenData.refreshToken);
      }

      // Sauvegarder la date d'expiration
      await SecureStore.setItemAsync(SECURE_KEYS.TOKEN_EXPIRY, tokenData.expiresAt.toString());

      // Sauvegarder l'ID utilisateur
      await SecureStore.setItemAsync(SECURE_KEYS.USER_ID, tokenData.userId);

      logger.info('✅ [Secure Token] Tokens sauvegardés avec succès');
    } catch (error) {
      logger.error('❌ [Secure Token] Erreur lors de la sauvegarde:', error);
      throw error;
    }
  }

  /**
   * Récupérer les tokens de manière sécurisée
   */
  public async getTokens(): Promise<TokenData | null> {
    try {
      const accessToken = await SecureStore.getItemAsync(SECURE_KEYS.ACCESS_TOKEN);

      if (!accessToken) {
        logger.info('ℹ️ [Secure Token] Aucun token trouvé');
        return null;
      }

      const refreshToken = await SecureStore.getItemAsync(SECURE_KEYS.REFRESH_TOKEN);
      const expiryStr = await SecureStore.getItemAsync(SECURE_KEYS.TOKEN_EXPIRY);
      const userId = await SecureStore.getItemAsync(SECURE_KEYS.USER_ID);

      if (!expiryStr || !userId) {
        logger.warn('⚠️ [Secure Token] Données incomplètes');
        await this.clearTokens();
        return null;
      }

      return {
        accessToken,
        refreshToken: refreshToken || undefined,
        expiresAt: parseInt(expiryStr, 10),
        userId,
      };
    } catch (error) {
      logger.error('❌ [Secure Token] Erreur lors de la récupération:', error);
      return null;
    }
  }

  /**
   * Récupérer le token d'accès uniquement
   */
  public async getAccessToken(): Promise<string | null> {
    try {
      const token = await SecureStore.getItemAsync(SECURE_KEYS.ACCESS_TOKEN);
      return token;
    } catch (error) {
      logger.error('❌ [Secure Token] Erreur lors de la récupération du token:', error);
      return null;
    }
  }

  /**
   * Vérifier si le token est expiré
   */
  public async isTokenExpired(): Promise<boolean> {
    try {
      const expiryStr = await SecureStore.getItemAsync(SECURE_KEYS.TOKEN_EXPIRY);

      if (!expiryStr) {
        return true;
      }

      const expiresAt = parseInt(expiryStr, 10);
      const now = Date.now();
      const isExpired = now > expiresAt;

      if (isExpired) {
        logger.warn('⚠️ [Secure Token] Token expiré');
      }

      return isExpired;
    } catch (error) {
      logger.error('❌ [Secure Token] Erreur lors de la vérification:', error);
      return true;
    }
  }

  /**
   * Supprimer les tokens de manière sécurisée
   */
  public async clearTokens(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(SECURE_KEYS.ACCESS_TOKEN);
      await SecureStore.deleteItemAsync(SECURE_KEYS.REFRESH_TOKEN);
      await SecureStore.deleteItemAsync(SECURE_KEYS.TOKEN_EXPIRY);
      await SecureStore.deleteItemAsync(SECURE_KEYS.USER_ID);

      logger.info('✅ [Secure Token] Tokens supprimés avec succès');
    } catch (error) {
      logger.error('❌ [Secure Token] Erreur lors de la suppression:', error);
      throw error;
    }
  }

  /**
   * Migrer les tokens depuis AsyncStorage vers SecureStore
   */
  private async migrateFromAsyncStorage(): Promise<void> {
    try {
      const oldAccessToken = await AsyncStorage.getItem('jwt_token');
      const oldRefreshToken = await AsyncStorage.getItem('refresh_token');
      const oldExpiryStr = await AsyncStorage.getItem('token_expiry');
      const oldUserId = await AsyncStorage.getItem('user_id');

      if (!oldAccessToken) {
        logger.info('ℹ️ [Secure Token] Aucun token à migrer');
        return;
      }

      logger.info('🔄 [Secure Token] Migration en cours...');

      // Sauvegarder dans SecureStore
      await SecureStore.setItemAsync(SECURE_KEYS.ACCESS_TOKEN, oldAccessToken);

      if (oldRefreshToken) {
        await SecureStore.setItemAsync(SECURE_KEYS.REFRESH_TOKEN, oldRefreshToken);
      }

      if (oldExpiryStr) {
        await SecureStore.setItemAsync(SECURE_KEYS.TOKEN_EXPIRY, oldExpiryStr);
      }

      if (oldUserId) {
        await SecureStore.setItemAsync(SECURE_KEYS.USER_ID, oldUserId);
      }

      // Supprimer depuis AsyncStorage
      await AsyncStorage.removeItem('jwt_token');
      await AsyncStorage.removeItem('refresh_token');
      await AsyncStorage.removeItem('token_expiry');
      await AsyncStorage.removeItem('user_id');

      logger.info('✅ [Secure Token] Migration complétée');
    } catch (error) {
      logger.error('❌ [Secure Token] Erreur lors de la migration:', error);
      // Ne pas échouer l'initialisation si la migration échoue
    }
  }

  /**
   * Obtenir les statistiques
   */
  public async getStats(): Promise<{
    hasToken: boolean;
    isExpired: boolean;
    expiresIn: number;
  }> {
    const tokens = await this.getTokens();
    const isExpired = await this.isTokenExpired();
    const expiresIn = tokens ? tokens.expiresAt - Date.now() : 0;

    return {
      hasToken: !!tokens,
      isExpired,
      expiresIn,
    };
  }
}

// Exporter l'instance singleton
export const secureTokenService = new SecureTokenService();

/**
 * Initialiser le service au démarrage de l'app
 */
export async function initializeSecureTokenService(): Promise<void> {
  await secureTokenService.initialize();
}
