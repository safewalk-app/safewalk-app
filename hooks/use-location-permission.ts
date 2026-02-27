import { useState, useEffect, useCallback } from 'react';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, Linking } from 'react-native';
import { logger } from '@/lib/logger';

type PermissionStatus = 'granted' | 'denied' | 'undetermined';

interface LocationPermissionState {
  status: PermissionStatus;
  asked: boolean;
  enabled: boolean;
}

const STORAGE_KEY = '@safewalk_location_permission';

/**
 * Hook pour gérer proprement les permissions de localisation
 * - Ne demande JAMAIS automatiquement les permissions
 * - Stocke l'état dans AsyncStorage
 * - Gère les refus avec bouton "Ouvrir Réglages"
 */
export function useLocationPermission() {
  const [state, setState] = useState<LocationPermissionState>({
    status: 'undetermined',
    asked: false,
    enabled: false,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Charger l'état depuis le storage au montage
  useEffect(() => {
    loadState();
  }, []);

  const loadState = async () => {
    try {
      // Charger l'état stocké
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      const storedState: LocationPermissionState = stored
        ? JSON.parse(stored)
        : { status: 'undetermined', asked: false, enabled: false };

      // Vérifier le statut réel de la permission
      const { status } = await Location.getForegroundPermissionsAsync();
      const actualStatus: PermissionStatus =
        status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'undetermined';

      // Mettre à jour l'état
      const newState: LocationPermissionState = {
        ...storedState,
        status: actualStatus,
      };

      setState(newState);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
      setIsLoading(false);
    } catch (error) {
      logger.error("Erreur lors du chargement de l'état des permissions:", error);
      setIsLoading(false);
    }
  };

  const saveState = async (newState: LocationPermissionState) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
      setState(newState);
    } catch (error) {
      logger.error("Erreur lors de la sauvegarde de l'état des permissions:", error);
    }
  };

  /**
   * Demander la permission (appelé uniquement depuis le toggle Paramètres)
   * Retourne true si granted, false sinon
   */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      logger.info('[Location Permission] Demande de permission...');
      const { status } = await Location.requestForegroundPermissionsAsync();
      const newStatus: PermissionStatus = status === 'granted' ? 'granted' : 'denied';

      const newState: LocationPermissionState = {
        status: newStatus,
        asked: true,
        enabled: newStatus === 'granted',
      };

      await saveState(newState);
      logger.info('[Location Permission] Statut:', newStatus);
      return newStatus === 'granted';
    } catch (error) {
      logger.error('[Location Permission] Erreur:', error);
      return false;
    }
  }, []);

  /**
   * Activer/désactiver la localisation (appelé depuis le toggle)
   */
  const toggleLocation = useCallback(
    async (
      enable: boolean,
    ): Promise<{
      success: boolean;
      needsPermission: boolean;
      needsSettings: boolean;
    }> => {
      logger.info('[Location Permission] Toggle:', enable);

      if (!enable) {
        // Désactiver la localisation
        const newState: LocationPermissionState = {
          ...state,
          enabled: false,
        };
        await saveState(newState);
        return { success: true, needsPermission: false, needsSettings: false };
      }

      // Activer la localisation
      if (state.status === 'granted') {
        // Permission déjà accordée
        const newState: LocationPermissionState = {
          ...state,
          enabled: true,
        };
        await saveState(newState);
        return { success: true, needsPermission: false, needsSettings: false };
      }

      if (state.status === 'undetermined') {
        // Permission jamais demandée => demander maintenant
        const granted = await requestPermission();
        return {
          success: granted,
          needsPermission: !granted,
          needsSettings: false,
        };
      }

      // Permission refusée => ne pas redemander, afficher message + bouton Settings
      return {
        success: false,
        needsPermission: false,
        needsSettings: true,
      };
    },
    [state, requestPermission],
  );

  /**
   * Ouvrir les réglages de l'app
   */
  const openSettings = useCallback(async () => {
    try {
      if (Platform.OS === 'ios') {
        await Linking.openURL('app-settings:');
      } else {
        await Linking.openSettings();
      }
    } catch (error) {
      logger.error("Erreur lors de l'ouverture des réglages:", error);
    }
  }, []);

  /**
   * Obtenir la position actuelle (si permission accordée)
   */
  const getCurrentPosition = useCallback(async (): Promise<{
    latitude: number;
    longitude: number;
    accuracy?: number;
  } | null> => {
    if (state.status !== 'granted' || !state.enabled) {
      logger.info(
        '[Location Permission] Position non disponible (permission non accordée ou désactivée)',
      );
      return null;
    }

    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy || undefined,
      };
    } catch (error) {
      logger.error('[Location Permission] Erreur lors de la récupération de la position:', error);
      return null;
    }
  }, [state]);

  return {
    status: state.status,
    asked: state.asked,
    enabled: state.enabled,
    isLoading,
    toggleLocation,
    requestPermission,
    openSettings,
    getCurrentPosition,
  };
}
