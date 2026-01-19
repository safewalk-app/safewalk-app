import { ScrollView, View, Text, Linking, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { BubbleBackground } from '@/components/ui/bubble-background';
import { GlassCard } from '@/components/ui/glass-card';
import { CushionPillButton } from '@/components/ui/cushion-pill-button';
import { useApp } from '@/lib/context/app-context';
import { MaterialIcons } from '@expo/vector-icons';

export default function AlertSentScreen() {
  const router = useRouter();
  const { settings, currentSession } = useApp();

  const handleCallContact = () => {
    if (settings.emergencyContactPhone) {
      Linking.openURL(`tel:${settings.emergencyContactPhone}`);
    }
  };

  const handleCall112 = () => {
    Linking.openURL('tel:112');
  };

  const handleIAmOkay = () => {
    router.push('/home');
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
        <View className="gap-2 mb-4 items-center">
          <Text className="text-5xl">🚨</Text>
          <Text className="text-3xl font-bold text-danger">
            Alerte envoyée
          </Text>
        </View>

        {/* Alert Details */}
        <GlassCard className="gap-3 bg-danger/10">
          <Text className="text-base font-semibold text-foreground">
            Récapitulatif
          </Text>
          <View className="gap-2">
            <View className="flex-row justify-between">
              <Text className="text-sm text-muted">Contact alerté :</Text>
              <Text className="text-sm font-semibold text-foreground">
                {settings.emergencyContactName}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-sm text-muted">Heure d'alerte :</Text>
              <Text className="text-sm font-semibold text-foreground">
                {new Date().toLocaleTimeString('fr-FR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
            {settings.locationEnabled && currentSession?.lastLocation && (
              <View className="flex-row justify-between">
                <Text className="text-sm text-muted">Position :</Text>
                <Text className="text-sm font-semibold text-foreground">
                  Envoyée
                </Text>
              </View>
            )}
          </View>
        </GlassCard>

        {/* Actions */}
        <View className="gap-3 mt-6">
          <Text className="text-sm font-semibold text-foreground">
            Que faire maintenant ?
          </Text>

          {/* Je vais bien */}
          <CushionPillButton
            label="Je vais bien"
            onPress={handleIAmOkay}
            variant="success"
            size="lg"
          />

          {/* Call Contact */}
          <Pressable
            onPress={handleCallContact}
            className="p-4 rounded-2xl bg-white border border-border flex-row items-center gap-3"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.94)',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 12,
              elevation: 3,
            }}
          >
            <MaterialIcons
              name="phone"
              size={24}
              color="#6C63FF"
            />
            <View className="flex-1">
              <Text className="font-semibold text-foreground">
                Appeler {settings.emergencyContactName}
              </Text>
              <Text className="text-xs text-muted">
                {settings.emergencyContactPhone}
              </Text>
            </View>
          </Pressable>

          {/* Call 112 */}
          <Pressable
            onPress={handleCall112}
            className="p-4 rounded-2xl bg-white border border-border flex-row items-center gap-3"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.94)',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 12,
              elevation: 3,
            }}
          >
            <MaterialIcons
              name="emergency"
              size={24}
              color="#FF4D4D"
            />
            <View className="flex-1">
              <Text className="font-semibold text-foreground">
                Appeler les secours
              </Text>
              <Text className="text-xs text-muted">
                Numéro d'urgence 112
              </Text>
            </View>
          </Pressable>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
