# SafeWalk MVP READY - Résumé Exécutif

**Date:** 24 Février 2026  
**Status:** 🔴 7 BLOQUANTS IDENTIFIÉS  
**Priorité:** P0 (Fiabilité) + P1 (Sécurité)

---

## RÉSUMÉ

SafeWalk est une app de sécurité qui envoie des SMS d'alerte si l'utilisateur ne confirme pas son arrivée dans un délai défini. L'audit identifie **7 bloquants critiques** qui doivent être corrigés avant le MVP release.

**Problème Principal:** Le schéma DB est incomplet et les Edge Functions manquent de gating crédits, retry logic, et idempotence.

---

## BLOQUANTS (P0) - À CORRIGER AVANT MVP

### 1. 🔴 Colonnes Manquantes dans `sessions`
**Impact:** Impossible de tracker les alertes envoyées, risque de SMS dupliqués

**Colonnes Manquantes:**
- `alert_sent_at` - Critique pour idempotence (éviter 2x le même SMS)
- `checkin_at` - Tracker confirmation utilisateur
- `cancelled_at` - Tracker annulation
- `share_location` - Partage de localisation
- `destination_note` - Note utilisateur

**Action:** Appliquer `scripts/migrations-001-mvp-ready.sql`

---

### 2. 🔴 RPC `claim_overdue_trips` Manquant
**Impact:** Cron ne peut pas récupérer les trips overdue de manière sûre

**Requis:**
- Utiliser `FOR UPDATE SKIP LOCKED` pour éviter les race conditions
- Retourner les trips avec tous les détails (user, contact, phone, location)
- Mettre à jour `alert_sent_at` atomiquement

**Action:** Migration SQL inclut la création du RPC

---

### 3. 🔴 RPC `consume_credit` Incomplet
**Impact:** Pas de gating crédits, risque de burn Twilio

**Requis:**
- Vérifier que le user a des crédits ou une subscription active
- Vérifier les quotas journaliers (100 SMS/jour, 50 SOS/jour)
- Retourner les codes d'erreur standardisés: `no_credits`, `quota_reached`
- Décrémenter atomiquement

**Action:** Migration SQL inclut la création du RPC

---

### 4. 🔴 Pas de RLS Policies
**Impact:** Users peuvent lire/écrire les données des autres users

**Requis:**
- RLS sur `profiles`, `emergency_contacts`, `sessions`, `sms_logs`
- Users ne peuvent lire QUE leurs propres données
- Cron (service role) peut lire/écrire `cron_heartbeat`

**Action:** Migration SQL inclut les RLS policies

---

### 5. 🔴 Pas de Gating Crédits dans `start-trip`
**Impact:** Users sans crédits peuvent démarrer des sorties et burn Twilio

**Requis:**
- Vérifier `profiles.subscription_active` et `profiles.free_alerts_remaining`
- Retourner `errorCode: 'no_credits'` si pas de crédits
- Rediriger vers paywall côté client
- Consommer le crédit atomiquement

**Action:** Appliquer `supabase/functions/start-trip/patch-credit-gating.ts`

---

### 6. 🔴 Pas de Validation OTP Avant SMS Réel
**Impact:** Risk d'abus (spam SMS)

**Requis:**
- Vérifier que `profiles.phone_verified = true` avant d'envoyer SMS
- Implémenter OTP flow avant de marquer phone comme verified

**Action:** Vérifier que OTP verification est obligatoire dans le flow

---

### 7. 🔴 Pas de Idempotence dans Cron
**Impact:** Users reçoivent 2+ SMS pour la même deadline

**Requis:**
- Vérifier `sessions.alert_sent_at IS NULL` avant d'envoyer SMS
- Mettre à jour `alert_sent_at` atomiquement
- Cron doit être idempotent même s'il tourne 2x

**Action:** RPC `claim_overdue_trips` inclut le check `alert_sent_at IS NULL`

---

## IMPORTANTS (P1) - À CORRIGER RAPIDEMENT

### 1. 🟡 Pas de Retry Logic Twilio
**Impact:** SMS perdus si Twilio est temporairement down

**Requis:**
- Retry avec exponential backoff (1s, 2s, 4s)
- Max 3 retries
- Tracker `retry_count` et `retry_at` dans `sms_logs`

**Action:** Appliquer `supabase/functions/test-sms/patch-retry-logic.ts`

---

### 2. 🟡 Pas de Monitoring Cron
**Impact:** Impossible de détecter si le cron s'arrête

**Requis:**
- Créer `cron_heartbeat` table
- Logger chaque exécution du cron
- Alerter si cron n'a pas tourné depuis 5 minutes

**Action:** Migration SQL inclut `cron_heartbeat` table et RPC

---

