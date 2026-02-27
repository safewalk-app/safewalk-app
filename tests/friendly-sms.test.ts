import { describe, it, expect } from 'vitest';

/**
 * Test: Vérifier que les SMS friendly sont envoyés avec personnalisation
 */
describe.skip('Friendly SMS', () => {
  const API_URL = 'http://localhost:3000';

  it('should send SMS with user name and location', async () => {
    const params = {
      contacts: [
        { name: 'Marie', phone: '+33763458273' },
        { name: 'Pierre', phone: '+33763458273' },
      ],
      userName: 'Ben',
      limitTimeStr: '02:30',
      location: { latitude: 48.8566, longitude: 2.3522 },
    };

    console.log("📤 Envoi d'une alerte SMS friendly...");

    const response = await fetch(`${API_URL}/api/friendly-sms/alert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    console.log('📊 Statut de la réponse:', response.status);
    expect(response.status).toBe(200);

    const data = await response.json();
    console.log('📋 Réponse:', JSON.stringify(data, null, 2));

    expect(data.success).toBe(true);
    expect(data.results).toBeDefined();
    expect(Array.isArray(data.results)).toBe(true);
    console.log('✅ SMS friendly envoyés avec succès');
  });

  it('should send SMS with note', async () => {
    const params = {
      contacts: [{ name: 'Marie', phone: '+33763458273' }],
      userName: 'Ben',
      limitTimeStr: '02:30',
      note: 'Soirée chez Karim.',
      location: { latitude: 48.8566, longitude: 2.3522 },
    };

    const response = await fetch(`${API_URL}/api/friendly-sms/alert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    console.log('✅ SMS avec note envoyé avec succès');
  });

  it('should send SMS without location', async () => {
    const params = {
      contacts: [{ name: 'Marie', phone: '+33763458273' }],
      userName: 'Ben',
      limitTimeStr: '02:30',
    };

    const response = await fetch(`${API_URL}/api/friendly-sms/alert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    console.log('✅ SMS sans localisation envoyé avec succès');
  });

  it('should reject missing userName', async () => {
    const params = {
      contacts: [{ name: 'Marie', phone: '+33763458273' }],
      limitTimeStr: '02:30',
    };

    const response = await fetch(`${API_URL}/api/friendly-sms/alert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    expect(response.status).toBe(400);
  });

  it('should reject empty contacts', async () => {
    const params = {
      contacts: [],
      userName: 'Ben',
      limitTimeStr: '02:30',
    };

    const response = await fetch(`${API_URL}/api/friendly-sms/alert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    expect(response.status).toBe(400);
  });
});
