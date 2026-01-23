import { View, Text, Pressable, Switch, Alert, ScrollView, ActivityIndicator } from 'react-native';
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
import { validatePhoneNumber, formatPhoneInput, cleanPhoneNumber } from '@/lib/utils';
import { checkHealth } from '@/lib/services/api-client';
import { sendEmergencySMS } from '@/lib/services/sms-service';
import { useLocationPermission } from '@/hooks/use-location-permission';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { settings, updateSettings, deleteAllData } = useApp();
  const [firstName, setFirstName] = useState(settings.firstName);
  const [contactName, setContactName] = useState(settings.emergencyContactName);
  const [contactPhone, setContactPhone] = useState(settings.emergencyContactPhone);
  const [contact2Name, setContact2Name] = useState(settings.emergencyContact2Name || '');
  const [contact2Phone, setContact2Phone] = useState(settings.emergencyContact2Phone || '');

  // Handlers pour le masque de saisie
  const handlePhoneChange = (text: string) => {
    const formatted = formatPhoneInput(text);
    setContactPhone(formatted);
    
    // Validation en temps réel
    const cleaned = cleanPhoneNumber(formatted);
    if (cleaned.length === 0) {
      setIsPhone1Valid(null); // Pas d'icône si vide
    } else {
      setIsPhone1Valid(validatePhoneNumber(cleaned));
    }
  };

  const handlePhone2Change = (text: string) => {
    const formatted = formatPhoneInput(text);
    setContact2Phone(formatted);
    
    // Validation en temps réel
    const cleaned = cleanPhoneNumber(formatted);
    if (cleaned.length === 0) {
      setIsPhone2Valid(null); // Pas d'icône si vide
    } else {
      setIsPhone2Valid(validatePhoneNumber(cleaned));
    }
  };

  const locationPermission = useLocationPermission();
  const [locationEnabled, setLocationEnabled] = useState(locationPermission.enabled);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [phone2Error, setPhone2Error] = useState<string | null>(null);
  const [isPhone1Valid, setIsPhone1Valid] = useState<boolean | null>(null);
  const [isPhone2Valid, setIsPhone2Valid] = useState<boolean | null>(null);
  const [isSendingTestSms, setIsSendingTestSms] = useState(false);

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

  // Autosave contact 1 avec validation
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

  // Autosave contact 2 avec validation
  useEffect(() => {
    const timer = setTimeout(() => {
      if (
        contact2Name !== (settings.emergencyContact2Name || '') ||
        contact2Phone !== (settings.emergencyContact2Phone || '')
      ) {
        // Nettoyer et valider le numéro si non vide
        const cleanedPhone2 = cleanPhoneNumber(contact2Phone);
        if (cleanedPhone2 && !validatePhoneNumber(cleanedPhone2)) {
          setPhone2Error('Format invalide. Utilisez +33 suivi de 9 chiffres (ex: +33612345678)');
          return;
        }
        setPhone2Error(null);
        updateSettings({
          emergencyContact2Name: contact2Name,
          emergencyContact2Phone: cleanedPhone2,
        });
        setToastMessage('Contact 2 sauvegardé');
        setShowToast(true);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [contact2Name, contact2Phone]);



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
    if (!contactPhone) {
      setToastMessage('❌ Aucun numéro de contact');
      setShowToast(true);
      return;
    }

    const cleanedPhone = cleanPhoneNumber(contactPhone);
    if (!validatePhoneNumber(cleanedPhone)) {
      setToastMessage('❌ Numéro invalide');
      setShowToast(true);
      return;
    }

    setIsSendingTestSms(true);

    try {
      // Vérifier la santé de l'API d'abord
      console.log('🔍 Vérification API SMS...');
      const health = await checkHealth();
      
      if (!health.ok) {
        console.error('❌ API SMS non accessible');
        setToastMessage('❌ API non accessible');
        setShowToast(true);
        setIsSendingTestSms(false);
        return;
      }

      if (!health.twilioConfigured) {
        console.error('❌ Twilio non configuré');
        setToastMessage('❌ Twilio non configuré');
        setShowToast(true);
        setIsSendingTestSms(false);
        return;
      }

      console.log('✅ API SMS OK, envoi du SMS de test...');

      // Envoyer le SMS de test via sendEmergencySMS
      const result = await sendEmergencySMS({
        reason: 'test',
        contactName: contactName || 'Contact',
        contactPhone: cleanedPhone,
        firstName: firstName,
      });

      if (result.ok) {
        console.log('✅ SMS de test envoyé avec succès:', result.sid);
        setToastMessage(`✅ SMS envoyé à ${contactName || contactPhone}`);
      } else {
        console.error('❌ Échec envoi SMS:', result.error);
        setToastMessage(`❌ Échec: ${result.error}`);
      }
    } catch (error: any) {
      console.error('❌ Erreur test SMS:', error);
      setToastMessage(`❌ Erreur: ${error.message}`);
    } finally {
      setIsSendingTestSms(false);
      setShowToast(true);
    }
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

            {/* Card "Contact d'urgence 2" */}
            <View className="mb-3">
              <GlassCard className="gap-2">
                <View className="flex-row items-center gap-2">
                  <MaterialIcons name="person-add" size={16} color="#3A86FF" />
                  <Text className="text-sm font-semibold text-foreground">
                    Contact 2 (optionnel)
                  </Text>
                </View>
                
                <PopTextField
                  placeholder="Nom"
                  value={contact2Name}
                  onChangeText={setContact2Name}
                />

                <View className="flex-row items-center gap-2">
                  <View className="flex-1">
                    <PopTextField
                      placeholder="+33 6 12 34 56 78"
                      value={contact2Phone}
                      onChangeText={handlePhone2Change}
                      keyboardType="phone-pad"
                    />
                    {phone2Error && (
                      <Text className="text-xs text-error mt-1">
                        {phone2Error}
                      </Text>
                    )}
                  </View>
                  <View className="p-2">
                    {isPhone2Valid === true && (
                      <MaterialIcons name="check-circle" size={20} color="#22C55E" />
                    )}
                    {isPhone2Valid === false && (
                      <MaterialIcons name="cancel" size={20} color="#EF4444" />
                    )}
                    {isPhone2Valid === null && (
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

        {/* Bouton "Test SMS" */}
        <ScreenTransition delay={250} duration={350}>
          <Pressable 
            onPress={handleTestSms}
            disabled={isSendingTestSms || !contactPhone}
            className="mb-4"
          >
            <GlassCard className="flex-row items-center justify-center gap-2 py-4">
              {isSendingTestSms ? (
                <ActivityIndicator size="small" color="#3A86FF" />
              ) : (
                <MaterialIcons name="send" size={20} color="#3A86FF" />
              )}
              <Text className="text-base font-semibold text-foreground">
                {isSendingTestSms ? 'Envoi en cours...' : 'Test SMS'}
              </Text>
            </GlassCard>
          </Pressable>
        </ScreenTransition>

        {/* Bouton "Supprimer mes données" */}
        <ScreenTransition delay={300} duration={350}>
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
