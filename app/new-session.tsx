import { ScrollView, View, Text, Pressable, Alert } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { BubbleBackground } from '@/components/ui/bubble-background';
import { GlassCard } from '@/components/ui/glass-card';
import { PopTextField } from '@/components/ui/pop-text-field';
import { CushionPillButton } from '@/components/ui/cushion-pill-button';
import { useApp } from '@/lib/context/app-context';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';

export default function NewSessionScreen() {
  const router = useRouter();
  const { settings, startSession } = useApp();
  const [dueTime, setDueTime] = useState(new Date(Date.now() + 2.5 * 60 * 60 * 1000));
  const [note, setNote] = useState('');

  const handleStartSession = () => {
    startSession(dueTime.getTime(), note);
    router.push('/active-session');
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const handleTimeChange = (hours: number, minutes: number) => {
    const newDate = new Date();
    newDate.setHours(hours, minutes, 0);
    if (newDate < new Date()) {
      newDate.setDate(newDate.getDate() + 1);
    }
    setDueTime(newDate);
  };

  return (
    <ScreenContainer
      className="px-4 pt-3"
      containerClassName="bg-background"
    >
      <BubbleBackground />

      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        className="relative z-10"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="gap-1 mb-3">
          <Text className="text-4xl font-bold text-foreground">
            Je sors
          </Text>
          <Text className="text-base text-muted">
            Tu penses rentrer vers quelle heure ?
          </Text>
        </View>

        {/* Card "Heure limite" */}
        <GlassCard className="gap-3 mb-3">
          <Text className="text-sm font-semibold text-muted">
            Heure limite
          </Text>
          <View className="flex-row items-center justify-between">
            <Text className="text-5xl font-bold text-foreground">
              {formatTime(dueTime)}
            </Text>
            <Pressable
              onPress={() => {
                // Simple time picker simulation
                const newHours = (dueTime.getHours() + 1) % 24;
                handleTimeChange(newHours, dueTime.getMinutes());
              }}
            >
              <MaterialIcons name="edit" size={24} color="#6C63FF" />
            </Pressable>
          </View>
        </GlassCard>

        {/* Card "Où vas-tu" */}
        <GlassCard className="gap-2 mb-3">
          <Text className="text-sm font-semibold text-muted">
            Où vas-tu ? (optionnel)
          </Text>
          <PopTextField
            placeholder="Ex: Soirée chez Karim..."
            value={note}
            onChangeText={setNote}
          />
        </GlassCard>

        {/* Card "Contact d'urgence" */}
        <GlassCard className="gap-2 mb-3">
          <Text className="text-sm font-semibold text-muted">
            Contact d'urgence
          </Text>
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-base font-semibold text-foreground">
                {settings.emergencyContactName}
              </Text>
              <Text className="text-sm text-muted">
                {settings.emergencyContactPhone}
              </Text>
            </View>
            <Pressable>
              <MaterialIcons name="phone" size={24} color="#6C63FF" />
            </Pressable>
          </View>
        </GlassCard>

        {/* Card "Localisation" */}
        <GlassCard className="gap-2 mb-3">
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-sm font-semibold text-foreground">
                Ajouter la position en cas d'alerte
              </Text>
              <Text className="text-xs text-muted">
                Jamais en continu, juste une dernière position si l'alerte part.
              </Text>
            </View>
            <View
              className="w-12 h-7 rounded-full items-center justify-end px-1"
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
            </View>
          </View>
        </GlassCard>

        {/* Bottom spacer */}
        <View className="flex-1" />

        {/* CTA "Démarrer" */}
        <View className="mb-2">
          <CushionPillButton
            label="Démarrer"
            onPress={handleStartSession}
            variant="primary"
            size="lg"
          />
        </View>

        {/* Extra bottom spacer */}
        <View className="h-2" />
      </ScrollView>
    </ScreenContainer>
  );
}
