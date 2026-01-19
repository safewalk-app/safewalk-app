import React, { createContext, useContext, useReducer, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface UserSettings {
  firstName: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  tolerance: number; // minutes
  locationEnabled: boolean;
}

export interface Session {
  id: string;
  startTime: number;
  limitTime: number; // heure limite choisie par l'utilisateur
  tolerance: number; // minutes
  deadline: number; // limitTime + tolerance (en ms)
  location?: string;
  note?: string;
  status: 'active' | 'returned' | 'overdue' | 'cancelled';
  endTime?: number;
  lastLocation?: { latitude: number; longitude: number };
  extensionsCount: number; // nombre de fois que +15 min a été utilisé
  alertTriggeredAt?: number; // timestamp quand l'alerte a été déclenchée
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
  deleteAllData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const defaultSettings: UserSettings = {
  firstName: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
  tolerance: 15,
  locationEnabled: false,
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
        dispatch({
          type: 'SET_SETTINGS',
          payload: JSON.parse(settingsStr),
        });
      }

      if (sessionStr) {
        dispatch({
          type: 'SET_SESSION',
          payload: JSON.parse(sessionStr),
        });
      }

      if (historyStr) {
        dispatch({
          type: 'SET_HISTORY',
          payload: JSON.parse(historyStr),
        });
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const updateSettings = async (updates: Partial<UserSettings>) => {
    const newSettings = { ...state.settings, ...updates };
    dispatch({ type: 'SET_SETTINGS', payload: newSettings });
    await AsyncStorage.setItem(
      'safewalk_settings',
      JSON.stringify(newSettings)
    );
  };

  const startSession = async (limitTime: number, note?: string) => {
    const now = Date.now();
    let adjustedLimitTime = limitTime;
    
    // Si limitTime < now, ajouter 1 jour
    if (adjustedLimitTime < now) {
      adjustedLimitTime += 24 * 60 * 60 * 1000;
    }
    
    const deadline = adjustedLimitTime + state.settings.tolerance * 60 * 1000;
    
    const session: Session = {
      id: `session_${Date.now()}`,
      startTime: now,
      limitTime: adjustedLimitTime,
      tolerance: state.settings.tolerance,
      deadline,
      note,
      status: 'active',
      extensionsCount: 0,
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
    await AsyncStorage.setItem(
      'safewalk_history',
      JSON.stringify(newHistory)
    );
  };

  const addTimeToSession = async (minutes: number) => {
    if (!state.currentSession) return;

    // Limiter max 60 min total de tolérance
    const newTolerance = Math.min(state.currentSession.tolerance + minutes, 60);
    const newDeadline = state.currentSession.limitTime + newTolerance * 60 * 1000;

    const updatedSession: Session = {
      ...state.currentSession,
      tolerance: newTolerance,
      deadline: newDeadline,
      extensionsCount: state.currentSession.extensionsCount + 1,
    };

    dispatch({ type: 'SET_SESSION', payload: updatedSession });
    await AsyncStorage.setItem(
      'safewalk_session',
      JSON.stringify(updatedSession)
    );
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
    await AsyncStorage.setItem(
      'safewalk_history',
      JSON.stringify(newHistory)
    );
  };

  const triggerAlert = async (location?: { latitude: number; longitude: number }) => {
    if (!state.currentSession) return;

    const alertedSession: Session = {
      ...state.currentSession,
      status: 'overdue',
      alertTriggeredAt: Date.now(),
      lastLocation: location,
    };

    dispatch({ type: 'SET_SESSION', payload: alertedSession });
    await AsyncStorage.setItem(
      'safewalk_session',
      JSON.stringify(alertedSession)
    );
    
    // Simuler l'envoi SMS au contact d'urgence
    const limitTimeStr = new Date(state.currentSession.limitTime).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
    const positionText = location
      ? `Position: ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
      : 'Position: non disponible';
    const smsMessage = `ALERTE: je n'ai pas confirmé mon retour. Heure limite: ${limitTimeStr}, tolérance: ${state.currentSession.tolerance} min. ${positionText}`;
    console.log('SMS envoyé à', state.settings.emergencyContactPhone, ':', smsMessage);
  };

  const checkAndTriggerAlert = async () => {
    if (!state.currentSession) return;
    if (state.currentSession.status !== 'active') return;

    const now = Date.now();
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
    deleteAllData,
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
