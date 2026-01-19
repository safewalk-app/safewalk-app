import { ScrollView, View, Text, Alert, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { BubbleBackground } from '@/components/ui/bubble-background';
import { GlassCard } from '@/components/ui/glass-card';
import { BigSuccessButton } from '@/components/ui/big-success-button';
import { CushionPillButton } from '@/components/ui/cushion-pill-button';
import { useApp } from '@/lib/context/app-context';
import { useState, useEffect } from 'react';
import { ToastPop } from '@/components/ui/toast-pop';

export default function ActiveSessionScreen() {
  const router = useRouter();
  const { currentSession, endSession, addTimeToSession, cancelSession } = useApp();
  const [timeLeft, setTimeLeft] = useState('--:--');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    if (!currentSession) {
      router.push('/home');
      return;
    }

    const updateTimeLeft = () => {
      const now = Date.now();
      const diff = currentSession.dueTime - now;

      if (diff <= 0) {
        setTimeLeft('00:00');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      setTimeLeft(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`);
    };

    updateTimeLeft();
    const interval = setInterval(updateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, [currentSession]);

  const handleReturnHome = async () => {
    await endSession();
    setToastMessage('Bienvenue à la maison !');
    setShowToast(true);
    setTimeout(() => {
      router.push('/home');
    }, 500);
  };

  const handleAddTime = async () => {
    await addTimeToSession(15);
    setToastMessage('15 minutes ajoutées');
    setShowToast(true);
  };

  const handleCancel = () => {
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
            setToastMessage('Sortie annulée');
            setShowToast(true);
            setTimeout(() => {
              router.push('/home');
            }, 500);
          },
        },
      ]
    );
  };

  if (!currentSession) {
    return null;
  }

  return (
    <ScreenContainer
      className="relative pb-24"
      containerClassName="bg-background"
    >
      <BubbleBackground />

      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        className="relative z-10 gap-4"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="gap-1 mb-2">
          <Text className="text-3xl font-bold text-foreground">
            Sortie en cours
          </Text>
          <Text className="text-base text-muted">
            Tu forase après 😊
          </Text>
        </View>

        {/* Time Display */}
        <GlassCard className="items-center justify-center py-8 gap-3">
          <View className="flex-row items-center gap-2">
            <Text className="text-2xl">🌙</Text>
            <Text className="text-sm text-muted font-semibold">
              Heure limite
            </Text>
          </View>
          <Text className="text-6xl font-bold text-primary">
            {timeLeft}
          </Text>
          <View className="flex-row gap-4 text-xs text-muted">
            <Text>Heure limite : {currentSession.dueTime ? new Date(currentSession.dueTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '--:--'}</Text>
          </View>
          <Text className="text-xs text-muted">
            Tolérance: {currentSession.tolerance} min
          </Text>
        </GlassCard>

        {/* Main CTA */}
        <View className="mt-6">
          <BigSuccessButton
            label="Je suis rentré"
            onPress={handleReturnHome}
          />
        </View>

        {/* Add Time */}
        <CushionPillButton
          label="+ 15 min"
          onPress={handleAddTime}
          variant="secondary"
          size="md"
        />

        {/* Cancel */}
        <Pressable onPress={handleCancel} className="mt-4">
          <Text className="text-center text-sm font-semibold text-danger">
            Annuler la sortie
          </Text>
        </Pressable>
      </ScrollView>

      {/* Toast */}
      {showToast && (
        <ToastPop
          message={toastMessage}
          type={toastMessage.includes('Bienvenue') ? 'success' : 'info'}
          duration={1500}
          onDismiss={() => setShowToast(false)}
        />
      )}
    </ScreenContainer>
  );
}
