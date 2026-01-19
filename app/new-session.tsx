import { ScrollView, View, Text, Modal, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { BubbleBackground } from '@/components/ui/bubble-background';
import { GlassCard } from '@/components/ui/glass-card';
import { PopTextField } from '@/components/ui/pop-text-field';
import { CushionPillButton } from '@/components/ui/cushion-pill-button';
import { useApp } from '@/lib/context/app-context';
import { useState } from 'react';
import { ToastPop } from '@/components/ui/toast-pop';
import { MaterialIcons } from '@expo/vector-icons';

export default function NewSessionScreen() {
  const router = useRouter();
  const { settings, startSession } = useApp();
  const [dueTime, setDueTime] = useState('02:30');
  const [location, setLocation] = useState('');
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const handleStartSession = async () => {
    // Parse time
    const [hours, minutes] = dueTime.split(':').map(Number);
    const now = new Date();
    const dueDateTime = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      hours,
      minutes
    );

    // If time is in the past, set for tomorrow
    if (dueDateTime < now) {
      dueDateTime.setDate(dueDateTime.getDate() + 1);
    }

    await startSession(dueDateTime.getTime(), location || undefined);
    setToastMessage('Sortie démarrée !');
    setShowToast(true);

    setTimeout(() => {
      router.push('/active-session');
    }, 500);
  };

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
            Je sors
          </Text>
          <Text className="text-base text-muted">
            Tu penses rentrer vers quelle heure ?
          </Text>
        </View>

        {/* Heure limite */}
        <View className="gap-2">
          <Text className="text-sm font-semibold text-foreground">
            Heure limite
          </Text>
          <Pressable onPress={() => setShowTimeModal(true)}>
            <GlassCard className="flex-row items-center justify-between p-4">
              <Text className="text-4xl font-bold text-primary">
                {dueTime}
              </Text>
              <MaterialIcons
                name="schedule"
                size={28}
                color="#6C63FF"
              />
            </GlassCard>
          </Pressable>
        </View>

        {/* Où vas-tu ? */}
        <PopTextField
          label="Où vas-tu ? (optionnel)"
          placeholder="Ex: Soirée chez Karim..."
          value={location}
          onChangeText={setLocation}
          multiline
          numberOfLines={2}
        />

        {/* Contact d'urgence */}
        <View className="gap-2">
          <Text className="text-sm font-semibold text-foreground">
            Contact d'urgence
          </Text>
          <GlassCard className="flex-row items-center justify-between p-4">
            <View className="flex-1">
              <Text className="text-base font-semibold text-foreground">
                {settings.emergencyContactName}
              </Text>
              <Text className="text-sm text-muted">
                {settings.emergencyContactPhone}
              </Text>
            </View>
            <Pressable className="p-2">
              <MaterialIcons
                name="phone"
                size={24}
                color="#6C63FF"
              />
            </Pressable>
          </GlassCard>
        </View>

        {/* Localisation */}
        <View className="gap-2">
          <View className="flex-row items-center justify-between">
            <Text className="text-sm font-semibold text-foreground">
              Localisation
            </Text>
            <Pressable
              className={`w-12 h-7 rounded-full items-center justify-${
                settings.locationEnabled ? 'end' : 'start'
              } px-1`}
              style={{
                backgroundColor: settings.locationEnabled ? '#2DE2A6' : '#E5E7EB',
              }}
            >
              <View
                className="w-5 h-5 rounded-full bg-white"
                style={{
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  elevation: 2,
                }}
              />
            </Pressable>
          </View>
          <Text className="text-xs text-muted">
            Ajouter la position en cas d'alerte. Jamais en continu, juste une dernière position si l'alerte part.
          </Text>
        </View>

        {/* CTA */}
        <View className="mt-6">
          <CushionPillButton
            label="Démarrer"
            onPress={handleStartSession}
            variant="primary"
            size="lg"
          />
        </View>
      </ScrollView>

      {/* Time Picker Modal */}
      <Modal
        visible={showTimeModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTimeModal(false)}
      >
        <Pressable
          className="flex-1 bg-black/50 items-center justify-center"
          onPress={() => setShowTimeModal(false)}
        >
          <GlassCard className="w-80 gap-4">
            <Text className="text-lg font-bold text-foreground">
              Sélectionner l'heure
            </Text>
            <PopTextField
              placeholder="HH:MM"
              value={dueTime}
              onChangeText={setDueTime}
              keyboardType="numeric"
            />
            <CushionPillButton
              label="Confirmer"
              onPress={() => setShowTimeModal(false)}
              variant="primary"
              size="md"
            />
          </GlassCard>
        </Pressable>
      </Modal>

      {/* Toast */}
      {showToast && (
        <ToastPop
          message={toastMessage}
          type="success"
          duration={1500}
          onDismiss={() => setShowToast(false)}
        />
      )}
    </ScreenContainer>
  );
}
