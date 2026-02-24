import { API_BASE_URL } from '../config/api';

export interface FriendlyAlertParams {
  contacts: Array<{ name: string; phone: string }>;
  userName: string;
  limitTimeStr: string;
  note?: string;
  location?: { latitude: number; longitude: number };
}

export async function sendFriendlyAlertSMS(params: FriendlyAlertParams): Promise<void> {
  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.info(`📤 [Tentative ${attempt}/${maxRetries}] Appel API SMS friendly`);
      logger.info('📋 Params:', JSON.stringify(params, null, 2));
      
      const url = `${API_BASE_URL}/api/friendly-sms/alert`;
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
      logger.info('✅ SMS friendly envoyés avec succès:', data);
      return; // Succès, sortir de la boucle
    } catch (error) {
      lastError = error as Error;
      logger.error(`❌ [Tentative ${attempt}/${maxRetries}] Erreur SMS friendly:`, error);
      
      if (attempt < maxRetries) {
        // Attendre 2 secondes avant de réessayer
        logger.info(`⏳ Nouvelle tentative dans 2 secondes...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }

  // Si toutes les tentatives ont échoué, lancer l'erreur
  throw new Error(`Échec de l'envoi SMS après ${maxRetries} tentatives: ${lastError?.message}`);
}
