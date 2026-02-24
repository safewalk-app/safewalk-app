import { ScrollView, View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BubbleBackground } from '@/components/ui/bubble-background';
import { HeroCardPremium } from '@/components/ui/hero-card-premium';
import { ScreenTransition } from '@/components/ui/screen-transition';
import { useApp } from '@/lib/context/app-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { ToastPop } from '@/components/ui/toast-pop';
import { StatusChecklist, type ChecklistItem } from '@/components/ui/status-checklist';
import { DurationQuickSelect, type DurationOption } from '@/components/ui/duration-quick-select';
import * as Notifications from 'expo-notifications';
import * as Location from 'expo-location';
import { useColors } from '@/hooks/use-colors';
import { logger } from '@/lib/logger';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { settings, currentSession } = useApp();
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);

  const hasContact = settings.emergencyContactName && settings.emergencyContactPhone;

  // Vérifier l'état des permissions
  useEffect(() => {
    const checkPermissions = async () => {
      try {
        // Vérifier notifications
        const notifSettings = await Notifications.getPermissionsAsync();
        const notifStatus = notifSettings.granted ? 'ok' : 'pending';

        // Vérifier localisation
        const locationStatus = await Location.getForegroundPermissionsAsync();
        const locStatus = locationStatus.granted ? 'ok' : 'pending';

        setChecklistItems([
          {
            id: 'contact',
            label: hasContact ? `Contact: ${settings.emergencyContactName}` : 'Configurer un contact',
            status: hasContact ? 'ok' : 'pending',
            onPress: () => router.push('/settings'),
          },
          {
            id: 'notifications',
            label: notifStatus === 'ok' ? 'Notifications: Activées' : 'Notifications: À activer',
            status: notifStatus,
            onPress: notifStatus === 'pending' ? () => requestNotifications() : undefined,
          },
          {
            id: 'location',
            label: locStatus === 'ok' ? 'Localisation: Autorisée' : 'Localisation: À autoriser',
            status: locStatus,
            onPress: locStatus === 'pending' ? () => requestLocation() : undefined,
          },
        ]);
      } catch (error) {
        logger.error('Error checking permissions:', error);
      }
    };

    checkPermissions();
  }, [settings, hasContact]);

  const requestNotifications = async () => {
    try {
      const result = await Notifications.requestPermissionsAsync();
      if (result.granted) {
        setToastMessage('Notifications activées');
        setShowToast(true);
      }
    } catch (error) {
      logger.error('Error requesting notifications:', error);
    }
  };

  const requestLocation = async () => {
    try {
      const result = await Location.requestForegroundPermissionsAsync();
      if (result.granted) {
        setToastMessage('Localisation autorisée');
        setShowToast(true);
      }
    } catch (error) {
      logger.error('Error requesting location:', error);
    }
  };

  const handleStartSession = () => {
    if (!hasContact) {
      setToastMessage('Configure un contact d\'urgence');
      setShowToast(true);
      setTimeout(() => {
        router.push('/settings');
      }, 1500);
      return;
    }

    router.push('/new-session');
  };

  const durationOptions: DurationOption[] = [
    { label: '30 min', minutes: 30 },
    { label: '1 h', minutes: 60 },
    { label: '2 h', minutes: 120 },
    { label: 'Personnalisé', minutes: -1 },
  ];

  const handleDurationSelect = (minutes: number) => {
    if (minutes === -1) {
      // Ouvrir l'écran de configuration personnalisée
      router.push('/new-session');
    } else {
      // Créer une session avec la durée sélectionnée
      router.push({
        pathname: '/new-session',
        params: { defaultMinutes: minutes },
      });
    }
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
        {/* Header - Ton Safety */}
        <ScreenTransition delay={0} duration={350}>
          <View className="gap-1 mb-6">
            <Text className="text-4xl font-bold text-foreground">
              SafeWalk
            </Text>
            <Text className="text-base text-muted">
              Reste en sécurité, partout.
            </Text>
          </View>
        </ScreenTransition>

        {/* Hero Card - Action Principale */}
        <ScreenTransition delay={100} duration={350}>
          <View className="mb-6">
            <HeroCardPremium
              title="Je sors"
              description="Définis une heure de retour. Un SMS est envoyé automatiquement si tu ne confirmes pas."
              buttonLabel="Commencer"
              onButtonPress={handleStartSession}
            />
          </View>
        </ScreenTransition>

        {/* Checklist d'État */}
        <ScreenTransition delay={200} duration={350}>
          <View className="mb-6">
            <Text className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">
              État du système
            </Text>
            <StatusChecklist items={checklistItems} />
          </View>
        </ScreenTransition>

        {/* Raccourcis Durée */}
        <ScreenTransition delay={300} duration={350}>
          <View className="mb-6">
            <DurationQuickSelect
              options={durationOptions}
              onSelect={handleDurationSelect}
            />
          </View>
        </ScreenTransition>

        {/* Micro-texte Contrat */}
        <ScreenTransition delay={400} duration={350}>
          <View
            className="p-4 rounded-lg"
            style={{ backgroundColor: `${colors.primary}15` }}
          >
            <View className="flex-row gap-2">
              <MaterialIcons
                name="info"
                size={16}
                color={colors.primary}
                style={{ marginTop: 2 }}
              />
              <Text className="flex-1 text-xs text-foreground leading-relaxed">
                Si tu ne confirmes pas à l'heure limite, un SMS est envoyé automatiquement à ton contact d'urgence.
              </Text>
            </View>
          </View>
        </ScreenTransition>

        {/* Current Session Info (if active) */}
        {currentSession && (
          <ScreenTransition delay={500} duration={350}>
            <Pressable
              onPress={() => router.push('/active-session')}
              className="mt-6"
            >
              {({ pressed }) => (
                <View
                  className="p-4 rounded-2xl"
                  style={{
                    backgroundColor: 'rgba(45, 226, 166, 0.1)',
                    borderLeftWidth: 4,
                    borderLeftColor: '#2DE2A6',
                    opacity: pressed ? 0.7 : 1,
                  }}
                >
                  <View className="flex-row items-center gap-2 mb-1">
                    <MaterialIcons name="location-on" size={16} color="#2DE2A6" />
                    <Text className="text-sm font-semibold text-foreground">
                      Sortie en cours
                    </Text>
                  </View>
                  <Text className="text-xs text-muted">
                    Appuie pour voir les détails
                  </Text>
                </View>
              )}
            </Pressable>
          </ScreenTransition>
        )}
      </ScrollView>

      {/* Toast */}
      {showToast && (
        <ToastPop
          message={toastMessage}
          type="warning"
          duration={2000}
          onDismiss={() => setShowToast(false)}
        />
      )}
    </View>
  );
}
