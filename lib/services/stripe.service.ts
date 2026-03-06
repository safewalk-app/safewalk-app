import { initStripe, useStripe, usePaymentSheet } from '@stripe/stripe-react-native';
import { supabase } from '@/lib/services/supabase-client';

/**
 * Configuration Stripe pour SafeWalk
 * Packages de crédits disponibles
 */
export const CREDIT_PACKAGES = [
  {
    id: 'credits_5',
    name: '5 Alertes',
    credits: 5,
    price: 299, // en cents (2.99€)
    priceDisplay: '2,99€',
    description: 'Parfait pour tester',
  },
  {
    id: 'credits_20',
    name: '20 Alertes',
    credits: 20,
    price: 999, // en cents (9.99€)
    priceDisplay: '9,99€',
    description: 'Meilleur rapport qualité-prix',
    badge: 'Populaire',
  },
  {
    id: 'credits_100',
    name: '100 Alertes',
    credits: 100,
    price: 3999, // en cents (39.99€)
    priceDisplay: '39,99€',
    description: 'Pour les utilisateurs réguliers',
  },
];

/**
 * Initialiser Stripe avec la clé publique
 */
export async function initializeStripe() {
  try {
    const publishableKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (!publishableKey) {
      throw new Error('EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY not configured');
    }

    await initStripe({
      publishableKey,
      merchantIdentifier: 'merchant.space.manus.safewalk',
    });
  } catch (error) {
    console.error('❌ Stripe initialization failed:', error);
    throw error;
  }
}

/**
 * Créer une session de paiement Stripe
 * @param packageId - ID du package (ex: 'credits_5')
 * @param userId - ID de l'utilisateur
 * @returns clientSecret pour initialiser le payment sheet
 */
export async function createPaymentSession(packageId: string, userId: string) {
  try {
    const package_ = CREDIT_PACKAGES.find((p) => p.id === packageId);
    if (!package_) {
      throw new Error(`Package ${packageId} not found`);
    }

    // Appeler l'Edge Function Supabase pour créer la session
    const { data, error } = await supabase.functions.invoke('create-payment-session', {
      body: {
        packageId,
        userId,
        amount: package_.price,
        credits: package_.credits,
      },
    });

    if (error) throw error;

    return {
      clientSecret: data.clientSecret,
      ephemeralKey: data.ephemeralKey,
      customerId: data.customerId,
      publishableKey: process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    };
  } catch (error) {
    console.error('❌ Failed to create payment session:', error);
    throw error;
  }
}

/**
 * Confirmer le paiement et ajouter les crédits
 * @param packageId - ID du package
 * @param userId - ID de l'utilisateur
 * @returns Nombre de crédits ajoutés
 */
export async function confirmPayment(packageId: string, userId: string) {
  try {
    const package_ = CREDIT_PACKAGES.find((p) => p.id === packageId);
    if (!package_) {
      throw new Error(`Package ${packageId} not found`);
    }

    // Appeler l'Edge Function pour confirmer et ajouter les crédits
    const { data, error } = await supabase.functions.invoke('confirm-payment', {
      body: {
        packageId,
        userId,
        credits: package_.credits,
      },
    });

    if (error) throw error;

    return {
      creditsAdded: package_.credits,
      totalCredits: data.totalCredits,
    };
  } catch (error) {
    console.error('❌ Failed to confirm payment:', error);
    throw error;
  }
}

/**
 * Récupérer l'historique des achats
 */
export async function getPurchaseHistory(userId: string) {
  try {
    const { data, error } = await supabase
      .from('credit_purchases')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('❌ Failed to fetch purchase history:', error);
    return [];
  }
}

/**
 * Vérifier si l'utilisateur a besoin d'être alerté (crédits faibles)
 */
export async function shouldNotifyLowCredits(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('free_alerts_remaining, last_low_credits_notification')
      .eq('id', userId)
      .single();

    if (error) throw error;

    const creditsRemaining = data.free_alerts_remaining ?? 0;
    const lastNotification = data.last_low_credits_notification
      ? new Date(data.last_low_credits_notification)
      : null;

    // Alerter si crédits < 2 ET pas d'alerte dans les 24h
    if (creditsRemaining < 2) {
      if (!lastNotification || Date.now() - lastNotification.getTime() > 24 * 60 * 60 * 1000) {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('❌ Failed to check low credits:', error);
    return false;
  }
}

/**
 * Marquer que l'utilisateur a été notifié (crédits faibles)
 */
export async function markLowCreditsNotified(userId: string) {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ last_low_credits_notification: new Date().toISOString() })
      .eq('id', userId);

    if (error) throw error;
  } catch (error) {
    console.error('❌ Failed to mark notification:', error);
  }
}
