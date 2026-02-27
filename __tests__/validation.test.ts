import { describe, it, expect } from 'vitest';

/**
 * Tests unitaires pour la validation des données SafeWalk
 * Validation des numéros de téléphone, contacts d'urgence, etc.
 */

describe('Validation - Numéros de téléphone', () => {
  const isValidPhoneNumber = (phone: string): boolean => {
    // Format E.164: +[country code][number]
    // Minimum 8 chiffres après le +, maximum 15 chiffres au total
    // Exemples valides: +33612345678, +14155552671
    // Exemples invalides: +3361 (trop court), +0612345678 (commence par 0)
    const e164Regex = /^\+[1-9]\d{7,14}$/;
    return e164Regex.test(phone);
  };

  it('devrait accepter un numéro français valide (+33)', () => {
    expect(isValidPhoneNumber('+33612345678')).toBe(true);
    expect(isValidPhoneNumber('+33763558273')).toBe(true);
  });

  it('devrait accepter un numéro américain valide (+1)', () => {
    expect(isValidPhoneNumber('+14155552671')).toBe(true);
  });

  it('devrait accepter un numéro britannique valide (+44)', () => {
    expect(isValidPhoneNumber('+447911123456')).toBe(true);
  });

  it('devrait rejeter un numéro sans +', () => {
    expect(isValidPhoneNumber('33612345678')).toBe(false);
    expect(isValidPhoneNumber('0612345678')).toBe(false);
  });

  it('devrait rejeter un numéro trop court', () => {
    expect(isValidPhoneNumber('+3361')).toBe(false);
  });

  it('devrait rejeter un numéro trop long', () => {
    expect(isValidPhoneNumber('+336123456789012345')).toBe(false);
  });

  it('devrait rejeter un numéro avec des caractères invalides', () => {
    expect(isValidPhoneNumber('+33 6 12 34 56 78')).toBe(false);
    expect(isValidPhoneNumber('+33-6-12-34-56-78')).toBe(false);
    expect(isValidPhoneNumber('+33(6)12345678')).toBe(false);
  });

  it('devrait rejeter une chaîne vide', () => {
    expect(isValidPhoneNumber('')).toBe(false);
  });

  it('devrait rejeter un numéro commençant par +0', () => {
    expect(isValidPhoneNumber('+0612345678')).toBe(false);
  });
});

describe('Validation - Formatage des numéros', () => {
  const formatPhoneNumber = (phone: string): string => {
    // Supprimer tous les espaces, tirets, parenthèses
    let cleaned = phone.replace(/[\s\-\(\)]/g, '');

    // Ajouter + si manquant et commence par un chiffre
    if (!cleaned.startsWith('+') && /^\d/.test(cleaned)) {
      // Si commence par 0, remplacer par +33 (France)
      if (cleaned.startsWith('0')) {
        cleaned = '+33' + cleaned.substring(1);
      } else if (cleaned.startsWith('33')) {
        cleaned = '+' + cleaned;
      } else {
        cleaned = '+' + cleaned;
      }
    }

    return cleaned;
  };

  it('devrait formater un numéro français avec espaces', () => {
    expect(formatPhoneNumber('06 12 34 56 78')).toBe('+33612345678');
  });

  it('devrait formater un numéro français avec tirets', () => {
    expect(formatPhoneNumber('06-12-34-56-78')).toBe('+33612345678');
  });

  it('devrait formater un numéro français commençant par 0', () => {
    expect(formatPhoneNumber('0612345678')).toBe('+33612345678');
  });

  it('devrait formater un numéro français commençant par 33', () => {
    expect(formatPhoneNumber('33612345678')).toBe('+33612345678');
  });

  it('ne devrait pas modifier un numéro déjà au format E.164', () => {
    expect(formatPhoneNumber('+33612345678')).toBe('+33612345678');
  });

  it('devrait supprimer les parenthèses', () => {
    expect(formatPhoneNumber('+33(6)12345678')).toBe('+33612345678');
  });
});

