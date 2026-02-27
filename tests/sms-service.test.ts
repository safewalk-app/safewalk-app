import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendEmergencySMS } from '../lib/services/sms-service';

// Mock de sendSMS
vi.mock('../lib/services/api-client', () => ({
  sendSMS: vi.fn(async (to: string, message: string) => {
    console.log(`[MOCK] sendSMS appelé avec to=${to}, message length=${message.length}`);

    // Simuler un succès
    return {
      ok: true,
      sid: 'SM_MOCK_' + Date.now(),
    };
  }),
}));

describe('SMS Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should send test SMS with correct format', async () => {
    const result = await sendEmergencySMS({
      reason: 'test',
      contactName: 'Jean',
      contactPhone: '0612345678',
      firstName: 'Marie',
    });

    expect(result.ok).toBe(true);
    expect(result.sid).toBeDefined();
    expect(result.sid).toContain('SM_MOCK_');
    console.log('✅ Test SMS validé:', result);
  });

  it('should send alert SMS with location', async () => {
    const result = await sendEmergencySMS({
      reason: 'alert',
      contactName: 'Jean',
      contactPhone: '0612345678',
      firstName: 'Marie',
      note: 'Retour du travail',
      location: {
        latitude: 48.8566,
        longitude: 2.3522,
      },
    });

    expect(result.ok).toBe(true);
    expect(result.sid).toBeDefined();
    console.log('✅ Alerte SMS validé:', result);
  });

  it('should send SOS SMS with location', async () => {
    const result = await sendEmergencySMS({
      reason: 'sos',
      contactName: 'Jean',
      contactPhone: '0612345678',
      firstName: 'Marie',
      location: {
        latitude: 48.8566,
        longitude: 2.3522,
      },
    });

    expect(result.ok).toBe(true);
    expect(result.sid).toBeDefined();
    console.log('✅ SOS SMS validé:', result);
  });

  it('should normalize French phone numbers to E.164', async () => {
    const { sendSMS } = await import('../lib/services/api-client');

    await sendEmergencySMS({
      reason: 'test',
      contactName: 'Jean',
      contactPhone: '06 12 34 56 78', // Format français avec espaces
      firstName: 'Marie',
    });

    // Vérifier que sendSMS a été appelé avec +33612345678
    expect(sendSMS).toHaveBeenCalledWith('+33612345678', expect.any(String));

    console.log('✅ Normalisation E.164 validée');
  });

  it('should reject invalid phone numbers', async () => {
    const result = await sendEmergencySMS({
      reason: 'test',
      contactName: 'Jean',
      contactPhone: '123', // Numéro invalide
      firstName: 'Marie',
    });

    expect(result.ok).toBe(false);
    expect(result.error).toContain('invalide');
    console.log('✅ Validation numéro invalide OK:', result.error);
  });
});