### 3. 🟡 Pas de Validation E.164 Côté Serveur
**Impact:** Numéros invalides causent des erreurs Twilio

**Requis:**
- Valider format E.164 dans chaque Edge Function
- Rejeter les numéros invalides avant d'appeler Twilio
- Ajouter constraint DB: `phone_number ~ '^\+[1-9]\d{1,14}$'`

**Action:** Migration SQL inclut les constraints

---

### 4. 🟡 Pas de Debounce sur SOS
**Impact:** Users peuvent déclencher 2+ SOS en appuyant rapidement

**Requis:**
- Debounce min 1 second entre les SOS
- Afficher message "SOS envoyé" immédiatement
- Disable le bouton pendant 1 second

**Action:** Vérifier dans `use-sos.ts` hook

---

### 5. 🟡 Pas d'Indexes pour Performance
**Impact:** Cron lent, queries lentes

**Requis:**
- Index composite: `sessions(status, deadline, alert_sent_at)`
- Index: `sms_logs(user_id)`, `sms_logs(sms_type)`, `sessions(status)`

**Action:** Migration SQL inclut les indexes

---

### 6. 🟡 Pas d'Affichage Clair des Messages
**Impact:** Users ne savent pas ce qui va se passer

**Requis:**
- Afficher: "Alerte envoyée à [contact] si pas de confirmation dans [X minutes]"
- Afficher le countdown du temps restant
- Afficher les messages d'erreur en français

**Action:** Vérifier dans `app/active-session.tsx`

---

## MINEURS (P2) - À CORRIGER APRÈS MVP

### 1. Pas de Exponential Backoff Optimisé
- Ajuster les délais de retry selon le type d'erreur Twilio

### 2. Pas de SLA Défini
- Définir: alerte envoyée dans les 2 minutes après deadline

### 3. Pas de Monitoring/Alertes
- Intégrer Sentry ou Datadog
- Alerter sur les erreurs critiques

---

## LIVRABLES

### 1. ✅ Rapport d'Audit Complet
- `AUDIT_MVP_READY.md` - Analyse détaillée de chaque section

### 2. ✅ Migrations SQL
- `scripts/migrations-001-mvp-ready.sql` - Colonnes, indexes, RLS, RPC

### 3. ✅ Patches Edge Functions
- `supabase/functions/_shared/error-codes.ts` - Codes d'erreur standardisés
- `supabase/functions/start-trip/patch-credit-gating.ts` - Gating crédits
- `supabase/functions/test-sms/patch-retry-logic.ts` - Retry logic
- `supabase/functions/cron-check-deadlines/patch-heartbeat.ts` - Monitoring

### 4. ✅ Checklist de Validation
- `AUDIT_VALIDATION_CHECKLIST.md` - 12 cas limites à tester

---

## PLAN D'ACTION

### Semaine 1: Bloquants (P0)
1. Appliquer migrations SQL
2. Appliquer patches Edge Functions
3. Tester les 7 bloquants
4. Déployer en staging

### Semaine 2: Importants (P1)
1. Tester les 6 importants
2. Ajouter monitoring cron
3. Configurer alertes
4. Tester en production

### Semaine 3: Mineurs (P2) + MVP Release
1. Optimiser retry logic
2. Ajouter SLA monitoring
3. Documenter procédures
4. Release MVP

---

## RISQUES

### Risque 1: Cron S'Arrête
**Probabilité:** Moyenne  
**Impact:** Users ne reçoivent pas les alertes  
**Mitigation:** Heartbeat monitoring + alertes

### Risque 2: SMS Dupliqués
**Probabilité:** Haute (sans idempotence)  
**Impact:** Mauvaise UX, coûts Twilio  
**Mitigation:** `alert_sent_at` check + RPC atomique

### Risque 3: Abus SMS (Spam)
**Probabilité:** Haute (sans gating)  
**Impact:** Burn Twilio credits  
**Mitigation:** Gating crédits + quotas journaliers

### Risque 4: RLS Bypass
**Probabilité:** Moyenne  
**Impact:** Data leak, privacy violation  
**Mitigation:** RLS policies + audit logs

---

## CONCLUSION

SafeWalk a une bonne architecture de base mais manque de **fiabilité** (deadman switch, idempotence) et **sécurité** (RLS, gating crédits). Les 7 bloquants doivent être corrigés avant le MVP release.

**Effort Estimé:**
- Migrations SQL: 1-2 heures
- Edge Functions patches: 2-3 heures
- Testing: 4-6 heures
- **Total: 7-11 heures**

**Recommandation:** Appliquer tous les patches et tester les cas limites avant de déployer en production.

---

## CONTACTS

Pour des questions sur l'audit:
- Analyste: Manus (AI Agent)
- Date: 24 Février 2026
- Version: 1.0

