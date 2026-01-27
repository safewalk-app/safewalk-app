/**
 * Service de surveillance des sessions actives
 * Vérifie toutes les minutes si des sessions ont dépassé leur deadline
 * et envoie automatiquement les SMS d'alerte
 */

import { getDb } from '../db';
import { sessions, userPreferences } from '../../drizzle/schema';
import { eq, and, lte } from 'drizzle-orm';
import { sendAlertSMS } from './twilio';

let monitorInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Démarrer la surveillance des sessions
 */
export function startSessionMonitor() {
  if (monitorInterval) {
    console.log('⚠️ [SessionMonitor] Already running');
    return;
  }

  console.log('🔄 [SessionMonitor] Starting...');
  
  // Vérifier immédiatement au démarrage
  checkSessions();
  
  // Puis vérifier toutes les 30 secondes
  monitorInterval = setInterval(() => {
    checkSessions();
  }, 30 * 1000);

  console.log('✅ [SessionMonitor] Started (checking every 30s)');
}

/**
 * Arrêter la surveillance des sessions
 */
export function stopSessionMonitor() {
  if (monitorInterval) {
    clearInterval(monitorInterval);
    monitorInterval = null;
    console.log('🛑 [SessionMonitor] Stopped');
  }
}

/**
 * Vérifier toutes les sessions actives
 */
async function checkSessions() {
  try {
    const db = await getDb();
    if (!db) {
      console.warn('⚠️ [SessionMonitor] Database not available');
      return;
    }

    const now = new Date();
    
    // Récupérer toutes les sessions actives dont la deadline est dépassée
    const overdueSessionsResult = await db
      .select({
        session: sessions,
        prefs: userPreferences,
      })
      .from(sessions)
      .leftJoin(userPreferences, eq(sessions.userId, userPreferences.userId))
      .where(
        and(
          eq(sessions.status, 'active'),
          lte(sessions.deadline, now)
        )
      );

    if (overdueSessionsResult.length === 0) {
      // Pas de sessions en retard
      return;
    }

    console.log(`⚠️ [SessionMonitor] Found ${overdueSessionsResult.length} overdue session(s)`);

    // Traiter chaque session en retard
    for (const { session, prefs } of overdueSessionsResult) {
      if (!prefs) {
        console.warn(`⚠️ [SessionMonitor] No preferences found for user ${session.userId}`);
        continue;
      }

      // Vérifier si on a déjà envoyé une alerte pour cette session
      if (session.alertTriggeredAt) {
        console.log(`⏭️ [SessionMonitor] Alert already sent for session ${session.id}`);
        continue;
      }

      console.log(`🚨 [SessionMonitor] Triggering alert for session ${session.id}`);

      // Envoyer SMS d'alerte au contact d'urgence
      try {
        if (prefs.emergencyContact1Phone) {
          const limitTimeStr = session.limitTime.toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit',
          });

          await sendAlertSMS(
            prefs.emergencyContact1Phone,
            limitTimeStr,
            15, // tolérance par défaut
            undefined // pas de localisation pour l'instant
          );

          console.log(`✅ [SessionMonitor] Alert SMS sent for session ${session.id}`);
        }

        // Marquer la session comme "alerte déclenchée"
        const dbUpdate = await getDb();
        if (!dbUpdate) return;
        
        await dbUpdate
          .update(sessions)
          .set({
            status: 'overdue',
            alertTriggeredAt: now,
            updatedAt: now,
          })
          .where(eq(sessions.id, session.id));

        console.log(`✅ [SessionMonitor] Session ${session.id} marked as overdue`);
      } catch (error: any) {
        console.error(`❌ [SessionMonitor] Failed to send alert for session ${session.id}:`, error.message);
      }
    }
  } catch (error: any) {
    console.error('❌ [SessionMonitor] Error checking sessions:', error.message);
  }
}

/**
 * Vérifier manuellement les sessions (pour tests)
 */
export async function checkSessionsNow() {
  console.log('🔍 [SessionMonitor] Manual check triggered');
  await checkSessions();
}
