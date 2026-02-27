import { logger } from '@/lib/utils/logger';
import { ScrollView, Text, View, Pressable, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BubbleBackground } from '@/components/ui/bubble-background';
import { GlassCard } from '@/components/ui/glass-card';
import { CushionPillButton } from '@/components/ui/cushion-pill-button';
type SMSStatus = 'sent' | 'delivered' | 'failed' | 'pending';

import { ScreenTransition } from '@/components/ui/screen-transition';
import { useApp } from '@/lib/context/app-context';
import { MaterialIcons } from '@expo/vector-icons';
import { MapViewComponent } from '@/components/ui/map-view-expo';
import * as Clipboard from 'expo-clipboard';

export default function AlertSentScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { settings, currentSession } = useApp();

  const handleCopyMapLink = async (link: string) => {
    await Clipboard.setStringAsync(link);
    // Toast feedback
    logger.debug('Lien copié:', link);
  };

  const handleCallContact = () => {
    if (settings.emergencyContactPhone) {
      Linking.openURL(`tel:${settings.emergencyContactPhone}`);
    }
  };

  const handleCall112 = () => {
    Linking.openURL('tel:112');
  };

  const handleIAmOkay = () => {
    router.push('/');
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
          <View className="gap-1 mb-4">
            <Text className="text-4xl font-bold text-foreground">Oups… 😬</Text>
            <Text className="text-base text-muted">
              On a prévenu ton contact. Confirme si tout va bien.
            </Text>
          </View>
        </ScreenTransition>

        {/* Map with Location */}
        {settings.locationEnabled && currentSession?.lastLocation && (
          <ScreenTransition delay={100} duration={350}>
            <View className="mb-4 rounded-3xl overflow-hidden">
              <MapViewComponent
                latitude={String(currentSession.lastLocation.latitude)}
                longitude={String(currentSession.lastLocation.longitude)}
              />
            </View>
          </ScreenTransition>
        )}

        {/* Alert Details Card */}
        <ScreenTransition
          delay={settings.locationEnabled && currentSession?.lastLocation ? 200 : 100}
          duration={350}
        >
          <GlassCard className="gap-3 mb-4">
            <Text className="text-sm font-semibold text-foreground">Récapitulatif</Text>
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
                    {currentSession.lastLocation.latitude.toFixed(4)},{' '}
                    {currentSession.lastLocation.longitude.toFixed(4)}
                  </Text>
                </View>
              )}
            </View>
          </GlassCard>
        </ScreenTransition>

        {/* Actions Section */}
        <ScreenTransition
          delay={settings.locationEnabled && currentSession?.lastLocation ? 300 : 200}
          duration={350}
        >
          <View className="gap-2 mb-3">
            <Text className="text-xs font-bold text-muted uppercase tracking-wider">Actions</Text>
          </View>
        </ScreenTransition>

        {/* Je vais bien Button */}
        <ScreenTransition
          delay={settings.locationEnabled && currentSession?.lastLocation ? 400 : 300}
          duration={350}
        >
          <View className="mb-3">
            <CushionPillButton
              label="Je vais bien"
              onPress={handleIAmOkay}
              variant="success"
              size="lg"
            />
          </View>
        </ScreenTransition>

        {/* Call Contact */}
        <ScreenTransition
          delay={settings.locationEnabled && currentSession?.lastLocation ? 500 : 400}
          duration={350}
        >
          <Pressable onPress={handleCallContact} className="mb-3">
            {({ pressed }) => (
              <GlassCard
                className="gap-3"
                style={{
                  opacity: pressed ? 0.7 : 1,
                }}
              >
                <View className="flex-row items-center gap-3">
                  <MaterialIcons name="phone" size={20} color="#6C63FF" />
                  <View className="flex-1">
                    <Text className="text-base font-semibold text-foreground">
                      Appeler {settings.emergencyContactName}
                    </Text>
                    <Text className="text-xs text-muted mt-1">
                      {settings.emergencyContactPhone}
                    </Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={20} color="#B0B0B0" />
                </View>
              </GlassCard>
            )}
          </Pressable>
        </ScreenTransition>

        {/* Call 112 */}
        <ScreenTransition
          delay={settings.locationEnabled && currentSession?.lastLocation ? 600 : 500}
          duration={350}
        >
          <Pressable onPress={handleCall112}>
            {({ pressed }) => (
              <GlassCard
                className="gap-3"
                style={{
                  opacity: pressed ? 0.7 : 1,
                }}
              >
                <View className="flex-row items-center gap-3">
                  <MaterialIcons name="emergency" size={20} color="#FF4D4D" />
                  <View className="flex-1">
                    <Text className="text-base font-semibold text-foreground">
                      Appeler les secours
                    </Text>
                    <Text className="text-xs text-muted mt-1">Numéro d'urgence 112</Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={20} color="#B0B0B0" />
                </View>
              </GlassCard>
            )}
          </Pressable>
        </ScreenTransition>
      </ScrollView>
    </View>
  );
}
