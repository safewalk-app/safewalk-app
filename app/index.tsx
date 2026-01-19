import { ScrollView, View, Text, Pressable } from 'react-native';
import { BubbleBackground } from '@/components/ui/bubble-background';
import { GlassCard } from '@/components/ui/glass-card';
import { HeroCardPremium } from '@/components/ui/hero-card-premium';
import { StatusCard } from '@/components/ui/status-card';
import { useApp } from '@/lib/context/app-context';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function IndexScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { settings, currentSession } = useApp();
  const [remainingTime, setRemainingTime] = useState<string>('');

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

  const handleStartSession = () => {
    if (!settings.emergencyContactName || !settings.emergencyContactPhone) {
      router.push('/settings');
      return;
    }
    router.push('/new-session');
  };

  const hasContact = settings.emergencyContactName && settings.emergencyContactPhone;

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
        <View className="gap-1 mb-3">
          <Text className="text-5xl font-bold text-foreground">
            SafeWalk
          </Text>
          <Text className="text-base text-muted">
            Reste en sécurité, partout.
          </Text>
        </View>

        {/* Hero Card */}
        <View className="mb-3">
          <HeroCardPremium
            title="Je sors"
            description="Définis une heure de retour. Un proche est prévenu si tu ne confirmes pas."
            buttonLabel="Commencer"
            onButtonPress={handleStartSession}
          />
        </View>

        {/* Status Card */}
        <View className="mb-3">
          <StatusCard
            status={hasContact ? 'active' : 'inactive'}
            title={hasContact ? 'Sécurité active' : 'Sécurité inactive'}
            subtitle={hasContact ? 'Contact configuré' : 'Configurer un contact'}
            onPress={() => router.push('/settings')}
          />
        </View>

        {/* Mini Card - Sortie en cours */}
        {currentSession && (
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
        )}

        {/* Section "Infos utiles" - visible seulement si pas de session */}
        {!currentSession && (
          <View className="mt-3">
            <GlassCard className="gap-2">
              <Text className="text-sm font-semibold text-foreground">
                Conseil du jour
              </Text>
              <Text className="text-xs text-muted leading-relaxed">
                Partage toujours ton heure de retour avec un proche de confiance.
              </Text>
            </GlassCard>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
