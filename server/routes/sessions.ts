import { Router } from "express";

const router = Router();

// POST /api/sessions/create - Créer une nouvelle session
router.post("/create", (req, res) => {
  try {
    const { userId, limitTime, tolerance, emergencyContacts, location } = req.body;

    if (!limitTime) {
      return res.status(400).json({ error: "limitTime is required" });
    }

    // Créer une session avec les données
    const session = {
      id: `session_${Date.now()}`,
      userId: userId || `user_${Date.now()}`,
      limitTime,
      deadline: new Date(new Date(limitTime).getTime() + (tolerance || 15) * 60000).toISOString(),
      tolerance: tolerance || 15,
      emergencyContacts,
      location,
      status: "active",
      createdAt: new Date().toISOString(),
      checkInConfirmed: false,
      extensionsCount: 0,
    };

    res.json({ success: true, session });
  } catch (error) {
    console.error("Error creating session:", error);
    res.status(500).json({ error: "Failed to create session" });
  }
});

// GET /api/sessions/:id - Récupérer une session
router.get("/:id", (req, res) => {
  try {
    const { id } = req.params;

    // Simuler la récupération d'une session
    const session = {
      id,
      status: "active",
      limitTime: new Date().toISOString(),
      deadline: new Date(Date.now() + 15 * 60000).toISOString(),
      checkInConfirmed: false,
      extensionsCount: 0,
    };

    res.json({ success: true, session });
  } catch (error) {
    console.error("Error fetching session:", error);
    res.status(500).json({ error: "Failed to fetch session" });
  }
});

export default router;
