import { useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import { tripService } from '@/lib/services/trip-service';

export interface LocationTrackingState {
  isTracking: boolean;
  lastLocation: { lat: number; lng: number } | null;
  lastSentAt: Date | null;
  error: string | null;
  isLoading: boolean;
}

export interface UseLocationTrackingOptions {
  tripId: string;
  enabled: boolean;
  intervalMs?: number; // Default: 45000 (45 seconds)
  onError?: (error: string) => void;
}

/**
 * Hook pour tracker la position GPS et envoyer les pings automatiquement
 * 
 * Utilise expo-location pour obtenir la position et tripService.pingLocation()
 * pour envoyer les pings à Supabase
 */
export function useLocationTracking(options: UseLocationTrackingOptions) {
  const { tripId, enabled, intervalMs = 45000, onError } = options;

  const [state, setState] = useState<LocationTrackingState>({
    isTracking: false,
    lastLocation: null,
    lastSentAt: null,
    error: null,
    isLoading: false,
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const locationSubscriptionRef = useRef<Location.LocationSubscription | null>(null);

  // Fonction pour envoyer un ping de location
  const sendLocationPing = async (lat: number, lng: number) => {
    try {
      setState((prev) => ({ ...prev, isLoading: true }));

      const result = await tripService.pingLocation({
        tripId,
        lat,
        lng,
      });

      if (result.success) {
        setState((prev) => ({
          ...prev,
          lastLocation: { lat, lng },
          lastSentAt: new Date(),
          error: null,
          isLoading: false,
        }));
      } else {
        const errorMsg = result.error || 'Failed to send location';
        setState((prev) => ({
          ...prev,
          error: errorMsg,
          isLoading: false,
        }));
        onError?.(errorMsg);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setState((prev) => ({
        ...prev,
        error: errorMsg,
        isLoading: false,
      }));
      onError?.(errorMsg);
    }
  };

  // Fonction pour démarrer le tracking
  const startTracking = async () => {
    try {
      // Demander les permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        const errorMsg = 'Location permission denied';
        setState((prev) => ({
          ...prev,
          error: errorMsg,
        }));
        onError?.(errorMsg);
        return;
      }

      setState((prev) => ({ ...prev, isTracking: true, error: null }));

      // Envoyer une première position immédiatement
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      if (location) {
        await sendLocationPing(
          location.coords.latitude,
          location.coords.longitude
        );
      }

      // Configurer l'intervalle pour envoyer les pings
      intervalRef.current = setInterval(async () => {
        try {
          const currentLocation = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });

          if (currentLocation) {
            await sendLocationPing(
              currentLocation.coords.latitude,
              currentLocation.coords.longitude
            );
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Failed to get location';
          setState((prev) => ({
            ...prev,
            error: errorMsg,
          }));
          onError?.(errorMsg);
        }
      }, intervalMs);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to start tracking';
      setState((prev) => ({
        ...prev,
        error: errorMsg,
        isTracking: false,
      }));
      onError?.(errorMsg);
    }
  };

  // Fonction pour arrêter le tracking
  const stopTracking = async () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (locationSubscriptionRef.current) {
      locationSubscriptionRef.current.remove();
      locationSubscriptionRef.current = null;
    }

    setState((prev) => ({
      ...prev,
      isTracking: false,
    }));
  };

  // Démarrer/arrêter le tracking en fonction de `enabled`
  useEffect(() => {
    if (enabled && !state.isTracking) {
      startTracking();
    } else if (!enabled && state.isTracking) {
      stopTracking();
    }

    return () => {
      if (state.isTracking) {
        stopTracking();
      }
    };
  }, [enabled, tripId]);

  return {
    ...state,
    startTracking,
    stopTracking,
  };
}
