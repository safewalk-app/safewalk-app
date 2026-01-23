import { describe, it, expect } from 'vitest';
import { API_BASE_URL, testApiConnection } from '../lib/config/api';

/**
 * Test End-to-End: Valider le flux complet SMS
 */
describe('E2E SMS Flow', () => {
  it('should have API_BASE_URL configured', () => {
    console.log('🔗 API_BASE_URL:', API_BASE_URL);
    expect(API_BASE_URL).toBeDefined();
    expect(API_BASE_URL).toContain('manus.computer');
  });

  it('should connect to API server', async () => {
    const isConnected = await testApiConnection();
    expect(isConnected).toBe(true);
  });

  it('should send friendly alert SMS', async () => {
    const params = {
      contacts: [
        { name: 'Marie', phone: '+33763458273' },
      ],
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
  }, 10000); // Timeout 10 secondes

  it('should send follow-up SMS', async () => {
    const params = {
      contacts: [
        { name: 'Marie', phone: '+33763458273' },
      ],
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
  }, 10000); // Timeout 10 secondes

  it('should send confirmation SMS', async () => {
    const params = {
      contacts: [
        { name: 'Marie', phone: '+33763458273' },
      ],
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
  }, 10000); // Timeout 10 secondes
});
