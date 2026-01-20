import { Router, Request, Response } from 'express';
import { sendAlertSMSToMultiple } from '../services/twilio';

const router = Router();

router.post('/alert', async (req: Request, res: Response) => {
  try {
    const { phoneNumbers, limitTimeStr, tolerance, location } = req.body;
    if (!phoneNumbers || !Array.isArray(phoneNumbers) || phoneNumbers.length === 0) {
      return res.status(400).json({ error: 'phoneNumbers required' });
    }
    console.log(`📤 SMS à ${phoneNumbers.length} contact(s)...`);
    const results = await sendAlertSMSToMultiple(phoneNumbers, limitTimeStr, tolerance, location);
    return res.status(200).json({ success: true, results });
  } catch (error) {
    console.error('❌ Erreur SMS:', error);
    return res.status(500).json({ error: 'Failed to send SMS' });
  }
});

export default router;
