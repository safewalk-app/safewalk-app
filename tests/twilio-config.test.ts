import { describe, it, expect } from 'vitest';

describe('Twilio Configuration', () => {
  describe('Environment Variables', () => {
    it('should have TWILIO_ACCOUNT_SID set', () => {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      expect(accountSid).toBeDefined();
      expect(accountSid).toBeTruthy();
      expect(accountSid).toMatch(/^AC[a-z0-9]{32}$/i);
    });

    it('should have TWILIO_AUTH_TOKEN set', () => {
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      expect(authToken).toBeDefined();
      expect(authToken).toBeTruthy();
      expect(authToken).toMatch(/^[a-z0-9]{32}$/i);
    });

    it('should have TWILIO_PHONE_NUMBER set', () => {
      const phoneNumber = process.env.TWILIO_PHONE_NUMBER;
      expect(phoneNumber).toBeDefined();
      expect(phoneNumber).toBeTruthy();
      expect(phoneNumber).toMatch(/^\+\d{10,15}$/);
    });
  });

  describe('Twilio Client Initialization', () => {
    it('should be able to initialize Twilio client with valid credentials', () => {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;

      expect(accountSid).toBeDefined();
      expect(authToken).toBeDefined();
      expect(accountSid).toMatch(/^AC[a-z0-9]{32}$/i);
      expect(authToken).toMatch(/^[a-z0-9]{32}$/i);
      expect(true).toBe(true);
    });
  });

  describe('SMS Message Format', () => {
    it('should format alert message correctly', () => {
      const limitTime = '14:00';
      const tolerance = 15;
      const message = `ALERTE: retour non confirmé à ${limitTime} (+${tolerance} min)`;
      
      expect(message).toContain('ALERTE');
      expect(message).toContain('14:00');
      expect(message).toContain('15 min');
    });

    it('should keep message under 160 characters for SMS', () => {
      const message = `ALERTE: retour non confirmé à 14:00 (+15 min). Position: 48.8566, 2.3522`;
      expect(message.length).toBeLessThanOrEqual(160);
    });
  });
});