describe("Validation - Contact d'urgence", () => {
  interface EmergencyContact {
    name: string;
    phone: string;
  }

  const isValidContact = (contact: EmergencyContact): boolean => {
    const hasName = contact.name.trim().length > 0;
    const hasValidPhone = /^\+[1-9]\d{1,14}$/.test(contact.phone);
    return hasName && hasValidPhone;
  };

  it('devrait accepter un contact valide', () => {
    const contact: EmergencyContact = {
      name: 'Marie Dupont',
      phone: '+33612345678',
    };
    expect(isValidContact(contact)).toBe(true);
  });

  it('devrait rejeter un contact sans nom', () => {
    const contact: EmergencyContact = {
      name: '',
      phone: '+33612345678',
    };
    expect(isValidContact(contact)).toBe(false);
  });

  it('devrait rejeter un contact avec nom vide (espaces)', () => {
    const contact: EmergencyContact = {
      name: '   ',
      phone: '+33612345678',
    };
    expect(isValidContact(contact)).toBe(false);
  });

  it('devrait rejeter un contact avec numéro invalide', () => {
    const contact: EmergencyContact = {
      name: 'Marie Dupont',
      phone: '0612345678',
    };
    expect(isValidContact(contact)).toBe(false);
  });

  it('devrait rejeter un contact sans nom ni numéro', () => {
    const contact: EmergencyContact = {
      name: '',
      phone: '',
    };
    expect(isValidContact(contact)).toBe(false);
  });
});

describe('Validation - Prénom utilisateur', () => {
  const isValidFirstName = (firstName: string): boolean => {
    const trimmed = firstName.trim();
    return trimmed.length > 0 && trimmed.length <= 50;
  };

  it('devrait accepter un prénom valide', () => {
    expect(isValidFirstName('Marie')).toBe(true);
    expect(isValidFirstName('Jean-Pierre')).toBe(true);
    expect(isValidFirstName('François')).toBe(true);
  });

  it('devrait rejeter un prénom vide', () => {
    expect(isValidFirstName('')).toBe(false);
    expect(isValidFirstName('   ')).toBe(false);
  });

  it('devrait rejeter un prénom trop long', () => {
    const longName = 'A'.repeat(51);
    expect(isValidFirstName(longName)).toBe(false);
  });

  it('devrait accepter un prénom avec espaces aux extrémités', () => {
    expect(isValidFirstName('  Marie  ')).toBe(true);
  });
});

describe('Validation - Coordonnées GPS', () => {
  interface Coordinates {
    latitude: number;
    longitude: number;
  }

  const isValidCoordinates = (coords: Coordinates): boolean => {
    const validLat = coords.latitude >= -90 && coords.latitude <= 90;
    const validLon = coords.longitude >= -180 && coords.longitude <= 180;
    return validLat && validLon;
  };

  it('devrait accepter des coordonnées valides (Paris)', () => {
    const paris: Coordinates = {
      latitude: 48.8566,
      longitude: 2.3522,
    };
    expect(isValidCoordinates(paris)).toBe(true);
  });

  it('devrait accepter des coordonnées valides (New York)', () => {
    const newYork: Coordinates = {
      latitude: 40.7128,
      longitude: -74.006,
    };
    expect(isValidCoordinates(newYork)).toBe(true);
  });

  it('devrait accepter des coordonnées aux limites', () => {
    expect(isValidCoordinates({ latitude: 90, longitude: 180 })).toBe(true);
    expect(isValidCoordinates({ latitude: -90, longitude: -180 })).toBe(true);
  });

  it('devrait rejeter une latitude invalide (> 90)', () => {
    expect(isValidCoordinates({ latitude: 91, longitude: 0 })).toBe(false);
  });

  it('devrait rejeter une latitude invalide (< -90)', () => {
    expect(isValidCoordinates({ latitude: -91, longitude: 0 })).toBe(false);
  });

  it('devrait rejeter une longitude invalide (> 180)', () => {
    expect(isValidCoordinates({ latitude: 0, longitude: 181 })).toBe(false);
  });

  it('devrait rejeter une longitude invalide (< -180)', () => {
    expect(isValidCoordinates({ latitude: 0, longitude: -181 })).toBe(false);
  });
});

describe('Validation - Message SMS', () => {
  const isValidSMSMessage = (message: string): boolean => {
    const trimmed = message.trim();
    // SMS standard: max 160 caractères
    // SMS avec données (position): max 1600 caractères
    return trimmed.length > 0 && trimmed.length <= 1600;
  };

  it('devrait accepter un message SMS court', () => {
    expect(isValidSMSMessage("ALERTE: je n'ai pas confirmé mon retour.")).toBe(true);
  });

  it('devrait accepter un message SMS avec position', () => {
    const message =
      "ALERTE: je n'ai pas confirmé mon retour. Heure limite: 22:00, tolérance: 15 min. Position: https://maps.google.com/?q=48.8566,2.3522";
    expect(isValidSMSMessage(message)).toBe(true);
  });

  it('devrait rejeter un message vide', () => {
    expect(isValidSMSMessage('')).toBe(false);
    expect(isValidSMSMessage('   ')).toBe(false);
  });

  it('devrait rejeter un message trop long', () => {
    const longMessage = 'A'.repeat(1601);
    expect(isValidSMSMessage(longMessage)).toBe(false);
  });
});
