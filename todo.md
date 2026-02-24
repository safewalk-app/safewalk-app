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

### C) Gating New-Session (1h - CRITIQUE)
Fichiers: app/new-session.tsx
- [ ] Check contact d'urgence → rediriger settings
- [ ] Check phone_verified → afficher OTP modal
- [ ] Check crédits → afficher paywall modal
- [ ] Tester tous les 3 cas

### D) Active Session Améliorations (1h - IMPORTANT)
Fichiers: app/active-session.tsx, trip-service.ts
- [ ] Remplacer SOS bouton par LongPressable (2s)
- [ ] Ajouter haptics feedback (Heavy)
- [ ] Ajouter cancelTrip() dans trip-service
- [ ] Ajouter bouton Annuler la sortie

### E) Settings Améliorations (1.5h - IMPORTANT)
Fichiers: app/settings.tsx
- [ ] Ajouter form pour créer/modifier contact principal
- [ ] Ajouter bouton Test SMS avec gating OTP + crédits
- [ ] Afficher liste contacts existants
- [ ] Ajouter bouton supprimer contact

### F) Error Handling (1h - IMPORTANT)
Fichiers: app/new-session.tsx, app/active-session.tsx, trip-service.ts
- [ ] Ajouter toast pour no_credits → paywall
- [ ] Ajouter toast pour quota_reached
- [ ] Ajouter toast pour phone_not_verified
- [ ] Ajouter toast pour twilio_failed
- [ ] Ajouter logging détaillé dans trip-service
