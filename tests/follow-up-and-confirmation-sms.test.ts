import { describe, it, expect } from 'vitest';

/**
 * Test: Vérifier que les SMS de relance et confirmation sont envoyés correctement
 */
describe.skip('Follow-up and Confirmation SMS', () => {
  const API_URL = 'http://localhost:3000';

  it('should send follow-up SMS after 10 minutes', async () => {
    const params = {
      contacts: [{ name: 'Marie', phone: '+33763458273' }],
      userName: 'Ben',
      location: { latitude: 48.8566, longitude: 2.3522 },
    };

    console.log("📤 Envoi d'une relance SMS...");

    const response = await fetch(`${API_URL}/api/friendly-sms/follow-up`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    console.log('📊 Statut de la réponse:', response.status);
    expect(response.status).toBe(200);

    const data = await response.json();
    console.log('📋 Réponse:', JSON.stringify(data, null, 2));

    expect(data.success).toBe(true);
    expect(Array.isArray(data.results)).toBe(true);
    console.log('✅ SMS de relance envoyé avec succès');
  });

  it('should send follow-up SMS without location', async () => {
    const params = {
      contacts: [{ name: 'Marie', phone: '+33763458273' }],
      userName: 'Ben',
    };

    const response = await fetch(`${API_URL}/api/friendly-sms/follow-up`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    console.log('✅ SMS de relance sans localisation envoyé avec succès');
  });

  it('should send confirmation SMS', async () => {
    const params = {
      contacts: [
        { name: 'Marie', phone: '+33763458273' },
        { name: 'Pierre', phone: '+33763458273' },
      ],
      userName: 'Ben',
    };

    console.log("📤 Envoi d'un SMS de confirmation...");

    const response = await fetch(`${API_URL}/api/friendly-sms/confirmation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    console.log('📊 Statut de la réponse:', response.status);
    expect(response.status).toBe(200);

    const data = await response.json();
    console.log('📋 Réponse:', JSON.stringify(data, null, 2));

    expect(data.success).toBe(true);
    expect(Array.isArray(data.results)).toBe(true);
    console.log('✅ SMS de confirmation envoyé avec succès');
  });

  it('should reject follow-up SMS without userName', async () => {
    const params = {
      contacts: [{ name: 'Marie', phone: '+33763458273' }],
    };

    const response = await fetch(`${API_URL}/api/friendly-sms/follow-up`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    expect(response.status).toBe(400);
  });

  it('should reject confirmation SMS without userName', async () => {
    const params = {
      contacts: [{ name: 'Marie', phone: '+33763458273' }],
    };

    const response = await fetch(`${API_URL}/api/friendly-sms/confirmation`, {
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
    };

    const response = await fetch(`${API_URL}/api/friendly-sms/follow-up`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    expect(response.status).toBe(400);
  });
});
