import { logger } from '../utils/logger';
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

    logger.debug(`📤 Envoi d'alertes SMS friendly à ${contacts.length} contact(s)...`);

    const results = await sendFriendlyAlertSMSToMultiple(
      contacts,
      userName,
      limitTimeStr,
      note,
      location,
    );

    return res.status(200).json({ success: true, results });
  } catch (error) {
    logger.error('❌ Erreur SMS friendly:', error);
    return res.status(500).json({ error: 'Failed to send SMS' });
  }
});

/**
 * POST /api/friendly-sms/follow-up
 * Envoyer une relance SMS friendly
 */
router.post('/follow-up', async (req: Request, res: Response) => {
  try {
    const { contacts, userName, location } = req.body;

    if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
      return res.status(400).json({ error: 'contacts required' });
    }

    if (!userName) {
      return res.status(400).json({ error: 'userName required' });
    }

    logger.debug(`📤 Envoi de relances SMS friendly à ${contacts.length} contact(s)...`);

    const { sendFollowUpAlertSMSToMultiple } = await import('../services/friendly-sms');
    const results = await sendFollowUpAlertSMSToMultiple(contacts, userName, location);

    return res.status(200).json({ success: true, results });
  } catch (error) {
    logger.error('❌ Erreur relance SMS:', error);
    return res.status(500).json({ error: 'Failed to send follow-up SMS' });
  }
});

/**
 * POST /api/friendly-sms/confirmation
 * Envoyer un SMS de confirmation
 */
router.post('/confirmation', async (req: Request, res: Response) => {
  try {
    const { contacts, userName } = req.body;

    if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
      return res.status(400).json({ error: 'contacts required' });
    }

    if (!userName) {
      return res.status(400).json({ error: 'userName required' });
    }

    logger.debug(`📤 Envoi de confirmations SMS à ${contacts.length} contact(s)...`);

    const { sendConfirmationSMSToMultiple } = await import('../services/friendly-sms');
    const results = await sendConfirmationSMSToMultiple(contacts, userName);

    return res.status(200).json({ success: true, results });
  } catch (error) {
    logger.error('❌ Erreur SMS confirmation:', error);
    return res.status(500).json({ error: 'Failed to send confirmation SMS' });
  }
});

export default router;
