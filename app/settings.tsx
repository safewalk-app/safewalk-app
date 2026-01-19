import { ScrollView, View, Text, Pressable, Switch, Alert } from 'react-native';
import { BubbleBackground } from '@/components/ui/bubble-background';
import { GlassCard } from '@/components/ui/glass-card';
import { PopTextField } from '@/components/ui/pop-text-field';
import { SegmentedControlPill } from '@/components/ui/segmented-control-pill';
import { useApp } from '@/lib/context/app-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { ToastPop } from '@/components/ui/toast-pop';

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
    }
  }, [locationEnabled]);

  const handleDeleteData = () => {
    Alert.alert(
      'Supprimer toutes les données',
      'Cette action est irréversible. Êtes-vous sûr ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            await deleteAllData();
            setToastMessage('Données supprimées');
            setShowToast(true);
          },
        },
      ]
    );
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
        <View className="gap-1 mb-3">
          <Text className="text-4xl font-bold text-foreground">
            Paramètres
          </Text>
          <Text className="text-base text-muted">
            Personnalise ton expérience.
          </Text>
        </View>

        {/* Card "Ton prénom" */}
        <View className="mb-3">
          <GlassCard className="gap-2">
            <Text className="text-sm font-semibold text-muted">
              Ton prénom
            </Text>
            <PopTextField
              placeholder="Ben"
              value={firstName}
              onChangeText={setFirstName}
            />
          </GlassCard>
        </View>

        {/* Card "Contact d'urgence" */}
        <View className="mb-3">
          <GlassCard className="gap-2">
            <Text className="text-sm font-semibold text-muted">
              Contact d'urgence
            </Text>
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
              <Pressable className="p-2">
                <MaterialIcons name="phone" size={20} color="#6C63FF" />
              </Pressable>
            </View>
            <Text className="text-xs text-warning">
              ⚠️ Ce contact est prévu uniquement si tu ne confirmes pas.
            </Text>
          </GlassCard>
        </View>

        {/* Card "Tolérance" */}
        <View className="mb-3">
          <GlassCard className="gap-2">
            <Text className="text-sm font-semibold text-muted">
              Tolérance
            </Text>
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
              <View className="flex-1">
                <Text className="text-sm font-semibold text-foreground">
                  Localisation
                </Text>
                <Text className="text-xs text-muted">
                  Ajouter la position en cas d'alerte
                </Text>
              </View>
              <Switch
                value={locationEnabled}
                onValueChange={(value) => setLocationEnabled(value)}
                trackColor={{ false: '#E5E7EB', true: '#2DE2A6' }}
                thumbColor="#FFFFFF"
              />
            </View>
          </GlassCard>
        </View>

        {/* Section "Infos" */}
        <View className="mt-4 pt-3 border-t border-border">
          <Text className="text-xs font-semibold text-muted uppercase mb-2">
            Infos
          </Text>

          {/* Card "Confidentialité" */}
          <View className="mb-2">
            <GlassCard className="gap-2">
              <View className="flex-row items-center justify-between">
                <Text className="text-sm font-semibold text-foreground">
                  Confidentialité
                </Text>
                <MaterialIcons name="chevron-right" size={20} color="#687076" />
              </View>
            </GlassCard>
          </View>

          {/* Card "Version" */}
          <View className="mb-2">
            <GlassCard className="gap-2">
              <View className="flex-row items-center justify-between">
                <Text className="text-sm text-muted">Version</Text>
                <Text className="text-sm font-semibold text-foreground">
                  v1.0.0
                </Text>
              </View>
            </GlassCard>
          </View>

          {/* Card "Support" */}
          <View className="mb-3">
            <GlassCard className="gap-2">
              <View className="flex-row items-center justify-between">
                <Text className="text-sm text-muted">Support</Text>
                <Pressable>
                  <Text className="text-sm font-semibold text-primary">
                    Contacter
                  </Text>
                </Pressable>
              </View>
            </GlassCard>
          </View>

          {/* Bouton "Supprimer mes données" */}
          <Pressable onPress={handleDeleteData} className="py-3">
            <Text className="text-center text-sm font-semibold text-error">
              Supprimer mes données
            </Text>
          </Pressable>
        </View>
      </ScrollView>

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
