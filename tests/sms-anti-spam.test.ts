import { describe, it, expect, beforeEach } from 'vitest';
import { canSendSMS, resetSMSTimestamp, resetAllSMSTimestamps } from '../lib/utils';

describe('SMS Anti-Spam System', () => {
  beforeEach(() => {
    // Réinitialiser tous les timestamps avant chaque test
    resetAllSMSTimestamps();
  });

  describe('canSendSMS', () => {
    it('should allow first SMS send', () => {
      const result = canSendSMS('test-alert', 60);
      expect(result).toBe(true);
      console.log('✅ Premier SMS autorisé');
    });

    it('should block duplicate SMS within 60 seconds', () => {
      const first = canSendSMS('test-duplicate', 60);
      expect(first).toBe(true);
      
      // Tentative immédiate (devrait être bloquée)
      const second = canSendSMS('test-duplicate', 60);
      expect(second).toBe(false);
      console.log('✅ SMS dupliqué bloqué');
    });

    it('should allow SMS after interval expires', async () => {
      const first = canSendSMS('test-interval', 1); // 1 seconde
      expect(first).toBe(true);
      
      // Attendre 1.1 secondes
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      const second = canSendSMS('test-interval', 1);
      expect(second).toBe(true);
      console.log('✅ SMS autorisé après expiration de l\'intervalle');
    });

    it('should use different keys for different SMS types', () => {
      const alert1 = canSendSMS('alert', 60);
      const followup1 = canSendSMS('followup', 60);
      
      expect(alert1).toBe(true);
      expect(followup1).toBe(true);
      
      // Les deux types peuvent être envoyés simultanément
      const alert2 = canSendSMS('alert', 60);
      const followup2 = canSendSMS('followup', 60);
      
      expect(alert2).toBe(false); // Bloqué (même clé)
      expect(followup2).toBe(false); // Bloqué (même clé)
      console.log('✅ Clés différentes pour différents types de SMS');
    });

    it('should reset timestamp correctly', () => {
      const first = canSendSMS('test-reset', 60);
      expect(first).toBe(true);
      
      // Tentative immédiate (bloquée)
      const second = canSendSMS('test-reset', 60);
      expect(second).toBe(false);
      
      // Reset
      resetSMSTimestamp('test-reset');
      
      // Nouvelle tentative (autorisée)
      const third = canSendSMS('test-reset', 60);
      expect(third).toBe(true);
      console.log('✅ Reset timestamp fonctionne');
    });

    it('should handle custom intervals', () => {
      const first = canSendSMS('test-custom', 120); // 2 minutes
      expect(first).toBe(true);
      
      // Tentative immédiate (bloquée)
      const second = canSendSMS('test-custom', 120);
      expect(second).toBe(false);
      console.log('✅ Intervalle personnalisé fonctionne');
    });
  });

  describe('Integration with triggerAlert', () => {
    it('should prevent spam in alert SMS', () => {
      // Simuler 3 appels rapides à triggerAlert
      const calls = [
        canSendSMS('alert', 60),
        canSendSMS('alert', 60),
        canSendSMS('alert', 60),
      ];
      
      expect(calls[0]).toBe(true);  // Premier autorisé
      expect(calls[1]).toBe(false); // Deuxième bloqué
      expect(calls[2]).toBe(false); // Troisième bloqué
      console.log('✅ Spam dans triggerAlert prévenu');
    });

    it('should prevent spam in follow-up SMS', () => {
      // Simuler 3 appels rapides à sendFollowUpAlertSMS
      const calls = [
        canSendSMS('followup', 60),
        canSendSMS('followup', 60),
        canSendSMS('followup', 60),
      ];
      
      expect(calls[0]).toBe(true);  // Premier autorisé
      expect(calls[1]).toBe(false); // Deuxième bloqué
      expect(calls[2]).toBe(false); // Troisième bloqué
      console.log('✅ Spam dans follow-up SMS prévenu');
    });

    it('should prevent spam in SOS SMS', () => {
      // Simuler 3 appels rapides au bouton SOS
      const calls = [
        canSendSMS('sos', 60),
        canSendSMS('sos', 60),
        canSendSMS('sos', 60),
      ];
      
      expect(calls[0]).toBe(true);  // Premier autorisé
      expect(calls[1]).toBe(false); // Deuxième bloqué
      expect(calls[2]).toBe(false); // Troisième bloqué
      console.log('✅ Spam dans SOS prévenu');
    });
  });

  describe('Edge cases', () => {
    it('should handle rapid successive calls', () => {
      const results = [];
      for (let i = 0; i < 10; i++) {
        results.push(canSendSMS('rapid-test', 60));
      }
      
      // Seul le premier devrait passer
      expect(results[0]).toBe(true);
      expect(results.slice(1).every(r => r === false)).toBe(true);
      console.log('✅ Appels rapides successifs gérés correctement');
    });

    it('should allow different SMS types simultaneously', () => {
      const alert = canSendSMS('alert', 60);
      const followup = canSendSMS('followup', 60);
      const sos = canSendSMS('sos', 60);
      
      // Tous les 3 types peuvent être envoyés en même temps
      expect(alert).toBe(true);
      expect(followup).toBe(true);
      expect(sos).toBe(true);
      console.log('✅ Types de SMS différents peuvent être envoyés simultanément');
    });

    it('should handle zero interval correctly', () => {
      const first = canSendSMS('zero-interval', 0);
      expect(first).toBe(true);
      
      // Avec intervalle 0, le deuxième devrait aussi passer
      const second = canSendSMS('zero-interval', 0);
      expect(second).toBe(true);
      console.log('✅ Intervalle zéro géré correctement');
    });
  });
});
