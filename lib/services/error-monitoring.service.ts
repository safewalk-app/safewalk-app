/**
 * Error Monitoring Service - Suivi des erreurs en temps réel
 * 
 * Fonctionnalités:
 * - Capture des erreurs non gérées
 * - Suivi des performances
 * - Alertes en temps réel (Sentry)
 * - Logs centralisés
 * - Contexte utilisateur
 */

import { logger } from '@/lib/logger';

// Configuration Sentry (à configurer en production)
const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN || '';
const ENVIRONMENT = process.env.NODE_ENV || 'development';
const APP_VERSION = '5.9.0';

/**
 * Types d'erreurs
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum ErrorCategory {
  NETWORK = 'network',
  API = 'api',
  AUTH = 'auth',
  DATABASE = 'database',
  VALIDATION = 'validation',
  PERMISSION = 'permission',
  UNKNOWN = 'unknown',
}

/**
 * Interface pour les erreurs
 */
export interface ErrorReport {
  id: string;
  timestamp: number;
  message: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  stack?: string;
  context?: Record<string, any>;
  userId?: string;
  userAgent?: string;
  url?: string;
  statusCode?: number;
  retryCount?: number;
  resolved?: boolean;
}

/**
 * Service de monitoring des erreurs
 */
class ErrorMonitoringService {
  private errorQueue: ErrorReport[] = [];
  private maxQueueSize = 100;
  private flushInterval = 30000; // 30 secondes
  private isInitialized = false;

  /**
   * Initialiser le service de monitoring
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Initialiser Sentry si DSN configuré
      if (SENTRY_DSN) {
        await this.initializeSentry();
      }

      // Capturer les erreurs non gérées
      this.setupGlobalErrorHandlers();

      // Démarrer le flush périodique
      this.startPeriodicFlush();

      this.isInitialized = true;
      logger.info('✅ [Error Monitoring] Service initialisé');
    } catch (error) {
      logger.error('❌ [Error Monitoring] Erreur d\'initialisation:', error);
    }
  }

  /**
   * Initialiser Sentry
   */
  private async initializeSentry(): Promise<void> {
    try {
      // Sentry sera initialisé côté serveur en production
      logger.info('🔗 [Sentry] Configuration en cours...');
    } catch (error) {
      logger.error('❌ [Sentry] Erreur de configuration:', error);
    }
  }

  /**
   * Configurer les gestionnaires d'erreurs globaux
   */
  private setupGlobalErrorHandlers(): void {
    // Erreurs non gérées (React Native)
    if (global.ErrorUtils) {
      global.ErrorUtils.setGlobalHandler((error: any, isFatal: boolean) => {
        this.captureError({
          message: error.message || 'Erreur non gérée',
          category: ErrorCategory.UNKNOWN,
          severity: isFatal ? ErrorSeverity.CRITICAL : ErrorSeverity.HIGH,
          stack: error.stack,
          context: { isFatal },
        });
      });
    }

    // Promesses rejetées non gérées
    if (global.onunhandledrejection) {
      global.onunhandledrejection = (event: any) => {
        this.captureError({
          message: event.reason?.message || 'Promesse rejetée non gérée',
          category: ErrorCategory.UNKNOWN,
          severity: ErrorSeverity.HIGH,
          stack: event.reason?.stack,
          context: { type: 'unhandledRejection' },
        });
      };
    }
  }

  /**
   * Capturer une erreur
   */
  public captureError(error: Omit<ErrorReport, 'id' | 'timestamp'>): ErrorReport {
    const errorReport: ErrorReport = {
      id: this.generateErrorId(),
      timestamp: Date.now(),
      message: error.message,
      category: error.category || ErrorCategory.UNKNOWN,
      severity: error.severity || ErrorSeverity.MEDIUM,
      stack: error.stack,
      context: error.context,
      userId: error.userId,
      userAgent: error.userAgent,
      url: error.url,
      statusCode: error.statusCode,
      retryCount: error.retryCount || 0,
      resolved: false,
    };

    // Ajouter à la queue
    this.addToQueue(errorReport);

    // Logger
    this.logError(errorReport);

    // Envoyer immédiatement si critique
    if (errorReport.severity === ErrorSeverity.CRITICAL) {
      this.flush();
    }

    return errorReport;
  }

  /**
   * Capturer une erreur réseau
   */
  public captureNetworkError(
    message: string,
    statusCode?: number,
    context?: Record<string, any>
  ): ErrorReport {
    return this.captureError({
      message,
      category: ErrorCategory.NETWORK,
      severity: statusCode === 429 ? ErrorSeverity.HIGH : ErrorSeverity.MEDIUM,
      statusCode,
      context,
    });
  }

  /**
   * Capturer une erreur API
   */
  public captureApiError(
    endpoint: string,
    statusCode: number,
    error: any
  ): ErrorReport {
    return this.captureError({
      message: `API Error: ${endpoint} (${statusCode})`,
      category: ErrorCategory.API,
      severity: statusCode >= 500 ? ErrorSeverity.HIGH : ErrorSeverity.MEDIUM,
      statusCode,
      context: {
        endpoint,
        error: error?.message || error,
      },
    });
  }

  /**
   * Capturer une erreur d'authentification
   */
  public captureAuthError(message: string, context?: Record<string, any>): ErrorReport {
    return this.captureError({
      message,
      category: ErrorCategory.AUTH,
      severity: ErrorSeverity.HIGH,
      context,
    });
  }

