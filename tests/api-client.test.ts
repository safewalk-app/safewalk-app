import { describe, it, expect } from 'vitest';
import { getAPIUrl } from '../lib/services/api-client';

/**
 * Tests du client API
 * Note: Les tests de connectivité réseau sont skippés car ils nécessitent
 * un serveur en production accessible depuis l'environnement de test.
 */
describe('API Client', () => {
  it('should have getAPIUrl function available', () => {
    const apiUrl = getAPIUrl();
    console.log('🔗 API URL:', apiUrl || '(fallback utilisé)');

    // La fonction doit toujours retourner une URL valide (ou fallback)
    expect(apiUrl).toBeDefined();
    expect(typeof apiUrl).toBe('string');
    expect(apiUrl.length).toBeGreaterThan(0);
  });

  it('should return a valid URL format', () => {
    const apiUrl = getAPIUrl();

    // L'URL doit être au format HTTP/HTTPS
    expect(apiUrl).toMatch(/^https?:\/\//);
  });

  // Test de connectivité skippé - nécessite un serveur en production
  it.skip('should successfully call /api/sms/health (requires production server)', async () => {
    const { checkHealth } = await import('../lib/services/api-client');
    const result = await checkHealth();

    expect(result).toBeDefined();
    expect(result.ok).toBe(true);
    expect(result.service).toBe('SMS API');
    expect(result.twilioConfigured).toBe(true);

    console.log('✅ Health check réussi:', result);
  }, 10000);
});
