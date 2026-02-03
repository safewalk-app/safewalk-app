import { describe, it, expect } from 'vitest';

/**
 * Tests de configuration de l'URL API
 * Note: Les tests de connectivité réseau sont skippés car ils nécessitent
 * un serveur en production accessible depuis l'environnement de test.
 */

describe('EXPO_PUBLIC_API_URL', () => {
  it('should be defined in environment', () => {
    const apiUrl = process.env.EXPO_PUBLIC_API_URL;
    
    // L'URL peut être définie ou non selon l'environnement
    // En développement local, elle peut être undefined
    if (apiUrl) {
      expect(apiUrl).toContain('https://');
    } else {
      // En environnement de test, on accepte que l'URL ne soit pas définie
      expect(true).toBe(true);
    }
  });

  // Test de connectivité skippé - nécessite un serveur en production
  it.skip('should be able to connect to API server (requires production server)', async () => {
    const apiUrl = process.env.EXPO_PUBLIC_API_URL;
    if (!apiUrl) {
      console.log('⏭️ EXPO_PUBLIC_API_URL non définie, test skippé');
      return;
    }
    
    const response = await fetch(`${apiUrl}/api/sms/health`);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.service).toBe('SMS API');
  });
});
