import { getApiUrl } from '@/lib/config/api';

export interface SendSmsOptions {
  to: string;
  message: string;
}

export interface SendSmsResult {
  success: boolean;
  sid?: string;
  status?: string;
  error?: string;
  details?: any;
}

/**
 * Envoyer un SMS via l'API backend
 */
export async function sendSms(options: SendSmsOptions): Promise<SendSmsResult> {
  try {
    const apiUrl = getApiUrl();
    const endpoint = `${apiUrl}/api/sms/send`;

    logger.info(`📤 [SMS Client] Envoi SMS à ${options.to}...`);
    logger.info(`🔗 [SMS Client] Endpoint: ${endpoint}`);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: options.to,
        message: options.message,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      logger.error(`❌ [SMS Client] Erreur HTTP ${response.status}:`, data);
      return {
        success: false,
        error: data.error || `HTTP ${response.status}`,
        details: data.details || data,
      };
    }

    if (!data.success) {
      logger.error('❌ [SMS Client] Échec envoi SMS:', data);
      return {
        success: false,
        error: data.error || 'Unknown error',
        details: data.details,
      };
    }

    logger.info(`✅ [SMS Client] SMS envoyé avec succès (SID: ${data.sid})`);
    return {
      success: true,
      sid: data.sid,
      status: data.status,
    };
  } catch (error: any) {
    logger.error('❌ [SMS Client] Erreur réseau:', error);
    return {
      success: false,
      error: error.message || 'Network error',
      details: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
    };
  }
}

/**
 * Vérifier la santé de l'API SMS
 */
export async function checkSmsApiHealth(): Promise<{
  ok: boolean;
  service?: string;
  twilioConfigured?: boolean;
  error?: string;
}> {
  try {
    const apiUrl = getApiUrl();
    const endpoint = `${apiUrl}/api/sms/health`;

    logger.info(`🔍 [SMS Client] Vérification santé API: ${endpoint}`);

    const response = await fetch(endpoint);
    const data = await response.json();

    if (!response.ok) {
      return {
        ok: false,
        error: `HTTP ${response.status}`,
      };
    }

    return {
      ok: data.ok,
      service: data.service,
      twilioConfigured: data.twilioConfigured,
    };
  } catch (error: any) {
    logger.error('❌ [SMS Client] Erreur health check:', error);
    return {
      ok: false,
      error: error.message || 'Network error',
    };
  }
}
