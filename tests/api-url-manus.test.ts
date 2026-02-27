import { describe, it, expect } from 'vitest';

/**
 * Test: Vérifier la configuration de l'URL API Manus
 * Note: Les tests de connectivité réseau sont skippés car ils nécessitent
 * un serveur en production accessible depuis l'environnement de test.
 */
describe('API URL Manus Configuration', () => {
  it('should have EXPO_PUBLIC_API_URL format valid if configured', () => {
    const apiUrl = process.env.EXPO_PUBLIC_API_URL;
    console.log('🔗 EXPO_PUBLIC_API_URL:', apiUrl || '(non définie)');

    // L'URL peut être définie ou non selon l'environnement
    if (apiUrl) {
      expect(apiUrl).toMatch(/^https?:\/\//);
      // En environnement Manus, l'URL contient manus.computer
      if (apiUrl.includes('manus.computer')) {
        expect(apiUrl).toContain('3000');
      }
    } else {
      // En environnement de test local, on accepte que l'URL ne soit pas définie
      console.log('⏭️ EXPO_PUBLIC_API_URL non définie - test de format skippé');
      expect(true).toBe(true);
    }
  });

  // Test de connectivité skippé - nécessite un serveur en production
  it.skip('should be able to connect to Manus API server (requires production server)', async () => {
    const apiUrl = process.env.EXPO_PUBLIC_API_URL;
    if (!apiUrl) {
      console.warn('⚠️ EXPO_PUBLIC_API_URL not configured');
      return;
    }

    try {
      const response = await fetch(`${apiUrl}/api/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      console.log('📊 API Response Status:', response.status);
      expect(response.status).toBe(200);

      const data = await response.json();
      console.log('✅ API Health Check:', JSON.stringify(data, null, 2));
      expect(data.ok).toBe(true);
    } catch (error) {
      console.error('❌ Failed to connect to API:', error);
      throw error;
    }
  });
});
