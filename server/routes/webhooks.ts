import { Router, Request, Response } from 'express';

const router = Router();

/**
 * POST /api/webhooks/twilio
 * Recevoir les confirmations de SMS de Twilio
 * Twilio envoie les statuts: queued, failed, sent, delivered, undelivered, read
 */
router.post('/twilio', async (req: Request, res: Response) => {
  try {
    const { MessageSid, MessageStatus, To, From, ErrorCode, ErrorMessage } = req.body;

    console.log(`📨 Webhook Twilio reçu:`);
    console.log(`   MessageSid: ${MessageSid}`);
    console.log(`   Status: ${MessageStatus}`);
    console.log(`   To: ${To}`);
    console.log(`   From: ${From}`);

    // Gérer les différents statuts
    switch (MessageStatus) {
      case 'delivered':
        console.log(`✅ SMS livré à ${To}`);
        // TODO: Mettre à jour le statut de la session
        break;
      case 'failed':
        console.log(`❌ SMS échoué à ${To}: ${ErrorMessage}`);
        // TODO: Notifier l'utilisateur de l'erreur
        break;
      case 'undelivered':
        console.log(`⚠️ SMS non livré à ${To}`);
        // TODO: Réessayer ou notifier
        break;
      case 'sent':
        console.log(`📤 SMS envoyé à ${To}`);
        break;
      default:
        console.log(`📌 Statut inconnu: ${MessageStatus}`);
    }

    // Répondre avec succès (Twilio attend une réponse 200)
    return res.status(200).json({ success: true, MessageSid });
  } catch (error) {
    console.error('❌ Erreur webhook Twilio:', error);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
});

/**
 * POST /api/webhooks/sms-confirmation
 * Endpoint personnalisé pour confirmer les SMS
 * Appelé quand un contact répond "OK" au SMS
 */
router.post('/sms-confirmation', async (req: Request, res: Response) => {
  try {
    const { sessionId, phoneNumber, confirmationStatus } = req.body;

    console.log(`✅ Confirmation SMS reçue:`);
    console.log(`   Session: ${sessionId}`);
    console.log(`   Contact: ${phoneNumber}`);
    console.log(`   Status: ${confirmationStatus}`);

    // TODO: Mettre à jour la session avec la confirmation
    // - Marquer le contact comme ayant confirmé
    // - Annuler l'alerte si tous les contacts ont confirmé
    // - Envoyer une notification à l'utilisateur

    return res.status(200).json({
      success: true,
      message: 'Confirmation reçue et traitée',
    });
  } catch (error) {
    console.error('❌ Erreur confirmation SMS:', error);
    return res.status(500).json({ error: 'Confirmation processing failed' });
  }
});

export default router;
