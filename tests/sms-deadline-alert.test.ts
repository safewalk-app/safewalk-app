import { describe, it, expect, beforeAll, afterAll } from 'vitest';

/**
 * Test: Vérifier que les SMS sont envoyés quand la deadline expire
 */
describe.skip('SMS Deadline Alert', () => {
  const API_URL = 'http://localhost:3000';
  const TEST_PHONE = '+33763458273';

  it('should send SMS alert when deadline is reached', async () => {
    const phoneNumbers = [TEST_PHONE];
    const limitTimeStr = new Date().toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
    const tolerance = 0;
    const location = { latitude: 48.8566, longitude: 2.3522 };

    console.log("📤 Envoi d'une alerte SMS...");

    const response = await fetch(`${API_URL}/api/sms/alert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumbers, limitTimeStr, tolerance, location }),
    });

    console.log('📊 Statut de la réponse:', response.status);
    expect(response.status).toBe(200);

    const data = await response.json();
    console.log('📋 Réponse:', JSON.stringify(data, null, 2));

    expect(data.success).toBe(true);
    console.log("✅ SMS d'alerte envoyé avec succès");
  });

  it('should reject empty phone numbers', async () => {
    const phoneNumbers: string[] = [];
    const limitTimeStr = '14:30';
    const tolerance = 0;

    const response = await fetch(`${API_URL}/api/sms/alert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumbers, limitTimeStr, tolerance }),
    });

    expect(response.status).toBe(400);
  });

  it('should handle multiple phone numbers', async () => {
    const phoneNumbers = ['+33763458273', '+33763458273'];
    const limitTimeStr = '14:30';
    const tolerance = 0;
    const location = { latitude: 48.8566, longitude: 2.3522 };

    const response = await fetch(`${API_URL}/api/sms/alert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumbers, limitTimeStr, tolerance, location }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
  });

  it('should send SMS with location data', async () => {
    const phoneNumbers = [TEST_PHONE];
    const limitTimeStr = '14:30';
    const tolerance = 0;
    const location = { latitude: 48.8566, longitude: 2.3522 };

    const response = await fetch(`${API_URL}/api/sms/alert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumbers, limitTimeStr, tolerance, location }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    console.log('✅ SMS envoyé avec position GPS');
  });
});
