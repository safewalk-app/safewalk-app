import { Router, Request, Response } from "express";
import { sendFriendlyAlertSMSToMultiple } from "../services/friendly-sms";
import * as db from "../db";
import crypto from "crypto";

const router = Router();

/**
 * POST /api/sos/trigger
 * Déclenche une alerte SOS immédiate
 * Envoie SMS friendly à tous les contacts d'urgence avec position GPS
 */
router.post("/trigger", async (req: Request, res: Response) => {
  try {
    const { sessionId, userId, latitude, longitude, accuracy } = req.body;

    console.log('[SOS] Requête reçue:', { sessionId, userId, latitude, longitude, accuracy });

    if (!sessionId || !userId) {
      console.error('[SOS] Erreur: sessionId ou userId manquant');
      return res.status(400).json({
        success: false,
        error: "sessionId et userId sont requis",
      });
    }

    // Récupérer la session (ou créer une session par défaut)
    let session = await db.getSession(sessionId);
    if (!session) {
      console.log('[SOS] Création session par défaut');
      const now = new Date();
      const defaultSession = {
        id: sessionId,
        userId,
        startTime: now,
        limitTime: new Date(now.getTime() + 60 * 60 * 1000),
        deadline: new Date(now.getTime() + 75 * 60 * 1000),
        tolerance: 15,
        status: 'active' as const,
      };
      session = await db.upsertSession(defaultSession);
      if (!session) {
        return res.status(500).json({
          success: false,
          error: "Impossible de créer la session",
        });
      }
    }

    // Récupérer les préférences utilisateur pour les contacts d'urgence
    let preferences = await db.getUserPreferences(userId);
    
    // Si pas de préférences, créer les préférences par défaut
    if (!preferences) {
      console.log('[SOS] Création des préférences par défaut pour userId:', userId);
      // Pas de préférences par défaut - l'utilisateur DOIT configurer ses contacts
      return res.status(400).json({
        success: false,
        error: "Aucun contact d'urgence configuré. Veuillez configurer vos contacts dans les paramètres.",
      });
    }

    const emergencyContacts: Array<{ name: string; phone: string }> = [];
    if (preferences.emergencyContact1Phone) {
      emergencyContacts.push({
        name: preferences.emergencyContact1Name || '',
        phone: preferences.emergencyContact1Phone,
      });
    }
    if (preferences.emergencyContact2Phone) {
      emergencyContacts.push({
        name: preferences.emergencyContact2Name || "",
        phone: preferences.emergencyContact2Phone,
      });
    }

    if (emergencyContacts.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Aucun contact d'urgence configuré",
      });
    }

    // Utiliser le système SMS friendly pour SOS
    const location = latitude && longitude ? { latitude, longitude } : undefined;
    const limitTimeStr = session.limitTime.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    console.log(`[SOS] Envoi SMS friendly à ${emergencyContacts.length} contact(s)...`);

    const smsResults = await sendFriendlyAlertSMSToMultiple(
      emergencyContacts,
      preferences.firstName || 'Utilisateur',
      limitTimeStr,
      '🚨 ALERTE SOS IMMÉDIATE',
      location
    );

    // Enregistrer les logs SMS en base de données
    for (const result of smsResults) {
      const smsLogId = crypto.randomUUID();
      await db.saveSmsLog({
        id: smsLogId,
        sessionId,
        phoneNumber: result.phone,
        message: `SOS Alert to ${result.phone}`,
        status: result.status as 'sent' | 'failed',
        messageSid: result.messageSid,
      });
    }

    // Sauvegarder la position GPS si fournie
    if (latitude && longitude) {
      const positionId = crypto.randomUUID();
      await db.savePosition({
        id: positionId,
        sessionId,
        latitude,
        longitude,
        accuracy,
      });
    }

    // Mettre à jour la session pour marquer l'alerte SOS
    await db.upsertSession({
      ...session,
      status: "overdue",
      alertTriggeredAt: new Date(),
      updatedAt: new Date(),
    });

    res.json({
      success: true,
      message: "Alerte SOS déclenchée",
      smsResults: smsResults.map(r => ({
        contact: emergencyContacts.find(c => c.phone === r.phone)?.name || 'Unknown',
        phone: r.phone,
        messageSid: r.messageSid,
        status: r.status,
      })),
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("[SOS] Erreur:", error);
    res.status(500).json({
      success: false,
      error: "Erreur lors du déclenchement de l'alerte SOS",
      details: String(error),
    });
  }
});

export default router;
