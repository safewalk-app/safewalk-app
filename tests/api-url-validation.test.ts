import { describe, it, expect } from 'vitest';

/**
 * Test de validation de l'URL API
 * Note: Les tests de connectivité réseau sont skippés car ils nécessitent
 * un serveur en production accessible depuis l'environnement de test.
 */
describe('API URL Validation', () => {
  const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://3000-example.us1.manus.computer';

  it('should have a valid API URL format', () => {
    expect(API_URL).toBeDefined();
    expect(API_URL).toMatch(/^https?:\/\//);
  });

  // Tests de connectivité skippés - nécessitent un serveur en production
  it.skip('should be able to reach the health endpoint (requires production server)', async () => {
    const response = await fetch(`${API_URL}/api/sms/health`);
    expect(response.ok).toBe(true);
    
    const data = await response.json();
    expect(data.ok).toBe(true);
    expect(data.service).toBe('SMS API');
    expect(data.twilioConfigured).toBe(true);
  });

  it.skip('should be able to send a test SMS (requires production server)', async () => {
    const response = await fetch(`${API_URL}/api/sms/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: '+33612345678',
        message: 'Test SafeWalk - Validation automatique',
      }),
    });

    expect(response.ok).toBe(true);
    
    const data = await response.json();
    expect(data.ok).toBe(true);
    expect(data.sid).toBeDefined();
    expect(data.status).toBeDefined();
  });
});
