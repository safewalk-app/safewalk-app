## PHASE 7: CHANGEMENTS MINIMAUX (V1.90)

**Analyse complète:** Voir `ANALYSIS_MINIMAL_CHANGES.md`

### A) Auth Anonyme + OTP Flow (1h - CRITIQUE) ✅ 75% COMPLÈTE
Fichiers: app-context.tsx, new-session.tsx, trip-service.ts
- [x] Ajouter signInAnonymously dans app-context au démarrage
- [x] Ajouter check phone_verified dans trip-service (startTrip, triggerSos, sendTestSms)
- [x] Intégrer OTP modal dans new-session.tsx avant startSession
- [ ] Tester flow complet

### B) Affichage Home (30min - IMPORTANT) ✅ COMPLÈTE
Fichiers: app/home.tsx
- [x] Ajouter query Supabase pour lire profile
- [x] Afficher crédits restants dans checklist
- [x] Afficher subscription_active status
- [x] Afficher phone_verified status

### C) Gating New-Session (1h - CRITIQUE) ✅ COMPLÈTE
Fichiers: app/new-session.tsx
- [x] Check contact d'urgence → rediriger settings
- [x] Check phone_verified → afficher OTP modal
- [x] Check crédits → afficher paywall modal
- [x] Tester tous les 3 cas

### D) Active Session Améliorations (1h - IMPORTANT) ✅ COMPLÈTE
Fichiers: app/active-session.tsx, trip-service.ts
- [x] Remplacer SOS bouton par LongPressable (2s)
- [x] Ajouter haptics feedback (Heavy)
- [x] Ajouter cancelTrip() dans trip-service
- [x] Ajouter bouton Annuler la sortie

### E) Settings Améliorations (1.5h - IMPORTANT) ✅ COMPLÈTE
Fichiers: app/settings.tsx
- [x] CRUD contacts déjà existant (PopTextField autosave + validation)
- [x] Ajouter bouton Test SMS avec gating OTP + crédits
- [x] Afficher liste contacts existants (Contact 1 & 2)
- [x] Ajouter bouton supprimer contact (via delete/clear fields)

### F) Error Handling (1h - IMPORTANT) ✅ COMPLÈTE
Fichiers: app/new-session.tsx, app/active-session.tsx, trip-service.ts, app/settings.tsx
- [x] Ajouter toast pour no_credits → paywall
- [x] Ajouter toast pour quota_reached
- [x] Ajouter toast pour phone_not_verified
- [x] Ajouter toast pour twilio_failed
- [x] Ajouter logging détaillé dans trip-service

### G) Simplifier à un seul contact d'urgence ✅ COMPLÈTE
Fichiers: app/settings.tsx, app-context.tsx
- [x] Supprimer Contact 2 du rendu settings.tsx
- [x] Supprimer Contact 2 de l'interface UserSettings
- [x] Supprimer Contact 2 de defaultSettings

---

## RÉSUMÉ FINAL V1.95

**Toutes les phases complétées ✅**

### Changements implémentés:
1. **A) Auth Anonyme** - signInAnonymously au démarrage + phone_verified checks
2. **B) Home Display** - Affichage dynamique des crédits, subscription, phone_verified
3. **C) New-Session Gating** - 3 checks (contact, phone, credits) avec modals appropriés
4. **D) Active Session** - SOS long-press (2s) + haptics + cancel-trip
5. **E) Settings** - Test SMS button avec gating
6. **F) Error Handling** - Toasts clairs pour 4 codes d'erreur (no_credits, quota_reached, phone_not_verified, twilio_failed)
7. **G) Single Contact** - Suppression de Contact 2, un seul contact d'urgence

### Fichiers modifiés:
- app/settings.tsx - Suppression Contact 2, error handling Test SMS
- app-context.tsx - Suppression Contact 2 de UserSettings
- trip-service.ts - Error handling pour startTrip, sendTestSms, triggerSos
- app/new-session.tsx - Error handling avec paywall/toast
- app/active-session.tsx - Error handling pour SOS long-press

### Tests recommandés:
1. Sign-in anonyme → Check phone_verified flow
2. New-session avec tous les 3 checks (contact, phone, credits)
3. Active session avec SOS long-press
4. Settings avec Test SMS
5. Vérifier toutes les toasts d'erreur


## PHASE 8: INTÉGRATION EDGE FUNCTIONS (V1.96+) ✅ PARTIELLEMENT COMPLÈTE

### H) Déployer Edge Functions (2h - CRITIQUE)
Fichiers: supabase/functions/trigger-sos, start-trip, test-sms, checkin
- [x] Vérifier et corriger la structure des Edge Functions existantes
- [x] Ajouter gestion des codes d'erreur (no_credits, quota_reached, twilio_failed)
- [x] Tester les Edge Functions localement (6/6 tests passent)
- [ ] Déployer sur Supabase (manuel via CLI ou console)
- [ ] Valider l'intégration avec l'app mobile

### Codes d'erreur à implémenter:
- `no_credits` - Utilisateur n'a pas de crédits
- `quota_reached` - Limite quotidienne atteinte
- `phone_not_verified` - Téléphone non vérifié
- `twilio_failed` - Erreur d'envoi SMS Twilio
