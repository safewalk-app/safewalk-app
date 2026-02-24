import { API_BASE_URL } from '../config/api';
import { cleanPhoneNumber, validatePhoneNumber } from '../utils';
import { logger } from '../logger';

/**
 * Service SMS Unifié - Point d'entrée unique pour tous les envois SMS
 * Fusionne: friendly-sms-client, follow-up-sms-client, sms-client
 */

export type SMSReason = 'test' | 'alert' | 'sos' | 'followup' | 'confirmation' | 'friendly-alert';

export interface SendEmergencySMSOptions {
  reason: SMSReason;
  tripId?: string;
  contactName: string;
  contactPhone: string;
  firstName?: string;
  note?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
}

export interface SendFriendlyAlertOptions {
  contacts: Array<{ name: string; phone: string }>;
  userName: string;
  limitTimeStr: string;
  note?: string;
  location?: { latitude: number; longitude: number };
}

export interface SendFollowUpOptions {
  contacts: Array<{ name: string; phone: string }>;
  userName: string;
  location?: { latitude: number; longitude: number };
}

export interface SendConfirmationOptions {
  contacts: Array<{ name: string; phone: string }>;
  userName: string;
}

export interface SendSmsResult {
  ok: boolean;
  sid?: string;
  error?: string;
  timestamp: number;
}

export interface SmsHealthCheck {
  ok: boolean;
  service?: string;
  twilioConfigured?: boolean;
  error?: string;
}

/**
 * Normaliser un numéro français en format E.164
 */
function normalizePhoneNumber(phone: string): string {
  const cleaned = cleanPhoneNumber(phone);
  
  if (cleaned.startsWith('+')) {
    return cleaned;
  }
  
  if (cleaned.startsWith('06') || cleaned.startsWith('07')) {
    return '+33' + cleaned.substring(1);
  }
  
  return '+' + cleaned;
}

/**
 * Construire le message SMS selon la raison
 */
function buildMessage(options: SendEmergencySMSOptions): string {
  const { reason, contactName, firstName, note, location } = options;
  const userName = firstName || 'Votre contact';
  
  switch (reason) {
    case 'test':
      return `✅ SafeWalk - Test réussi !\n\n${userName} a bien configuré ce numéro comme contact d'urgence.\n\nTu recevras un message si ${userName} ne rentre pas à l'heure prévue. 🙏`;
    
    case 'alert':
      let alertMsg = `🔔 SafeWalk - Alerte\n\nSalut ! ${userName} n'a pas confirmé son retour à l'heure prévue.`;
      if (note) {
        alertMsg += `\n\nOù : ${note}`;
      }
      if (location) {
        const mapsUrl = `https://www.google.com/maps?q=${location.latitude},${location.longitude}`;
        alertMsg += `\n\n📍 Position GPS :\n${mapsUrl}`;
      } else {
        alertMsg += `\n\n📍 Position GPS : Non disponible`;
      }
      alertMsg += `\n\nPeux-tu vérifier que tout va bien ? Merci ! 🙏`;
      return alertMsg;
    
    case 'sos':
      let sosMsg = `🆘 SafeWalk - URGENCE\n\n${userName} a déclenché le bouton SOS !`;
      if (note) {
        sosMsg += `\n\nOù : ${note}`;
      }
      if (location) {
        const mapsUrl = `https://www.google.com/maps?q=${location.latitude},${location.longitude}`;
        sosMsg += `\n\n📍 Position GPS :\n${mapsUrl}`;
      } else {
        sosMsg += `\n\n📍 Position GPS : Non disponible`;
      }
      sosMsg += `\n\nContacte-le MAINTENANT ou appelle les secours si besoin. 🚨`;
      return sosMsg;
    
    case 'followup':
      let followupMsg = `⏰ SafeWalk - Relance\n\n${userName} n'a toujours pas confirmé son retour (10 min après l'heure limite).`;
      if (location) {
        const mapsUrl = `https://www.google.com/maps?q=${location.latitude},${location.longitude}`;
        followupMsg += `\n\n📍 Position GPS :\n${mapsUrl}`;
      } else {
        followupMsg += `\n\n📍 Position GPS : Non disponible`;
      }
      followupMsg += `\n\nMerci de le contacter rapidement. 🙏`;
      return followupMsg;
    
    case 'confirmation':
      return `✅ SafeWalk\n\n${userName} est bien rentré ! Tout va bien. 😊\n\nMerci d'être là pour lui. 🙏`;
    
    case 'friendly-alert':
      return `🔔 SafeWalk - Alerte\n\n${userName} n'a pas confirmé son retour à l'heure prévue. Peux-tu vérifier que tout va bien ? Merci ! 🙏`;
    
    default:
      return `SafeWalk: Message d'urgence de ${userName}`;
  }
}

