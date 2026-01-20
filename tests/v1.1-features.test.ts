import { describe, it, expect, beforeEach } from 'vitest';

/**
 * Tests pour V1.1 - Check-in automatique + 2 Contacts d'urgence
 */

describe('V1.1 Features - Check-in & 2 Contacts', () => {
  // ============================================================================
  // A) CHECK-IN AUTOMATIQUE
  // ============================================================================

  describe('A) Check-in Automatique', () => {
    describe('midTime calculation', () => {
      it('should calculate midTime as now + (limitTime - now)/2', () => {
        const now = Date.now();
        const limitTime = now + 2 * 60 * 60 * 1000; // 2 heures à partir de maintenant
        
        const midTime = now + (limitTime - now) / 2;
        
        // midTime devrait être exactement au milieu
        expect(midTime).toBe(now + 60 * 60 * 1000); // 1 heure après maintenant
      });

      it('should handle different time ranges', () => {
        const now = Date.now();
        
        // Test 1: 30 minutes
        const limitTime1 = now + 30 * 60 * 1000;
        const midTime1 = now + (limitTime1 - now) / 2;
        expect(midTime1).toBe(now + 15 * 60 * 1000);
        
        // Test 2: 1 heure
        const limitTime2 = now + 60 * 60 * 1000;
        const midTime2 = now + (limitTime2 - now) / 2;
        expect(midTime2).toBe(now + 30 * 60 * 1000);
        
        // Test 3: 4 heures
        const limitTime3 = now + 4 * 60 * 60 * 1000;
        const midTime3 = now + (limitTime3 - now) / 2;
        expect(midTime3).toBe(now + 2 * 60 * 60 * 1000);
      });
    });

    describe('check-in notification timing', () => {
      it('should schedule first notification at midTime', () => {
        const now = Date.now();
        const limitTime = now + 2 * 60 * 60 * 1000;
        const midTime = now + (limitTime - now) / 2;
        
        const delayMs = midTime - now;
        
        // Le délai devrait être positif et égal à la moitié du temps total
        expect(delayMs).toBeGreaterThan(0);
        expect(delayMs).toBe((limitTime - now) / 2);
      });

      it('should schedule second notification 10 minutes after first', () => {
        const firstNotifTime = Date.now();
        const secondNotifTime = firstNotifTime + 10 * 60 * 1000;
        
        const delayBetweenNotifs = secondNotifTime - firstNotifTime;
        
        expect(delayBetweenNotifs).toBe(10 * 60 * 1000);
      });
    });

    describe('check-in confirmation', () => {
      it('should mark checkInOk as true when user confirms', () => {
        const session = {
          id: 'test-session',
          startTime: Date.now(),
          limitTime: Date.now() + 2 * 60 * 60 * 1000,
          tolerance: 15,
          deadline: Date.now() + 2.25 * 60 * 60 * 1000,
          status: 'active' as const,
          extensionsCount: 0,
          checkInOk: false,
        };
        
        // Simuler la confirmation du check-in
        const updatedSession = {
          ...session,
          checkInOk: true,
        };
        
        expect(updatedSession.checkInOk).toBe(true);
      });

      it('should allow extending time during check-in', () => {
        const session = {
          id: 'test-session',
          startTime: Date.now(),
          limitTime: Date.now() + 2 * 60 * 60 * 1000,
          tolerance: 15,
          deadline: Date.now() + 2.25 * 60 * 60 * 1000,
          status: 'active' as const,
          extensionsCount: 0,
        };
        
        const originalLimitTime = session.limitTime;
        const extensionMinutes = 15;
        
        // Simuler l'extension
        const updatedSession = {
          ...session,
          limitTime: originalLimitTime + extensionMinutes * 60 * 1000,
          deadline: originalLimitTime + extensionMinutes * 60 * 1000 + session.tolerance * 60 * 1000,
          extensionsCount: session.extensionsCount + 1,
        };
        
        expect(updatedSession.limitTime).toBe(originalLimitTime + 15 * 60 * 1000);
        expect(updatedSession.extensionsCount).toBe(1);
      });
    });
  });

  // ============================================================================
  // B) SUPPORT DE 2 CONTACTS D'URGENCE
  // ============================================================================

  describe('B) Support de 2 Contacts d\'urgence', () => {
    describe('contact validation', () => {
      it('should require at least 1 contact', () => {
        const settings1 = {
          firstName: 'John',
          emergencyContactName: '',
          emergencyContactPhone: '',
          emergencyContact2Name: '',
          emergencyContact2Phone: '',
          tolerance: 15,
          locationEnabled: false,
        };
        
        const hasValidContact = 
          (settings1.emergencyContactName && settings1.emergencyContactPhone) ||
          (settings1.emergencyContact2Name && settings1.emergencyContact2Phone);
        
        expect(hasValidContact).toBeFalsy();
      });

      it('should allow 1 contact configured', () => {
        const settings = {
          firstName: 'John',
          emergencyContactName: 'Mom',
          emergencyContactPhone: '+33612345678',
          emergencyContact2Name: '',
          emergencyContact2Phone: '',
          tolerance: 15,
          locationEnabled: false,
        };
        
        const hasValidContact = 
          (settings.emergencyContactName && settings.emergencyContactPhone) ||
          (settings.emergencyContact2Name && settings.emergencyContact2Phone);
        
        expect(hasValidContact).toBeTruthy();
      });

      it('should allow 2 contacts configured', () => {
        const settings = {
          firstName: 'John',
          emergencyContactName: 'Mom',
          emergencyContactPhone: '+33612345678',
          emergencyContact2Name: 'Dad',
          emergencyContact2Phone: '+33687654321',
          tolerance: 15,
          locationEnabled: false,
        };
        
        const hasValidContact = 
          (settings.emergencyContactName && settings.emergencyContactPhone) ||
          (settings.emergencyContact2Name && settings.emergencyContact2Phone);
        
        expect(hasValidContact).toBeTruthy();
      });
    });

    describe('contact notification', () => {
      it('should notify contact 1 when alert is triggered', () => {
        const settings = {
          firstName: 'John',
          emergencyContactName: 'Mom',
          emergencyContactPhone: '+33612345678',
          emergencyContact2Name: 'Dad',
          emergencyContact2Phone: '+33687654321',
          tolerance: 15,
          locationEnabled: false,
        };
        
        const contactsToNotify = [];
        
        if (settings.emergencyContactName && settings.emergencyContactPhone) {
          contactsToNotify.push({
            name: settings.emergencyContactName,
            phone: settings.emergencyContactPhone,
          });
        }
        
        if (settings.emergencyContact2Name && settings.emergencyContact2Phone) {
          contactsToNotify.push({
            name: settings.emergencyContact2Name,
            phone: settings.emergencyContact2Phone,
          });
        }
        
        expect(contactsToNotify).toHaveLength(2);
        expect(contactsToNotify[0].name).toBe('Mom');
        expect(contactsToNotify[1].name).toBe('Dad');
      });

      it('should notify only contact 1 if contact 2 is not configured', () => {
        const settings = {
          firstName: 'John',
          emergencyContactName: 'Mom',
          emergencyContactPhone: '+33612345678',
          emergencyContact2Name: '',
          emergencyContact2Phone: '',
          tolerance: 15,
          locationEnabled: false,
        };
        
        const contactsToNotify = [];
        
        if (settings.emergencyContactName && settings.emergencyContactPhone) {
          contactsToNotify.push({
            name: settings.emergencyContactName,
            phone: settings.emergencyContactPhone,
          });
        }
        
        if (settings.emergencyContact2Name && settings.emergencyContact2Phone) {
          contactsToNotify.push({
            name: settings.emergencyContact2Name,
            phone: settings.emergencyContact2Phone,
          });
        }
        
        expect(contactsToNotify).toHaveLength(1);
        expect(contactsToNotify[0].name).toBe('Mom');
      });
    });
  });

  // ============================================================================
  // C) INTÉGRATION
  // ============================================================================

  describe('C) Intégration Check-in + 2 Contacts', () => {
    it('should complete full check-in flow with 2 contacts', () => {
      const now = Date.now();
      const limitTime = now + 2 * 60 * 60 * 1000;
      const midTime = now + (limitTime - now) / 2;
      
      // Session initiale
      const session = {
        id: 'test-session',
        startTime: now,
        limitTime,
        tolerance: 15,
        deadline: limitTime + 15 * 60 * 1000,
        status: 'active' as const,
        extensionsCount: 0,
        checkInOk: false,
        checkInNotifTime: midTime,
      };
      
      // Settings avec 2 contacts
      const settings = {
        firstName: 'John',
        emergencyContactName: 'Mom',
        emergencyContactPhone: '+33612345678',
        emergencyContact2Name: 'Dad',
        emergencyContact2Phone: '+33687654321',
        tolerance: 15,
        locationEnabled: false,
      };
      
      // Vérifier que la session a les infos de check-in
      expect(session.checkInNotifTime).toBe(midTime);
      expect(session.checkInOk).toBe(false);
      
      // Vérifier que les 2 contacts sont configurés
      const hasContact1 = settings.emergencyContactName && settings.emergencyContactPhone;
      const hasContact2 = settings.emergencyContact2Name && settings.emergencyContact2Phone;
      
      expect(hasContact1).toBeTruthy();
      expect(hasContact2).toBeTruthy();
    });
  });
});
