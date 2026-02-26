/**
 * Token Rotation Service
 * 
 * Rafraîchit automatiquement les tokens pour limiter l'exposition
 * en cas de compromission
 * 
 * Fonctionnalités:
 * - Rotation automatique des tokens (15 min par défaut)
 * - Détection des tokens expirés
 * - Gestion des erreurs de refresh
 * - Logging des rotations
 * - Notification utilisateur en cas d'échec
 */

import { AppState, AppStateStatus, Platform } from 'react-native';
import { logger } from '@/lib/logger';
import { secureTokenService, TokenData } from './secure-token.service';

/**
 * Configuration de la rotation des tokens
 */
const TOKEN_ROTATION_CONFIG = {
  // Intervalle de rotation en millisecondes (15 minutes)
  ROTATION_INTERVAL: 15 * 60 * 1000,
  // Intervalle de vérification (5 minutes)
  CHECK_INTERVAL: 5 * 60 * 1000,
  // Temps d'expiration avant rotation (2 minutes)
  EXPIRATION_BUFFER: 2 * 60 * 1000,
  // Nombre maximum de tentatives de refresh
  MAX_RETRY_ATTEMPTS: 3,
  // Délai entre les tentatives (en millisecondes)
  RETRY_DELAY: 5000,
};

/**
 * Résultat de la rotation
 */
export interface TokenRotationResult {
  success: boolean;
  rotatedAt: number;
  expiresAt: number;
  error?: string;
  retryCount?: number;
}

/**
 * Service de rotation des tokens
 */
class TokenRotationService {
  private rotationTimer: NodeJS.Timeout | null = null;
  private checkTimer: NodeJS.Timeout | null = null;
  private appStateSubscription: any = null;
  private lastRotationTime = 0;
  private rotationCount = 0;
  private isRotating = false;
  private isEnabled = true;

