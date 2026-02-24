# SafeWalk MVP READY - Validation Checklist

**Status:** 🔴 À VALIDER  
**Date:** 24 Février 2026

---

## PHASE 1: MIGRATIONS SQL

### Appliquer les migrations
- [ ] Exécuter `scripts/migrations-001-mvp-ready.sql` dans Supabase
- [ ] Vérifier que toutes les colonnes sont créées
- [ ] Vérifier que les indexes sont créés
- [ ] Vérifier que les RLS policies sont activées
- [ ] Vérifier que les RPC functions sont créées

### Vérifier les colonnes
```sql
-- Sessions table
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'sessions' 
ORDER BY column_name;
```
Expected columns:
- ✅ id, user_id, start_time, deadline, status
- ✅ location_latitude, location_longitude
- ✅ **alert_sent_at** (NEW)
- ✅ **checkin_at** (NEW)
- ✅ **cancelled_at** (NEW)
- ✅ **share_location** (NEW)
- ✅ **destination_note** (NEW)
- ✅ created_at, updated_at

```sql
-- Emergency contacts table
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'emergency_contacts' 
ORDER BY column_name;
```
Expected columns:
- ✅ id, user_id, name, phone_number
- ✅ **priority** (NEW)
- ✅ **opted_out** (NEW)
- ✅ created_at, updated_at

```sql
-- SMS logs table
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'sms_logs' 
ORDER BY column_name;
```
Expected columns:
- ✅ id, session_id, contact_id
- ✅ message_sid, status, error_message
- ✅ **user_id** (NEW)
- ✅ **sms_type** (NEW)
- ✅ **retry_count** (NEW)
- ✅ **retry_at** (NEW)
- ✅ created_at, updated_at

---

## PHASE 2: EDGE FUNCTIONS PATCHES

### Appliquer les patches
- [ ] Appliquer `patch-credit-gating.ts` à `start-trip/index.ts`
- [ ] Appliquer `patch-retry-logic.ts` à `test-sms/index.ts`
- [ ] Appliquer `patch-heartbeat.ts` à `cron-check-deadlines/index.ts`
- [ ] Appliquer `error-codes.ts` à `_shared/error-codes.ts`

### Vérifier les imports
- [ ] `start-trip` importe `validateUserCanStartTrip`
- [ ] `test-sms` importe `sendSmsWithRetry`, `validateUserCanSendTestSms`
- [ ] `cron-check-deadlines` importe `logCronHeartbeat`, `checkCronHealth`
- [ ] Tous les imports d'error codes sont corrects

---

## PHASE 3: CAS LIMITES À TESTER

### 3.1 Deadman Switch (App Killée)
**Scenario:** User starts a trip, app is killed, deadline is reached

**Steps:**
1. Sign in anonyme
2. Vérifier téléphone (OTP)
3. Ajouter contact d'urgence
4. Démarrer une sortie avec deadline = maintenant + 2 minutes
5. Tuer l'app (force stop)
6. Attendre 3 minutes
7. Vérifier que le SMS a été envoyé au contact

**Expected Result:**
- ✅ SMS reçu par le contact
- ✅ `sms_logs.status = 'sent'`
- ✅ `sessions.alert_sent_at` est défini
- ✅ Pas de SMS dupliqué même si cron tourne 2x

**Failure Modes:**
- ❌ SMS non reçu → Cron n'a pas tourné
- ❌ SMS dupliqué → Pas d'idempotence
- ❌ `alert_sent_at` NULL → Pas de tracking

---

### 3.2 Credits à 0
**Scenario:** User has no credits and tries to start a trip

**Steps:**
1. Sign in avec user ayant `free_alerts_remaining = 0` et `subscription_active = false`
2. Cliquer "Je sors"

**Expected Result:**
- ✅ Bouton "Je sors" est disabled
- ✅ Message d'erreur: "Crédits insuffisants"
- ✅ Redirection vers paywall
- ✅ Pas d'appel à `start-trip` Edge Function

**Failure Modes:**
- ❌ Bouton enabled → Pas de gating
- ❌ Session créée → Pas de vérification crédits
- ❌ Pas de paywall → UX manquante

---

### 3.3 Quota Atteint
**Scenario:** User has reached daily SMS quota

**Steps:**
1. Sign in avec user ayant `sms_daily_count >= sms_daily_limit`
2. Démarrer une sortie

**Expected Result:**
- ✅ `start-trip` retourne `errorCode: 'quota_reached'`
- ✅ Message d'erreur: "Limite atteinte aujourd'hui"
- ✅ Pas de SMS envoyé
- ✅ `sms_logs.status = 'failed'` avec `error_message = 'quota_reached'`

**Failure Modes:**
- ❌ Session créée → Pas de vérification quota
- ❌ SMS envoyé → Pas de respect du quota

---

