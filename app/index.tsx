import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { BubbleBackground } from '@/components/ui/bubble-background';
import { GlassCard } from '@/components/ui/glass-card';
import { HeroCardPremium } from '@/components/ui/hero-card-premium';
import { StatusCard } from '@/components/ui/status-card';
import { ScreenTransition } from '@/components/ui/screen-transition';
import { useApp } from '@/lib/context/app-context';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useProfileData } from '@/hooks/use-profile-data';
import { supabase } from '@/lib/supabase';

export default function IndexScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { settings, currentSession } = useApp();
  const profileData = useProfileData();
  const [remainingTime, setRemainingTime] = useState<string>('');
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [loading, setLoading] = useState(true);

  // Update remaining time every second
  useEffect(() => {
    if (!currentSession) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const deadline = currentSession.deadline;
      const remaining = deadline - now;

      if (remaining > 0) {
        const hours = Math.floor(remaining / (1000 * 60 * 60));
        const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
        setRemainingTime(
          `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
        );
      } else {
        setRemainingTime('En retard');
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [currentSession]);

  // Check phone verification on mount
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

  // Déterminer l'état de sécurité dynamiquement
  const getSecurityStatus = () => {
    const hasContact = settings.emergencyContactName && settings.emergencyContactPhone;
    const hasCredits = profileData.subscription_active || profileData.free_alerts_remaining > 0;

    // Cas 1: Aucun contact
    if (!hasContact) {
      return {
        status: 'inactive',
        title: 'Sécurité inactive',
        subtitle: 'Ajoute un contact d\'urgence pour activer les alertes.',
        isReady: false,
      };
    }

    // Cas 2: Configuration incomplète
    if (!phoneVerified || !hasCredits || !settings.locationEnabled) {
      const reasons = [];
      if (!phoneVerified) reasons.push('téléphone non vérifié');
      if (!hasCredits) reasons.push('crédits épuisés');
      if (!settings.locationEnabled) reasons.push('localisation désactivée');

      return {
        status: 'incomplete',
        title: 'Sécurité incomplète',
        subtitle: 'Finalise la configuration pour activer les alertes.',
        isReady: false,
        reasons,
      };
    }

    // Cas 3: Tout est prêt
    return {
      status: 'active',
      title: 'Sécurité active',
      subtitle: 'Tes alertes sont prêtes.',
      isReady: true,
    };
  };

  const securityStatus = getSecurityStatus();

  // Logique du CTA principal
  const handleStartSession = () => {
    const hasContact = settings.emergencyContactName && settings.emergencyContactPhone;
    const hasCredits = profileData.subscription_active || profileData.free_alerts_remaining > 0;

    // Cas 1: Contact manquant
    if (!hasContact) {
      Alert.alert(
        'Contact d\'urgence manquant',
        'Ajoute un contact d\'urgence pour continuer.',
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Aller aux Paramètres',
            onPress: () => router.push('/settings'),
          },
        ]
      );
      return;
    }

    // Cas 2: Téléphone non vérifié
    if (!phoneVerified) {
      Alert.alert(
        'Téléphone non vérifié',
        'Vérifie ton numéro pour activer les alertes.',
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Vérifier maintenant',
            onPress: () => router.push('/verify-otp'),
          },
        ]
      );
      return;
    }

    // Cas 3: Crédits épuisés
    if (!hasCredits) {
      Alert.alert(
        'Pas d\'alertes disponibles',
        'Tu n\'as plus d\'alertes disponibles. Ajoute des crédits pour continuer.',
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Ajouter des crédits',
            onPress: () => router.push('/paywall'),
          },
        ]
      );
      return;
    }

    // Cas 4: Tout est prêt - aller vers new-session
    router.push('/new-session');
  };

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
          paddingBottom: insets.bottom + 16,
        }}
      >
        {/* Header */}
        <ScreenTransition delay={0} duration={350}>
          <View className="gap-1 mb-3">
            <Text className="text-5xl font-bold text-foreground">
              SafeWalk
            </Text>
            <Text className="text-base text-muted">
              Reste en sécurité, où que tu sois.
            </Text>
          </View>
        </ScreenTransition>

        {/* Hero Card */}
        <ScreenTransition delay={100} duration={350}>
          <View className="mb-3">
            <HeroCardPremium
              title="Je sors"
              description="Définis une heure de retour. Ton contact est prévenu automatiquement si tu ne confirmes pas ton retour."
              buttonLabel="Démarrer une sortie"
              onButtonPress={handleStartSession}
            />
          </View>
        </ScreenTransition>

        {/* Status Card - Dynamique */}
        <ScreenTransition delay={200} duration={350}>
          <View className="mb-3">
            <StatusCard
              status={securityStatus.status}
              title={securityStatus.title}
              subtitle={securityStatus.subtitle}
              onPress={() => router.push('/settings')}
            />
          </View>
        </ScreenTransition>

        {/* Mini Card - Sortie en cours */}
        {currentSession && (
          <ScreenTransition delay={300} duration={350}>
            <Pressable
              onPress={() => router.push('/active-session')}
              className="mb-3"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.94)',
                borderRadius: 28,
                paddingHorizontal: 16,
                paddingVertical: 14,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.1,
                shadowRadius: 35,
                elevation: 4,
              }}
            >
              <View className="flex-row items-center gap-3">
                <MaterialIcons name="location-on" size={20} color="#6C63FF" />
                <View className="flex-1">
                  <Text className="text-base font-semibold text-foreground">
                    Sortie en cours
                  </Text>
                  <Text className="text-sm text-muted">
                    Temps restant: {remainingTime}
                  </Text>
                </View>
                <MaterialIcons name="chevron-right" size={24} color="#6C63FF" />
              </View>
            </Pressable>
          </ScreenTransition>
        )}

        {/* Section "Infos utiles" - visible seulement si pas de session */}
        {!currentSession && (
          <ScreenTransition delay={300} duration={350}>
            <View className="mt-3">
              <GlassCard className="gap-2">
                <Text className="text-sm font-semibold text-foreground">
                  Conseil du jour
                </Text>
                <Text className="text-xs text-muted leading-relaxed">
                  Un petit réflexe utile : fixe toujours une heure de retour.
                </Text>
              </GlassCard>
            </View>
          </ScreenTransition>
        )}
      </ScrollView>
    </View>
  );
}
