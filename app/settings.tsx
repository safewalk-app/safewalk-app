import { View, Text, Pressable, Switch, Alert } from 'react-native';
import { BubbleBackground } from '@/components/ui/bubble-background';
import { GlassCard } from '@/components/ui/glass-card';
import { PopTextField } from '@/components/ui/pop-text-field';
import { SegmentedControlPill } from '@/components/ui/segmented-control-pill';
import { useApp } from '@/lib/context/app-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { ToastPop } from '@/components/ui/toast-pop';
import * as Haptics from 'expo-haptics';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { settings, updateSettings, deleteAllData } = useApp();
  const [firstName, setFirstName] = useState(settings.firstName);
  const [contactName, setContactName] = useState(settings.emergencyContactName);
  const [contactPhone, setContactPhone] = useState(settings.emergencyContactPhone);
  const [tolerance, setTolerance] = useState(settings.tolerance);
  const [locationEnabled, setLocationEnabled] = useState(settings.locationEnabled);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Autosave firstName
  useEffect(() => {
    const timer = setTimeout(() => {
      if (firstName !== settings.firstName) {
        updateSettings({ firstName });
        setToastMessage('Prénom sauvegardé');
        setShowToast(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [firstName]);

  // Autosave contact
  useEffect(() => {
    const timer = setTimeout(() => {
      if (
        contactName !== settings.emergencyContactName ||
        contactPhone !== settings.emergencyContactPhone
      ) {
        updateSettings({
          emergencyContactName: contactName,
          emergencyContactPhone: contactPhone,
        });
        setToastMessage('Contact sauvegardé');
        setShowToast(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [contactName, contactPhone]);

  // Autosave tolerance
  useEffect(() => {
    if (tolerance !== settings.tolerance) {
      updateSettings({ tolerance });
      setToastMessage(`Tolérance: ${tolerance} min`);
      setShowToast(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [tolerance]);

  // Autosave location
  useEffect(() => {
    if (locationEnabled !== settings.locationEnabled) {
      updateSettings({ locationEnabled });
      setToastMessage(
        locationEnabled
          ? 'Localisation activée'
          : 'Localisation désactivée'
      );
      setShowToast(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }, [locationEnabled]);

  const handleDeleteData = () => {
    Alert.alert(
      'Supprimer toutes les données',
      'Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            await deleteAllData();
            setToastMessage('Données supprimées');
            setShowToast(true);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          },
        },
      ]
    );
  };

  return (
    <View className="flex-1 bg-background">
      <BubbleBackground />

      <View
        className="relative z-10 flex-1"
        style={{
          paddingHorizontal: 16,
          paddingTop: insets.top + 12,
          paddingBottom: insets.bottom + 16,
        }}
      >
        {/* Header */}
        <View className="gap-1 mb-4">
          <Text className="text-4xl font-bold text-foreground">
            Paramètres
          </Text>
        </View>

        {/* SECTION 1: PROFIL */}
        <View className="mb-4">
          <Text className="text-xs font-bold text-muted uppercase tracking-wider mb-2">
            Profil
          </Text>

          {/* Card "Ton prénom" */}
          <GlassCard className="gap-2">
            <View className="flex-row items-center gap-2">
              <MaterialIcons name="person" size={16} color="#6C63FF" />
              <Text className="text-sm font-semibold text-muted">
                Prénom
              </Text>
            </View>
            <PopTextField
              placeholder="Ben"
              value={firstName}
              onChangeText={setFirstName}
            />
          </GlassCard>
        </View>

        {/* SECTION 2: SÉCURITÉ */}
        <View className="mb-4">
          <Text className="text-xs font-bold text-muted uppercase tracking-wider mb-2">
            Sécurité
          </Text>

          {/* Card "Contact d'urgence" */}
          <View className="mb-3">
            <GlassCard className="gap-2">
              <View className="flex-row items-center gap-2">
                <MaterialIcons name="emergency" size={16} color="#FF4D4D" />
                <Text className="text-sm font-semibold text-foreground">
                  Contact d'urgence
                </Text>
              </View>
              
              <PopTextField
                placeholder="Nom"
                value={contactName}
                onChangeText={setContactName}
              />

              <View className="flex-row items-center gap-2">
                <View className="flex-1">
                  <PopTextField
                    placeholder="+33 6 12 34 56 78"
                    value={contactPhone}
                    onChangeText={setContactPhone}
                  />
                </View>
                <Pressable 
                  className="p-2"
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <MaterialIcons name="phone" size={20} color="#6C63FF" />
                </Pressable>
              </View>
            </GlassCard>
          </View>

          {/* Card "Tolérance" */}
          <View className="mb-3">
            <GlassCard className="gap-2">
              <View className="flex-row items-center gap-2">
                <MaterialIcons name="schedule" size={16} color="#2DE2A6" />
                <Text className="text-sm font-semibold text-foreground">
                  Tolérance
                </Text>
              </View>
              <SegmentedControlPill
                options={[
                  { label: '10 min', value: 10 },
                  { label: '15 min', value: 15 },
                  { label: '30 min', value: 30 },
                ]}
                value={tolerance}
                onValueChange={(value) => setTolerance(value as number)}
              />
            </GlassCard>
          </View>

          {/* Card "Localisation" */}
          <View className="mb-3">
            <GlassCard className="gap-2">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-2 flex-1">
                  <MaterialIcons name="location-on" size={16} color="#3A86FF" />
                  <Text className="text-sm font-semibold text-foreground">
                    Partage de position
                  </Text>
                </View>
                <Switch
                  value={locationEnabled}
                  onValueChange={(value) => {
                    setLocationEnabled(value);
                  }}
                  trackColor={{ false: '#E5E7EB', true: '#2DE2A6' }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </GlassCard>
          </View>
        </View>

        {/* Bouton "Supprimer mes données" */}
        <Pressable 
          onPress={handleDeleteData}
          className="py-3"
        >
          {({ pressed }) => (
            <View
              style={{
                opacity: pressed ? 0.6 : 1,
              }}
            >
              <Text className="text-center text-base font-bold text-error">
                Supprimer mes données
              </Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* Toast */}
      {showToast && (
        <ToastPop
          message={toastMessage}
          type="success"
          duration={1500}
          onDismiss={() => setShowToast(false)}
        />
      )}
    </View>
  );
}
