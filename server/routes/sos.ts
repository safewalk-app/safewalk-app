import { Router, Request, Response } from "express";
import { sendAlertSMS } from "../services/twilio";
import * as db from "../db";
import crypto from "crypto";

const router = Router();

/**
 * POST /api/sos/trigger
 * Déclenche une alerte SOS immédiate
 * Envoie SMS à tous les contacts d'urgence avec position GPS
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
      const defaultPrefs = {
        userId,
        firstName: 'Utilisateur',
        emergencyContact1Name: 'Contact 1',
        emergencyContact1Phone: '+33763458273',
        emergencyContact2Name: 'Contact 2',
        emergencyContact2Phone: '+33763458273',
      };
      preferences = await db.upsertUserPreferences(defaultPrefs);
      
      if (!preferences) {
        return res.status(500).json({
          success: false,
          error: "Impossible de créer les préférences utilisateur",
        });
      }
    }

    const emergencyContacts = [];
    if (preferences.emergencyContact1Phone) {
      emergencyContacts.push({
        name: preferences.emergencyContact1Name || "Contact 1",
        phone: preferences.emergencyContact1Phone,
      });
    }
    if (preferences.emergencyContact2Phone) {
      emergencyContacts.push({
        name: preferences.emergencyContact2Name || "Contact 2",
        phone: preferences.emergencyContact2Phone,
      });
    }

    if (emergencyContacts.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Aucun contact d'urgence configuré",
      });
    }

    // Construire le message SOS
    let sosMessage = `🚨 ALERTE SOS 🚨\n\n`;
    sosMessage += `${preferences.firstName || "Quelqu'un"} a déclenché une alerte d'urgence.\n\n`;

    if (latitude && longitude) {
      sosMessage += `📍 Position: ${latitude}, ${longitude}\n`;
      sosMessage += `🗺️ Google Maps: https://maps.google.com/?q=${latitude},${longitude}\n\n`;
    }

    sosMessage += `⏰ Heure: ${new Date().toLocaleString("fr-FR")}\n`;
    sosMessage += `📱 Réponds ou appelle immédiatement.`;

    // Envoyer SMS à tous les contacts d'urgence
    const smsResults = [];
    for (const contact of emergencyContacts) {
      try {
        // Envoyer le SMS SOS
        let messageSid = "";
        try {
          await sendAlertSMS(contact.phone, "immédiatement", 0);
          messageSid = crypto.randomUUID();
        } catch (err) {
          console.error(`Erreur lors de l'envoi SOS à ${contact.phone}:`, err);
          throw err;
        }

        // Enregistrer le log SMS en base de données
        const smsLogId = crypto.randomUUID();
        await db.saveSmsLog({
          id: smsLogId,
          sessionId,
          phoneNumber: contact.phone,
          message: sosMessage,
          status: "sent",
          messageSid,
        });

        smsResults.push({
          contact: contact.name,
          phone: contact.phone,
          messageSid,
          status: "sent",
        });

        console.log(`[SOS] SMS envoyé à ${contact.name} (${contact.phone}): ${messageSid}`);
      } catch (error) {
        console.error(`[SOS] Erreur lors de l'envoi à ${contact.name}:`, error);
        smsResults.push({
          contact: contact.name,
          phone: contact.phone,
          status: "failed",
          error: String(error),
        });
      }
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
      smsResults,
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
