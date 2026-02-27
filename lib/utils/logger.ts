/**
 * Système de logging propre avec niveaux et désactivation automatique en production
 *
 * Usage:
 * - logger.debug('Message de debug', data) → affiché uniquement en développement
 * - logger.info('Message d'info', data) → affiché uniquement en développement
 * - logger.warn('Avertissement', data) → toujours affiché
 * - logger.error('Erreur', error) → toujours affiché
 */

import Constants from 'expo-constants';

// Détection de l'environnement
const isDevelopment = __DEV__ || Constants.expoConfig?.extra?.environment === 'development';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerOptions {
  prefix?: string;
  enabled?: boolean;
}

class Logger {
  private prefix: string;
  private enabled: boolean;

  constructor(options: LoggerOptions = {}) {
    this.prefix = options.prefix || '[SafeWalk]';
    this.enabled = options.enabled !== undefined ? options.enabled : isDevelopment;
  }

  /**
   * Log de debug - désactivé en production
   * Utilisé pour les informations de développement détaillées
   */
  debug(message: string, ...args: any[]) {
    if (this.enabled) {
      console.log(`${this.prefix} [DEBUG]`, message, ...args);
    }
  }

  /**
   * Log d'information - désactivé en production
   * Utilisé pour les informations générales
   */
  info(message: string, ...args: any[]) {
    if (this.enabled) {
      console.log(`${this.prefix} [INFO]`, message, ...args);
    }
  }

  /**
   * Log d'avertissement - toujours actif
   * Utilisé pour les situations potentiellement problématiques
   */
  warn(message: string, ...args: any[]) {
    console.warn(`${this.prefix} [WARN]`, message, ...args);
  }

  /**
   * Log d'erreur - toujours actif
   * Utilisé pour les erreurs et exceptions
   */
  error(message: string, ...args: any[]) {
    console.error(`${this.prefix} [ERROR]`, message, ...args);
  }

  /**
   * Créer un logger avec un préfixe personnalisé
   */
  createChild(prefix: string): Logger {
    return new Logger({
      prefix: `${this.prefix} ${prefix}`,
      enabled: this.enabled,
    });
  }
}

// Instance par défaut
export const logger = new Logger();

// Export de la classe pour créer des loggers personnalisés
export { Logger };
