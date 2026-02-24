/**
 * Service de gestion des quotas (alertes gratuites et SMS de test)
 * 
 * Règles :
 * - 3 alertes "late" gratuites par utilisateur (lifetime)
 * - 1 SMS de test gratuit par utilisateur
 * - Ensuite : paywall (subscription_active boolean)
 * - SMS quotidiens limités : 10 par jour, 3 SOS par jour
 */

import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';

export interface QuotaStatus {
  freeAlertsRemaining: number;
  freeTestSmsRemaining: number;
  subscriptionActive: boolean;
  smsDailyRemaining: number;
  smsSosDailyRemaining: number;
  canSendAlert: boolean;
  canSendTestSms: boolean;
  canSendSosSms: boolean;
}

/**
 * Récupérer le statut des quotas de l'utilisateur
 */
export async function getQuotaStatus(userId: string): Promise<QuotaStatus | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('free_alerts_remaining, free_test_sms_remaining, subscription_active, sms_daily_limit, sms_sos_daily_limit')
      .eq('user_id', userId)
      .single();

    if (error) {
      logger.error('❌ Erreur lors de la récupération des quotas:', error);
      return null;
    }

    if (!data) {
      logger.warn('⚠️ Profil utilisateur non trouvé');
      return null;
    }

    // Vérifier les SMS envoyés aujourd'hui
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: smsSent, error: smsError } = await supabase
      .from('sms_logs')
      .select('sms_type')
      .eq('user_id', userId)
      .eq('status', 'sent')
      .gte('created_at', today.toISOString());

    if (smsError) {
      logger.error('❌ Erreur lors de la récupération des SMS envoyés:', smsError);
    }

    const smsSentCount = smsSent?.length || 0;
    const sosSentCount = smsSent?.filter(s => s.sms_type === 'sos').length || 0;

    const smsDailyRemaining = Math.max(0, (data.sms_daily_limit || 10) - smsSentCount);
    const smsSosDailyRemaining = Math.max(0, (data.sms_sos_daily_limit || 3) - sosSentCount);

    return {
      freeAlertsRemaining: data.free_alerts_remaining || 0,
      freeTestSmsRemaining: data.free_test_sms_remaining || 0,
      subscriptionActive: data.subscription_active || false,
      smsDailyRemaining,
      smsSosDailyRemaining,
      canSendAlert: data.free_alerts_remaining > 0 || data.subscription_active,
      canSendTestSms: data.free_test_sms_remaining > 0,
      canSendSosSms: smsSosDailyRemaining > 0,
    };
  } catch (error) {
    logger.error('❌ Erreur dans getQuotaStatus:', error);
    return null;
  }
}

/**
 * Décrémenter une alerte gratuite
 */
export async function decrementFreeAlert(userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ free_alerts_remaining: supabase.rpc('decrement_free_alerts', { user_id: userId }) })
      .eq('user_id', userId);

    if (error) {
      logger.error('❌ Erreur lors de la décrémentation des alertes:', error);
      return false;
    }

    logger.info('✅ Alerte gratuite décrémentée');
    return true;
  } catch (error) {
    logger.error('❌ Erreur dans decrementFreeAlert:', error);
    return false;
  }
}

/**
 * Décrémenter un SMS de test gratuit
 */
export async function decrementFreeTestSms(userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ free_test_sms_remaining: supabase.rpc('decrement_free_test_sms', { user_id: userId }) })
      .eq('user_id', userId);

    if (error) {
      logger.error('❌ Erreur lors de la décrémentation des SMS de test:', error);
      return false;
    }

    logger.info('✅ SMS de test gratuit décrémenté');
    return true;
  } catch (error) {
    logger.error('❌ Erreur dans decrementFreeTestSms:', error);
    return false;
  }
}

/**
 * Vérifier si l'utilisateur peut envoyer une alerte SOS
 */
export async function canSendSosAlert(userId: string): Promise<boolean> {
  const quota = await getQuotaStatus(userId);
  if (!quota) return false;

  // Vérifier les alertes gratuites ET les SMS SOS quotidiens
  const canAlert = quota.freeAlertsRemaining > 0 || quota.subscriptionActive;
  const canSmsSos = quota.smsSosDailyRemaining > 0;

  return canAlert && canSmsSos;
}

/**
 * Vérifier si l'utilisateur peut envoyer un SMS de test
 */
export async function canSendTestSms(userId: string): Promise<boolean> {
  const quota = await getQuotaStatus(userId);
  if (!quota) return false;

  return quota.freeTestSmsRemaining > 0;
}

/**
 * Enregistrer un SMS envoyé dans les logs
 */
export async function logSms(
  userId: string,
  toPhone: string,
  smsType: 'late' | 'sos' | 'test',
  tripId?: string,
  twiioSid?: string,
  error?: string
): Promise<boolean> {
  try {
    const { error: logError } = await supabase
      .from('sms_logs')
      .insert({
        user_id: userId,
        trip_id: tripId || null,
        to_phone: toPhone,
        sms_type: smsType,
        status: error ? 'failed' : 'sent',
        twilio_sid: twiioSid || null,
        error: error || null,
      });

    if (logError) {
      logger.error('❌ Erreur lors de l\'enregistrement du SMS:', logError);
      return false;
    }

    logger.info(`✅ SMS ${smsType} enregistré`);
    return true;
  } catch (err) {
    logger.error('❌ Erreur dans logSms:', err);
    return false;
  }
}

/**
 * Obtenir le nombre de SMS envoyés aujourd'hui
 */
export async function getSmsSentToday(userId: string): Promise<{ total: number; sos: number }> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from('sms_logs')
      .select('sms_type')
      .eq('user_id', userId)
      .eq('status', 'sent')
      .gte('created_at', today.toISOString());

    if (error) {
      logger.error('❌ Erreur lors de la récupération des SMS:', error);
      return { total: 0, sos: 0 };
    }

    const total = data?.length || 0;
    const sos = data?.filter(s => s.sms_type === 'sos').length || 0;

    return { total, sos };
  } catch (error) {
    logger.error('❌ Erreur dans getSmsSentToday:', error);
    return { total: 0, sos: 0 };
  }
}
