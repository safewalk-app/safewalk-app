import { ScrollView, View, Text, Pressable, Alert } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { BubbleBackground } from '@/components/ui/bubble-background';
import { GlassCard } from '@/components/ui/glass-card';
import { PopTextField } from '@/components/ui/pop-text-field';
import { SegmentedControlPill } from '@/components/ui/segmented-control-pill';
import { CushionPillButton } from '@/components/ui/cushion-pill-button';
import { useApp } from '@/lib/context/app-context';
import { useState, useEffect } from 'react';
import { ToastPop } from '@/components/ui/toast-pop';
import { MaterialIcons } from '@expo/vector-icons';

export default function SettingsScreen() {
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
            Paramètres
          </Text>
          <Text className="text-base text-muted">
            Personnalise ton expérience.
          </Text>
        </View>

        {/* Prénom */}
        <PopTextField
          label="Ton prénom"
          placeholder="Ex: Ben"
          value={firstName}
          onChangeText={setFirstName}
        />

        {/* Contact d'urgence */}
        <View className="gap-2">
          <Text className="text-sm font-semibold text-foreground">
            Contact d'urgence
          </Text>
          <GlassCard className="gap-3">
            <PopTextField
              placeholder="Nom du contact"
              value={contactName}
              onChangeText={setContactName}
            />
            <View className="flex-row gap-2 items-center">
              <View className="flex-1">
                <PopTextField
                  placeholder="+33 6 12 34 56 78"
                  value={contactPhone}
                  onChangeText={setContactPhone}
                  keyboardType="phone-pad"
                />
              </View>
              {contactPhone && (
                <Pressable className="p-2">
                  <MaterialIcons
                    name="phone"
                    size={24}
                    color="#6C63FF"
                  />
                </Pressable>
              )}
            </View>
          </GlassCard>
          <Text className="text-xs text-warning">
            ⚠ Ce contact est prévu uniquement si tu ne confirmes pas.
          </Text>
        </View>

        {/* Tolérance */}
        <SegmentedControlPill
          label="Tolérance"
          options={[
            { label: '10 min', value: 10 },
            { label: '15 min', value: 15 },
            { label: '30 min', value: 30 },
          ]}
          value={tolerance}
          onValueChange={(val) => setTolerance(val as number)}
        />

        {/* Localisation */}
        <View className="gap-2">
          <View className="flex-row items-center justify-between">
            <Text className="text-sm font-semibold text-foreground">
              Ajouter la position en cas d'alerte
            </Text>
            <Pressable
              onPress={() => setLocationEnabled(!locationEnabled)}
              className={`w-12 h-7 rounded-full items-center justify-${
                locationEnabled ? 'end' : 'start'
              } px-1`}
              style={{
                backgroundColor: locationEnabled ? '#2DE2A6' : '#E5E7EB',
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
            Jamais en continu, juste une dernière position si l'alerte part.
          </Text>
        </View>

        {/* Danger Zone */}
        <View className="mt-6 pt-6 border-t border-border">
          <Pressable onPress={handleDeleteData}>
            <Text className="text-sm font-semibold text-danger">
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
    </ScreenContainer>
  );
}
