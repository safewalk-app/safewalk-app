import { Router, Request, Response } from 'express';
import { sendFriendlyAlertSMSToMultiple } from '../services/friendly-sms';

const router = Router();

/**
 * POST /api/friendly-sms/alert
 * Envoyer une alerte SMS friendly avec personnalisation
 */
router.post('/alert', async (req: Request, res: Response) => {
  try {
    const { contacts, userName, limitTimeStr, note, location } = req.body;

    if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
      return res.status(400).json({ error: 'contacts required' });
    }

    if (!userName || !limitTimeStr) {
      return res.status(400).json({ error: 'userName and limitTimeStr required' });
    }

    console.log(`📤 Envoi d'alertes SMS friendly à ${contacts.length} contact(s)...`);

    const results = await sendFriendlyAlertSMSToMultiple(
      contacts,
      userName,
      limitTimeStr,
      note,
      location
    );

    return res.status(200).json({ success: true, results });
  } catch (error) {
    console.error('❌ Erreur SMS friendly:', error);
    return res.status(500).json({ error: 'Failed to send SMS' });
  }
});

export default router;
