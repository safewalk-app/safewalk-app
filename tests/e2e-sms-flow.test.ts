import { describe, it, expect } from 'vitest';
import { API_BASE_URL } from '../lib/config/api';

/**
 * Test End-to-End: Valider le flux complet SMS
 * Note: Les tests de connectivité réseau sont skippés car ils nécessitent
 * un serveur en production accessible depuis l'environnement de test.
 * Ces tests doivent être exécutés manuellement avec un serveur actif.
 */
describe('E2E SMS Flow', () => {
  it('should have API_BASE_URL configured', () => {
    console.log('🔗 API_BASE_URL:', API_BASE_URL);
    expect(API_BASE_URL).toBeDefined();
    expect(typeof API_BASE_URL).toBe('string');
    expect(API_BASE_URL.length).toBeGreaterThan(0);
  });

  it('should have valid API_BASE_URL format', () => {
    expect(API_BASE_URL).toMatch(/^https?:\/\//);
  });

  // Tests E2E skippés - nécessitent un serveur en production
  it.skip('should connect to API server (requires production server)', async () => {
    const { testApiConnection } = await import('../lib/config/api');
    const isConnected = await testApiConnection();
    expect(isConnected).toBe(true);
  });

  it.skip('should send friendly alert SMS (requires production server)', async () => {
    const params = {
      contacts: [{ name: 'Marie', phone: '+33763458273' }],
      userName: 'Ben',
      limitTimeStr: '02:30',
      location: { latitude: 48.8566, longitude: 2.3522 },
    };

    const response = await fetch(`${API_BASE_URL}/api/friendly-sms/alert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    console.log('📊 Response Status:', response.status);
    expect(response.status).toBe(200);

    const data = await response.json();
    console.log('✅ Response:', JSON.stringify(data, null, 2));
    expect(data.success).toBe(true);
  }, 10000);

  it.skip('should send follow-up SMS (requires production server)', async () => {
    const params = {
      contacts: [{ name: 'Marie', phone: '+33763458273' }],
      userName: 'Ben',
      location: { latitude: 48.8566, longitude: 2.3522 },
    };

    const response = await fetch(`${API_BASE_URL}/api/friendly-sms/follow-up`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    console.log('📊 Response Status:', response.status);
    expect(response.status).toBe(200);

    const data = await response.json();
    console.log('✅ Response:', JSON.stringify(data, null, 2));
    expect(data.success).toBe(true);
  }, 10000);

  it.skip('should send confirmation SMS (requires production server)', async () => {
    const params = {
      contacts: [{ name: 'Marie', phone: '+33763458273' }],
      userName: 'Ben',
    };

    const response = await fetch(`${API_BASE_URL}/api/friendly-sms/confirmation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    console.log('📊 Response Status:', response.status);
    expect(response.status).toBe(200);

    const data = await response.json();
    console.log('✅ Response:', JSON.stringify(data, null, 2));
    expect(data.success).toBe(true);
  }, 10000);
});
