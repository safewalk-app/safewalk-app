import { describe, it, expect } from 'vitest';
import { validatePhoneNumber, formatPhoneNumber } from '../lib/utils';

describe('Phone Validation', () => {
  describe('validatePhoneNumber', () => {
    it('should accept valid French phone numbers', () => {
      expect(validatePhoneNumber('+33612345678')).toBe(true);
      expect(validatePhoneNumber('+33987654321')).toBe(true);
      expect(validatePhoneNumber('+33123456789')).toBe(true);
    });

    it('should reject invalid formats', () => {
      // Mauvais préfixe (non français)
      expect(validatePhoneNumber('+34612345678')).toBe(false);

      // Note: 0612345678 est VALIDE car c'est le format français local
      // La fonction validatePhoneNumber accepte les formats +33 ET 06/07
      expect(validatePhoneNumber('0612345678')).toBe(true); // format français local valide
      expect(validatePhoneNumber('0712345678')).toBe(true); // format français local valide
      expect(validatePhoneNumber('0512345678')).toBe(false); // 05 n'est pas mobile

      // Mauvaise longueur
      expect(validatePhoneNumber('+3361234567')).toBe(false); // trop court
      expect(validatePhoneNumber('+336123456789')).toBe(false); // trop long

      // Caractères invalides
      expect(validatePhoneNumber('+33 6 12 34 56 78')).toBe(false); // espaces
      expect(validatePhoneNumber('+33-6-12-34-56-78')).toBe(false); // tirets
      expect(validatePhoneNumber('+33.6.12.34.56.78')).toBe(false); // points

      // Vide ou null
      expect(validatePhoneNumber('')).toBe(false);
      expect(validatePhoneNumber('   ')).toBe(false);
    });

    it('should trim whitespace before validation', () => {
      expect(validatePhoneNumber('  +33612345678  ')).toBe(true);
      expect(validatePhoneNumber('\n+33612345678\n')).toBe(true);
    });
  });

  describe('formatPhoneNumber', () => {
    it('should format valid phone numbers', () => {
      expect(formatPhoneNumber('+33612345678')).toBe('+33 6 12 34 56 78');
      expect(formatPhoneNumber('+33987654321')).toBe('+33 9 87 65 43 21');
    });

    it('should return original for invalid numbers', () => {
      expect(formatPhoneNumber('invalid')).toBe('invalid');
      expect(formatPhoneNumber('+34612345678')).toBe('+34612345678');
      expect(formatPhoneNumber('')).toBe('');
    });
  });
});
