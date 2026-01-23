import { View, Text, ScrollView, Alert, Pressable } from 'react-native';
import { BubbleBackground } from '@/components/ui/bubble-background';
import { GlassCard } from '@/components/ui/glass-card';
import { BigSuccessButton } from '@/components/ui/big-success-button';
import { CushionPillButton } from '@/components/ui/cushion-pill-button';
import { TimerAnimation } from '@/components/ui/timer-animation';
import { ScreenTransition } from '@/components/ui/screen-transition';
import { CheckInModal } from '@/components/ui/check-in-modal';
import { useApp } from '@/lib/context/app-context';
import { useCheckInNotifications } from '@/hooks/use-check-in-notifications';
import { useRealTimeLocation } from '@/hooks/use-real-time-location';
import { useNotifications } from '@/hooks/use-notifications';
import { useSOS } from '@/hooks/use-sos';
import { SOSButton } from '@/components/ui/sos-button';
import { useRouter } from 'expo-router';
import { useEffect, useState, useRef } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ActiveSessionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { currentSession, endSession, cancelSession, addTimeToSession, confirmCheckIn, settings, triggerAlert } = useApp();
  const { confirmCheckIn: confirmCheckInNotif } = useCheckInNotifications();
  const { location } = useRealTimeLocation({ enabled: settings.locationEnabled });
  const { sendNotification, scheduleNotification, cancelNotification } = useNotifications();
  const { triggerSOS, isLoading: sosLoading } = useSOS({
    sessionId: currentSession?.id || '',
    userId: 1,
    location: location || undefined,
  });
  const [remainingTime, setRemainingTime] = useState<string>('00:00:00');
  const [sessionState, setSessionState] = useState<'active' | 'grace' | 'overdue'>('active');
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const timerNotificationRef = useRef<string | null>(null);
  const alertNotificationRef = useRef<string | null>(null);
  const alertSMSRef = useRef<string | null>(null); // Track si SMS d'alerte envoyé
  const followUpSMSRef = useRef<string | null>(null); // Track si SMS de relance envoyé

  useEffect(() => {
    // Ne rediriger que si on est sur la page active-session ET qu'il n'y a pas de session
    // Éviter les redirections involontaires lors de la navigation
    if (!currentSession && router.canGoBack()) {
      // Si on peut revenir en arrière, revenir au lieu de rediriger
      router.back();
      return;
    }
    if (!currentSession) {
      // Sinon rediriger à l'accueil
      router.push('/');
      return;
    }

    const interval = setInterval(() => {
      const now = Date.now();
      const limitTime = currentSession.limitTime;
      const deadline = currentSession.deadline;
      
      // Calculer le temps restant jusqu'à limitTime (heure de retour prévue)
      const remainingUntilLimit = limitTime - now;
      
      // Déterminer l'état de la session
      if (remainingUntilLimit > 0) {
        // Avant l'heure limite : afficher le temps jusqu'à limitTime
        setSessionState('active');
        const hours = Math.floor(remainingUntilLimit / (1000 * 60 * 60));
        const minutes = Math.floor((remainingUntilLimit % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((remainingUntilLimit % (1000 * 60)) / 1000);
        setRemainingTime(
          `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
        );
        // Envoyer notification 5 minutes avant l'heure limite
        const fiveMinBefore = limitTime - (5 * 60 * 1000);
        if (now >= fiveMinBefore && now < fiveMinBefore + 1000 && !timerNotificationRef.current) {
          timerNotificationRef.current = 'scheduled';
          sendNotification({
            title: '⚠️ Petit check',
            body: 'Tout va bien ? 😊 Confirme ton retour dans 5 minutes.',
            data: { type: 'timer_warning' },
          });
        }
      } else if (now < deadline) {
        // Entre limitTime et deadline : période de grâce
        setSessionState('grace');
        const remainingUntilDeadline = deadline - now;
        const hours = Math.floor(remainingUntilDeadline / (1000 * 60 * 60));
        const minutes = Math.floor((remainingUntilDeadline % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((remainingUntilDeadline % (1000 * 60)) / 1000);
        setRemainingTime(
          `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
        );
      } else {
        // Après deadline : en retard
        setSessionState('overdue');
        const overdueTime = now - deadline;
        const hours = Math.floor(overdueTime / (1000 * 60 * 60));
        const minutes = Math.floor((overdueTime % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((overdueTime % (1000 * 60)) / 1000);
        setRemainingTime(
          `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
        );
        
        // Envoyer notification d'alerte ET SMS dès que la deadline est dépassée
        if (!alertNotificationRef.current) {
          alertNotificationRef.current = 'triggered';
          sendNotification({
            title: '🚨 Oups… on a prévenu ton contact',
            body: '😬 Confirme si tout va bien.',
            data: { type: 'alert_triggered' },
          });
          
          // Envoyer les SMS d'alerte (même sans localisation)
          if (!alertSMSRef.current) {
            alertSMSRef.current = 'sent';
            triggerAlert(location || undefined);
          }
        }
        
        // Envoyer SMS de relance 10 min après la deadline si pas de confirmation
        const tenMinAfterDeadline = deadline + (10 * 60 * 1000);
        if (now >= tenMinAfterDeadline && now < tenMinAfterDeadline + 1000 && !followUpSMSRef.current && !currentSession.checkInConfirmed) {
          followUpSMSRef.current = 'sent';
          console.log('📤 Envoi SMS de relance...');
          // Importer et appeler sendFollowUpAlertSMS
          import('@/lib/services/follow-up-sms-client').then(({ sendFollowUpAlertSMS }) => {
            const contacts = [];
            if (settings.emergencyContactPhone) {
              contacts.push({
                name: settings.emergencyContactName,
                phone: settings.emergencyContactPhone,
              });
            }
            if (settings.emergencyContact2Phone) {
              contacts.push({
                name: settings.emergencyContact2Name || '',
                phone: settings.emergencyContact2Phone,
              });
            }
            if (contacts.length > 0) {
              sendFollowUpAlertSMS({
                contacts,
                userName: settings.firstName,
                location: location || undefined,
              }).catch((error) => {
                console.error('Erreur relance SMS:', error);
              });
            }
          });
        }
      }
    }, 1000);

    return () => {
      clearInterval(interval);
      if (timerNotificationRef.current) timerNotificationRef.current = null;
      if (alertNotificationRef.current) alertNotificationRef.current = null;
    };
  }, [currentSession, router, sendNotification, triggerAlert, location]);

  const handleCompleteSession = async () => {
    // Capturer la position GPS si activée
    if (settings.locationEnabled && location) {
      console.log('Position capturée:', location);
    }
    await endSession();
    router.push('/');
  };

  const handleExtendSession = async () => {
    await addTimeToSession(15);
  };

  const handleConfirmCheckIn = async () => {
    await confirmCheckIn();
    setShowCheckInModal(false);
  };

  const handleCheckInAddTime = async () => {
    await addTimeToSession(15);
    setShowCheckInModal(false);
  };

  const handleCheckInConfirm = async () => {
    // Capturer la position GPS si activée
    if (settings.locationEnabled && location) {
      console.log('Position capturée au check-in:', location);
    }
    setShowCheckInModal(false);
    await confirmCheckInNotif();
  };

  const handleCancelSession = () => {
    Alert.alert(
      'Annuler la sortie',
      'Êtes-vous sûr de vouloir annuler cette sortie ?',
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Oui',
          style: 'destructive',
          onPress: async () => {
            // Capturer la position GPS si activée
            if (settings.locationEnabled && location) {
              console.log('Position capturée:', location);
            }
            await cancelSession();
            router.push('/');
          },
        },
      ]
    );
  };

  if (!currentSession) {
    return null;
  }

  // Formater les heures
  const limitTimeStr = new Date(currentSession.limitTime).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const deadlineStr = new Date(currentSession.deadline).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  // Déterminer les couleurs en fonction de l'état
  const timerColor = sessionState === 'active' ? '#6C63FF' : sessionState === 'grace' ? '#F59E0B' : '#FF4D4D';
  const timerLabel = sessionState === 'active' ? 'Temps avant retour' : sessionState === 'grace' ? 'Période de grâce' : 'En retard depuis';

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
        {/* Check-In Modal */}
        <CheckInModal
          visible={showCheckInModal}
          onConfirmCheckIn={handleConfirmCheckIn}
          onAddTime={handleCheckInAddTime}
          onClose={() => setShowCheckInModal(false)}
        />
        
        {/* Header */}
        <ScreenTransition delay={0} duration={350}>
          <View className="gap-1 mb-3">
            <Text className="text-4xl font-bold text-foreground">
              Sortie en cours
            </Text>
          </View>
        </ScreenTransition>

        {/* Timer Card */}
        <ScreenTransition delay={100} duration={350}>
          <GlassCard
            className="gap-2 mb-4"
            style={{
              backgroundColor: sessionState === 'active' ? 'rgba(108, 99, 255, 0.08)' : sessionState === 'grace' ? 'rgba(245, 158, 11, 0.08)' : 'rgba(255, 77, 77, 0.08)',
              paddingHorizontal: 16,
              paddingVertical: 14,
            }}
          >
            <Text className="text-sm font-semibold text-muted">
              {timerLabel}
            </Text>
            <Text
              className="text-6xl font-bold text-center"
              style={{
                color: timerColor,
                lineHeight: 72,
              }}
            >
              {remainingTime}
            </Text>
            
            {/* Informations détaillées */}
            <View className="gap-2 mt-3 pt-3 border-t" style={{ borderTopColor: timerColor + '20' }}>
              <View className="flex-row justify-between">
                <Text className="text-sm text-muted">Heure limite (retour prévu) :</Text>
                <Text className="text-sm font-semibold text-foreground">
                  {limitTimeStr}
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-sm text-muted">Heure d'alerte (+ tolérance) :</Text>
                <Text className="text-sm font-semibold text-foreground">
                  {deadlineStr}
                </Text>
              </View>

            </View>

            {/* Légende des états */}
            {sessionState === 'grace' && (
              <View className="mt-3 pt-3 border-t" style={{ borderTopColor: timerColor + '20' }}>
                <Text className="text-xs text-warning font-semibold">
                  ⚠️ Vous êtes en retard par rapport à votre heure limite. L'alerte sera déclenchée à {deadlineStr}.
                </Text>
              </View>
            )}

            {sessionState === 'overdue' && (
              <View className="mt-3 pt-3 border-t" style={{ borderTopColor: timerColor + '20' }}>
                <Text className="text-xs text-error font-semibold">
                  🚨 Alerte déclenchée ! Vos contacts d'urgence ont été notifiés.
                </Text>
              </View>
            )}
          </GlassCard>
        </ScreenTransition>

        {/* Je suis rentré Button */}
        <ScreenTransition delay={200} duration={350}>
          <BigSuccessButton
            label="✅ Je suis rentré"
            onPress={handleCompleteSession}
          />
        </ScreenTransition>

        {/* + 15 min Button */}
        <ScreenTransition delay={300} duration={350}>
          <View className="mt-3 mb-3">
            <CushionPillButton
              label="+ 15 min"
              onPress={handleExtendSession}
              variant="secondary"
              size="lg"
            />
          </View>
        </ScreenTransition>

        {/* SOS Button */}
        <ScreenTransition delay={400} duration={350}>
          <View className="my-4">
            <SOSButton
              onPress={triggerSOS}
              isLoading={sosLoading}
              className="w-full"
            />
          </View>
        </ScreenTransition>

        {/* Annuler la sortie */}
        <ScreenTransition delay={500} duration={350}>
          <Pressable onPress={handleCancelSession} className="py-4">
            <Text className="text-center text-base font-bold text-error">
              Annuler la sortie
            </Text>
          </Pressable>
        </ScreenTransition>
      </ScrollView>
    </View>
  );
}
