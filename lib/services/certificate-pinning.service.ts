/**
 * Certificate Pinning Service
 *
 * Implémente le Certificate Pinning pour prévenir les attaques MITM
 *
 * Fonctionnalités:
 * - Validation des certificats SSL/TLS
 * - Pinning des certificats publics (public key pinning)
 * - Fallback sur les certificats système
 * - Logging des violations
 */

import { Platform } from 'react-native';
import { logger } from '@/lib/logger';

/**
 * Configuration des certificats épinglés
 * Format: { host: 'certificatPublicKey' }
 */
const PINNED_CERTIFICATES: Record<string, string[]> = {
  'api.manus.im': [
    // Public Key Pin (SHA-256) - À obtenir du certificat réel
    'sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
    'sha256/BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=', // Backup
  ],
  'kycuteffcbqizyqlhczc.supabase.co': [
    'sha256/CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC=',
    'sha256/DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD=', // Backup
  ],
};

/**
 * Service de Certificate Pinning
 */
class CertificatePinningService {
  private isEnabled = true;
  private violationCount = 0;

  /**
   * Initialiser le service
   */
  public initialize(): void {
    if (Platform.OS === 'web') {
      logger.info('ℹ️ [Certificate Pinning] Désactivé sur web (géré par le navigateur)');
      this.isEnabled = false;
      return;
    }

    logger.info('✅ [Certificate Pinning] Service initialisé');
    this.isEnabled = true;
  }

  /**
   * Valider un certificat pour un host
   * @param host - Nom d'hôte (ex: api.manus.im)
   * @param certificatePublicKey - Clé publique du certificat (SHA-256)
   * @returns true si le certificat est valide
   */
  public validateCertificate(host: string, certificatePublicKey: string): boolean {
    if (!this.isEnabled) {
      return true;
    }

    try {
      const pinnedKeys = PINNED_CERTIFICATES[host];

      if (!pinnedKeys) {
        logger.warn(`⚠️ [Certificate Pinning] Aucun certificat épinglé pour ${host}`);
        return true; // Permettre si pas de pin défini
      }

      const isValid = pinnedKeys.includes(certificatePublicKey);

      if (!isValid) {
        this.violationCount++;
        logger.error(`❌ [Certificate Pinning] VIOLATION: Certificat invalide pour ${host}`, {
          expected: pinnedKeys,
          received: certificatePublicKey,
          violationCount: this.violationCount,
        });

        // Notifier si trop de violations
        if (this.violationCount > 3) {
          logger.error(
            '🚨 [Certificate Pinning] ALERTE: Trop de violations, possible attaque MITM!',
          );
        }

        return false;
      }

      logger.info(`✅ [Certificate Pinning] Certificat valide pour ${host}`);
      return true;
    } catch (error) {
      logger.error('❌ [Certificate Pinning] Erreur lors de la validation:', error);
      return false; // Échouer de manière sécurisée
    }
  }

  /**
   * Obtenir les certificats épinglés pour un host
   */
  public getPinnedCertificates(host: string): string[] | null {
    return PINNED_CERTIFICATES[host] || null;
  }

  /**
   * Ajouter un certificat épinglé
   */
  public addPinnedCertificate(host: string, publicKeyPin: string): void {
    if (!PINNED_CERTIFICATES[host]) {
      PINNED_CERTIFICATES[host] = [];
    }
    PINNED_CERTIFICATES[host].push(publicKeyPin);
    logger.info(`✅ [Certificate Pinning] Certificat ajouté pour ${host}`);
  }

  /**
   * Supprimer un certificat épinglé
   */
  public removePinnedCertificate(host: string, publicKeyPin: string): void {
    if (PINNED_CERTIFICATES[host]) {
      PINNED_CERTIFICATES[host] = PINNED_CERTIFICATES[host].filter((pin) => pin !== publicKeyPin);
      logger.info(`✅ [Certificate Pinning] Certificat supprimé pour ${host}`);
    }
  }

  /**
   * Obtenir le nombre de violations
   */
  public getViolationCount(): number {
    return this.violationCount;
  }

  /**
   * Réinitialiser le compteur de violations
   */
  public resetViolationCount(): void {
    this.violationCount = 0;
    logger.info('✅ [Certificate Pinning] Compteur de violations réinitialisé');
  }

  /**
   * Vérifier si le service est activé
   */
  public isServiceEnabled(): boolean {
    return this.isEnabled;
  }
}

export const certificatePinningService = new CertificatePinningService();

/**
 * Initialiser le service au démarrage
 */
export async function initializeCertificatePinning(): Promise<void> {
  certificatePinningService.initialize();
}
