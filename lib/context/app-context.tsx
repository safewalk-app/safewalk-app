import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { sendFriendlyAlertSMS } from '../services/friendly-sms-client';
import { sendFollowUpAlertSMS, sendConfirmationSMS } from '../services/follow-up-sms-client';
import { useNotifications } from '@/hooks/use-notifications';

export interface UserSettings {
  firstName: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContact2Name?: string;
  emergencyContact2Phone?: string;
  locationEnabled: boolean;
}

// CORRECTION BUG #5: Enum pour les états de session
export type SessionState = 'active' | 'grace' | 'overdue' | 'returned' | 'cancelled';

export interface Session {
  id: string;
  startTime: number;
  limitTime: number; // heure limite choisie par l'utilisateur
  deadline: number; // limitTime (sans tolérance)
  location?: string;
  note?: string;
  status: SessionState; // CORRECTION: utiliser SessionState au lieu de string
  endTime?: number;
  lastLocation?: { latitude: number; longitude: number };
  
  // CORRECTION BUG #4: Gérer les extensions séparément de la tolérance
  extensionsCount: number; // nombre de fois que +15 min a été utilisé (max 3)
  maxExtensions: number; // limite d'extensions (3 x 15 min = 45 min max)
  
  // CORRECTION BUG #3: Tracker si check-in confirmé
  checkInConfirmed: boolean; // true si l'utilisateur a confirmé "Je vais bien"
  checkInConfirmedAt?: number; // timestamp de la confirmation
  
  alertTriggeredAt?: number; // timestamp quand l'alerte a été déclenchée
  checkInOk?: boolean; // true si l'utilisateur a confirmé au check-in
  checkInNotifTime?: number; // timestamp du check-in notification (midTime)
  checkInSecondNotifTime?: number; // timestamp de la 2e notification check-in
}

export type SyncStatus = 'synced' | 'syncing' | 'offline';

