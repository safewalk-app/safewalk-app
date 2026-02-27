/**
 * Service de gestion de la privacy (position snapshot)
 *
 * Règles :
 * - Par défaut : "Position incluse uniquement en cas d'alerte"
 * - Pas de tracking continu obligatoire
 * - On stocke une dernière position connue (snapshot au start ou quand app ouverte)
 * - Position capturée uniquement en cas d'alerte SOS
 */

import * as Location from 'expo-location';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';

export interface LocationSnapshot {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  timestamp: number;
}

/**
 * Demander les permissions de localisation
 */
export async function requestLocationPermission(): Promise<boolean> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();

    if (status !== 'granted') {
      logger.warn('⚠️ Permission de localisation refusée');
      return false;
    }

    logger.info('✅ Permission de localisation accordée');
    return true;
  } catch (error) {
    logger.error('❌ Erreur lors de la demande de permission:', error);
    return false;
  }
}

/**
 * Obtenir la position actuelle (snapshot)
 */
export async function getLocationSnapshot(): Promise<LocationSnapshot | null> {
  try {
    // Vérifier la permission
    const { status } = await Location.getForegroundPermissionsAsync();

    if (status !== 'granted') {
      logger.warn('⚠️ Permission de localisation non accordée');
      return null;
    }

    // Obtenir la position avec timeout de 10 secondes
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
      timeout: 10000,
    });

    const snapshot: LocationSnapshot = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy,
      timestamp: location.timestamp,
    };

    logger.info('✅ Position capturée:', snapshot);
    return snapshot;
  } catch (error) {
    logger.error('❌ Erreur lors de la capture de position:', error);
    return null;
  }
}

/**
 * Sauvegarder la position dans un trip
 */
export async function saveLocationToTrip(
  tripId: string,
  location: LocationSnapshot,
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('trips')
      .update({
        last_lat: location.latitude,
        last_lng: location.longitude,
        last_seen_at: new Date(location.timestamp).toISOString(),
      })
      .eq('id', tripId);

    if (error) {
      logger.error('❌ Erreur lors de la sauvegarde de la position:', error);
      return false;
    }

    logger.info('✅ Position sauvegardée dans le trip');
    return true;
  } catch (error) {
    logger.error('❌ Erreur dans saveLocationToTrip:', error);
    return false;
  }
}

/**
 * Formater la position pour le SMS
 */
export function formatLocationForSms(location: LocationSnapshot): string {
  const lat = location.latitude.toFixed(6);
  const lng = location.longitude.toFixed(6);
  const accuracy = location.accuracy ? `±${Math.round(location.accuracy)}m` : 'précision inconnue';

  // Google Maps link
  const mapsUrl = `https://maps.google.com/?q=${lat},${lng}`;

  return `📍 Position: ${lat}, ${lng} (${accuracy})\n${mapsUrl}`;
}

/**
 * Obtenir la position du dernier trip
 */
export async function getLastTripLocation(tripId: string): Promise<LocationSnapshot | null> {
  try {
    const { data, error } = await supabase
      .from('trips')
      .select('last_lat, last_lng, last_seen_at')
      .eq('id', tripId)
      .single();

    if (error || !data || !data.last_lat || !data.last_lng) {
      logger.warn('⚠️ Position du trip non trouvée');
      return null;
    }

    return {
      latitude: data.last_lat,
      longitude: data.last_lng,
      accuracy: null,
      timestamp: new Date(data.last_seen_at).getTime(),
    };
  } catch (error) {
    logger.error('❌ Erreur dans getLastTripLocation:', error);
    return null;
  }
}

/**
 * Vérifier si le partage de position est activé pour un trip
 */
export async function isLocationSharingEnabled(tripId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('trips')
      .select('share_location')
      .eq('id', tripId)
      .single();

    if (error || !data) {
      logger.warn('⚠️ Trip non trouvé');
      return false;
    }

    return data.share_location || false;
  } catch (error) {
    logger.error('❌ Erreur dans isLocationSharingEnabled:', error);
    return false;
  }
}

/**
 * Désactiver le partage de position pour un trip
 */
export async function disableLocationSharing(tripId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('trips')
      .update({ share_location: false })
      .eq('id', tripId);

    if (error) {
      logger.error('❌ Erreur lors de la désactivation du partage:', error);
      return false;
    }

    logger.info('✅ Partage de position désactivé');
    return true;
  } catch (error) {
    logger.error('❌ Erreur dans disableLocationSharing:', error);
    return false;
  }
}
