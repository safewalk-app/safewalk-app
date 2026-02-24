import { API_BASE_URL } from '../config/api';

export interface FollowUpAlertParams {
  contacts: Array<{ name: string; phone: string }>;
  userName: string;
  location?: { latitude: number; longitude: number };
}

export interface ConfirmationParams {
  contacts: Array<{ name: string; phone: string }>;
  userName: string;
}

/**
 * Envoyer un SMS de relance après 10 min si pas de confirmation
 */
export async function sendFollowUpAlertSMS(params: FollowUpAlertParams): Promise<void> {
  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.info(`📤 [Tentative ${attempt}/${maxRetries}] Appel API SMS relance`);
      logger.info('📋 Params:', JSON.stringify(params, null, 2));
      
      const url = `${API_BASE_URL}/api/friendly-sms/follow-up`;
      logger.info('🔗 URL:', url);

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      logger.info('📊 Réponse API:', response.status, response.statusText);

      if (!response.ok) {
        const errorBody = await response.text();
        logger.error('❌ Réponse API:', errorBody);
        throw new Error(`SMS API error: ${response.status} ${response.statusText} - ${errorBody}`);
      }

      const data = await response.json();
      logger.info('✅ SMS relance envoyés avec succès:', data);
      return; // Succès, sortir de la boucle
    } catch (error) {
      lastError = error as Error;
      logger.error(`❌ [Tentative ${attempt}/${maxRetries}] Erreur SMS relance:`, error);
      
      if (attempt < maxRetries) {
        logger.info(`⏳ Nouvelle tentative dans 2 secondes...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }

  throw new Error(`Échec de l'envoi SMS relance après ${maxRetries} tentatives: ${lastError?.message}`);
}

/**
 * Envoyer un SMS de confirmation quand l'utilisateur confirme "Je vais bien"
 */
export async function sendConfirmationSMS(params: ConfirmationParams): Promise<void> {
  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.info(`📤 [Tentative ${attempt}/${maxRetries}] Appel API SMS confirmation`);
      logger.info('📋 Params:', JSON.stringify(params, null, 2));
      
      const url = `${API_BASE_URL}/api/friendly-sms/confirmation`;
      logger.info('🔗 URL:', url);

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      logger.info('📊 Réponse API:', response.status, response.statusText);

      if (!response.ok) {
        const errorBody = await response.text();
        logger.error('❌ Réponse API:', errorBody);
        throw new Error(`SMS API error: ${response.status} ${response.statusText} - ${errorBody}`);
      }

      const data = await response.json();
      logger.info('✅ SMS confirmation envoyés avec succès:', data);
      return; // Succès, sortir de la boucle
    } catch (error) {
      lastError = error as Error;
      logger.error(`❌ [Tentative ${attempt}/${maxRetries}] Erreur SMS confirmation:`, error);
      
      if (attempt < maxRetries) {
        logger.info(`⏳ Nouvelle tentative dans 2 secondes...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }

  throw new Error(`Échec de l'envoi SMS confirmation après ${maxRetries} tentatives: ${lastError?.message}`);
}
