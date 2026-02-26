import { ScrollView, Text, View, Modal } from 'react-native';
import { BubbleBackground } from '@/components/ui/bubble-background';
import { GlassCard } from '@/components/ui/glass-card';
import { PopTextField } from '@/components/ui/pop-text-field';
import { CushionPillButton } from '@/components/ui/cushion-pill-button';
import { TimeLimitPicker } from '@/components/ui/time-limit-picker';
import { ScreenTransition } from '@/components/ui/screen-transition';
import { FeedbackAnimation } from '@/components/ui/feedback-animation';
import { useApp } from '@/lib/context/app-context';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { useProfileData } from '@/hooks/use-profile-data';
import { ToastPop } from '@/components/ui/toast-pop';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { RateLimitErrorAlert } from '@/components/rate-limit-error-alert';
import { useCooldown } from '@/lib/hooks/use-cooldown';

export default function NewSessionScreen() {
  const router = useRouter();
  const { settings, startSession } = useApp();
  const insets = useSafeAreaInsets();
  const [limitTime, setLimitTime] = useState(Date.now() + 2.5 * 60 * 60 * 1000);
  const [note, setNote] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [showPaywallModal, setShowPaywallModal] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitState, setSubmitState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [rateLimitError, setRateLimitError] = useState<{
    visible: boolean;
    message?: string;
  }>({ visible: false });
  const profileData = useProfileData();

  // Cooldown de 2 secondes entre les démarrages de sortie
  const { trigger: triggerStartSession, isOnCooldown, remainingTime } = useCooldown({
    duration: 2000,
  });

  // Check if phone is verified on mount
  useEffect(() => {
    checkPhoneVerification();
  }, []);

  const checkPhoneVerification = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('phone_verified')
        .eq('id', user.id)
        .single();

      setPhoneVerified(profile?.phone_verified || false);
      setLoading(false);
    } catch (error) {
      console.error('Error checking phone verification:', error);
      setLoading(false);
    }
  };

  // Déterminer la raison du blocage si applicable
  const getBlockingReason = () => {
    if (!settings.emergencyContactName || !settings.emergencyContactPhone) {
      return {
        reason: 'Contact d\'urgence manquant',
        message: 'Ajoute un contact d\'urgence pour démarrer une sortie.',
        action: 'Aller aux Paramètres',
        onAction: () => router.push('/settings'),
      };
    }
    if (!phoneVerified) {
      return {
        reason: 'Numéro non vérifié',
        message: 'Vérifie ton numéro pour activer les alertes SMS.',
        action: 'Vérifier maintenant',
        onAction: () => setShowOtpModal(true),
      };
    }
    const hasCredits = profileData.subscription_active || profileData.free_alerts_remaining > 0;
    if (!hasCredits) {
      return {
        reason: 'Crédits insuffisants',
        message: 'Tu as atteint la limite d\'aujourd\'hui. Ajoute des crédits pour continuer.',
        action: 'Ajouter des crédits',
        onAction: () => setShowPaywallModal(true),
      };
    }
    if (!settings.locationEnabled) {
      return {
        reason: 'Localisation désactivée',
        message: 'Active la localisation dans Paramètres pour partager ta position en cas d\'alerte.',
        action: 'Aller aux Paramètres',
        onAction: () => router.push('/settings'),
      };
    }
    return null;
  };

  const handleStartSession = async () => {
    await triggerStartSession(async () => {
    // Check 1: Emergency contact
    if (!settings.emergencyContactName || !settings.emergencyContactPhone) {
      setToastMessage('Configure un contact d\'urgence d\'abord');
      setTimeout(() => {
        setToastMessage('');
        router.push('/settings');
      }, 2000);
      return;
    }

    // Check 2: Phone verification
    if (!phoneVerified) {
      setShowOtpModal(true);
      return;
    }

    // Check 3: Credits
    const hasCredits = profileData.subscription_active || profileData.free_alerts_remaining > 0;
    if (!hasCredits) {
      setShowPaywallModal(true);
      return;
    }

    // Check 4: Localisation activee
    if (!settings.locationEnabled) {
      setToastMessage('Veuillez activer la localisation');
      setTimeout(() => {
        setToastMessage('');
        router.push('/settings');
      }, 2000);
      return;
    }

    // Check 5: Deadline valide (minimum 15 minutes)
    const now = Date.now();
    const minDeadline = now + (15 * 60 * 1000);
    if (limitTime <= now) {
      setToastMessage('La deadline doit etre dans le futur');
      return;
    }
    if (limitTime < minDeadline) {
      setToastMessage('La deadline doit etre au minimum dans 15 minutes');
      return;
    }

    // All checks passed - start the session
    try {
      setLoading(true);
      const result = await startSession(limitTime, note);
      
      // Check if startSession returned an error
      if (!result || result.success === false) {
        const errorCode = result?.errorCode;
        
        if (errorCode === 'no_credits') {
          setShowPaywallModal(true);
          setLoading(false);
          return;
        }
        if (errorCode === 'quota_reached') {
          setToastMessage('Limite atteinte aujourd\'hui');
          setLoading(false);
          setTimeout(() => setToastMessage(''), 3000);
          return;
        }
        if (errorCode === 'twilio_failed') {
          setToastMessage('Impossible d\'envoyer l\'alerte, réessaiera');
          setLoading(false);
          setTimeout(() => setToastMessage(''), 3000);
          return;
        }
        
        // Generic error
        setToastMessage(result?.error || 'Erreur lors du démarrage');
        setLoading(false);
        setTimeout(() => setToastMessage(''), 3000);
        return;
      }
      
      setLoading(false);
      router.push('/active-session');
    } catch (error) {
      setLoading(false);
      setToastMessage('Erreur lors du démarrage');
      setTimeout(() => setToastMessage(''), 3000);
    }
    });
  };

  const handleOtpSuccess = () => {
    setPhoneVerified(true);
    setShowOtpModal(false);
    setToastMessage('Numéro vérifié ! Tu peux maintenant démarrer une sortie.');
    setTimeout(() => setToastMessage(''), 2000);
  };

  // CTA height for bottom padding calculation
  const ctaHeight = 60;
  const bottomPadding = ctaHeight + insets.bottom + 12;

  return (
    <View className="flex-1 bg-background">
      <BubbleBackground />

      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        className="relative z-10"
        showsVerticalScrollIndicator={false}
        style={{
          paddingHorizontal: 16,
          paddingTop: insets.top + 12,
          paddingBottom: bottomPadding,
        }}
      >
        {/* Header */}
        <ScreenTransition delay={0} duration={350}>
          <View className="gap-1 mb-6">
            <Text className="text-4xl font-bold text-foreground">Je sors</Text>
            <Text className="text-base text-muted">
              Tu penses rentrer vers quelle heure ?
            </Text>
          </View>
        </ScreenTransition>

        {/* Time Limit Picker */}
        <ScreenTransition delay={100} duration={350}>
          <View className="gap-3 mb-4">
            <TimeLimitPicker
              selectedTime={limitTime}
              onTimeSelected={setLimitTime}
            />
          </View>
        </ScreenTransition>

        {/* Card Où vas-tu */}
        <ScreenTransition delay={200} duration={350}>
          <GlassCard className="gap-2 mb-3">
            <Text className="text-sm font-medium text-muted">
              Où vas-tu ? (optionnel)
            </Text>
            <PopTextField
              placeholder="Ex: Soirée chez Karim..."
              value={note}
              onChangeText={setNote}
            />
          </GlassCard>
        </ScreenTransition>

        {/* Card Contact d'urgence */}
        <ScreenTransition delay={300} duration={350}>
          <GlassCard className="gap-2 mb-3">
            <Text className="text-sm font-medium text-muted">
              Contact d'urgence
            </Text>
            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <Text className="text-base font-semibold text-foreground">
                  {settings.emergencyContactName || 'Non configuré'}
                </Text>
                <Text className="text-sm text-muted mt-1">
                  {settings.emergencyContactPhone || ''}
                </Text>
              </View>
            </View>
          </GlassCard>
        </ScreenTransition>

        {/* Card Localisation */}
        <ScreenTransition delay={400} duration={350}>
          <GlassCard className="gap-2">
            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <Text className="text-sm font-medium text-muted">
                  Localisation
                </Text>
                <Text className="text-xs text-muted mt-1">
                  Ajouter ta position en cas d'alerte
                </Text>
              </View>
            </View>
          </GlassCard>
        </ScreenTransition>
      </ScrollView>

      {/* Sticky CTA Bottom */}
      <View
        className="px-4 bg-background border-t border-border"
        style={{ paddingBottom: insets.bottom + 12, paddingTop: 12 }}
      >
        {/* Rate Limit Error Alert */}
        <RateLimitErrorAlert
          visible={rateLimitError.visible}
          message={rateLimitError.message}
          onDismiss={() => setRateLimitError({ visible: false })}
        />

        <FeedbackAnimation state={submitState}>
          <CushionPillButton
            label={isOnCooldown ? `Attendre ${Math.ceil(remainingTime / 1000)}s` : "Démarrer"}
            onPress={handleStartSession}
            variant="success"
            size="lg"
            disabled={isOnCooldown || loading}
          />
        </FeedbackAnimation>
      </View>

      {/* Toast */}
      {toastMessage && (
        <ToastPop
          message={toastMessage}
          type="error"
          onDismiss={() => setToastMessage('')}
        />
      )}
    </View>
  );
}
