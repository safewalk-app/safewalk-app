import { Router, Request, Response } from 'express';
import twilio from 'twilio';

const router = Router();

// Initialiser le client Twilio
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

/**
 * GET /api/sms/health
 * Health check pour vérifier que l'API SMS est accessible
 */
router.get('/health', (req: Request, res: Response) => {
  const hasCredentials = !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER);
  
  return res.status(200).json({
    ok: true,
    service: 'SMS API',
    timestamp: new Date().toISOString(),
    twilioConfigured: hasCredentials,
  });
});

/**
 * POST /api/sms/send
 * Envoyer un SMS simple via Twilio
 * 
 * Body:
 * {
 *   "to": "+33612345678",
 *   "message": "Texte du message"
 * }
 */
router.post('/send', async (req: Request, res: Response) => {
  console.log('📨 [SMS] Requête reçue:', { to: req.body.to, messageLength: req.body.message?.length });
  
  try {
    const { to, message } = req.body;

    // Validation des paramètres
    if (!to || !message) {
      console.error('❌ [SMS] Paramètres manquants:', { to: !!to, message: !!message });
      return res.status(400).json({
        ok: false,
        error: 'Missing required fields: to, message',
      });
    }

    // Vérifier les credentials Twilio
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
      console.error('❌ [SMS] Credentials Twilio manquantes');
      return res.status(500).json({
        ok: false,
        error: 'Twilio credentials not configured',
      });
    }

    console.log(`📤 [SMS] Envoi SMS à ${to}...`);
    console.log(`📝 [SMS] Message: ${message.substring(0, 50)}...`);

    // Envoyer le SMS via Twilio
    const result = await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: to,
    });

    console.log(`✅ [SMS] SMS envoyé avec succès`);
    console.log(`   SID: ${result.sid}`);
    console.log(`   Status: ${result.status}`);
    console.log(`   To: ${result.to}`);
    console.log(`   From: ${result.from}`);
    console.log(`   ErrorCode: ${result.errorCode || 'none'}`);
    console.log(`   ErrorMessage: ${result.errorMessage || 'none'}`);
    console.log(`   Price: ${result.price || 'pending'}`);
    console.log(`   PriceUnit: ${result.priceUnit || 'pending'}`);

    return res.status(200).json({
      ok: true,
      sid: result.sid,
      status: result.status,
      to: result.to,
      errorCode: result.errorCode,
      errorMessage: result.errorMessage,
    });
  } catch (error: any) {
    console.error('❌ [SMS] Erreur Twilio:', error);
    
    // Extraire les détails de l'erreur Twilio
    const errorDetails = {
      message: error.message || 'Unknown error',
      code: error.code || null,
      status: error.status || null,
      moreInfo: error.moreInfo || null,
    };

    return res.status(500).json({
      ok: false,
      error: 'Failed to send SMS',
      details: errorDetails,
    });
  }
});

export default router;
