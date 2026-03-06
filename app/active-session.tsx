import { logger } from '@/lib/utils/logger';
import { View, Text, ScrollView, Alert, Pressable } from 'react-native';
import { BubbleBackground } from '@/components/ui/bubble-background';
import { GlassCard } from '@/components/ui/glass-card';
import { BigSuccessButton } from '@/components/ui/big-success-button';
import { CushionPillButton } from '@/components/ui/cushion-pill-button';
import { TimerAnimation } from '@/components/ui/timer-animation';
import { ScreenTransition } from '@/components/ui/screen-transition';
import { CheckInModal } from '@/components/ui/check-in-modal';
import {
  BackgroundWarningModal,
  shouldShowBackgroundWarning,
} from '@/components/background-warning-modal';
import { useBatteryWarning, BatteryWarningBanner } from '@/components/battery-warning';
import { GPSStatusIndicator } from '@/components/ui/gps-status-indicator';
import { FeedbackAnimation } from '@/components/ui/feedback-animation';
import { useApp } from '@/lib/context/app-context';
import { useCheckInNotifications } from '@/hooks/use-check-in-notifications';
import { useRealTimeLocation } from '@/hooks/use-real-time-location';
import { useLocationPermission } from '@/hooks/use-location-permission';
import { useNotifications } from '@/hooks/use-notifications';
import { useSOS } from '@/hooks/use-sos';
import { useLoadingWrapper } from '@/hooks/use-loading-indicator';
import { SOSButton } from '@/components/ui/sos-button';
import { useRouter } from 'expo-router';
import { useEffect, useState, useRef } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { useKeepAwake } from 'expo-keep-awake';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { getNetworkErrorMessage } from '@/lib/utils/network-checker';
import { useLocationTracking } from '@/hooks/use-location-tracking';
import { useDeadlineTimer } from '@/hooks/use-deadline-timer';
import { LongPressGestureHandler } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import * as tripService from '@/lib/services/trip-service';
import { runSafetyGuard, buildGuardContext } from '@/lib/core/safety-guard';
import { useProfileData } from '@/hooks/use-profile-data';