export interface AppContextType {
  settings: UserSettings;
  currentSession: Session | null;
  history: Session[];
  syncStatus: SyncStatus;
  updateSettings: (settings: Partial<UserSettings>) => Promise<void>;
  startSession: (limitTime: number, note?: string) => Promise<void>;
  endSession: () => Promise<void>;
  addTimeToSession: (minutes: number) => Promise<void>;
  cancelSession: () => Promise<void>;
  triggerAlert: (location?: { latitude: number; longitude: number }) => Promise<void>;
  checkAndTriggerAlert: () => Promise<void>;
  confirmCheckIn: () => Promise<void>;
  deleteAllData: () => Promise<void>;
  // CORRECTION BUG #5: Ajouter une méthode pour obtenir l'état de la session
  getSessionState: (session: Session) => SessionState;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const defaultSettings: UserSettings = {
  firstName: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
  emergencyContact2Name: '',
  emergencyContact2Phone: '',
  locationEnabled: true,
};

type Action =
  | { type: 'SET_SETTINGS'; payload: UserSettings }
  | { type: 'SET_SESSION'; payload: Session | null }
  | { type: 'SET_HISTORY'; payload: Session[] }
  | { type: 'UPDATE_SESSION'; payload: Partial<Session> }
  | { type: 'SET_SYNC_STATUS'; payload: SyncStatus };

interface State {
  settings: UserSettings;
  syncStatus: SyncStatus;
  currentSession: Session | null;
  history: Session[];
}

const initialState: State = {
  settings: defaultSettings,
  syncStatus: 'synced',
  currentSession: null,
  history: [],
};

function appReducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_SETTINGS':
      return { ...state, settings: action.payload };
    case 'SET_SESSION':
      return { ...state, currentSession: action.payload };
    case 'SET_HISTORY':
      return { ...state, history: action.payload };
    case 'UPDATE_SESSION':
      return {
        ...state,
        currentSession: state.currentSession
          ? { ...state.currentSession, ...action.payload }
          : null,
      };
    case 'SET_SYNC_STATUS':
      return { ...state, syncStatus: action.payload };
    default:
      return state;
  }
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const { sendNotification } = useNotifications();

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [settingsStr, sessionStr, historyStr] = await Promise.all([
        AsyncStorage.getItem('safewalk_settings'),
        AsyncStorage.getItem('safewalk_session'),
        AsyncStorage.getItem('safewalk_history'),
      ]);

      if (settingsStr) {
        dispatch({ type: 'SET_SETTINGS', payload: JSON.parse(settingsStr) });
      }
      if (sessionStr) {
        dispatch({ type: 'SET_SESSION', payload: JSON.parse(sessionStr) });
      }
      if (historyStr) {
        dispatch({ type: 'SET_HISTORY', payload: JSON.parse(historyStr) });
      }

      // Récupérer les sessions depuis le serveur
      try {
        const userId = 1; // TODO: récupérer le vrai userId depuis auth
        const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/sessions/user/${userId}?status=active`);
        
        if (response.ok) {
          const data = await response.json();
          const activeSessions = data.sessions || [];
          
          if (activeSessions.length > 0) {
            // Prendre la session active la plus récente
            const serverSession = activeSessions[0];
            
            // Convertir les timestamps du serveur en format local
            const localSession: Session = {
              id: serverSession.id,
              startTime: new Date(serverSession.startTime).getTime(),
              limitTime: new Date(serverSession.limitTime).getTime(),
              deadline: new Date(serverSession.deadline).getTime(),
              note: serverSession.note || undefined,
              status: serverSession.status as 'active' | 'returned' | 'cancelled',
              extensionsCount: serverSession.extensionsCount || 0,
              maxExtensions: 3,
              checkInConfirmed: serverSession.checkInConfirmed === 1,
              endTime: serverSession.endTime ? new Date(serverSession.endTime).getTime() : undefined,
            };
            
            // Si pas de session locale ou session serveur plus récente, restaurer depuis serveur
            if (!sessionStr || localSession.startTime > JSON.parse(sessionStr).startTime) {
              console.log('✅ Session active restaurée depuis le serveur');
              dispatch({ type: 'SET_SESSION', payload: localSession });
              await AsyncStorage.setItem('safewalk_session', JSON.stringify(localSession));
              
              // CORRECTION CRITIQUE : Reprogrammer les notifications après restauration
              // On doit reprogrammer les 4 notifications comme dans active-session.tsx
              const now = Date.now();
              const { limitTime, deadline } = localSession;
              
              // 1. Notification 5 min avant l'heure limite
              const fiveMinBefore = limitTime - (5 * 60 * 1000);
              if (fiveMinBefore > now) {
                await Notifications.scheduleNotificationAsync({
                  content: {
                    title: '⚠️ Petit check',
                    body: 'Tout va bien ? 😊 Confirme ton retour dans 5 minutes.',
                    data: { type: 'timer_warning', sessionId: localSession.id },
                    sound: 'default',
                    badge: 1,
                  },
                  trigger: { type: 'date' as const, date: new Date(fiveMinBefore) } as any,
                });
              }
              
              // 2. Notification à la deadline (heure limite)
              if (limitTime > now) {
                await Notifications.scheduleNotificationAsync({
                  content: {
                    title: '⏰ Heure de retour dépassée',
                    body: 'Confirme que tout va bien ! Sinon tes contacts seront alertés dans 15 min.',
                    data: { type: 'deadline_reached', sessionId: localSession.id },
                    sound: 'default',
                    badge: 1,
                    categoryIdentifier: 'session_alert',
                  },
                  trigger: { type: 'date' as const, date: new Date(limitTime) } as any,
                });
              }
              
              // 3. Notification à la deadline finale (avant alerte)
              const deadlineWarning = deadline - (2 * 60 * 1000);
              if (deadlineWarning > now) {
                await Notifications.scheduleNotificationAsync({
                  content: {
                    title: '🚨 Dernière chance',
                    body: 'Tes contacts seront alertés dans 2 minutes ! Confirme maintenant.',
                    data: { type: 'final_warning', sessionId: localSession.id },
                    sound: 'default',
                    badge: 1,
                    categoryIdentifier: 'session_alert',
                  },
                  trigger: { type: 'date' as const, date: new Date(deadlineWarning) } as any,
                });
              }
              
              // 4. Notification quand l'alerte est déclenchée
              if (deadline > now) {
                await Notifications.scheduleNotificationAsync({
                  content: {
                    title: '🚨 Alerte déclenchée',
                    body: 'Tes contacts d\'urgence ont été alertés. Confirme que tout va bien.',
                    data: { type: 'alert_triggered', sessionId: localSession.id },
                    sound: 'default',
                    badge: 1,
                    categoryIdentifier: 'session_alert',
                  },
                  trigger: { type: 'date' as const, date: new Date(deadline) } as any,
                });
              }
              
              console.log('✅ Notifications reprogrammées après restauration');
            }
          }
        }
      } catch (error) {
        console.warn('⚠️ Échec récupération sessions serveur:', error);
        // Continuer avec les données locales si le serveur est inaccessible
      }
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
    }
  };

  const updateSettings = async (newSettings: Partial<UserSettings>) => {
    const updated = { ...state.settings, ...newSettings };
    dispatch({ type: 'SET_SETTINGS', payload: updated });
    await AsyncStorage.setItem('safewalk_settings', JSON.stringify(updated));
  };

  const startSession = async (limitTime: number, note?: string) => {
    const now = Date.now();
    let adjustedLimitTime = limitTime;

    // Si limitTime < now, ajouter 1 jour
    if (adjustedLimitTime < now) {
      adjustedLimitTime += 24 * 60 * 60 * 1000;
    }

    // CORRECTION BUG #3: Initialiser checkInConfirmed à false
    // Pas de tolérance - deadline = limitTime
    const deadline = adjustedLimitTime;

    const session: Session = {
      id: `session_${Date.now()}`,
      startTime: now,
      limitTime: adjustedLimitTime,
      deadline,
      note,
      status: 'active',
      extensionsCount: 0,
      maxExtensions: 3, // CORRECTION BUG #4: Max 3 extensions de 15 min
      checkInConfirmed: false, // CORRECTION BUG #3: Initialiser à false
    };

    dispatch({ type: 'SET_SESSION', payload: session });
    await AsyncStorage.setItem('safewalk_session', JSON.stringify(session));
    
    // Synchroniser avec le serveur backend
    dispatch({ type: 'SET_SYNC_STATUS', payload: 'syncing' });
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/sessions/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: session.id,
          userId: 1, // TODO: récupérer le vrai userId depuis auth
          startTime: new Date(session.startTime),
          limitTime: new Date(session.limitTime),
          deadline: new Date(session.deadline),
          status: session.status,
          note: session.note,
          extensionsCount: session.extensionsCount,
          checkInConfirmed: session.checkInConfirmed ? 1 : 0,
          emergencyContactName: state.settings.emergencyContactName,
          emergencyContactPhone: state.settings.emergencyContactPhone,
          firstName: state.settings.firstName,
        }),
      });
      
      if (response.ok) {
        console.log('✅ Session synchronisée avec le serveur');
        dispatch({ type: 'SET_SYNC_STATUS', payload: 'synced' });
      } else {
        console.warn('⚠️ Échec synchronisation session:', await response.text());
        dispatch({ type: 'SET_SYNC_STATUS', payload: 'offline' });
      }
    } catch (error) {
      console.error('❌ Erreur synchronisation session:', error);
      dispatch({ type: 'SET_SYNC_STATUS', payload: 'offline' });
    }
  };

  const endSession = async () => {
    if (!state.currentSession) return;
    const returnedSession: Session = {
      ...state.currentSession,
      status: 'returned',
      endTime: Date.now(),
    };
    const newHistory = [...state.history, returnedSession];
    dispatch({ type: 'SET_SESSION', payload: null });
    dispatch({ type: 'SET_HISTORY', payload: newHistory });
    await AsyncStorage.removeItem('safewalk_session');
    await AsyncStorage.setItem('safewalk_history', JSON.stringify(newHistory));
    
    // Synchroniser avec le serveur backend
    dispatch({ type: 'SET_SYNC_STATUS', payload: 'syncing' });
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/sessions/${returnedSession.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'returned',
          endTime: returnedSession.endTime ? new Date(returnedSession.endTime) : new Date(),
          updatedAt: new Date(),
        }),
      });
      
      if (response.ok) {
        console.log('✅ Session terminée synchronisée avec le serveur');
        dispatch({ type: 'SET_SYNC_STATUS', payload: 'synced' });
      } else {
        console.warn('⚠️ Échec synchronisation fin session:', await response.text());
        dispatch({ type: 'SET_SYNC_STATUS', payload: 'offline' });
      }
    } catch (error) {
      console.error('❌ Erreur synchronisation fin session:', error);
      dispatch({ type: 'SET_SYNC_STATUS', payload: 'offline' });
    }
  };

  const addTimeToSession = async (minutes: number) => {
    if (!state.currentSession) return;

    // CORRECTION BUG #4: Gérer les extensions séparément
    // Vérifier si on peut ajouter une extension
    if (state.currentSession.extensionsCount >= state.currentSession.maxExtensions) {
      console.warn('Nombre maximum d\'extensions atteint');
      return;
    }

    // Ajouter 15 min à la deadline (pas à la tolérance)
    const newDeadline = state.currentSession.deadline + minutes * 60 * 1000;
    const newExtensionsCount = state.currentSession.extensionsCount + 1;

    const updatedSession: Session = {
      ...state.currentSession,
      deadline: newDeadline,
      extensionsCount: newExtensionsCount,
    };

    dispatch({ type: 'SET_SESSION', payload: updatedSession });
    await AsyncStorage.setItem('safewalk_session', JSON.stringify(updatedSession));
    
    // Synchroniser avec le serveur backend
    dispatch({ type: 'SET_SYNC_STATUS', payload: 'syncing' });
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/sessions/${updatedSession.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deadline: new Date(updatedSession.deadline),
          extensionsCount: updatedSession.extensionsCount,
          updatedAt: new Date(),
        }),
      });
      
      if (response.ok) {
        console.log('✅ Extension de session synchronisée avec le serveur');
        dispatch({ type: 'SET_SYNC_STATUS', payload: 'synced' });
      } else {
        console.warn('⚠️ Échec synchronisation extension:', await response.text());
        dispatch({ type: 'SET_SYNC_STATUS', payload: 'offline' });
      }
    } catch (error) {
      console.error('❌ Erreur synchronisation extension:', error);
      dispatch({ type: 'SET_SYNC_STATUS', payload: 'offline' });
    }
  };

  const cancelSession = async () => {
    if (!state.currentSession) return;
    const cancelledSession: Session = {
      ...state.currentSession,
      status: 'cancelled',
      endTime: Date.now(),
    };
    const newHistory = [...state.history, cancelledSession];
    dispatch({ type: 'SET_SESSION', payload: null });
    dispatch({ type: 'SET_HISTORY', payload: newHistory });
    await AsyncStorage.removeItem('safewalk_session');
    await AsyncStorage.setItem('safewalk_history', JSON.stringify(newHistory));
    
    // Synchroniser avec le serveur backend
    dispatch({ type: 'SET_SYNC_STATUS', payload: 'syncing' });
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/sessions/${cancelledSession.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'cancelled',
          endTime: cancelledSession.endTime ? new Date(cancelledSession.endTime) : new Date(),
          updatedAt: new Date(),
        }),
      });
      
      if (response.ok) {
        console.log('✅ Session annulée synchronisée avec le serveur');
        dispatch({ type: 'SET_SYNC_STATUS', payload: 'synced' });
      } else {
        console.warn('⚠️ Échec synchronisation annulation:', await response.text());
        dispatch({ type: 'SET_SYNC_STATUS', payload: 'offline' });
      }
    } catch (error) {
      console.error('❌ Erreur synchronisation annulation:', error);
      dispatch({ type: 'SET_SYNC_STATUS', payload: 'offline' });
    }
  };

  const triggerAlert = useCallback(async (location?: { latitude: number; longitude: number }) => {
    console.log('🚨 [triggerAlert] Début de triggerAlert');
    console.log('📋 [triggerAlert] Settings:', state.settings);
    console.log('📋 [triggerAlert] Session:', state.currentSession);
    console.log('📋 [triggerAlert] Location:', location);
    
    if (!state.currentSession) return;
    
    // Marquer la session comme overdue
    const alertedSession: Session = {
      ...state.currentSession,
      status: 'overdue',
      alertTriggeredAt: Date.now(),
      lastLocation: location,
    };
    dispatch({ type: 'SET_SESSION', payload: alertedSession });
    await AsyncStorage.setItem('safewalk_session', JSON.stringify(alertedSession));

    // Notification locale
    sendNotification({
      title: '🚨 Oups... on a prévenu ton contact',
      body: 'Tu n\'as pas confirmé ton retour à temps. Rassure-les vite !',
      data: { type: 'alert_triggered' },
    });
    
    // Vérifier qu'il y a au moins un contact
    if (!state.settings.emergencyContactPhone && !state.settings.emergencyContact2Phone) {
      console.error('❌ [triggerAlert] AUCUN CONTACT CONFIGURÉ ! Les SMS ne seront pas envoyés.');
      return;
    }

    // Envoyer SMS via sendEmergencySMS
    const { sendEmergencySMS } = await import('@/lib/services/sms-service');
    const { cleanPhoneNumber } = await import('@/lib/utils');
    
    try {
      // Envoyer au contact 1
      if (state.settings.emergencyContactPhone) {
        const cleanedPhone1 = cleanPhoneNumber(state.settings.emergencyContactPhone);
        console.log('📤 [triggerAlert] Envoi SMS au contact 1:', cleanedPhone1);
        const result1 = await sendEmergencySMS({
          reason: 'alert',
          contactName: state.settings.emergencyContactName || 'Contact',
          contactPhone: cleanedPhone1,
          firstName: state.settings.firstName,
          note: state.currentSession.note,
          location,
        });
        
        if (result1.ok) {
          console.log('✅ [triggerAlert] SMS envoyé au contact 1 (SID:', result1.sid, ')');
        } else {
          console.error('❌ [triggerAlert] Échec envoi SMS au contact 1:', result1.error);
        }
      }
      
      // Envoyer au contact 2
      if (state.settings.emergencyContact2Phone) {
        console.log('📤 [triggerAlert] Envoi SMS au contact 2...');
        const result2 = await sendEmergencySMS({
          reason: 'alert',
          contactName: state.settings.emergencyContact2Name || 'Contact 2',
          contactPhone: state.settings.emergencyContact2Phone,
          firstName: state.settings.firstName,
          note: state.currentSession.note,
          location,
        });
        
        if (result2.ok) {
          console.log('✅ [triggerAlert] SMS envoyé au contact 2 (SID:', result2.sid, ')');
        } else {
          console.error('❌ [triggerAlert] Échec envoi SMS au contact 2:', result2.error);
        }
      }
    } catch (error) {
      console.error('❌ [triggerAlert] Exception lors de l\'envoi des SMS:', error);
    }
  }, [state.currentSession, state.settings, sendNotification]);

  const checkAndTriggerAlert = async () => {
    if (!state.currentSession) return;
    if (state.currentSession.status !== 'active') return;
    const now = Date.now();

    // CORRECTION BUG #3: Ne pas déclencher l'alerte si check-in confirmé
    if (state.currentSession.checkInConfirmed) {
      console.log('Check-in confirmé, pas d\'alerte');
      return;
    }

    if (now >= state.currentSession.deadline) {
      // Capturer position GPS si activée
      let position: { latitude: number; longitude: number } | undefined;
      if (state.settings.locationEnabled) {
        // Simuler une position GPS (en production, utiliser expo-location)
        position = {
          latitude: 48.8566 + Math.random() * 0.01,
          longitude: 2.3522 + Math.random() * 0.01,
        };
      }
      await triggerAlert(position);
    }
  };

  // CORRECTION BUG #3: Mettre à jour confirmCheckIn
  const confirmCheckIn = async () => {
    if (!state.currentSession) return;

    // Marquer le check-in comme confirmé
    const updatedSession: Session = {
      ...state.currentSession,
      checkInConfirmed: true,
      checkInConfirmedAt: Date.now(),
      deadline: state.currentSession.limitTime,
      checkInOk: true,
    };

    dispatch({ type: 'SET_SESSION', payload: updatedSession });
    await AsyncStorage.setItem('safewalk_session', JSON.stringify(updatedSession));

    // Envoyer SMS de confirmation SEULEMENT si alerte a été déclenchée
    if (state.currentSession.status === 'overdue' || state.currentSession.alertTriggeredAt) {
      try {
        const contacts = [];
        if (state.settings.emergencyContactPhone) {
          contacts.push({
            name: state.settings.emergencyContactName,
            phone: state.settings.emergencyContactPhone,
          });
        }
        if (state.settings.emergencyContact2Phone) {
          contacts.push({
            name: state.settings.emergencyContact2Name || '',
            phone: state.settings.emergencyContact2Phone,
          });
        }

        if (contacts.length > 0) {
          await sendConfirmationSMS({
            contacts,
            userName: state.settings.firstName,
          });
        }
      } catch (error) {
        console.error('Erreur lors de l\'envoi du SMS de confirmation:', error);
      }
    }
  };

  const deleteAllData = async () => {
    dispatch({ type: 'SET_SETTINGS', payload: defaultSettings });
    dispatch({ type: 'SET_SESSION', payload: null });
    dispatch({ type: 'SET_HISTORY', payload: [] });
    await Promise.all([
      AsyncStorage.removeItem('safewalk_settings'),
      AsyncStorage.removeItem('safewalk_session'),
      AsyncStorage.removeItem('safewalk_history'),
    ]);
  };

  // CORRECTION BUG #5: Méthode pour obtenir l'état de la session
  const getSessionState = (session: Session): SessionState => {
    const now = Date.now();
    const limitTime = session.limitTime;
    const deadline = session.deadline;

    if (now < limitTime) {
      return 'active';
    } else if (now < deadline) {
      return 'grace';
    } else {
      return 'overdue';
    }
  };

  const value: AppContextType = {
    settings: state.settings,
    currentSession: state.currentSession,
    history: state.history,
    syncStatus: state.syncStatus,
    updateSettings,
    startSession,
    endSession,
    addTimeToSession,
    cancelSession,
    triggerAlert,
    checkAndTriggerAlert,
    confirmCheckIn,
    deleteAllData,
    getSessionState,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
