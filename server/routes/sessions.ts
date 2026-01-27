import { Router } from "express";
import { upsertSession, upsertUserPreferences } from "../db";

const router = Router();

/**
 * Endpoint pour synchroniser une session avec le serveur
 */
router.post("/sync", async (req, res) => {
  try {
    const {
      id,
      userId,
      startTime,
      limitTime,
      deadline,
      status,
      note,
      extensionsCount,
      checkInConfirmed,
      emergencyContactName,
      emergencyContactPhone,
      firstName,
    } = req.body;

    if (!id || !userId || !limitTime || !deadline) {
      res.status(400).json({ ok: false, error: "Missing required fields" });
      return;
    }

    // Synchroniser la session
    const session = await upsertSession({
      id,
      userId,
      startTime: startTime ? new Date(startTime) : new Date(),
      limitTime: new Date(limitTime),
      deadline: new Date(deadline),
      status: status || "active",
      note,
      extensionsCount: extensionsCount || 0,
      checkInConfirmed: checkInConfirmed || 0,
    });

    // Synchroniser les préférences utilisateur (pour avoir les contacts d'urgence)
    if (emergencyContactName || emergencyContactPhone || firstName) {
      await upsertUserPreferences({
        userId,
        firstName,
        emergencyContact1Name: emergencyContactName,
        emergencyContact1Phone: emergencyContactPhone,
        locationEnabled: 0,
        notificationsEnabled: 1,
      });
    }

    console.log(`✅ [API] Session ${id} synchronized`);
    res.json({ ok: true, session });
  } catch (error: any) {
    console.error("❌ [API] Error syncing session:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * Endpoint pour mettre à jour une session (extension, completion, etc.)
 */
router.put("/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const updates = req.body;

    // Convertir les timestamps en Date
    if (updates.deadline) updates.deadline = new Date(updates.deadline);
    if (updates.endTime) updates.endTime = new Date(updates.endTime);
    if (updates.alertTriggeredAt) updates.alertTriggeredAt = new Date(updates.alertTriggeredAt);
    if (updates.checkInConfirmedAt) updates.checkInConfirmedAt = new Date(updates.checkInConfirmedAt);

    const session = await upsertSession({
      id: sessionId,
      ...updates,
    });

    console.log(`✅ [API] Session ${sessionId} updated`);
    res.json({ ok: true, session });
  } catch (error: any) {
    console.error("❌ [API] Error updating session:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

export default router;
