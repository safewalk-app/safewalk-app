import { ScrollView, View, Text, Pressable } from 'react-native';
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
import { notify, notifyBlocked } from '@/lib/services/notification.service';

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

  // Vérifier les blocages et afficher les notifications appropriées
  const checkBlockingConditions = () => {
    if (!settings.emergencyContactName || !settings.emergencyContactPhone) {
      notifyBlocked('contact.missing', {
        action: 'Aller aux Paramètres',
        onAction: () => router.push('/settings'),
      });
      return true;
    }
    if (!phoneVerified) {
      notifyBlocked('auth.otp_required', {
        action: 'Vérifier maintenant',
        onAction: () => setShowOtpModal(true),
      });
      return true;
    }
    const hasCredits = profileData.subscription_active || profileData.free_alerts_remaining > 0;
    if (!hasCredits) {
      notifyBlocked('credits.empty', {
        action: 'Ajouter des crédits',
        onAction: () => setShowPaywallModal(true),
      });
      return true;
    }
    if (!settings.locationEnabled) {
      notifyBlocked('permission.location_required', {
        action: 'Aller aux Paramètres',
        onAction: () => router.push('/settings'),
      });
      return true;
    }
    return false;
  };

  const handleStartSession = async () => {
    await triggerStartSession(async () => {
      // Vérifier les blocages
      if (checkBlockingConditions()) {
        return;
      }

      // Vérifier deadline valide (minimum 15 minutes)
      const now = Date.now();
      const minDeadline = now + (15 * 60 * 1000);
      if (limitTime <= now) {
        notify('error.unknown');
        return;
      }
      if (limitTime < minDeadline) {
        notify('error.unknown');
        return;
      }

      setSubmitState('loading');

      try {
        const result = await startSession({
          deadline: limitTime,
          note,
        });

        if (result.success) {
          setSubmitState('success');
          notify('trip.started');
          setTimeout(() => {
            router.replace('/active-session');
          }, 500);
        } else if (result.error === 'rate_limit') {
          setRateLimitError({
            visible: true,
            message: result.message,
          });
          setSubmitState('error');
        } else {
          setSubmitState('error');
          notify('error.unknown');
        }
      } catch (error) {
        setSubmitState('error');
        notify('error.unknown');
      }
    });
  };

  if (loading) {
    return (
      <View className="flex-1 bg-background justify-center items-center">
        <Text className="text-foreground">Chargement...</Text>
      </View>
    );
  }

  return (
    <ScreenTransition>
      <View className="flex-1 bg-background">
        <BubbleBackground />

        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          className="relative z-10"
          showsVerticalScrollIndicator={false}
          style={{
            paddingTop: insets.top + 16,
            paddingBottom: insets.bottom + 16,
          }}
        >
          <View className="px-4 gap-6">
            {/* Hero Card */}
            <GlassCard className="gap-3">
              <View className="flex-row items-center gap-3">
                <Text className="text-4xl">🚀</Text>
                <View className="flex-1">
                  <Text className="text-2xl font-bold text-foreground">Je sors</Text>
                  <Text className="text-sm text-muted">
                    Définis une heure de retour. Un proche est prévenu si tu ne confirmes pas.
                  </Text>
                </View>
              </View>
            </GlassCard>

            {/* Time Limit Picker */}
            <GlassCard className="gap-4">
              <Text className="text-base font-semibold text-foreground">Heure limite</Text>
              <TimeLimitPicker value={limitTime} onChange={setLimitTime} />
            </GlassCard>

            {/* Note */}
            <GlassCard className="gap-3">
              <Text className="text-base font-semibold text-foreground">Note (optionnel)</Text>
              <PopTextField
                placeholder="Ex: Je vais à la gym, puis au café..."
                value={note}
                onChangeText={setNote}
                multiline
                numberOfLines={3}
              />
            </GlassCard>

            {/* Start Button */}
            <FeedbackAnimation state={submitState} onDismiss={() => setSubmitState('idle')}>
              <CushionPillButton
                onPress={handleStartSession}
                disabled={isOnCooldown || submitState === 'loading'}
                accessibilityLabel="Démarrer la sortie"
                accessibilityHint={
                  isOnCooldown
                    ? `Attendre ${Math.ceil(remainingTime / 1000)}s avant de démarrer`
                    : 'Démarre une nouvelle sortie avec l\'heure limite définie'
                }
              >
                <Text className="text-lg font-bold text-background">
                  {isOnCooldown ? `Attendre ${Math.ceil(remainingTime / 1000)}s` : 'Commencer'}
                </Text>
              </CushionPillButton>
            </FeedbackAnimation>
          </View>
        </ScrollView>

        {/* Rate Limit Error Alert */}
        <RateLimitErrorAlert
          visible={rateLimitError.visible}
          message={rateLimitError.message}
          onDismiss={() => setRateLimitError({ visible: false })}
        />

        {/* Toast */}
        {toastMessage && (
          <ToastPop message={toastMessage} onDismiss={() => setToastMessage('')} />
        )}
      </View>
    </ScreenTransition>
  );
}
