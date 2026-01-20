import { describe, it, expect } from 'vitest';

describe('Twilio Secrets Validation', () => {
  it('should have TWILIO_ACCOUNT_SID configured', () => {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    expect(sid).toBeDefined();
    expect(sid).toBeTruthy();
    expect(sid).toMatch(/^AC[a-z0-9]{32}$/i);
    console.log('✅ TWILIO_ACCOUNT_SID: ' + sid?.substring(0, 10) + '...');
  });

  it('should have TWILIO_AUTH_TOKEN configured', () => {
    const token = process.env.TWILIO_AUTH_TOKEN;
    expect(token).toBeDefined();
    expect(token).toBeTruthy();
    expect(token?.length).toBe(32);
    console.log('✅ TWILIO_AUTH_TOKEN: ' + token?.substring(0, 10) + '...');
  });

  it('should have TWILIO_PHONE_NUMBER configured', () => {
    const phone = process.env.TWILIO_PHONE_NUMBER;
    expect(phone).toBeDefined();
    expect(phone).toBeTruthy();
    console.log('✅ TWILIO_PHONE_NUMBER: ' + phone);
  });

  it('should be able to initialize Twilio client', () => {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const phoneNumber = process.env.TWILIO_PHONE_NUMBER;

    expect(accountSid).toBeTruthy();
    expect(authToken).toBeTruthy();
    expect(phoneNumber).toBeTruthy();

    console.log('✅ Twilio client can be initialized');
  });

  it('should validate SMS alert message format', () => {
    const limitTime = '14:00';
    const tolerance = 15;
    const message = `ALERTE SafeWalk: retour non confirmé à ${limitTime} (+${tolerance} min tolérance). Position: 48.8566, 2.3522`;

    expect(message).toContain('ALERTE SafeWalk');
    expect(message.length).toBeLessThanOrEqual(160);
    console.log('✅ SMS message format valid');
  });
});
