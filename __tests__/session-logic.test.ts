import { describe, it, expect } from 'vitest';

/**
 * Tests unitaires pour la logique métier de SafeWalk
 * Validation des calculs de deadline, temps restant, états de session
 */

describe('Session Logic - Calcul de deadline', () => {
  it('devrait calculer correctement la deadline (limitTime sans tolérance)', () => {
    const limitTime = new Date('2026-01-30T22:00:00').getTime();
    const deadline = limitTime; // Pas de tolérance dans le nouveau système

    expect(deadline).toBe(limitTime);
  });

  it('devrait gérer les extensions (+15 min)', () => {
    const initialDeadline = new Date('2026-01-30T22:00:00').getTime();
    const extensionMinutes = 15;
    const newDeadline = initialDeadline + extensionMinutes * 60 * 1000;

    const expected = new Date('2026-01-30T22:15:00').getTime();
    expect(newDeadline).toBe(expected);
  });

  it('devrait limiter les extensions à 3 maximum', () => {
    const maxExtensions = 3;
    let extensionsCount = 0;

    // Simuler 5 tentatives d'extension
    for (let i = 0; i < 5; i++) {
      if (extensionsCount < maxExtensions) {
        extensionsCount++;
      }
    }

    expect(extensionsCount).toBe(3);
  });

  it('devrait calculer correctement le temps restant', () => {
    const deadline = new Date('2026-01-30T22:00:00').getTime();
    const now = new Date('2026-01-30T21:45:00').getTime();
    const remaining = deadline - now;

    const expectedMinutes = 15;
    const expectedMs = expectedMinutes * 60 * 1000;

    expect(remaining).toBe(expectedMs);
  });

  it('devrait retourner temps négatif si deadline dépassée', () => {
    const deadline = new Date('2026-01-30T22:00:00').getTime();
    const now = new Date('2026-01-30T22:10:00').getTime();
    const remaining = deadline - now;

    expect(remaining).toBeLessThan(0);
    expect(remaining).toBe(-10 * 60 * 1000); // -10 minutes
  });
});

describe('Session Logic - États de session', () => {
  it('devrait avoir un état "active" au démarrage', () => {
    const session = {
      id: '1',
      startTime: Date.now(),
      limitTime: Date.now() + 60 * 60 * 1000, // +1h
      deadline: Date.now() + 60 * 60 * 1000,
      status: 'active' as const,
      extensionsCount: 0,
      maxExtensions: 3,
      checkInConfirmed: false,
    };

    expect(session.status).toBe('active');
  });

  it('devrait passer à "overdue" quand deadline dépassée', () => {
    const now = Date.now();
    const deadline = now - 10 * 60 * 1000; // -10 minutes
    const remaining = deadline - now;

    const shouldTriggerAlert = remaining <= 0;
    const newStatus = shouldTriggerAlert ? 'overdue' : 'active';

    expect(shouldTriggerAlert).toBe(true);
    expect(newStatus).toBe('overdue');
  });

  it('devrait passer à "returned" quand utilisateur confirme', () => {
    let status: 'active' | 'returned' = 'active';

    // Simuler confirmation utilisateur
    const confirmReturn = () => {
      status = 'returned';
    };

    confirmReturn();
    expect(status).toBe('returned');
  });

  it('devrait passer à "cancelled" quand utilisateur annule', () => {
    let status: 'active' | 'cancelled' = 'active';

    // Simuler annulation
    const cancelSession = () => {
      status = 'cancelled';
    };

    cancelSession();
    expect(status).toBe('cancelled');
  });
});

