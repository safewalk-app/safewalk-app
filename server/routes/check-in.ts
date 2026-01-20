import { Router } from "express";

const router = Router();

// POST /api/check-in/confirm - Confirmer un check-in
router.post("/confirm", (req, res) => {
  try {
    const { sessionId, userId, location } = req.body;

    if (!sessionId || !userId) {
      return res.status(400).json({ error: "sessionId and userId are required" });
    }

    // Confirmer le check-in
    const checkIn = {
      id: `checkin_${Date.now()}`,
      sessionId,
      userId,
      location,
      confirmedAt: new Date().toISOString(),
      status: "confirmed",
    };

    res.json({ success: true, checkIn });
  } catch (error) {
    console.error("Error confirming check-in:", error);
    res.status(500).json({ error: "Failed to confirm check-in" });
  }
});

export default router;