  /**
   * Capturer une erreur de validation
   */
  public captureValidationError(field: string, message: string): ErrorReport {
    return this.captureError({
      message: `Validation Error: ${field} - ${message}`,
      category: ErrorCategory.VALIDATION,
      severity: ErrorSeverity.LOW,
      context: { field },
    });
  }

  /**
   * Marquer une erreur comme résolue
   */
  public resolveError(errorId: string): void {
    const error = this.errorQueue.find(e => e.id === errorId);
    if (error) {
      error.resolved = true;
      logger.info(`✅ [Error Monitoring] Erreur ${errorId} marquée comme résolue`);
    }
  }

  /**
   * Ajouter à la queue
   */
  private addToQueue(error: ErrorReport): void {
    this.errorQueue.push(error);

    // Limiter la taille de la queue
    if (this.errorQueue.length > this.maxQueueSize) {
      this.errorQueue = this.errorQueue.slice(-this.maxQueueSize);
    }
  }

  /**
   * Logger une erreur
   */
  private logError(error: ErrorReport): void {
    const severityEmoji = {
      [ErrorSeverity.LOW]: '⚠️',
      [ErrorSeverity.MEDIUM]: '⚠️',
      [ErrorSeverity.HIGH]: '❌',
      [ErrorSeverity.CRITICAL]: '🚨',
    };

    const emoji = severityEmoji[error.severity];
    logger.error(
      `${emoji} [${error.category.toUpperCase()}] ${error.message}`,
      {
        errorId: error.id,
        severity: error.severity,
        stack: error.stack,
        context: error.context,
      }
    );
  }

  /**
   * Démarrer le flush périodique
   */
  private startPeriodicFlush(): void {
    setInterval(() => {
      this.flush();
    }, this.flushInterval);
  }

  /**
   * Envoyer les erreurs à Sentry
   */
  public async flush(): Promise<void> {
    if (this.errorQueue.length === 0) return;

    try {
      const errorsToSend = this.errorQueue.filter(e => !e.resolved);

      if (errorsToSend.length === 0) return;

      logger.info(`📤 [Error Monitoring] Envoi de ${errorsToSend.length} erreurs...`);

      // Envoyer à Sentry (côté serveur en production)
      await this.sendToSentry(errorsToSend);

      // Envoyer aux logs centralisés
      await this.sendToLogsService(errorsToSend);

      // Vider la queue
      this.errorQueue = [];

      logger.info('✅ [Error Monitoring] Erreurs envoyées avec succès');
    } catch (error) {
      logger.error('❌ [Error Monitoring] Erreur lors de l\'envoi:', error);
    }
  }

  /**
   * Envoyer à Sentry
   */
  private async sendToSentry(errors: ErrorReport[]): Promise<void> {
    if (!SENTRY_DSN) return;

    try {
      // Envoyer à Sentry via API
      const response = await fetch('https://sentry.io/api/0/projects/submit/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Sentry-Auth': `DSN ${SENTRY_DSN}`,
        },
        body: JSON.stringify({
          version: APP_VERSION,
          environment: ENVIRONMENT,
          errors: errors.map(e => ({
            type: e.category,
            value: e.message,
            stacktrace: e.stack,
            level: e.severity,
            timestamp: e.timestamp,
            extra: e.context,
          })),
        }),
      });

      if (!response.ok) {
        logger.error('❌ [Sentry] Erreur d\'envoi:', response.statusText);
      }
    } catch (error) {
      logger.error('❌ [Sentry] Exception:', error);
    }
  }

  /**
   * Envoyer aux logs centralisés
   */
  private async sendToLogsService(errors: ErrorReport[]): Promise<void> {
    try {
      // Envoyer aux logs centralisés (ELK, Datadog, etc.)
      const response = await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service: 'safewalk-app',
          version: APP_VERSION,
          environment: ENVIRONMENT,
          errors,
        }),
      });

      if (!response.ok) {
        logger.error('❌ [Logs Service] Erreur d\'envoi:', response.statusText);
      }
    } catch (error) {
      logger.error('❌ [Logs Service] Exception:', error);
    }
  }

  /**
   * Obtenir les statistiques
   */
  public getStats(): {
    totalErrors: number;
    unresolvedErrors: number;
    criticalErrors: number;
    errorsByCategory: Record<string, number>;
  } {
    const unresolvedErrors = this.errorQueue.filter(e => !e.resolved);
    const criticalErrors = unresolvedErrors.filter(
      e => e.severity === ErrorSeverity.CRITICAL
    );

    const errorsByCategory: Record<string, number> = {};
    unresolvedErrors.forEach(e => {
      errorsByCategory[e.category] = (errorsByCategory[e.category] || 0) + 1;
    });

    return {
      totalErrors: this.errorQueue.length,
      unresolvedErrors: unresolvedErrors.length,
      criticalErrors: criticalErrors.length,
      errorsByCategory,
    };
  }

  /**
   * Générer un ID unique pour l'erreur
   */
  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Exporter l'instance singleton
export const errorMonitoring = new ErrorMonitoringService();

/**
 * Initialiser le service au démarrage de l'app
 */
export async function initializeErrorMonitoring(): Promise<void> {
  await errorMonitoring.initialize();
}
