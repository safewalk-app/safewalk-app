import { ScrollView, View, Text, Pressable, Alert } from 'react-native';
import { BubbleBackground } from '@/components/ui/bubble-background';
import { GlassCard } from '@/components/ui/glass-card';
import { BigSuccessButton } from '@/components/ui/big-success-button';
import { CushionPillButton } from '@/components/ui/cushion-pill-button';
import { useApp } from '@/lib/context/app-context';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ActiveSessionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { currentSession, endSession, cancelSession, addTimeToSession } = useApp();
  const [remainingTime, setRemainingTime] = useState<string>('00:00:00');
  const [isOverdue, setIsOverdue] = useState(false);

  useEffect(() => {
    if (!currentSession) {
      router.push('/');
      return;
    }

    const interval = setInterval(() => {
      const now = Date.now();
      const deadline = currentSession.deadline;
      const remaining = deadline - now;

      if (remaining > 0) {
        setIsOverdue(false);
        const hours = Math.floor(remaining / (1000 * 60 * 60));
        const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
        setRemainingTime(
          `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
        );
      } else {
        setIsOverdue(true);
        const overdueTime = Math.abs(remaining);
        const hours = Math.floor(overdueTime / (1000 * 60 * 60));
        const minutes = Math.floor((overdueTime % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((overdueTime % (1000 * 60)) / 1000);
        setRemainingTime(
          `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
        );
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [currentSession, router]);

  const handleCompleteSession = async () => {
    await endSession();
    router.push('/');
  };

  const handleExtendSession = async () => {
    await addTimeToSession(15);
  };

  const handleCancelSession = () => {
    Alert.alert(
      'Annuler la sortie',
      'Êtes-vous sûr de vouloir annuler cette sortie ?',
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Oui',
          style: 'destructive',
          onPress: async () => {
            await cancelSession();
            router.push('/');
          },
        },
      ]
    );
  };

  if (!currentSession) {
    return null;
  }

  const dueTimeStr = new Date(currentSession.limitTime).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });

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
          <Text className="text-4xl font-bold text-foreground">
            Sortie en cours
          </Text>
        </View>

        {/* Timer Card */}
        <GlassCard
          className="gap-2 mb-4"
          style={{
            backgroundColor: isOverdue ? 'rgba(255, 77, 77, 0.08)' : 'rgba(255, 255, 255, 0.94)',
            paddingHorizontal: 16,
            paddingVertical: 14,
          }}
        >
          <Text className="text-sm font-semibold text-muted">
            Temps restant
          </Text>
          <Text
            className="text-6xl font-bold text-center"
            style={{
              color: isOverdue ? '#FF4D4D' : '#6C63FF',
              lineHeight: 72,
            }}
          >
            {isOverdue ? 'En retard' : remainingTime}
          </Text>
          <View className="gap-1 mt-2">
            <View className="flex-row justify-between">
              <Text className="text-sm text-muted">Heure limite :</Text>
              <Text className="text-sm font-semibold text-foreground">
                {dueTimeStr}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-sm text-muted">Tolérance :</Text>
              <Text className="text-sm font-semibold text-foreground">
                {currentSession.tolerance} min
              </Text>
            </View>
          </View>
        </GlassCard>

        {/* Je suis rentré Button */}
        <BigSuccessButton
          label="✅ Je suis rentré"
          onPress={handleCompleteSession}
        />

        {/* + 15 min Button */}
        <View className="mt-3 mb-3">
          <CushionPillButton
            label="+ 15 min"
            onPress={handleExtendSession}
            variant="secondary"
            size="md"
          />
        </View>

        {/* Annuler la sortie */}
        <Pressable onPress={handleCancelSession} className="py-3">
          <Text className="text-center text-sm font-semibold text-error">
            Annuler la sortie
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
