import { useState, useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import { Platform } from 'react-native';
import { logger } from '@/lib/logger';

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: number;
}

interface UseRealTimeLocationOptions {
  enabled?: boolean;
  updateInterval?: number; // en millisecondes
  minAccuracy?: number; // en mètres
}

/**
 * Hook pour obtenir la position GPS en temps réel
 * @param options Configuration optionnelle
 * @returns Position actuelle, erreur, et statut du chargement
 */
export function useRealTimeLocation(options: UseRealTimeLocationOptions = {}) {
  const {
    enabled = true,
    updateInterval = 5000, // 5 secondes par défaut
    minAccuracy = 50, // 50 mètres par défaut
  } = options;

  const [location, setLocation] = useState<LocationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const watchSubscriptionRef = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let isMounted = true;

    const startLocationTracking = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Vérifier la permission (ne PAS demander)
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status !== 'granted') {
          setError('Permission de localisation non accordée');
          setIsLoading(false);
          return;
        }

        // Obtenir la position initiale
        const initialLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

        if (isMounted) {
          setLocation({
            latitude: initialLocation.coords.latitude,
            longitude: initialLocation.coords.longitude,
            accuracy: initialLocation.coords.accuracy || undefined,
            timestamp: initialLocation.timestamp,
          });
        }

        // Configurer le suivi en temps réel
        const subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: updateInterval,
            distanceInterval: 10, // Mettre à jour si déplacement > 10m
          },
          (newLocation) => {
            if (isMounted) {
              // Vérifier la précision minimale
              if (!newLocation.coords.accuracy || newLocation.coords.accuracy <= minAccuracy) {
                setLocation({
                  latitude: newLocation.coords.latitude,
                  longitude: newLocation.coords.longitude,
                  accuracy: newLocation.coords.accuracy || undefined,
                  timestamp: newLocation.timestamp,
                });
              }
            }
          },
        );

        watchSubscriptionRef.current = subscription;
        setIsLoading(false);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erreur de géolocalisation';
        if (isMounted) {
          setError(errorMessage);
          setIsLoading(false);
        }
      }
    };

    startLocationTracking();

    return () => {
      isMounted = false;
      if (watchSubscriptionRef.current) {
        watchSubscriptionRef.current.remove();
        watchSubscriptionRef.current = null;
      }
    };
  }, [enabled, updateInterval, minAccuracy]);

  /**
   * Obtenir une snapshot unique de la position actuelle
   */
  const getSnapshot = async (): Promise<LocationData | null> => {
    try {
      // Vérifier la permission (ne PAS demander)
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        logger.info('[Location] Permission non accordée, position non disponible');
        return null;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      return {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        accuracy: currentLocation.coords.accuracy || undefined,
        timestamp: currentLocation.timestamp,
      };
    } catch (err) {
      logger.error('Erreur lors de la capture de position:', err);
      return null;
    }
  };

  /**
   * Générer un lien Google Maps pour la position
   */
  const getMapsLink = (loc?: LocationData): string => {
    const position = loc || location;
    if (!position) return '';
    return `https://maps.google.com/?q=${position.latitude},${position.longitude}`;
  };

  /**
   * Formater la position pour l'affichage
   */
  const formatLocation = (loc?: LocationData): string => {
    const position = loc || location;
    if (!position) return 'Position non disponible';
    return `${position.latitude.toFixed(4)}, ${position.longitude.toFixed(4)}`;
  };

  return {
    location,
    error,
    isLoading,
    getSnapshot,
    getMapsLink,
    formatLocation,
  };
}
