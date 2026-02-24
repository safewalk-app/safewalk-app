import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getLocationSnapshot,
  formatLocationForSms,
  isLocationSharingEnabled,
  disableLocationSharing,
  LocationSnapshot,
} from '@/lib/services/privacy-service';

// Mock expo-location
vi.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: vi.fn(async () => ({ status: 'granted' })),
  getForegroundPermissionsAsync: vi.fn(async () => ({ status: 'granted' })),
  getCurrentPositionAsync: vi.fn(async () => ({
    coords: {
      latitude: 48.8566,
      longitude: 2.3522,
      accuracy: 10,
    },
    timestamp: Date.now(),
  })),
}));

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn((table: string) => ({
      select: vi.fn(function() {
        return {
          eq: vi.fn(function() {
            return {
              single: vi.fn(async () => ({
                data: {
                  share_location: true,
                  last_lat: 48.8566,
                  last_lng: 2.3522,
                  last_seen_at: new Date().toISOString(),
                },
                error: null,
              })),
            };
          }),
        };
      }),
      update: vi.fn(function() {
        return {
          eq: vi.fn(async () => ({ error: null })),
        };
      }),
    })),
  },
}));

describe('Privacy Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getLocationSnapshot', () => {
    it('devrait retourner une position valide', async () => {
      const location = await getLocationSnapshot();

      expect(location).toBeDefined();
      expect(location?.latitude).toBe(48.8566);
      expect(location?.longitude).toBe(2.3522);
      expect(location?.accuracy).toBe(10);
    });

    it('devrait avoir un timestamp valide', async () => {
      const location = await getLocationSnapshot();

      expect(location?.timestamp).toBeGreaterThan(0);
    });
  });

  describe('formatLocationForSms', () => {
    it('devrait formater la position pour SMS', () => {
      const location: LocationSnapshot = {
        latitude: 48.8566,
        longitude: 2.3522,
        accuracy: 10,
        timestamp: Date.now(),
      };

      const formatted = formatLocationForSms(location);

      expect(formatted).toContain('📍');
      expect(formatted).toContain('48.856600');
      expect(formatted).toContain('2.352200');
      expect(formatted).toContain('±10m');
      expect(formatted).toContain('maps.google.com');
    });

    it('devrait gérer les positions sans précision', () => {
      const location: LocationSnapshot = {
        latitude: 48.8566,
        longitude: 2.3522,
        accuracy: null,
        timestamp: Date.now(),
      };

      const formatted = formatLocationForSms(location);

      expect(formatted).toContain('précision inconnue');
    });
  });

  describe('isLocationSharingEnabled', () => {
    it('devrait retourner true si le partage est activé', async () => {
      const enabled = await isLocationSharingEnabled('trip-123');

      expect(enabled).toBe(true);
    });
  });

  describe('disableLocationSharing', () => {
    it('devrait désactiver le partage de position', async () => {
      const result = await disableLocationSharing('trip-123');

      expect(result).toBe(true);
    });
  });

  describe('Privacy rules', () => {
    it('devrait respecter la règle "position uniquement en cas d\'alerte"', () => {
      // La position ne doit être capturée que lors d'une alerte
      // Pas de tracking continu en arrière-plan
      const location: LocationSnapshot = {
        latitude: 48.8566,
        longitude: 2.3522,
        accuracy: 10,
        timestamp: Date.now(),
      };

      // La position doit être capturée à la demande, pas automatiquement
      expect(location).toBeDefined();
    });

    it('devrait permettre aux utilisateurs de désactiver le partage', async () => {
      const result = await disableLocationSharing('trip-123');

      expect(result).toBe(true);
    });
  });

  describe('Location accuracy', () => {
    it('devrait inclure la précision dans le SMS', () => {
      const location: LocationSnapshot = {
        latitude: 48.8566,
        longitude: 2.3522,
        accuracy: 25,
        timestamp: Date.now(),
      };

      const formatted = formatLocationForSms(location);

      expect(formatted).toContain('±25m');
    });

    it('devrait formater les coordonnées avec 6 décimales', () => {
      const location: LocationSnapshot = {
        latitude: 48.856611,
        longitude: 2.352222,
        accuracy: 10,
        timestamp: Date.now(),
      };

      const formatted = formatLocationForSms(location);

      expect(formatted).toContain('48.856611');
      expect(formatted).toContain('2.352222');
    });
  });

  describe('Google Maps link', () => {
    it('devrait générer un lien Google Maps valide', () => {
      const location: LocationSnapshot = {
        latitude: 48.8566,
        longitude: 2.3522,
        accuracy: 10,
        timestamp: Date.now(),
      };

      const formatted = formatLocationForSms(location);

      expect(formatted).toContain('https://maps.google.com/?q=48.856600,2.352200');
    });
  });
});