export default function ActiveSessionScreen() {
  // Empêcher l'écran de s'éteindre pendant la session
  useKeepAwake();

  // Wrappers pour afficher les indicateurs de chargement
  const withCompleteLoading = useLoadingWrapper({
    name: 'Fin de la sortie',
    type: 'service',
    minDuration: 300,
  });

  const withExtendLoading = useLoadingWrapper({
    name: 'Extension de la sortie',
    type: 'service',
    minDuration: 300,
  });

  // Vérifier l'état de la batterie
  const { batteryLevel, isLowBattery, isCriticalBattery } = useBatteryWarning();

  // Détecter l'état de la connectivité réseau
  const networkStatus = useNetworkStatus();

  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    currentSession,
    endSession,
    cancelSession,
    addTimeToSession,
    confirmCheckIn,
    settings,
    triggerAlert,
  } = useApp();
  const { confirmCheckIn: confirmCheckInNotif } = useCheckInNotifications();
  const { location } = useRealTimeLocation({ enabled: settings.locationEnabled });
  const locationPermission = useLocationPermission();
  const profileData = useProfileData();
  const { sendNotification, scheduleNotification, cancelNotification, cancelAllNotifications } =
    useNotifications();
  const { triggerSOS, isLoading: sosLoading } = useSOS({
    sessionId: currentSession?.id || '',
    location: location || undefined,
    onSuccess: (result) => {
      logger.debug('✅ SOS envoyé avec succès:', result);
      // Afficher une notification de succès
      sendNotification({
        title: '✅ SOS envoyé',
        body: `Alerte envoyée à ${result.smsResults?.filter((r) => r.status === 'sent').length} contact(s). Tu es en sécurité ?`,
        data: { type: 'sos_success' },
      });
    },
    onError: (error) => {
      logger.error('❌ Erreur SOS:', error);
      // Afficher une notification d'erreur
      sendNotification({
        title: '❌ Erreur SOS',
        body: error.message || "Échec de l'envoi de l'alerte SOS",
        data: { type: 'sos_error' },
      });
    },
  });

  // Tracker la position GPS automatiquement
  const locationTracking = useLocationTracking({
    tripId: currentSession?.id || '',
    enabled: settings.locationEnabled && !!currentSession,
    intervalMs: 45000,
    onError: (error) => {
      logger.error('Location tracking error:', error);
    },
  });

  // Hook pour afficher le countdown deadline en temps réel
  const deadlineTimer = useDeadlineTimer(
    currentSession?.deadline ? new Date(currentSession.deadline) : null,
    () => {
      // Callback quand deadline est atteinte
      logger.debug('Deadline atteinte');
    },
    () => {
      // Callback quand alerte imminente (< 5 minutes)
      logger.debug('Alerte imminente: < 5 minutes avant deadline');
      // Optionnel: envoyer une notification supplémentaire
      sendNotification({
        title: '⚠️ Attention',
        body: 'Moins de 5 minutes avant ton retour prévu!',
        data: { type: 'deadline_alert_imminent' },
      });
    },
  );

  const [remainingTime, setRemainingTime] = useState<string>('00:00:00');
  const [sessionState, setSessionState] = useState<'active' | 'grace' | 'overdue'>('active');
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [confirmReturnState, setConfirmReturnState] = useState<
    'idle' | 'loading' | 'success' | 'error'
  >('idle');
  const [extendState, setExtendState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [cancelState, setCancelState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const timerNotificationRef = useRef<string | null>(null);
  const alertNotificationRef = useRef<string | null>(null);
  const alertSMSRef = useRef<string | null>(null); // Track si SMS d'alerte envoyé
  const followUpSMSRef = useRef<string | null>(null); // Track si SMS de relance envoyé
  const locationRef = useRef(location); // Ref pour accéder à la dernière valeur de location

  // Afficher le modal d'avertissement au démarrage
  useEffect(() => {
    const checkWarning = async () => {
      const shouldShow = await shouldShowBackgroundWarning();
      if (shouldShow) {
        setShowWarningModal(true);
      }
    };
    checkWarning();
  }, []);

  // Mettre à jour la ref quand location change (sans redéclencher le timer)
  useEffect(() => {
    locationRef.current = location;
  }, [location]);

  // Écouter les réponses aux notifications (actions)
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(async (response) => {
      const actionId = response.actionIdentifier;
      logger.debug('👆 Action notification:', actionId);

      if (actionId === 'confirm_safe') {
        // L'utilisateur a cliqué sur "Je suis rentré" dans la notification
        logger.debug('✅ Confirmation depuis notification');
        await handleCompleteSession();
      } else if (actionId === 'extend_session') {
        // L'utilisateur a cliqué sur "+15 min" dans la notification
        logger.debug('⏰ Extension depuis notification');
        await handleExtendSession();
      } else if (actionId === 'trigger_sos') {
        // L'utilisateur a cliqué sur "SOS" dans la notification
        logger.debug('🚨 SOS depuis notification');
        await triggerSOS();
      }
    });

    return () => subscription.remove();
  }, [currentSession, triggerSOS, endSession, settings, location, addTimeToSession]);

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
          `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`,
        );
        // Programmer toutes les notifications (une seule fois au démarrage)
        if (!timerNotificationRef.current) {
          timerNotificationRef.current = 'scheduled';

          // 1. Notification 5 min avant l'heure limite
          const fiveMinBefore = limitTime - 5 * 60 * 1000;
          if (fiveMinBefore > now) {
            scheduleNotification(
              {
                title: '⚠️ Petit check',
                body: 'Tout va bien ? 😊 Confirme ton retour dans 5 minutes.',
                data: { type: 'timer_warning', sessionId: currentSession.id },
              },
              new Date(fiveMinBefore),
            );
          }

          // 2. Notification à la deadline (heure limite)
          if (limitTime > now) {
            scheduleNotification(
              {
                title: '⏰ Heure de retour dépassée',
                body: 'Confirme que tout va bien ! Sinon tes contacts seront alertés dans 15 min.',
                data: { type: 'deadline_reached', sessionId: currentSession.id },
                categoryIdentifier: 'session_alert',
              },
              new Date(limitTime),
            );
          }

          // 3. Notification à la deadline finale (avant alerte)
          const deadlineWarning = deadline - 2 * 60 * 1000; // 2 min avant alerte
          if (deadlineWarning > now) {
            scheduleNotification(
              {
                title: '🚨 Dernière chance',
                body: 'Tes contacts seront alertés dans 2 minutes ! Confirme maintenant.',
                data: { type: 'final_warning', sessionId: currentSession.id },
                categoryIdentifier: 'session_alert',
              },
              new Date(deadlineWarning),
            );
          }

          // 4. Notification quand l'alerte est déclenchée
          if (deadline > now) {
            scheduleNotification(
              {
                title: '🚨 Alerte déclenchée',
                body: "Tes contacts d'urgence ont été alertés. Confirme que tout va bien.",
                data: { type: 'alert_triggered', sessionId: currentSession.id },
                categoryIdentifier: 'session_alert',
              },
              new Date(deadline),
            );
          }
        }
      } else if (now < deadline) {
        // Entre limitTime et deadline : période de grâce
        setSessionState('grace');
        const remainingUntilDeadline = deadline - now;
        const hours = Math.floor(remainingUntilDeadline / (1000 * 60 * 60));
        const minutes = Math.floor((remainingUntilDeadline % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((remainingUntilDeadline % (1000 * 60)) / 1000);
        setRemainingTime(
          `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`,
        );
      } else {
        // Après deadline : en retard
        setSessionState('overdue');
        const overdueTime = now - deadline;
        const hours = Math.floor(overdueTime / (1000 * 60 * 60));
        const minutes = Math.floor((overdueTime % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((overdueTime % (1000 * 60)) / 1000);
        setRemainingTime(
          `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`,
        );

        // Envoyer notification d'alerte ET SMS dès que la deadline est dépassée
        if (!alertNotificationRef.current) {
          alertNotificationRef.current = 'triggered';
          logger.debug("🔔 [Notification] Envoi notification d'alerte (deadline dépassée)");
          sendNotification({
            title: '🚨 Oups… on a prévenu ton contact',
            body: '😬 Confirme si tout va bien.',
            data: { type: 'alert_triggered' },
          });

          // Envoyer les SMS d'alerte (même sans localisation)
          if (!alertSMSRef.current) {
            alertSMSRef.current = 'sent';
            triggerAlert(locationRef.current || undefined);
          }
        }

        // Envoyer SMS de relance 10 min après la deadline si pas de confirmation
        const tenMinAfterDeadline = deadline + 10 * 60 * 1000;
        if (
          now >= tenMinAfterDeadline &&
          !followUpSMSRef.current &&
          !currentSession.checkInConfirmed
        ) {
          followUpSMSRef.current = 'sent';
          logger.debug('📤 Envoi SMS de relance...');
          // Importer et appeler sendFollowUpAlertSMS avec garde-fou anti-spam
          Promise.all([import('@/lib/services/sms-service'), import('@/lib/utils')]).then(
            ([{ sendFollowUpAlertSMS }, { canSendSMS }]) => {
              if (!canSendSMS('followup', 60)) {
                logger.warn('🚫 SMS de relance bloqué par anti-spam');
                return;
              }
              const contacts = [];
              if (settings.emergencyContactPhone) {
                contacts.push({
                  name: settings.emergencyContactName,
                  phone: settings.emergencyContactPhone,
                });
              }

              if (contacts.length > 0) {
                sendFollowUpAlertSMS({
                  contacts,
                  userName: settings.firstName,
                  location: locationRef.current || undefined,
                }).catch((error) => {
                  Alert.alert(
                    '⚠️ Erreur SMS de relance',
                    `Impossible d'envoyer le SMS de relance: ${error.message || 'Erreur inconnue'}`,
                    [{ text: 'OK' }],
                  );
                });
              }
            },
          );
        }
      }
    }, 1000);

    return () => {
      clearInterval(interval);
      if (timerNotificationRef.current) timerNotificationRef.current = null;
      if (alertNotificationRef.current) alertNotificationRef.current = null;
    };
  }, [currentSession, router, sendNotification, triggerAlert]);
  // Note: location retiré des dépendances pour éviter de recréer le timer à chaque mise à jour GPS

  const handleCompleteSession = async () => {
    // HAUTE #8: Confirmation avant terminer session
    Alert.alert('Terminer la sortie ?', 'Etes-vous sur de vouloir terminer cette sortie ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Terminer',
        style: 'destructive',
        onPress: async () => {
          await _completeSession();
        },
      },
    ]);
  };

  const _completeSession = async () => {
    await withCompleteLoading(async () => {
      // Capturer la position GPS si activee
      if (settings.locationEnabled && location) {
        logger.debug('Position capturee:', location);
      }

      // Si une alerte a ete envoyee, envoyer un SMS de confirmation
      if (sessionState === 'overdue' && alertSMSRef.current) {
        logger.debug('📤 Envoi SMS de confirmation "Je suis rentré"...');
        try {
          const { sendEmergencySMS } = await import('@/lib/services/sms-service');
          const result = await sendEmergencySMS({
            reason: 'confirmation',
            contactName: settings.emergencyContactName || 'Contact',
            contactPhone: settings.emergencyContactPhone || '',
            firstName: settings.firstName || 'Votre contact',
            note: currentSession?.note,
            location: location || undefined,
          });

          if (result.ok) {
            logger.debug('✅ SMS de confirmation envoyé:', result.sid);
            sendNotification({
              title: '✅ Contact rassuré',
              body: `${settings.emergencyContactName} a été informé que tu es bien rentré`,
              data: { type: 'confirmation_sent' },
            });
          } else {
            logger.error('❌ Échec envoi SMS confirmation:', result.error);
          }
        } catch (error) {
          logger.error("❌ Erreur lors de l'envoi du SMS de confirmation:", error);
        }
      }

      await endSession();
      router.push('/');
    });
  };

  const handleExtendSession = async () => {
    await withExtendLoading(() => addTimeToSession(15));
    // Afficher un toast de confirmation
    logger.debug("🔔 [Notification] Envoi notification d'extension (+15 min)");
    sendNotification({
      title: '✅ +15 minutes ajoutées',
      body:
        'Nouveau retour prévu : ' +
        new Date(currentSession!.deadline + 15 * 60 * 1000).toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      data: { type: 'extension_confirmed' },
    });
  };

  const handleConfirmCheckIn = async () => {
    // Annuler toutes les notifications programmées (session terminée)
    await cancelAllNotifications();
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
      logger.debug('Position capturée au check-in:', location);
    }
    setShowCheckInModal(false);
    await confirmCheckInNotif();
  };

  const handleCancelSession = () => {
    Alert.alert('Annuler la sortie', 'Êtes-vous sûr de vouloir annuler cette sortie ?', [
      { text: 'Non', style: 'cancel' },
      {
        text: 'Oui',
        style: 'destructive',
        onPress: async () => {
          // Annuler toutes les notifications programmées
          await cancelAllNotifications();
          // Capturer la position GPS si activée
          if (settings.locationEnabled && location) {
            logger.debug('Position capturée:', location);
          }
          await cancelSession();
          router.push('/');
        },
      },
    ]);
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
  const timerColor =
    sessionState === 'active' ? '#6C63FF' : sessionState === 'grace' ? '#F59E0B' : '#FF4D4D';
  const timerLabel =
    sessionState === 'active'
      ? 'Temps avant retour'
      : sessionState === 'grace'
        ? 'Période de grâce'
        : 'En retard depuis';

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

        {/* Background Warning Modal */}
        <BackgroundWarningModal
          visible={showWarningModal}
          onClose={() => setShowWarningModal(false)}
        />

        {/* Header */}
        <ScreenTransition delay={0} duration={350}>
          <View className="gap-1 mb-3">
            <View className="flex-row items-center justify-between">
              <Text className="text-4xl font-bold text-foreground">Sortie en cours</Text>
              {/* Indicateur GPS */}
              <Pressable
                onPress={() => {
                  Alert.alert(
                    locationPermission.enabled ? 'Position partagée' : 'Position non partagée',
                    locationPermission.enabled
                      ? "Ta position est partagée en cas d'alerte."
                      : "Active la localisation dans Paramètres pour partager ta position en cas d'alerte.",
                    [
                      { text: 'OK', style: 'default' },
                      locationPermission.enabled
                        ? undefined
                        : {
                            text: 'Paramètres',
                            onPress: () => router.push('/settings'),
                          },
                    ].filter(Boolean) as any,
                  );
                }}
                style={({ pressed }) => [
                  {
                    opacity: pressed ? 0.6 : 1,
                    padding: 8,
                    borderRadius: 12,
                    backgroundColor: locationPermission.enabled
                      ? 'rgba(45, 226, 166, 0.15)'
                      : 'rgba(255, 77, 77, 0.15)',
                  },
                ]}
              >
                <Text style={{ fontSize: 24 }}>
                  {locationTracking.isTracking ? '🟢' : locationTracking.error ? '🔴' : '⚪'}
                </Text>
              </Pressable>
            </View>
          </View>
        </ScreenTransition>

        {/* Bannière d'avertissement réseau */}
        {networkStatus.isOffline && (
          <ScreenTransition delay={50} duration={350}>
            <GlassCard
              className="mb-4"
              style={{
                backgroundColor: 'rgba(255, 77, 77, 0.12)',
                borderLeftWidth: 4,
                borderLeftColor: '#FF4D4D',
                paddingHorizontal: 16,
                paddingVertical: 12,
              }}
            >
              <View className="flex-row items-start gap-3">
                <Text style={{ fontSize: 24, marginTop: -2 }}>📵</Text>
                <View className="flex-1">
                  <Text className="text-sm font-bold text-foreground mb-1">
                    Aucune connexion Internet
                  </Text>
                  <Text className="text-xs text-muted leading-relaxed">
                    L'alerte SMS ne pourra pas être envoyée. Vérifie ta connexion WiFi ou
                    cellulaire.
                  </Text>
                </View>
              </View>
            </GlassCard>
          </ScreenTransition>
        )}

        {/* Bannière d'avertissement batterie */}
        {(isLowBattery || isCriticalBattery) && (
          <ScreenTransition delay={75} duration={350}>
            <BatteryWarningBanner
              batteryLevel={batteryLevel}
              isLowBattery={isLowBattery}
              isCriticalBattery={isCriticalBattery}
            />
          </ScreenTransition>
        )}

        {/* GPS Tracking Status Card */}
        {settings.locationEnabled && (
          <ScreenTransition delay={75} duration={350}>
            <GlassCard
              className="gap-2 mb-4"
              style={{
                backgroundColor: locationTracking.isTracking
                  ? 'rgba(45, 226, 166, 0.08)'
                  : locationTracking.error
                    ? 'rgba(255, 77, 77, 0.08)'
                    : 'rgba(200, 200, 200, 0.08)',
                paddingHorizontal: 16,
                paddingVertical: 12,
              }}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-2 flex-1">
                  <Text style={{ fontSize: 18 }}>
                    {locationTracking.isTracking ? '🟢' : locationTracking.error ? '🔴' : '⚪'}
                  </Text>
                  <View className="flex-1">
                    <Text className="text-sm font-semibold text-foreground">
                      {locationTracking.isTracking
                        ? 'Position partagée'
                        : locationTracking.error
                          ? 'Erreur GPS'
                          : 'Position non partagée'}
                    </Text>
                    {locationTracking.lastSentAt && (
                      <Text className="text-xs text-muted">
                        Mise à jour:{' '}
                        {new Date(locationTracking.lastSentAt).toLocaleTimeString('fr-FR')}
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            </GlassCard>
          </ScreenTransition>
        )}

        {/* Timer Card */}
        <ScreenTransition delay={100} duration={350}>
          <GlassCard
            className="gap-2 mb-4"
            style={{
              backgroundColor:
                sessionState === 'active'
                  ? 'rgba(108, 99, 255, 0.08)'
                  : sessionState === 'grace'
                    ? 'rgba(245, 158, 11, 0.08)'
                    : 'rgba(255, 77, 77, 0.08)',
              paddingHorizontal: 16,
              paddingVertical: 14,
            }}
          >
            <Text className="text-sm font-semibold text-muted">{timerLabel}</Text>
            <Text
              className="text-6xl font-bold text-center"
              style={{
                color: timerColor,
                lineHeight: 72,
              }}
            >
              {remainingTime}
            </Text>

            {/* Barre de progression */}
            <View className="mt-3 h-2 bg-gray-300 rounded-full overflow-hidden">
              <View
                className="h-full rounded-full"
                style={{
                  width: `${deadlineTimer.percentage}%`,
                  backgroundColor: timerColor,
                  opacity: 0.7,
                }}
              />
            </View>

            {/* Informations détaillées */}
            <View
              className="gap-2 mt-3 pt-3 border-t"
              style={{ borderTopColor: timerColor + '20' }}
            >
              <View className="flex-row justify-between">
                <Text className="text-sm text-muted">Retour prévu :</Text>
                <Text className="text-sm font-semibold text-foreground">{limitTimeStr}</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-sm text-muted">Alerte à :</Text>
                <Text className="text-sm font-semibold text-foreground">{deadlineStr}</Text>
              </View>
            </View>

            {/* Légende des états */}
            {sessionState === 'grace' && (
              <View className="mt-3 pt-3 border-t" style={{ borderTopColor: timerColor + '20' }}>
                <Text className="text-xs text-warning font-semibold">
                  ⚠️ Tu es en retard. L'alerte sera déclenchée à {deadlineStr}.
                </Text>
              </View>
            )}

            {sessionState === 'overdue' && (
              <View className="mt-3 pt-3 border-t" style={{ borderTopColor: timerColor + '20' }}>
                <Text className="text-xs text-error font-semibold">
                  🚨 Alerte déclenchée ! Ton contact a été prévenu.
                </Text>
              </View>
            )}
          </GlassCard>
        </ScreenTransition>

        {/* GPS Status Indicator */}
        <ScreenTransition delay={100} duration={350}>
          <GPSStatusIndicator enabled={settings.locationEnabled} className="mb-4" />
        </ScreenTransition>

        {/* Je suis rentré Button */}
        <ScreenTransition delay={200} duration={350}>
          <FeedbackAnimation state={confirmReturnState}>
            <BigSuccessButton
              label="✅ Je suis rentré"
              onPress={handleCompleteSession}
              accessibilityLabel="Bouton Je suis rentré"
              accessibilityHint="Appuyez pour confirmer votre retour"
              accessibilityState={{ disabled: confirmReturnLoading }}
            />
          </FeedbackAnimation>
        </ScreenTransition>

        {/* + 15 min Button */}
        <ScreenTransition delay={300} duration={350}>
          <View className="mt-3 mb-3">
            <FeedbackAnimation state={extendState}>
              <CushionPillButton
                label="Prolonger de 15 min"
                onPress={handleExtendSession}
                variant="secondary"
                size="lg"
                accessibilityLabel="Bouton Prolonger 15 minutes"
                accessibilityHint="Appuyez pour ajouter 15 minutes à votre sortie"
                accessibilityState={{ disabled: extendLoading }}
              />
            </FeedbackAnimation>
          </View>
        </ScreenTransition>

        {/* SOS Button - Long Press (2s) */}
        <ScreenTransition delay={400} duration={350}>
          <LongPressGestureHandler
            onHandlerStateChange={async (event) => {
              if (event.nativeEvent.state === 3) {
                // ACTIVE state
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                const result = await tripService.triggerSos({ tripId: currentSession?.id });

                // Handle error codes from SOS
                if (!result.success) {
                  const errorCode = result.errorCode;
                  if (errorCode === 'quota_reached') {
                    Alert.alert(
                      'Limite atteinte',
                      "Tu as atteint la limite d'alertes SOS pour aujourd'hui. Essaie demain.",
                    );
                  } else if (errorCode === 'twilio_failed') {
                    Alert.alert(
                      "Erreur d'envoi",
                      "Impossible d'envoyer l'alerte SOS. Nous réessayerons automatiquement.",
                    );
                  } else {
                    Alert.alert(
                      'Erreur SOS',
                      result.error || "Erreur lors de l'envoi de l'alerte SOS. Réessaie plus tard.",
                    );
                  }
                }
              }
            }}
            minDurationMs={2000}
          >
            <View
              className="my-4"
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Bouton SOS"
              accessibilityHint="Appui long 2 secondes pour déclencher l'alerte d'urgence"
              accessibilityState={{ disabled: sosLoading }}
            >
              <SOSButton
                onPress={async () => {
                  // Verifier les conditions de securite avant SOS
                  const context = buildGuardContext({
                    settings,
                    profileData,
                    locationEnabled: locationPermission.enabled,
                  });

                  const guardResult = runSafetyGuard('trigger_sos', context);

                  if (!guardResult.allowed) {
                    // Afficher un avertissement si les conditions ne sont pas remplies
                    Alert.alert(
                      guardResult.blockReason?.replace(/_/g, ' ').toUpperCase() || 'Erreur',
                      guardResult.message,
                      [
                        { text: 'OK', style: 'cancel' },
                        {
                          text: guardResult.action || 'Corriger',
                          onPress: () => {
                            switch (guardResult.nextStep) {
                              case 'go_settings_contact':
                                router.push('/settings');
                                break;
                              case 'open_otp':
                                router.push('/phone-verification');
                                break;
                            }
                          },
                        },
                      ],
                    );
                    return;
                  }

                  // Confirmation SOS avec delai
                  Alert.alert(
                    'Declencher SOS ?',
                    "Es-tu en danger ? Cette action alertera ton contact d'urgence.",
                    [
                      { text: 'Annuler', style: 'cancel' },
                      {
                        text: 'OUI, SOS !',
                        style: 'destructive',
                        onPress: async () => {
                          await triggerSOS();
                        },
                      },
                    ],
                  );
                }}
                isLoading={sosLoading}
                className="w-full"
              />
            </View>
          </LongPressGestureHandler>
        </ScreenTransition>

        {/* Annuler la sortie */}
        <ScreenTransition delay={500} duration={350}>
          <FeedbackAnimation state={cancelState}>
            <Pressable
              onPress={async () => {
                Alert.alert('Annuler la sortie ?', 'Es-tu sûr de vouloir annuler cette sortie ?', [
                  { text: 'Non', style: 'cancel' },
                  {
                    text: 'Oui, annuler',
                    style: 'destructive',
                    onPress: async () => {
                      setCancelState('loading');
                      const result = await tripService.cancelTrip(currentSession?.id || '');
                      if (result.success) {
                        setCancelState('success');
                        setTimeout(() => router.push('/home'), 500);
                      } else {
                        setCancelState('error');
                        Alert.alert('Erreur', result.error || "Impossible d'annuler la sortie");
                        setTimeout(() => setCancelState('idle'), 1000);
                      }
                    },
                  },
                ]);
              }}
              className="py-4"
            >
              <Text className="text-center text-base font-bold text-error">Annuler la sortie</Text>
            </Pressable>
          </FeedbackAnimation>
        </ScreenTransition>
      </ScrollView>
    </View>
  );
}