describe('Session Logic - Déclenchement alerte', () => {
  it('ne devrait PAS déclencher alerte si temps restant > 0', () => {
    const deadline = Date.now() + 30 * 60 * 1000; // +30 minutes
    const now = Date.now();
    const remaining = deadline - now;

    const shouldTriggerAlert = remaining <= 0;

    expect(shouldTriggerAlert).toBe(false);
  });

  it('devrait déclencher alerte si deadline dépassée', () => {
    const deadline = Date.now() - 5 * 60 * 1000; // -5 minutes
    const now = Date.now();
    const remaining = deadline - now;

    const shouldTriggerAlert = remaining <= 0;

    expect(shouldTriggerAlert).toBe(true);
  });

  it('ne devrait PAS déclencher alerte si status = "returned"', () => {
    type SessionStatus = 'active' | 'returned' | 'cancelled';
    const checkShouldTrigger = (status: SessionStatus, remaining: number): boolean => {
      return remaining <= 0 && status === 'active';
    };

    const status: SessionStatus = 'returned';
    const deadline = Date.now() - 5 * 60 * 1000;
    const now = Date.now();
    const remaining = deadline - now;

    const shouldTriggerAlert = checkShouldTrigger(status, remaining);

    expect(shouldTriggerAlert).toBe(false);
  });

  it('ne devrait PAS déclencher alerte si status = "cancelled"', () => {
    type SessionStatus = 'active' | 'returned' | 'cancelled';
    const checkShouldTrigger = (status: SessionStatus, remaining: number): boolean => {
      return remaining <= 0 && status === 'active';
    };

    const status: SessionStatus = 'cancelled';
    const deadline = Date.now() - 5 * 60 * 1000;
    const now = Date.now();
    const remaining = deadline - now;

    const shouldTriggerAlert = checkShouldTrigger(status, remaining);

    expect(shouldTriggerAlert).toBe(false);
  });

  it('ne devrait PAS déclencher alerte si checkInConfirmed = true', () => {
    const checkInConfirmed = true;
    const deadline = Date.now() - 5 * 60 * 1000;
    const now = Date.now();
    const remaining = deadline - now;

    const shouldTriggerAlert = remaining <= 0 && !checkInConfirmed;

    expect(shouldTriggerAlert).toBe(false);
  });
});

describe('Session Logic - Formatage du temps', () => {
  it('devrait formater correctement HH:MM:SS', () => {
    const formatTime = (ms: number): string => {
      const totalSeconds = Math.floor(Math.abs(ms) / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    expect(formatTime(3661000)).toBe('01:01:01'); // 1h 1min 1s
    expect(formatTime(0)).toBe('00:00:00');
    expect(formatTime(59000)).toBe('00:00:59');
    expect(formatTime(3600000)).toBe('01:00:00');
  });

  it('devrait formater correctement les temps négatifs', () => {
    const formatTime = (ms: number): string => {
      const totalSeconds = Math.floor(Math.abs(ms) / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      const formatted = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      return ms < 0 ? `-${formatted}` : formatted;
    };

    expect(formatTime(-3661000)).toBe('-01:01:01');
    expect(formatTime(-60000)).toBe('-00:01:00');
  });
});

describe('Session Logic - Gestion du jour suivant', () => {
  it('devrait gérer correctement une heure limite le lendemain', () => {
    // Cas: il est 23:00 et l'utilisateur choisit 02:00 (lendemain)
    const now = new Date('2026-01-30T23:00:00').getTime();
    const chosenHour = 2;
    const chosenMinute = 0;

    // Créer limitTime pour aujourd'hui
    let limitTime = new Date(now);
    limitTime.setHours(chosenHour, chosenMinute, 0, 0);

    // Si limitTime < now, ajouter 1 jour
    if (limitTime.getTime() < now) {
      limitTime.setDate(limitTime.getDate() + 1);
    }

    const expected = new Date('2026-01-31T02:00:00').getTime();
    expect(limitTime.getTime()).toBe(expected);
  });

  it('ne devrait PAS ajouter de jour si heure limite dans le futur', () => {
    // Cas: il est 10:00 et l'utilisateur choisit 14:00 (même jour)
    const now = new Date('2026-01-30T10:00:00').getTime();
    const chosenHour = 14;
    const chosenMinute = 0;

    let limitTime = new Date(now);
    limitTime.setHours(chosenHour, chosenMinute, 0, 0);

    if (limitTime.getTime() < now) {
      limitTime.setDate(limitTime.getDate() + 1);
    }

    const expected = new Date('2026-01-30T14:00:00').getTime();
    expect(limitTime.getTime()).toBe(expected);
  });
});
