import express, { Router } from "express";
import smsRoutes from "../routes/sms";
import webhookRoutes from "../routes/webhooks";
import sessionsRoutes from "../routes/sessions";
import checkInRoutes from "../routes/check-in";

const router = Router();

// Monter les routes API
router.use("/sms", smsRoutes);
router.use("/webhooks", webhookRoutes);
router.use("/sessions", sessionsRoutes);
router.use("/check-in", checkInRoutes);

export default router;