### 3.4 Double Cron Run
**Scenario:** Cron runs twice for the same overdue trip

**Steps:**
1. Créer une session avec deadline = maintenant - 1 minute
2. Appeler `cron-check-deadlines` 2x rapidement
3. Vérifier les SMS logs

**Expected Result:**
- ✅ Un seul SMS envoyé (pas de dupliqué)
- ✅ `sessions.alert_sent_at` défini après la 1ère run
- ✅ 2ème run skips la session (car `alert_sent_at IS NOT NULL`)
- ✅ Cron heartbeat logs 2 exécutions

**Failure Modes:**
- ❌ 2 SMS envoyés → Pas d'idempotence
- ❌ `alert_sent_at` NULL → Pas de tracking

---

### 3.5 Twilio Down
**Scenario:** Twilio API is temporarily unavailable

**Steps:**
1. Mock Twilio API pour retourner 503 (Service Unavailable)
2. Appeler `test-sms` Edge Function
3. Vérifier les retries

**Expected Result:**
- ✅ 1ère tentative échoue (503)
- ✅ Retry avec exponential backoff (1s, 2s, 4s)
- ✅ Max 3 retries
- ✅ `sms_logs.retry_count = 3`
- ✅ `sms_logs.status = 'failed'` après max retries
- ✅ `sms_logs.error_message` contient le message Twilio

**Failure Modes:**
- ❌ Pas de retry → SMS perdu
- ❌ Retry infini → Boucle infinie
- ❌ Pas de backoff → Surcharge Twilio

---

### 3.6 Contact Opt-Out
**Scenario:** Emergency contact has opted out

**Steps:**
1. Créer une session avec deadline = maintenant - 1 minute
2. Mettre le contact à `opted_out = true`
3. Appeler `cron-check-deadlines`
4. Vérifier que le SMS n'est pas envoyé

**Expected Result:**
- ✅ Pas de SMS envoyé
- ✅ `sms_logs.status = 'failed'`
- ✅ `sms_logs.error_message = 'contact_opted_out'`

**Failure Modes:**
- ❌ SMS envoyé au contact opt-out → Pas de respect des préférences

---

### 3.7 Numéro Invalide
**Scenario:** Emergency contact has invalid phone number

**Steps:**
1. Créer un contact avec `phone_number = '123'` (invalid E.164)
2. Démarrer une sortie
3. Attendre la deadline
4. Vérifier que le SMS n'est pas envoyé

**Expected Result:**
- ✅ Validation E.164 côté serveur
- ✅ `sms_logs.status = 'failed'`
- ✅ `sms_logs.error_message = 'invalid_phone_format'`
- ✅ Pas d'appel Twilio

**Failure Modes:**
- ❌ SMS envoyé avec numéro invalide → Erreur Twilio
- ❌ Pas de validation → Mauvaise UX

---

### 3.8 Phone Not Verified
**Scenario:** User tries to start a trip without verifying phone

**Steps:**
1. Sign in anonyme
2. Cliquer "Je sors" SANS vérifier le téléphone

**Expected Result:**
- ✅ `start-trip` retourne `errorCode: 'phone_not_verified'`
- ✅ Message d'erreur: "Téléphone non vérifié"
- ✅ Pas de session créée
- ✅ Redirection vers OTP verification

**Failure Modes:**
- ❌ Session créée → Pas de vérification phone
- ❌ SMS envoyé sans vérification → Abus possible

---

### 3.9 SOS Long-Press
**Scenario:** User long-presses SOS button for 2 seconds

**Steps:**
1. Démarrer une sortie
2. Long-press le bouton SOS pendant 2 secondes
3. Vérifier que l'alerte est envoyée

**Expected Result:**
- ✅ Haptics feedback (Heavy) après 2 secondes
- ✅ Toast: "Alerte envoyée à [contact]"
- ✅ SMS reçu par le contact
- ✅ `sms_logs.sms_type = 'sos'`
- ✅ Pas de SMS dupliqué si on appuie 2x rapidement

**Failure Modes:**
- ❌ SMS envoyé avant 2 secondes → Anti-faux-clic manquant
- ❌ 2 SMS envoyés → Pas de debounce
- ❌ Pas de haptics → Pas de feedback

---

### 3.10 Checkin
**Scenario:** User confirms arrival before deadline

**Steps:**
1. Démarrer une sortie avec deadline = maintenant + 10 minutes
2. Cliquer "J'suis arrivé" avant la deadline
3. Vérifier que l'alerte n'est pas envoyée

**Expected Result:**
- ✅ `sessions.status = 'checked_in'`
- ✅ `sessions.checkin_at` défini
- ✅ Pas de SMS envoyé à la deadline
- ✅ Message: "Arrivée confirmée"

**Failure Modes:**
- ❌ SMS envoyé malgré le checkin → Pas de vérification status
- ❌ `checkin_at` NULL → Pas de tracking

