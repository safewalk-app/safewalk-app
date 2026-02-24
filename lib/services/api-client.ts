/**
 * API Client - Point d'entrée unique pour tous les appels API
 * 
 * Configuration:
 * - URL de base: EXPO_PUBLIC_API_URL (définie dans .env)
 * - Logs automatiques en développement
 * - Gestion d'erreurs unifiée
 */

import { logger } from '@/lib/logger';

// URL de l'API depuis les variables d'environnement
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://3000-izg08xkxsyk2siv7372nz-49e5cc45.us1.manus.computer';

// Log de l'URL utilisée (utile pour debug)
logger.info('🔗 [API Client] URL configurée:', API_URL);

/**
 * Effectuer un appel API
 */
async function apiCall<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_URL}${endpoint}`;
  
  logger.info(`📡 [API] ${options.method || 'GET'} ${endpoint}`);
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      logger.error(`❌ [API] Erreur ${response.status}:`, data);
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    logger.info(`✅ [API] Succès:`, data);
    return data;
  } catch (error: any) {
    logger.error(`❌ [API] Exception:`, error.message);
    throw error;
  }
}

/**
 * Health Check
 * GET /api/sms/health
 */
export async function checkHealth(): Promise<{ ok: boolean; service: string; timestamp: string; twilioConfigured: boolean }> {
  return apiCall('/api/sms/health');
}

/**
 * Envoyer un SMS
 * POST /api/sms/send
 */
export async function sendSMS(to: string, message: string): Promise<{ ok: boolean; sid?: string; error?: string }> {
  return apiCall('/api/sms/send', {
    method: 'POST',
    body: JSON.stringify({ to, message }),
  });
}

/**
 * Obtenir l'URL de l'API (pour affichage/debug)
 */
export function getAPIUrl(): string {
  return API_URL;
}