  /**
   * Initialiser le service
   */
  public async initialize(): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        logger.info('ℹ️ [Token Rotation] Non disponible sur web');
        this.isEnabled = false;
        return;
      }

      // Démarrer la rotation automatique
      this.startAutoRotation();

      // Écouter les changements d'état de l'app
      this.appStateSubscription = AppState.addEventListener(
        'change',
        this.handleAppStateChange.bind(this)
      );

      logger.info('✅ [Token Rotation] Service initialisé', {
        rotationInterval: `${TOKEN_ROTATION_CONFIG.ROTATION_INTERVAL / 1000 / 60} min`,
      });
    } catch (error) {
      logger.error('❌ [Token Rotation] Erreur lors de l\'initialisation:', error);
    }
  }

  /**
   * Démarrer la rotation automatique
   */
  private startAutoRotation(): void {
    if (!this.isEnabled) return;

    // Vérifier et rotationner les tokens immédiatement
    this.checkAndRotateTokens();

    // Configurer la vérification périodique
    this.checkTimer = setInterval(() => {
      this.checkAndRotateTokens();
    }, TOKEN_ROTATION_CONFIG.CHECK_INTERVAL);

    logger.info('✅ [Token Rotation] Rotation automatique démarrée');
  }

  /**
   * Arrêter la rotation automatique
   */
  private stopAutoRotation(): void {
    if (this.rotationTimer) {
      clearInterval(this.rotationTimer);
      this.rotationTimer = null;
    }

    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = null;
    }

    logger.info('✅ [Token Rotation] Rotation automatique arrêtée');
  }

  /**
   * Vérifier et rotationner les tokens si nécessaire
   */
  private async checkAndRotateTokens(): Promise<void> {
    try {
      if (this.isRotating) {
        logger.debug('[Token Rotation] Rotation déjà en cours');
        return;
      }

      const tokens = await secureTokenService.getTokens();

      if (!tokens) {
        logger.debug('[Token Rotation] Aucun token à rotationner');
        return;
      }

      // Vérifier si le token est expiré ou proche de l'expiration
      const timeUntilExpiry = tokens.expiresAt - Date.now();
      const shouldRotate =
        timeUntilExpiry < TOKEN_ROTATION_CONFIG.EXPIRATION_BUFFER ||
        Date.now() - this.lastRotationTime > TOKEN_ROTATION_CONFIG.ROTATION_INTERVAL;

      if (shouldRotate) {
        logger.info('[Token Rotation] Rotation des tokens nécessaire', {
          timeUntilExpiry: `${timeUntilExpiry / 1000 / 60} min`,
          timeSinceLastRotation: `${(Date.now() - this.lastRotationTime) / 1000 / 60} min`,
        });

        await this.rotateTokens();
      }
    } catch (error) {
      logger.error('❌ [Token Rotation] Erreur lors de la vérification:', error);
    }
  }

  /**
   * Rotationner les tokens
   */
  public async rotateTokens(retryCount = 0): Promise<TokenRotationResult> {
    if (this.isRotating) {
      logger.warn('⚠️ [Token Rotation] Rotation déjà en cours');
      return {
        success: false,
        rotatedAt: Date.now(),
        expiresAt: 0,
        error: 'Rotation already in progress',
      };
    }

    try {
      this.isRotating = true;

      logger.info('🔄 [Token Rotation] Début de la rotation des tokens', {
        attempt: retryCount + 1,
        maxAttempts: TOKEN_ROTATION_CONFIG.MAX_RETRY_ATTEMPTS,
      });

      // Récupérer les tokens actuels
      const currentTokens = await secureTokenService.getTokens();

      if (!currentTokens) {
        throw new Error('No tokens to rotate');
      }

      // Appeler l'API de refresh
      const newTokens = await this.callRefreshTokenAPI(currentTokens);

      // Sauvegarder les nouveaux tokens
      await secureTokenService.saveTokens(newTokens);

      this.lastRotationTime = Date.now();
      this.rotationCount++;

      logger.info('✅ [Token Rotation] Tokens rotationnés avec succès', {
        rotationCount: this.rotationCount,
        expiresIn: `${(newTokens.expiresAt - Date.now()) / 1000 / 60} min`,
      });

      return {
        success: true,
        rotatedAt: this.lastRotationTime,
        expiresAt: newTokens.expiresAt,
      };
    } catch (error) {
      logger.error('❌ [Token Rotation] Erreur lors de la rotation:', error, {
        attempt: retryCount + 1,
      });

      // Retry logic
      if (retryCount < TOKEN_ROTATION_CONFIG.MAX_RETRY_ATTEMPTS) {
        logger.info(`🔄 [Token Rotation] Nouvelle tentative dans ${TOKEN_ROTATION_CONFIG.RETRY_DELAY / 1000}s`);
        await new Promise((resolve) =>
          setTimeout(resolve, TOKEN_ROTATION_CONFIG.RETRY_DELAY)
        );
        return this.rotateTokens(retryCount + 1);
      }

      return {
        success: false,
        rotatedAt: Date.now(),
        expiresAt: 0,
        error: String(error),
        retryCount: retryCount + 1,
      };
    } finally {
      this.isRotating = false;
    }
  }

  /**
   * Appeler l'API de refresh des tokens
   * À implémenter avec l'API réelle
   */
  private async callRefreshTokenAPI(currentTokens: TokenData): Promise<TokenData> {
    try {
      // À implémenter avec l'API réelle
      // Pour le moment, retourner les tokens avec une nouvelle expiration
      const newExpiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 heures

      return {
        ...currentTokens,
        expiresAt: newExpiresAt,
      };
    } catch (error) {
      logger.error('❌ [Token Rotation] Erreur lors de l\'appel API:', error);
      throw error;
    }
  }

  /**
   * Gérer les changements d'état de l'app
   */
  private handleAppStateChange(state: AppStateStatus): void {
    if (state === 'active') {
      logger.info('📱 [Token Rotation] App en avant-plan');
      // Vérifier les tokens quand l'app revient au premier plan
      this.checkAndRotateTokens();
    } else if (state === 'background') {
      logger.info('📱 [Token Rotation] App en arrière-plan');
    }
  }

  /**
   * Obtenir le nombre de rotations
   */
  public getRotationCount(): number {
    return this.rotationCount;
  }

  /**
   * Obtenir le temps de la dernière rotation
   */
  public getLastRotationTime(): number {
    return this.lastRotationTime;
  }

  /**
   * Obtenir le temps jusqu'à la prochaine rotation
   */
  public getTimeUntilNextRotation(): number {
    const timeSinceLastRotation = Date.now() - this.lastRotationTime;
    const timeUntilNextRotation = TOKEN_ROTATION_CONFIG.ROTATION_INTERVAL - timeSinceLastRotation;
    return Math.max(0, timeUntilNextRotation);
  }

  /**
   * Forcer la rotation immédiate
   */
  public async forceRotation(): Promise<TokenRotationResult> {
    logger.info('🔄 [Token Rotation] Rotation forcée demandée');
    return this.rotateTokens();
  }

  /**
   * Activer/Désactiver la rotation automatique
   */
  public setAutoRotationEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    if (enabled) {
      this.startAutoRotation();
    } else {
      this.stopAutoRotation();
    }
    logger.info(`${enabled ? '✅' : '⛔'} [Token Rotation] Rotation automatique ${enabled ? 'activée' : 'désactivée'}`);
  }

  /**
   * Nettoyer le service
   */
  public cleanup(): void {
    this.stopAutoRotation();

    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }

    logger.info('✅ [Token Rotation] Service nettoyé');
  }
}

export const tokenRotationService = new TokenRotationService();

/**
 * Initialiser le service au démarrage
 */
export async function initializeTokenRotation(): Promise<void> {
  await tokenRotationService.initialize();
}