---

### 3.11 Extend
**Scenario:** User extends deadline before it expires

**Steps:**
1. Démarrer une sortie avec deadline = maintenant + 5 minutes
2. Cliquer "Prolonger de 15 min" après 3 minutes
3. Attendre la deadline originale + 2 minutes
4. Vérifier que l'alerte n'est pas envoyée

**Expected Result:**
- ✅ `sessions.deadline` prolongée de 15 minutes
- ✅ Pas de SMS à la deadline originale
- ✅ Message: "Sortie prolongée jusqu'à [new time]"

**Failure Modes:**
- ❌ SMS envoyé à la deadline originale → Pas de mise à jour deadline
- ❌ Deadline non prolongée → Pas de persistence

---

### 3.12 Cron Health Check
**Scenario:** Monitor cron execution

**Steps:**
1. Vérifier `cron_heartbeat` table
2. Vérifier que `last_run_at` est à jour (< 5 minutes)
3. Vérifier que `status = 'success'`

**Expected Result:**
- ✅ Cron heartbeat updated every 1-2 minutes
- ✅ `processed`, `sent`, `failed` counts are accurate
- ✅ No error messages for successful runs

**Failure Modes:**
- ❌ `last_run_at` > 5 minutes → Cron n'a pas tourné
- ❌ `status = 'failed'` → Cron a échoué
- ❌ Pas de heartbeat → Pas de monitoring

---

## PHASE 4: TESTS MANUELS

### Test Flow Complet
1. **Sign In Anonyme**
   - [ ] Créer un compte anonyme
   - [ ] Recevoir un SMS OTP
   - [ ] Vérifier le téléphone

2. **Ajouter Contact d'Urgence**
   - [ ] Aller dans Settings
   - [ ] Ajouter un contact avec numéro valide
   - [ ] Tester SMS
   - [ ] Recevoir le SMS de test

3. **Démarrer une Sortie**
   - [ ] Cliquer "Je sors"
   - [ ] Définir la deadline (ex: +30 minutes)
   - [ ] Voir l'écran "Sortie en cours"
   - [ ] Affichage: "Alerte envoyée à [contact] si pas de confirmation"

4. **Confirmer Arrivée**
   - [ ] Cliquer "J'suis arrivé"
   - [ ] Voir le message "Arrivée confirmée"
   - [ ] Vérifier que pas de SMS à la deadline

5. **Prolonger la Sortie**
   - [ ] Démarrer une nouvelle sortie
   - [ ] Cliquer "Prolonger de 15 min"
   - [ ] Vérifier que la deadline est mise à jour

6. **Déclencher SOS**
   - [ ] Démarrer une nouvelle sortie
   - [ ] Long-press le bouton SOS pendant 2 secondes
   - [ ] Recevoir le SMS SOS
   - [ ] Vérifier que `sms_type = 'sos'`

---

## PHASE 5: MONITORING EN PRODUCTION

### Logs à Vérifier
- [ ] Supabase Edge Functions logs (errors, warnings)
- [ ] `cron_heartbeat` table (execution history)
- [ ] `sms_logs` table (SMS status, retry count, error messages)

### Métriques à Tracker
- [ ] Cron execution frequency (should be every 1-2 minutes)
- [ ] SMS success rate (should be > 99%)
- [ ] SMS latency (should be < 30 seconds from deadline)
- [ ] Error rate by type (phone_not_verified, no_credits, quota_reached, twilio_failed)

### Alertes à Configurer
- [ ] Cron hasn't run in 5 minutes
- [ ] SMS failure rate > 5%
- [ ] Twilio API errors
- [ ] Database connection errors

---

## RÉSUMÉ

### Bloquants (P0) - Avant MVP
- [ ] Migrations SQL appliquées
- [ ] RPC functions créées et testées
- [ ] Edge Functions patches appliqués
- [ ] Cas limites testés (deadman switch, credits, quota, double cron)
- [ ] RLS policies activées

### Importants (P1) - Avant production
- [ ] Cron health monitoring configuré
- [ ] SMS retry logic testé
- [ ] Phone validation E.164 testé
- [ ] Paywall gating testé
- [ ] SOS debounce testé

### Mineurs (P2) - Après MVP
- [ ] Exponential backoff optimisé
- [ ] SLA monitoring configuré
- [ ] Alertes Sentry/Datadog configurées
- [ ] Documentation utilisateur complète

---

## CHECKLIST FINALE

- [ ] Tous les P0 bloquants sont résolus
- [ ] Tous les P1 importants sont résolus
- [ ] Tous les cas limites sont testés
- [ ] Monitoring en production est configuré
- [ ] Documentation est à jour
- [ ] Équipe est formée sur les procédures d'escalade

**Status:** 🟢 READY FOR MVP RELEASE
