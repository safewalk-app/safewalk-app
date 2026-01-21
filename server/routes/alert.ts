import { Router, Request, Response } from "express";
import { sendAlertSMS } from "../services/twilio";
import * as db from "../db";
import crypto from "crypto";

const router = Router();

/**
 * POST /api/alert
 * Endpoint pour envoyer une alerte SMS quand la deadline expire
 */
router.post("/", async (req: Request, res: Response) => {
  try {
    const { sessionId, userId, latitude, longitude, accuracy } = req.body;

    console.log("🚨 Alerte deadline dépassée pour session:", sessionId);

    // Récupérer la session
    const session = await db.getSession(sessionId);
    if (!session) {
      console.warn("⚠️ Session non trouvée:", sessionId);
      return res.status(404).json({
        success: false,
        error: "Session non trouvée",
      });
    }

    // Récupérer les préférences utilisateur
    const preferences = await db.getUserPreferences(userId);
    if (!preferences) {
      console.warn("⚠️ Préférences utilisateur non trouvées:", userId);
      return res.status(404).json({
        success: false,
        error: "Préférences utilisateur non trouvées",
      });
    }

    // Préparer les numéros de téléphone
    const phoneNumbers: string[] = [];
    if (preferences.emergencyContact1Phone) {
      phoneNumbers.push(preferences.emergencyContact1Phone);
    }
    if (preferences.emergencyContact2Phone) {
      phoneNumbers.push(preferences.emergencyContact2Phone);
    }

    if (phoneNumbers.length === 0) {
      console.warn("⚠️ Aucun contact d'urgence configuré");
      return res.status(400).json({
        success: false,
        error: "Aucun contact d'urgence configuré",
      });
    }

    // Formater la position
    const locationStr = latitude && longitude 
      ? `📍 Position: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}\nGoogle Maps: https://maps.google.com/?q=${latitude},${longitude}`
      : "Position non disponible";

    // Formater le message d'alerte
    const message = `🚨 ALERTE SAFEWALK 🚨
${preferences.firstName || "Utilisateur"} n'a pas confirmé son retour à l'heure limite.
Heure d'alerte: ${new Date().toLocaleTimeString("fr-FR")}
${locationStr}

Répondez ou appelez pour confirmer que tout va bien.`;

    console.log("📤 Envoi SMS d'alerte à", phoneNumbers.length, "contacts");

    // Envoyer les SMS
    const smsResults = [];
    for (const phoneNumber of phoneNumbers) {
      try {
        await sendAlertSMS(phoneNumber, "immédiatement", 0, { latitude, longitude });
        const messageSid = crypto.randomUUID();
        
        console.log("✅ SMS envoyé à", phoneNumber, "- SID:", messageSid);
        smsResults.push({
          contact: preferences.emergencyContact1Phone === phoneNumber 
            ? preferences.emergencyContact1Name 
            : preferences.emergencyContact2Name,
          phone: phoneNumber,
          messageSid,
          status: "sent",
        });

        // Enregistrer le SMS en base de données
        await db.saveSmsLog({
          id: crypto.randomUUID(),
          sessionId,
          phoneNumber,
          message,
          status: "sent",
          messageSid,
        });
      } catch (err) {
        console.error("❌ Erreur lors de l'envoi SMS à", phoneNumber, err);
        smsResults.push({
          contact: preferences.emergencyContact1Phone === phoneNumber 
            ? preferences.emergencyContact1Name 
            : preferences.emergencyContact2Name,
          phone: phoneNumber,
          status: "failed",
        });
      }
    }

    // Mettre à jour le statut de la session
    await db.upsertSession({
      ...session,
      status: "overdue",
      alertTriggeredAt: new Date(),
    });

    console.log("✅ Alerte traitée avec succès");

    res.json({
      success: true,
      message: "Alerte envoyée",
      smsResults,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("❌ Erreur lors du traitement de l'alerte:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Erreur interne",
    });
  }
});

export default router;
