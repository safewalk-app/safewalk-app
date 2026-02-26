import { logger } from "@/lib/utils/logger";
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
import { validatePhoneNumber as validatePhoneNumberService, getValidationFeedback } from '@/lib/services/phone-validation-service';
import { checkHealth } from '@/lib/services/api-client';
import { sendEmergencySMS } from '@/lib/services/sms-service';
import { useLocationPermission } from '@/hooks/use-location-permission';
import * as tripService from '@/lib/services/trip-service';
import { useProfileData } from '@/hooks/use-profile-data';
import { RateLimitErrorAlert } from '@/components/rate-limit-error-alert';
import { useCooldown } from '@/lib/hooks/use-cooldown';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { settings, updateSettings, deleteAllData } = useApp();
  const profileData = useProfileData();
  const [firstName, setFirstName] = useState(settings.firstName);
  const [contactName, setContactName] = useState(settings.emergencyContactName);
  const [contactPhone, setContactPhone] = useState(settings.emergencyContactPhone);

  // Handlers pour le masque de saisie
  const handlePhoneChange = (text: string) => {
    const formatted = formatPhoneInput(text);
    setContactPhone(formatted);
    
    // Validation en temps réel avec feedback détaillé
    const cleaned = cleanPhoneNumber(formatted);
    if (cleaned.length === 0) {
      setIsPhone1Valid(null); // Pas d'icône si vide
      setPhoneError(null);
    } else {
      const result = validatePhoneNumberService(cleaned);
      setIsPhone1Valid(result.isValid);
      setPhoneError(result.feedback || null);
    }
  };



  const locationPermission = useLocationPermission();
  const [locationEnabled, setLocationEnabled] = useState(locationPermission.enabled);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [isPhone1Valid, setIsPhone1Valid] = useState<boolean | null>(null);
  const [isSendingTestSms, setIsSendingTestSms] = useState(false);
  const [rateLimitError, setRateLimitError] = useState<{
    visible: boolean;
    message?: string;
  }>({ visible: false });

  // Cooldown de 5 secondes entre les SMS de test
  const { trigger: triggerTestSms, isOnCooldown, remainingTime } = useCooldown({
    duration: 5000,
  });

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

  // Autosave contact 1 avec validation stricte E.164
  useEffect(() => {
    const timer = setTimeout(() => {
      if (
        contactName !== settings.emergencyContactName ||
        contactPhone !== settings.emergencyContactPhone
      ) {
        // Nettoyer et valider le numéro si non vide
        const cleanedPhone = cleanPhoneNumber(contactPhone);
        if (cleanedPhone && !validatePhoneNumber(cleanedPhone)) {
          setPhoneError('Format invalide. Utilisez +33 suivi de 9 chiffres (ex: +33612345678)');
          return;
        }
        setPhoneError(null);
        updateSettings({
          emergencyContactName: contactName,
          emergencyContactPhone: cleanedPhone,
        });
        setToastMessage('Contact 1 sauvegardé');
        setShowToast(true);
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
      // Succès
      updateSettings({ locationEnabled: value });
      setToastMessage(
        value
          ? '✅ Localisation activée'
          : 'Localisation désactivée'
      );
      setShowToast(true);
    } else if (result.needsSettings) {
      // Permission refusée => afficher message + bouton Settings
      Alert.alert(
        'Permission refusée',
        'Pour activer la localisation, vous devez autoriser l\'accès dans les réglages de votre téléphone.',
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Ouvrir Réglages',
            onPress: () => locationPermission.openSettings(),
          },
        ]
      );
    } else if (result.needsPermission) {
      // Permission refusée après demande
      setToastMessage('❌ Permission refusée');
      setShowToast(true);
    }
  };



  const handleTestSms = async () => {
    await triggerTestSms(async () => {
      // CRITIQUE: Vérifier que le contact d'urgence est configuré
      if (!contactPhone || !contactName) {
        Alert.alert(
          'Contact d\'urgence manquant',
          'Veuillez d\'abord configurer un contact d\'urgence pour tester les SMS.'
        );
        return;
      }

      // CRITIQUE: Valider le format du numéro d'urgence
      const cleanedPhone = cleanPhoneNumber(contactPhone);
      if (!validatePhoneNumber(cleanedPhone)) {
        Alert.alert(
          'Numéro invalide',
          'Le numéro d\'urgence n\'est pas au bon format. Utilisez +33 suivi de 9 chiffres.'
        );
        return;
      }

      // Check phone_verified
      if (!profileData?.phone_verified) {
      Alert.alert('Téléphone non vérifié', 'Veuillez d\'abord vérifier votre numéro de téléphone.');
      return;
    }

    // Check credits
    if (profileData?.free_test_sms_remaining === 0 && !profileData?.subscription_active) {
      Alert.alert('Pas de crédits', 'Vous n\'avez plus de SMS de test disponibles.');
      return;
    }

    setIsSendingTestSms(true);
    const result = await tripService.sendTestSms();
    setIsSendingTestSms(false);

    if (result.success) {
      setToastMessage('✅ SMS de test envoyé !');
      setShowToast(true);
    } else {
      // Handle specific error codes
      const errorCode = result.errorCode;
      if (errorCode === 'no_credits') {
        Alert.alert('Crédits insuffisants', 'Vous n\'avez plus de SMS de test disponibles.');
      } else if (errorCode === 'quota_reached') {
        Alert.alert('Limite atteinte', 'Vous avez atteint la limite d\'SMS pour aujourd\'hui.');
      } else if (errorCode === 'twilio_failed') {
        Alert.alert('Erreur d\'envoi', 'Impossible d\'envoyer le SMS. Réessaiera automatiquement.');
      } else {
        Alert.alert('Erreur', result.error || 'Impossible d\'envoyer le SMS de test');
      }
    }
    });
  };

  const handleDeleteData = () => {
    Alert.alert(
      'Supprimer toutes les données ?',
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
        <ScreenTransition delay={0} duration={350}>
          <View className="gap-1 mb-4">
            <Text className="text-4xl font-bold text-foreground">
              Paramètres
            </Text>
          </View>
        </ScreenTransition>

        {/* SECTION 1: PROFIL */}
        <ScreenTransition delay={100} duration={350}>
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
        </ScreenTransition>

        {/* SECTION 2: SÉCURITÉ */}
        <ScreenTransition delay={200} duration={350}>
          <View className="mb-4">
            <Text className="text-xs font-bold text-muted uppercase tracking-wider mb-2">
              Sécurité
            </Text>

            {/* Card "Contact d'urgence 1" */}
            <View className="mb-3">
              <GlassCard className="gap-2">
                <View className="flex-row items-center gap-2">
                  <MaterialIcons name="emergency" size={16} color="#FF4D4D" />
                  <Text className="text-sm font-semibold text-foreground">
                    Contact 1
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
                      onChangeText={handlePhoneChange}
                      keyboardType="phone-pad"
                    />
                    {phoneError && (
                      <Text className="text-xs text-error mt-1">
                        {phoneError}
                      </Text>
                    )}
                  </View>
                  <View className="p-2">
                    {isPhone1Valid === true && (
                      <MaterialIcons name="check-circle" size={20} color="#22C55E" />
                    )}
                    {isPhone1Valid === false && (
                      <MaterialIcons name="cancel" size={20} color="#EF4444" />
                    )}
                    {isPhone1Valid === null && (
                      <MaterialIcons name="phone" size={20} color="#9BA1A6" />
                    )}
                  </View>
                </View>
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
                    onValueChange={handleLocationToggle}
                    trackColor={{ false: '#E5E7EB', true: '#2DE2A6' }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              </GlassCard>
            </View>
          </View>
        </ScreenTransition>

        {/* Rate Limit Error Alert */}
        <RateLimitErrorAlert
          visible={rateLimitError.visible}
          message={rateLimitError.message}
          onDismiss={() => setRateLimitError({ visible: false })}
        />

        {/* Bouton "Test SMS" */}
        <ScreenTransition delay={250} duration={350}>
          <Pressable 
            onPress={handleTestSms}
            disabled={isSendingTestSms || isOnCooldown}
            className="mb-4"
          >
            <GlassCard className={`flex-row items-center justify-center gap-2 py-4 ${isOnCooldown ? 'opacity-50' : ''}`}>
              {isSendingTestSms ? (
                <ActivityIndicator size="small" color="#0a7ea4" />
              ) : (
                <MaterialIcons name="message" size={20} color="#0a7ea4" />
              )}
              <Text className="text-base font-semibold text-foreground">
                {isSendingTestSms
                  ? 'Envoi en cours...'
                  : isOnCooldown
                    ? `Attendre ${Math.ceil(remainingTime / 1000)}s`
                    : 'Tester SMS'}
              </Text>
            </GlassCard>
          </Pressable>
        </ScreenTransition>

        {/* Bouton "À propos" */}
        <ScreenTransition delay={300} duration={350}>
          <Pressable 
            onPress={() => router.push('/about')}
            className="mb-4"
          >
            <GlassCard className="flex-row items-center justify-center gap-2 py-4">
              <MaterialIcons name="info" size={20} color="#0a7ea4" />
              <Text className="text-base font-semibold text-foreground">
                À propos
              </Text>
            </GlassCard>
          </Pressable>
        </ScreenTransition>

        {/* Bouton "Supprimer mes données" */}
        <ScreenTransition delay={350} duration={350}>
          <Pressable onPress={handleDeleteData}>
            <Text className="text-center text-base font-bold text-error">
              Supprimer mes données
            </Text>
          </Pressable>
        </ScreenTransition>
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