/**
 * Envoyer un SMS d'urgence unique
 */
export async function sendEmergencySMS(options: SendEmergencySMSOptions): Promise<SendSmsResult> {
  const timestamp = Date.now();
  
  logger.info(`📤 [SMS Service] Envoi SMS d'urgence (${options.reason})...`);
  
  try {
    const cleanedPhone = cleanPhoneNumber(options.contactPhone);
    if (!validatePhoneNumber(cleanedPhone)) {
      logger.error('❌ [SMS Service] Numéro invalide:', options.contactPhone);
      return {
        ok: false,
        error: 'Numéro de téléphone invalide',
        timestamp,
      };
    }
    
    const normalizedPhone = normalizePhoneNumber(cleanedPhone);
    const message = buildMessage(options);
    
    logger.info(`📞 [SMS Service] Envoi à ${normalizedPhone}`);
    
    const url = `${API_BASE_URL}/api/sms/send`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: normalizedPhone,
        message: message,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      logger.error(`❌ [SMS Service] Échec envoi:`, data);
      return {
        ok: false,
        error: data.error || `HTTP ${response.status}`,
        timestamp,
      };
    }

    logger.info(`✅ [SMS Service] SMS envoyé (SID: ${data.sid})`);
    return {
      ok: true,
      sid: data.sid,
      timestamp,
    };
  } catch (error: any) {
    logger.error('❌ [SMS Service] Exception:', error);
    return {
      ok: false,
      error: error.message || 'Erreur réseau',
      timestamp,
    };
  }
}

/**
 * Envoyer un SMS "friendly alert" à plusieurs contacts avec retry
 */
export async function sendFriendlyAlertSMS(params: SendFriendlyAlertOptions): Promise<void> {
  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.info(`📤 [SMS Service] Tentative ${attempt}/${maxRetries} - Friendly alert`);
      
      const url = `${API_BASE_URL}/api/friendly-sms/alert`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        logger.error('❌ [SMS Service] Réponse API:', errorBody);
        throw new Error(`SMS API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      logger.info('✅ [SMS Service] Friendly alert envoyés:', data);
      return;
    } catch (error) {
      lastError = error as Error;
      logger.error(`❌ [SMS Service] Tentative ${attempt} échouée:`, error);
      
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }

  throw new Error(`Échec friendly alert après ${maxRetries} tentatives: ${lastError?.message}`);
}

/**
 * Envoyer un SMS de relance après 10 min si pas de confirmation
 */
export async function sendFollowUpAlertSMS(params: SendFollowUpOptions): Promise<void> {
  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.info(`📤 [SMS Service] Tentative ${attempt}/${maxRetries} - Follow-up`);
      
      const url = `${API_BASE_URL}/api/friendly-sms/follow-up`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        logger.error('❌ [SMS Service] Réponse API:', errorBody);
        throw new Error(`SMS API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      logger.info('✅ [SMS Service] Follow-up envoyés:', data);
      return;
    } catch (error) {
      lastError = error as Error;
      logger.error(`❌ [SMS Service] Tentative ${attempt} échouée:`, error);
      
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }

  throw new Error(`Échec follow-up après ${maxRetries} tentatives: ${lastError?.message}`);
}

/**
 * Envoyer un SMS de confirmation quand l'utilisateur confirme "Je vais bien"
 */
export async function sendConfirmationSMS(params: SendConfirmationOptions): Promise<void> {
  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.info(`📤 [SMS Service] Tentative ${attempt}/${maxRetries} - Confirmation`);
      
      const url = `${API_BASE_URL}/api/friendly-sms/confirmation`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        logger.error('❌ [SMS Service] Réponse API:', errorBody);
        throw new Error(`SMS API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      logger.info('✅ [SMS Service] Confirmation envoyée:', data);
      return;
    } catch (error) {
      lastError = error as Error;
      logger.error(`❌ [SMS Service] Tentative ${attempt} échouée:`, error);
      
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }

  throw new Error(`Échec confirmation après ${maxRetries} tentatives: ${lastError?.message}`);
}

/**
 * Vérifier la santé de l'API SMS
 */
export async function checkSmsApiHealth(): Promise<SmsHealthCheck> {
  try {
    const url = `${API_BASE_URL}/api/sms/health`;
    logger.info(`🔍 [SMS Service] Vérification santé API...`);

    const response = await fetch(url);
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
    logger.error('❌ [SMS Service] Health check échoué:', error);
    return {
      ok: false,
      error: error.message || 'Network error',
    };
  }
}
