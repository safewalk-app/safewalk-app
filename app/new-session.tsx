import { View, Text, ScrollView, Pressable, Switch, Alert } from 'react-native';
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
import { useLoadingWrapper } from '@/hooks/use-loading-indicator';
import { ToastPop } from '@/components/ui/toast-pop';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { RateLimitErrorAlert } from '@/components/rate-limit-error-alert';
import { useCooldown } from '@/lib/hooks/use-cooldown';
import { notify, notifyBlocked } from '@/lib/services/notification.service';
import { MaterialIcons } from '@expo/vector-icons';

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
  const [blockingReason, setBlockingReason] = useState<string | null>(null);
  const [rateLimitError, setRateLimitError] = useState<{
    visible: boolean;
    message?: string;
  }>({ visible: false });
  const profileData = useProfileData();

  // Wrapper pour afficher l'indicateur de chargement lors du démarrage de la sortie
  const withSessionLoading = useLoadingWrapper({
    name: 'Démarrage de la sortie',
    type: 'service',
    minDuration: 300,
  });

  // Cooldown de 2 secondes entre les démarrages de sortie
  const {
    trigger: triggerStartSession,
    isOnCooldown,
    remainingTime,
  } = useCooldown({
    duration: 2000,
  });

  // Check if phone is verified on mount
  useEffect(() => {
    checkPhoneVerification();
  }, []);

  const checkPhoneVerification = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
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

  // Vérifier les blocages et retourner la raison du blocage
  const checkBlockingConditions = () => {
    if (!settings.emergencyContactName || !settings.emergencyContactPhone) {
      setBlockingReason('contact.missing');
      return true;
    }
    if (!phoneVerified) {
      setBlockingReason('auth.otp_required');
      return true;
    }
    const hasCredits = profileData.subscription_active || profileData.free_alerts_remaining > 0;
    if (!hasCredits) {
      setBlockingReason('credits.empty');
      return true;
    }
    // GPS est optionnel - ne pas bloquer
    setBlockingReason(null);
    return false;
  };

  // Obtenir le message et l'action pour le blocage
  const getBlockingMessage = () => {
    switch (blockingReason) {
      case 'contact.missing':
        return {
          title: "Contact d'urgence manquant",
          message: "Ajoute un contact d'urgence pour continuer.",
          action: 'Aller aux Paramètres',
          onAction: () => router.push('/settings'),
        };
      case 'auth.otp_required':
        return {
          title: 'Téléphone non vérifié',
          message: 'Vérifie ton numéro pour activer les alertes.',
          action: 'Vérifier maintenant',
          onAction: () => setShowOtpModal(true),
        };
      case 'credits.empty':
        return {
          title: "Pas d'alertes disponibles",
          message: "Tu n'as plus d'alertes disponibles. Ajoute des crédits pour continuer.",
          action: 'Ajouter des crédits',
          onAction: () => setShowPaywallModal(true),
        };
      default:
        return null;
    }
  };

  const handleStartSession = async () => {
    // Vérifier les blocages avant de démarrer
    if (checkBlockingConditions()) {
      const blockingMsg = getBlockingMessage();
      if (blockingMsg) {
        Alert.alert(blockingMsg.title, blockingMsg.message, [
          { text: 'Annuler', style: 'cancel' },
          { text: blockingMsg.action, onPress: blockingMsg.onAction },
        ]);
      }
      return;
    }

    await triggerStartSession(async () => {
      // Vérifier deadline valide (minimum 15 minutes)
      const now = Date.now();
      const minDeadline = now + 15 * 60 * 1000;
      if (limitTime <= now) {
        notify('error.invalid_time');
        setSubmitState('error');
        return;
      }
      if (limitTime < minDeadline) {
        notify('error.invalid_time');
        setSubmitState('error');
        return;
      }

      setSubmitState('loading');

      try {
        // Afficher l'indicateur de chargement pendant le démarrage de la sortie
        const result = await withSessionLoading(() =>
          startSession({
            deadline: limitTime,
            note,
          }),
        );

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

  // Déterminer le message du bouton selon l'état
  const getButtonMessage = () => {
    if (isOnCooldown) {
      return `Attendre ${Math.ceil(remainingTime / 1000)}s`;
    }
    if (blockingReason) {
      switch (blockingReason) {
        case 'contact.missing':
          return "Ajoute un contact d'urgence";
        case 'auth.otp_required':
          return 'Vérifie ton numéro';
        case 'credits.empty':
          return "Tu n'as plus d'alertes";
        default:
          return 'Démarrer la sortie';
      }
    }
    return 'Démarrer la sortie';
  };

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
                  <Text className="text-sm text-muted">Tu penses rentrer vers quelle heure ?</Text>
                </View>
              </View>
            </GlassCard>

            {/* Time Limit Picker */}
            <GlassCard className="gap-4">
              <Text className="text-base font-semibold text-foreground">Retour prévu</Text>
              <TimeLimitPicker value={limitTime} onChange={setLimitTime} />
              <Text className="text-xs text-muted mt-2">
                Si tu ne confirmes pas ton retour, ton contact sera prévenu automatiquement.
              </Text>
            </GlassCard>

            {/* Destination */}
            <GlassCard className="gap-3">
              <Text className="text-base font-semibold text-foreground">
                Où vas-tu ? (optionnel)
              </Text>
              <PopTextField
                placeholder="Ex. Soirée chez Karim"
                value={note}
                onChangeText={setNote}
                multiline
                numberOfLines={3}
              />
            </GlassCard>

            {/* Contact d'urgence */}
            <GlassCard className="gap-3">
              <View className="flex-row items-center gap-2">
                <MaterialIcons name="emergency" size={16} color="#FF4D4D" />
                <Text className="text-base font-semibold text-foreground">Contact d'urgence</Text>
              </View>
              {settings.emergencyContactName && settings.emergencyContactPhone ? (
                <>
                  <View className="gap-2">
                    <Text className="text-sm text-muted">Nom</Text>
                    <Text className="text-base font-medium text-foreground">
                      {settings.emergencyContactName}
                    </Text>
                  </View>
                  <View className="gap-2">
                    <Text className="text-sm text-muted">Téléphone</Text>
                    <Text className="text-base font-medium text-foreground">
                      {settings.emergencyContactPhone}
                    </Text>
                  </View>
                  <Text className="text-xs text-muted mt-2">
                    Cette personne recevra une alerte si tu ne confirmes pas ton retour.
                  </Text>
                </>
              ) : (
                <Pressable onPress={() => router.push('/settings')}>
                  <Text className="text-sm text-primary font-medium">
                    Ajoute un contact d'urgence pour activer les alertes.
                  </Text>
                </Pressable>
              )}
            </GlassCard>

            {/* Localisation */}
            <GlassCard className="gap-3">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-2 flex-1">
                  <MaterialIcons name="location-on" size={16} color="#3A86FF" />
                  <Text className="text-base font-semibold text-foreground">
                    Partager ma position en cas d'alerte
                  </Text>
                </View>
                <Switch
                  value={settings.locationEnabled}
                  onValueChange={(value) => {
                    // Cette action est gérée dans les paramètres
                    // Ici on affiche juste l'état
                  }}
                  trackColor={{ false: '#E5E7EB', true: '#2DE2A6' }}
                  thumbColor="#FFFFFF"
                  disabled={true}
                />
              </View>
              <Text className="text-xs text-muted mt-2">
                Ta position n'est envoyée qu'en cas d'alerte.
              </Text>
              {!settings.locationEnabled && (
                <Text className="text-xs text-warning mt-1">
                  La localisation est désactivée. Tu peux continuer sans elle.
                </Text>
              )}
            </GlassCard>

            {/* Start Button */}
            <FeedbackAnimation state={submitState} onDismiss={() => setSubmitState('idle')}>
              <CushionPillButton
                onPress={handleStartSession}
                disabled={isOnCooldown || submitState === 'loading' || blockingReason !== null}
                accessibilityLabel="Démarrer la sortie"
                accessibilityHint={
                  isOnCooldown
                    ? `Attendre ${Math.ceil(remainingTime / 1000)}s avant de démarrer`
                    : "Démarre une nouvelle sortie avec l'heure limite définie"
                }
              >
                <Text className="text-lg font-bold text-background">{getButtonMessage()}</Text>
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
        {toastMessage && <ToastPop message={toastMessage} onDismiss={() => setToastMessage('')} />}
      </View>
    </ScreenTransition>
  );
}
