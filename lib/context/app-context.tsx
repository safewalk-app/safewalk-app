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
  dueTime: number;
  tolerance: number;
  location?: string;
  note?: string;
  status: 'active' | 'completed' | 'alerted' | 'cancelled';
  endTime?: number;
  lastLocation?: { latitude: number; longitude: number };
}

export interface AppContextType {
  settings: UserSettings;
  currentSession: Session | null;
  history: Session[];
  updateSettings: (settings: Partial<UserSettings>) => Promise<void>;
  startSession: (dueTime: number, note?: string) => Promise<void>;
  endSession: () => Promise<void>;
  addTimeToSession: (minutes: number) => Promise<void>;
  cancelSession: () => Promise<void>;
  alertSession: (location?: { latitude: number; longitude: number }) => Promise<void>;
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

  const startSession = async (dueTime: number, note?: string) => {
    const session: Session = {
      id: `session_${Date.now()}`,
      startTime: Date.now(),
      dueTime,
      tolerance: state.settings.tolerance,
      note,
      status: 'active',
    };

    dispatch({ type: 'SET_SESSION', payload: session });
    await AsyncStorage.setItem('safewalk_session', JSON.stringify(session));
  };

  const endSession = async () => {
    if (!state.currentSession) return;

    const completedSession: Session = {
      ...state.currentSession,
      status: 'completed',
      endTime: Date.now(),
    };

    const newHistory = [...state.history, completedSession];
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

    const updatedSession: Session = {
      ...state.currentSession,
      dueTime: state.currentSession.dueTime + minutes * 60 * 1000,
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

  const alertSession = async (location?: { latitude: number; longitude: number }) => {
    if (!state.currentSession) return;

    const alertedSession: Session = {
      ...state.currentSession,
      status: 'alerted',
      endTime: Date.now(),
      lastLocation: location,
    };

    const newHistory = [...state.history, alertedSession];
    dispatch({ type: 'SET_SESSION', payload: null });
    dispatch({ type: 'SET_HISTORY', payload: newHistory });

    await AsyncStorage.removeItem('safewalk_session');
    await AsyncStorage.setItem(
      'safewalk_history',
      JSON.stringify(newHistory)
    );
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
    alertSession,
    deleteAllData,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
