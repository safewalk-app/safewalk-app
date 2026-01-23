import React, { createContext, useContext, useReducer, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { sendFriendlyAlertSMS } from '../services/friendly-sms-client';
import { sendFollowUpAlertSMS, sendConfirmationSMS } from '../services/follow-up-sms-client';

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

export interface AppContextType {
  settings: UserSettings;
  currentSession: Session | null;
  history: Session[];
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
  | { type: 'UPDATE_SESSION'; payload: Partial<Session> };

interface State {
  settings: UserSettings;
  currentSession: Session | null;
  history: Session[];
}

const initialState: State = {
  settings: defaultSettings,
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
    default:
      return state;
  }
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

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
  };

  const triggerAlert = async (location?: { latitude: number; longitude: number }) => {
    // Garde-fou anti-spam : bloquer si SMS envoyé il y a moins de 60s
    const { canSendSMS } = await import('@/lib/utils');
    if (!canSendSMS('alert', 60)) {
      console.warn('🚫 [triggerAlert] SMS bloqué par anti-spam');
      return;
    }
    
    console.log('🚨 [triggerAlert] Début de triggerAlert');
    console.log('📋 [triggerAlert] Settings:', state.settings);
    console.log('📋 [triggerAlert] Session:', state.currentSession);
    console.log('📋 [triggerAlert] Location:', location);
    if (!state.currentSession) return;
    const alertedSession: Session = {
      ...state.currentSession,
      status: 'overdue',
      alertTriggeredAt: Date.now(),
      lastLocation: location,
    };
    dispatch({ type: 'SET_SESSION', payload: alertedSession });
    await AsyncStorage.setItem('safewalk_session', JSON.stringify(alertedSession));

    // Envoyer les SMS aux contacts d'urgence avec la position
    const limitTimeStr = new Date(state.currentSession.limitTime).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
    
    const phoneNumbers = [];
    if (state.settings.emergencyContactPhone) {
      phoneNumbers.push(state.settings.emergencyContactPhone);
    }
    if (state.settings.emergencyContact2Phone) {
      phoneNumbers.push(state.settings.emergencyContact2Phone);
    }

    console.log('📞 [triggerAlert] Numéros de téléphone:', phoneNumbers);
    if (phoneNumbers.length === 0) {
      console.error('❌ [triggerAlert] AUCUN CONTACT CONFIGURÉ ! Les SMS ne seront pas envoyés.');
      return;
    }

    if (phoneNumbers.length > 0) {
      const contacts = [];
      try {
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

        console.log('📤 [triggerAlert] Appel sendFriendlyAlertSMS avec:', { contacts, userName: state.settings.firstName, limitTimeStr, note: state.currentSession.note, location });
        const result = await sendFriendlyAlertSMS({
          contacts,
          userName: state.settings.firstName,
          limitTimeStr,
          note: state.currentSession.note,
          location,
        });
        console.log('✅ [triggerAlert] Résultat sendFriendlyAlertSMS:', result);
      } catch (error) {
        console.error('❌ ERREUR CRITIQUE: Échec de l\'envoi des SMS d\'alerte');
        console.error('📋 Détails de l\'erreur:', error);
        console.error('📋 Contacts:', contacts);
        console.error('📋 Localisation:', location);
        
        // TODO: Afficher un toast d'erreur à l'utilisateur
        // Alert.alert('Erreur SMS', 'Impossible d\'envoyer les SMS. Veuillez contacter vos proches manuellement.');
      }
    }
  };

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
