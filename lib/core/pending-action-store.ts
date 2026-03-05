import { logger } from '@/lib/utils/logger';
import type { ActionType } from './safety-guard';

/**
 * Store pour gérer les actions en attente de reprise
 * Utilisé pour reprendre automatiquement une action après:
 * - Ajout d'un contact d'urgence
 * - Vérification OTP
 * - Achat de crédits
 */

interface PendingAction {
  actionType: ActionType;
  params?: Record<string, any>;
  timestamp: number;
}

class PendingActionStore {
  private pendingAction: PendingAction | null = null;

  /**
   * Mémoriser une action en attente
   */
  setPendingAction(actionType: ActionType, params?: Record<string, any>) {
    this.pendingAction = {
      actionType,
      params,
      timestamp: Date.now(),
    };
    logger.info('[PendingActionStore] Action stored', {
      actionType,
      params,
    });
  }

  /**
   * Récupérer l'action en attente
   */
  getPendingAction(): PendingAction | null {
    return this.pendingAction;
  }

  /**
   * Effacer l'action en attente
   */
  clearPendingAction() {
    logger.info('[PendingActionStore] Action cleared');
    this.pendingAction = null;
  }

  /**
   * Vérifier s'il y a une action en attente
   */
  hasPendingAction(): boolean {
    return this.pendingAction !== null;
  }

  /**
   * Vérifier si l'action en attente est expirée (> 5 minutes)
   */
  isPendingActionExpired(): boolean {
    if (!this.pendingAction) return false;
    const age = Date.now() - this.pendingAction.timestamp;
    const isExpired = age > 5 * 60 * 1000; // 5 minutes
    if (isExpired) {
      logger.warn('[PendingActionStore] Action expired', { age });
    }
    return isExpired;
  }
}

// Singleton
export const pendingActionStore = new PendingActionStore();
