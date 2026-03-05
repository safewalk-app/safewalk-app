import { logger } from '@/lib/utils/logger';
import { View, Text, Pressable, Switch, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { BubbleBackground } from '@/components/ui/bubble-background';
import { GlassCard } from '@/components/ui/glass-card';
import { PopTextField } from '@/components/ui/pop-text-field';
import { SegmentedControlPill } from '@/components/ui/segmented-control-pill';
import { ScreenTransition } from '@/components/ui/screen-transition';
import { useApp } from '@/lib/context/app-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { ToastPop } from '@/components/ui/toast-pop';
import { formatPhoneInput, cleanPhoneNumber } from '@/lib/utils';
import {
  validatePhoneNumber as validatePhoneNumberService,
  getValidationFeedback,
} from '@/lib/services/phone-validation-service';
import { checkHealth } from '@/lib/services/api-client';
import { useLocationPermission } from '@/hooks/use-location-permission';
import { useProfileData } from '@/hooks/use-profile-data';
import { RateLimitErrorAlert } from '@/components/rate-limit-error-alert';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { settings, updateSettings, deleteAllData } = useApp();
  const profileData = useProfileData();
  const [firstName, setFirstName] = useState(settings.firstName);
  
  // Mon numéro de téléphone (à vérifier)
  const [myPhone, setMyPhone] = useState(settings.userPhone || '');
  const [myPhoneValid, setMyPhoneValid] = useState<boolean | null>(null);
  const [myPhoneError, setMyPhoneError] = useState<string | null>(null);
  
  // Contact d'urgence
  const [contactName, setContactName] = useState(settings.emergencyContactName);
  const [contactPhone, setContactPhone] = useState(settings.emergencyContactPhone);
  const [contactPhoneValid, setContactPhoneValid] = useState<boolean | null>(null);
  const [contactPhoneError, setContactPhoneError] = useState<string | null>(null);

  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [rateLimitError, setRateLimitError] = useState<{
    visible: boolean;
    message?: string;
  }>({ visible: false });

  const locationPermission = useLocationPermission();
  const [locationEnabled, setLocationEnabled] = useState(locationPermission.enabled);

  // Handler pour "Mon numéro"
  const handleMyPhoneChange = (text: string) => {
    const formatted = formatPhoneInput(text);
    setMyPhone(formatted);

    const cleaned = cleanPhoneNumber(formatted);
    if (cleaned.length === 0) {
      setMyPhoneValid(null);
      setMyPhoneError(null);
    } else {
      const result = validatePhoneNumberService(cleaned);
      setMyPhoneValid(result.isValid);
      setMyPhoneError(result.feedback || null);
    }
  };

  // Handler pour Contact d'urgence
  const handleContactPhoneChange = (text: string) => {
    const formatted = formatPhoneInput(text);
    setContactPhone(formatted);

    const cleaned = cleanPhoneNumber(formatted);
    if (cleaned.length === 0) {
      setContactPhoneValid(null);
      setContactPhoneError(null);
    } else {
      const result = validatePhoneNumberService(cleaned);
      setContactPhoneValid(result.isValid);
      setContactPhoneError(result.feedback || null);
    }
  };

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

  // Autosave Mon numéro
  useEffect(() => {
    const timer = setTimeout(() => {
      if (myPhone !== settings.userPhone) {
        const cleanedPhone = cleanPhoneNumber(myPhone);
        if (cleanedPhone && !validatePhoneNumberService(cleanedPhone)) {
          setMyPhoneError('Format invalide. Utilisez +33 suivi de 9 chiffres');
          return;
        }
        setMyPhoneError(null);
        updateSettings({ userPhone: cleanedPhone });
        if (cleanedPhone) {
          setToastMessage('Mon numéro sauvegardé');
          setShowToast(true);
        }
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [myPhone]);

  // Autosave Contact d'urgence
  useEffect(() => {
    const timer = setTimeout(() => {
      if (
        contactName !== settings.emergencyContactName ||
        contactPhone !== settings.emergencyContactPhone
      ) {
        const cleanedPhone = cleanPhoneNumber(contactPhone);
        if (cleanedPhone && !validatePhoneNumberService(cleanedPhone)) {
          setContactPhoneError('Format invalide. Utilisez +33 suivi de 9 chiffres');
          return;
        }
        setContactPhoneError(null);
        updateSettings({
          emergencyContactName: contactName,
          emergencyContactPhone: cleanedPhone,
        });
        if (contactName || cleanedPhone) {
          setToastMessage('Contact d\'urgence sauvegardé');
          setShowToast(true);
        }
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [contactName, contactPhone]);

  // Synchroniser locationEnabled avec le hook
  useEffect(() => {
    setLocationEnabled(locationPermission.enabled);
  }, [locationPermission.enabled]);

  // Handler pour le toggle localisation
  const handleLocationToggle = async (value: boolean) => {
    const result = await locationPermission.toggleLocation(value);

    if (result.success) {
      updateSettings({ locationEnabled: value });
      setToastMessage(value ? '✅ Localisation activée' : 'Localisation désactivée');
      setShowToast(true);
    } else if (result.needsSettings) {
      Alert.alert(
        'Permission refusée',
        "Pour activer la localisation, vous devez autoriser l'accès dans les réglages de votre téléphone.",
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Ouvrir Réglages',
            onPress: () => locationPermission.openSettings(),
          },
        ],
      );
    } else if (result.needsPermission) {
      setToastMessage('❌ Permission refusée');
      setShowToast(true);
    }
  };

  const handleDeleteData = () => {
    Alert.alert('Supprimer toutes les données ?', 'Cette action est irréversible.', [
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
    ]);
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
        <ScreenTransition delay={0} duration={350}>
          <View className="gap-1 mb-6">
            <Text className="text-4xl font-bold text-foreground">Paramètres</Text>
            <Text className="text-sm text-muted">Configure ton profil et ta sécurité</Text>
          </View>
        </ScreenTransition>

        <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
          {/* SECTION 1: PROFIL */}
          <ScreenTransition delay={100} duration={350}>
            <View className="mb-6">
              <Text className="text-xs font-bold text-muted uppercase tracking-wider mb-3">
                👤 Profil
              </Text>

              <GlassCard className="gap-3">
                <View className="flex-row items-center gap-2">
                  <MaterialIcons name="person" size={18} color="#6C63FF" />
                  <Text className="text-sm font-semibold text-foreground">Mon prénom</Text>
                </View>
                <PopTextField
                  placeholder="Ex. Ben"
                  value={firstName}
                  onChangeText={setFirstName}
                  accessibilityLabel="Champ Mon prénom"
                  accessibilityHint="Entrez votre prénom"
                />
                <Text className="text-xs text-muted">
                  Utilisé dans les alertes envoyées à ton contact.
                </Text>
              </GlassCard>
            </View>
          </ScreenTransition>

          {/* SECTION 2: MON NUMÉRO (À VÉRIFIER) */}
          <ScreenTransition delay={150} duration={350}>
            <View className="mb-6">
              <Text className="text-xs font-bold text-muted uppercase tracking-wider mb-3">
                📱 Vérification
              </Text>

              <GlassCard className="gap-3">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-2 flex-1">
                    <MaterialIcons name="phone" size={18} color="#3A86FF" />
                    <Text className="text-sm font-semibold text-foreground">Mon numéro</Text>
                  </View>
                  <View className="p-2">
                    {profileData?.phone_verified ? (
                      <View className="flex-row items-center gap-1 bg-success/10 px-2 py-1 rounded-full">
                        <MaterialIcons name="check-circle" size={16} color="#22C55E" />
                        <Text className="text-xs text-success font-semibold">Vérifié</Text>
                      </View>
                    ) : (
                      <View className="flex-row items-center gap-1 bg-warning/10 px-2 py-1 rounded-full">
                        <MaterialIcons name="schedule" size={16} color="#F59E0B" />
                        <Text className="text-xs text-warning font-semibold">À vérifier</Text>
                      </View>
                    )}
                  </View>
                </View>

                <View className="flex-row items-center gap-2">
                  <View className="flex-1">
                    <PopTextField
                      placeholder="+33 6 12 34 56 78"
                      value={myPhone}
                      onChangeText={handleMyPhoneChange}
                      keyboardType="phone-pad"
                      editable={!profileData?.phone_verified}
                      accessibilityLabel="Champ Mon numéro de téléphone"
                      accessibilityHint="Entrez votre numéro au format E.164"
                    />
                    {myPhoneError && <Text className="text-xs text-error mt-1">{myPhoneError}</Text>}
                  </View>
                  <View className="p-2">
                    {myPhoneValid === true && (
                      <MaterialIcons name="check-circle" size={20} color="#22C55E" />
                    )}
                    {myPhoneValid === false && (
                      <MaterialIcons name="cancel" size={20} color="#EF4444" />
                    )}
                    {myPhoneValid === null && (
                      <MaterialIcons name="phone" size={20} color="#9BA1A6" />
                    )}
                  </View>
                </View>

                {!profileData?.phone_verified && myPhone && (
                  <Pressable
                    onPress={() => router.push('/phone-verification')}
                    className="bg-primary/10 rounded-lg p-3"
                  >
                    <Text className="text-primary font-semibold text-center">
                      Vérifier mon numéro via OTP
                    </Text>
                  </Pressable>
                )}

                <Text className="text-xs text-muted">
                  Nécessaire pour activer les alertes de sécurité.
                </Text>
              </GlassCard>
            </View>
          </ScreenTransition>

          {/* SECTION 3: CONTACT D'URGENCE */}
          <ScreenTransition delay={200} duration={350}>
            <View className="mb-6">
              <Text className="text-xs font-bold text-muted uppercase tracking-wider mb-3">
                🆘 Contact d'urgence
              </Text>

              <GlassCard className="gap-3">
                <View className="flex-row items-center gap-2">
                  <MaterialIcons name="emergency" size={18} color="#FF4D4D" />
                  <Text className="text-sm font-semibold text-foreground">Qui prévenir ?</Text>
                </View>

                {/* Nom du contact */}
                <View>
                  <Text className="text-xs font-semibold text-muted mb-1">Nom</Text>
                  <PopTextField
                    placeholder="Ex. Sarah"
                    value={contactName}
                    onChangeText={setContactName}
                    accessibilityLabel="Champ Nom du contact d'urgence"
                    accessibilityHint="Entrez le nom du contact d'alerte"
                  />
                </View>

                {/* Numéro du contact */}
                <View>
                  <Text className="text-xs font-semibold text-muted mb-1">Numéro de téléphone</Text>
                  <View className="flex-row items-center gap-2">
                    <View className="flex-1">
                      <PopTextField
                        placeholder="+33 6 12 34 56 78"
                        value={contactPhone}
                        onChangeText={handleContactPhoneChange}
                        keyboardType="phone-pad"
                        accessibilityLabel="Champ Numéro de téléphone du contact"
                        accessibilityHint="Entrez le numéro au format E.164"
                      />
                      {contactPhoneError && (
                        <Text className="text-xs text-error mt-1">{contactPhoneError}</Text>
                      )}
                    </View>
                    <View className="p-2">
                      {contactPhoneValid === true && (
                        <MaterialIcons name="check-circle" size={20} color="#22C55E" />
                      )}
                      {contactPhoneValid === false && (
                        <MaterialIcons name="cancel" size={20} color="#EF4444" />
                      )}
                      {contactPhoneValid === null && (
                        <MaterialIcons name="phone" size={20} color="#9BA1A6" />
                      )}
                    </View>
                  </View>
                </View>

                <Text className="text-xs text-muted">
                  Cette personne recevra une alerte SMS si tu ne confirmes pas ton retour.
                </Text>
              </GlassCard>
            </View>
          </ScreenTransition>

          {/* SECTION 4: LOCALISATION */}
          <ScreenTransition delay={250} duration={350}>
            <View className="mb-6">
              <Text className="text-xs font-bold text-muted uppercase tracking-wider mb-3">
                📍 Localisation
              </Text>

              <GlassCard className="gap-3">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-2 flex-1">
                    <MaterialIcons name="location-on" size={18} color="#3A86FF" />
                    <Text className="text-sm font-semibold text-foreground">
                      Partager en cas d'alerte
                    </Text>
                  </View>
                  <Switch
                    value={locationEnabled}
                    onValueChange={handleLocationToggle}
                    trackColor={{ false: '#E5E7EB', true: '#2DE2A6' }}
                    thumbColor="#FFFFFF"
                    accessible={true}
                    accessibilityLabel="Partager ma position"
                    accessibilityHint="Activez pour partager votre localisation en cas d'alerte"
                    accessibilityRole="switch"
                    accessibilityState={{ checked: locationEnabled }}
                  />
                </View>
                <Text className="text-xs text-muted">
                  Ta position n'est envoyée qu'en cas d'alerte à ton contact.
                </Text>
              </GlassCard>
            </View>
          </ScreenTransition>

          {/* SECTION 5: ACTIONS */}
          <ScreenTransition delay={300} duration={350}>
            <View className="mb-6">
              <Text className="text-xs font-bold text-muted uppercase tracking-wider mb-3">
                ⚙️ Actions
              </Text>

              {/* À propos */}
              <Pressable
                onPress={() => router.push('/about')}
                className="mb-3"
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="À propos"
              >
                <GlassCard className="gap-2 flex-row items-center justify-between">
                  <View className="flex-row items-center gap-2">
                    <MaterialIcons name="info" size={18} color="#6C63FF" />
                    <Text className="text-sm font-semibold text-foreground">À propos</Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={20} color="#9BA1A6" />
                </GlassCard>
              </Pressable>

              {/* Supprimer les données */}
              <Pressable
                onPress={handleDeleteData}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Supprimer toutes les données"
              >
                <GlassCard className="gap-2 flex-row items-center justify-between bg-error/5">
                  <View className="flex-row items-center gap-2">
                    <MaterialIcons name="delete" size={18} color="#EF4444" />
                    <Text className="text-sm font-semibold text-error">Supprimer les données</Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={20} color="#EF4444" />
                </GlassCard>
              </Pressable>
            </View>
          </ScreenTransition>
        </ScrollView>

        {/* Rate Limit Error Alert */}
        <RateLimitErrorAlert
          visible={rateLimitError.visible}
          message={rateLimitError.message}
          onDismiss={() => setRateLimitError({ visible: false })}
        />

        {/* Toast */}
        <ToastPop visible={showToast} message={toastMessage} onDismiss={() => setShowToast(false)} />
      </View>
    </View>
  );
}
