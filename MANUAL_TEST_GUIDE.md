# SafeWalk - Manuel de Test Manuel (12 Cas Limites)

**Objectif:** Valider que tous les 12 cas limites fonctionnent correctement en production

**Durée estimée:** 2-3 heures  
**Environnement:** Staging ou Production avec données de test  
**Outils requis:** Téléphone avec Expo Go, Supabase console, logs

---

## Préparation

### 1. Créer des Comptes de Test

```bash
# Compte 1: User with credits
- Email: test-credits@safewalk.app
- Phone: +33612345678 (verified)
- Credits: 10
- Contact: +33698765432

# Compte 2: User without credits
- Email: test-nocredits@safewalk.app
- Phone: +33612345679 (verified)
- Credits: 0
- Contact: +33698765433

# Compte 3: User not verified
- Email: test-notverified@safewalk.app
- Phone: +33612345680 (NOT verified)
- Credits: 10
- Contact: +33698765434
```

### 2. Configurer Twilio Mock (optionnel)

Pour tester les erreurs Twilio sans envoyer de vrais SMS:
- Utiliser Twilio Sandbox (numéro +1 415-523-8886)
- Ou mock les réponses Twilio dans les tests

### 3. Ouvrir les Logs Supabase

```
Supabase Console → Functions → Logs
Supabase Console → Database → sms_logs table
Supabase Console → Database → cron_heartbeat table
```

---

## Test 1: Deadman Switch - App Tuée

**Objectif:** Vérifier que le SMS est envoyé quand l'app est tuée

### Étapes

1. **Sign in** avec Compte 1 (credits)
2. **Vérifier téléphone** (OTP)
3. **Ajouter contact d'urgence** (+33698765432)
4. **Démarrer une sortie**
   - Deadline: Maintenant + 2 minutes
   - Partage localisation: OUI
5. **Tuer l'app** (force stop)
6. **Attendre 3 minutes**
7. **Vérifier les logs**

### Vérifications

- [ ] SMS reçu au contact (+33698765432)
- [ ] `sms_logs.status = 'sent'`
- [ ] `sms_logs.sms_type = 'alert'`
- [ ] `sessions.alert_sent_at IS NOT NULL`
- [ ] Pas de SMS dupliqué

### Logs à Vérifier

```sql
-- Vérifier SMS envoyé
SELECT id, status, sms_type, created_at 
FROM sms_logs 
WHERE user_id = 'test-credits' 
ORDER BY created_at DESC LIMIT 5;

-- Vérifier session
SELECT id, status, alert_sent_at, deadline 
FROM sessions 
WHERE user_id = 'test-credits' 
ORDER BY created_at DESC LIMIT 1;
```

---

## Test 2: Credits à Zéro

**Objectif:** Vérifier que l'app rejette start-trip sans crédits

### Étapes

1. **Sign in** avec Compte 2 (no credits)
2. **Vérifier téléphone**
3. **Cliquer "Je sors"**

### Vérifications

- [ ] Message d'erreur: "Crédits insuffisants"
- [ ] Pas de session créée
- [ ] Redirection vers paywall
- [ ] Bouton "Je sors" disabled

### Logs à Vérifier

```sql
-- Vérifier qu'aucune session n'a été créée
SELECT COUNT(*) FROM sessions 
WHERE user_id = 'test-nocredits' 
AND created_at > NOW() - INTERVAL '5 minutes';
-- Expected: 0
```

---

## Test 3: Quota Atteint

**Objectif:** Vérifier que le quota journalier est respecté

### Étapes

1. **Créer un compte de test** avec `sms_daily_count = 100` (limite)
2. **Vérifier téléphone**
3. **Cliquer "Je sors"**

### Vérifications

- [ ] Message d'erreur: "Limite atteinte aujourd'hui"
- [ ] Pas de session créée
- [ ] `errorCode: 'quota_reached'`

### Logs à Vérifier

```sql
-- Vérifier le quota
SELECT sms_daily_count, sms_daily_limit 
FROM profiles 
WHERE id = 'test-quota';
```

---

## Test 4: Double Cron Run

**Objectif:** Vérifier que le cron est idempotent

### Étapes

1. **Créer une session** avec deadline = maintenant - 1 minute
2. **Appeler cron-check-deadlines 2x rapidement**
   ```bash
   curl -X POST https://[project].supabase.co/functions/v1/cron-check-deadlines \
     -H "x-cron-secret: [secret]"
   ```
3. **Vérifier les SMS logs**

### Vérifications

- [ ] Un seul SMS envoyé (pas de dupliqué)
- [ ] `sessions.alert_sent_at` défini après 1ère run
- [ ] 2ème run skips la session (idempotence)
- [ ] 2 entries dans `cron_heartbeat` (2 exécutions)

### Logs à Vérifier

```sql
-- Vérifier SMS unique
SELECT COUNT(*) FROM sms_logs 
WHERE session_id = '[session_id]' 
AND sms_type = 'alert' 
AND status = 'sent';
-- Expected: 1

-- Vérifier heartbeat
SELECT function_name, last_run_at, status, processed, sent 
FROM cron_heartbeat 
WHERE function_name = 'cron-check-deadlines' 
ORDER BY created_at DESC LIMIT 2;
-- Expected: 2 rows, both status = 'success'
```

---

## Test 5: Twilio Down

**Objectif:** Vérifier que les retries fonctionnent

### Étapes

1. **Mock Twilio pour retourner 503**
   - Utiliser un proxy ou modifier les tests
2. **Appeler test-sms**
3. **Vérifier les retries**

### Vérifications

- [ ] 1ère tentative échoue (503)
- [ ] Retries avec exponential backoff (1s, 2s, 4s)
- [ ] Max 3 retries
- [ ] `sms_logs.retry_count = 3`
- [ ] `sms_logs.status = 'failed'` après max retries

### Logs à Vérifier

```sql
-- Vérifier retry tracking
SELECT id, retry_count, retry_at, status, error_message 
FROM sms_logs 
WHERE sms_type = 'test' 
ORDER BY created_at DESC LIMIT 1;
```

---

## Test 6: Contact Opt-Out

**Objectif:** Vérifier que les contacts opt-out ne reçoivent pas de SMS

### Étapes

1. **Créer un contact** avec `opted_out = true`
2. **Créer une session** avec deadline = maintenant - 1 minute
3. **Appeler cron-check-deadlines**

### Vérifications

- [ ] Pas de SMS envoyé
- [ ] `sms_logs.status = 'failed'`
- [ ] `sms_logs.error_message` contient 'opted_out'

### Logs à Vérifier

```sql
-- Vérifier contact opt-out
SELECT id, opted_out FROM emergency_contacts 
WHERE user_id = '[user_id]';

-- Vérifier pas de SMS
SELECT COUNT(*) FROM sms_logs 
WHERE contact_id = '[contact_id]' 
AND status = 'sent';
-- Expected: 0
```

---

## Test 7: Numéro Invalide

**Objectif:** Vérifier que les numéros invalides sont rejetés

### Étapes

1. **Créer un contact** avec `phone_number = '123'` (invalide)
2. **Créer une session** avec deadline = maintenant - 1 minute
3. **Appeler cron-check-deadlines**

### Vérifications

- [ ] Validation E.164 côté serveur
- [ ] Pas de SMS envoyé
- [ ] `sms_logs.status = 'failed'`
- [ ] `sms_logs.error_message = 'Invalid phone number format'`

### Logs à Vérifier

```sql
-- Vérifier numéro invalide
SELECT phone_number FROM emergency_contacts 
WHERE id = '[contact_id]';

-- Vérifier pas de SMS
SELECT COUNT(*) FROM sms_logs 
WHERE contact_id = '[contact_id]' 
AND status = 'sent';
-- Expected: 0
```

---

## Test 8: Phone Not Verified

**Objectif:** Vérifier que les users non vérifiés ne peuvent pas démarrer

### Étapes

1. **Sign in** avec Compte 3 (not verified)
2. **Cliquer "Je sors"** SANS vérifier le téléphone

### Vérifications

- [ ] Message d'erreur: "Téléphone non vérifié"
- [ ] Pas de session créée
- [ ] `errorCode: 'phone_not_verified'`
- [ ] Redirection vers OTP verification

### Logs à Vérifier

```sql
-- Vérifier phone_verified
SELECT phone_verified FROM profiles 
WHERE id = 'test-notverified';
-- Expected: false

-- Vérifier pas de session
SELECT COUNT(*) FROM sessions 
WHERE user_id = 'test-notverified' 
AND created_at > NOW() - INTERVAL '5 minutes';
-- Expected: 0
```

---

## Test 9: SOS Long-Press

**Objectif:** Vérifier que le SOS nécessite 2 secondes

### Étapes

1. **Démarrer une sortie**
2. **Long-press le bouton SOS pendant 2 secondes**
3. **Vérifier le SMS**

### Vérifications

- [ ] Haptics feedback (Heavy) après 2 secondes
- [ ] Toast: "Alerte envoyée à [contact]"
- [ ] SMS reçu par le contact
- [ ] `sms_logs.sms_type = 'sos'`
- [ ] Pas de SMS dupliqué si on appuie 2x rapidement

### Logs à Vérifier

```sql
-- Vérifier SOS SMS
SELECT id, sms_type, status, created_at 
FROM sms_logs 
WHERE sms_type = 'sos' 
AND user_id = '[user_id]' 
ORDER BY created_at DESC LIMIT 1;
```

---

## Test 10: Checkin

**Objectif:** Vérifier que le checkin empêche l'alerte

### Étapes

1. **Démarrer une sortie** avec deadline = maintenant + 10 minutes
2. **Cliquer "J'suis arrivé"** après 3 minutes
3. **Attendre la deadline originale + 2 minutes**

### Vérifications

- [ ] `sessions.status = 'checked_in'`
- [ ] `sessions.checkin_at IS NOT NULL`
- [ ] Pas de SMS à la deadline
- [ ] Message: "Arrivée confirmée"

### Logs à Vérifier

```sql
-- Vérifier checkin
SELECT id, status, checkin_at, deadline 
FROM sessions 
WHERE user_id = '[user_id]' 
ORDER BY created_at DESC LIMIT 1;

-- Vérifier pas de SMS
SELECT COUNT(*) FROM sms_logs 
WHERE session_id = '[session_id]' 
AND status = 'sent';
-- Expected: 0
```

---

## Test 11: Extend

**Objectif:** Vérifier que la prolongation fonctionne

### Étapes

1. **Démarrer une sortie** avec deadline = maintenant + 5 minutes
2. **Cliquer "Prolonger de 15 min"** après 3 minutes
3. **Vérifier la deadline mise à jour**
4. **Attendre la deadline originale + 2 minutes**

### Vérifications

- [ ] `sessions.deadline` prolongée de 15 minutes
- [ ] Pas de SMS à la deadline originale
- [ ] Message: "Sortie prolongée jusqu'à [new time]"

### Logs à Vérifier

```sql
-- Vérifier deadline prolongée
SELECT id, deadline, updated_at 
FROM sessions 
WHERE user_id = '[user_id]' 
ORDER BY created_at DESC LIMIT 1;
```

---

## Test 12: Cron Health Check

**Objectif:** Vérifier que le monitoring du cron fonctionne

### Étapes

1. **Vérifier la table cron_heartbeat**
2. **Vérifier que last_run_at < 5 minutes**
3. **Vérifier que status = 'success'**

### Vérifications

- [ ] Cron heartbeat updated every 1-2 minutes
- [ ] `last_run_at < 5 minutes ago`
- [ ] `status = 'success'`
- [ ] `processed`, `sent`, `failed` counts are accurate
- [ ] Pas de error_message pour successful runs

### Logs à Vérifier

```sql
-- Vérifier heartbeat
SELECT function_name, last_run_at, status, processed, sent, failed, error_message 
FROM cron_heartbeat 
WHERE function_name = 'cron-check-deadlines' 
ORDER BY created_at DESC LIMIT 5;

-- Vérifier que le cron tourne régulièrement
-- Expected: last_run_at < NOW() - INTERVAL '5 minutes'
SELECT 
  EXTRACT(EPOCH FROM (NOW() - last_run_at)) / 60 as minutes_since_last_run
FROM cron_heartbeat 
WHERE function_name = 'cron-check-deadlines' 
ORDER BY created_at DESC LIMIT 1;
-- Expected: < 5
```

---

## Résumé des Vérifications

### Checklist Finale

- [ ] Test 1: Deadman Switch - SMS reçu
- [ ] Test 2: Credits à 0 - Rejeté
- [ ] Test 3: Quota atteint - Rejeté
- [ ] Test 4: Double cron - Idempotent
- [ ] Test 5: Twilio down - Retries
- [ ] Test 6: Contact opt-out - Pas de SMS
- [ ] Test 7: Numéro invalide - Rejeté
- [ ] Test 8: Phone not verified - Rejeté
- [ ] Test 9: SOS long-press - SMS envoyé
- [ ] Test 10: Checkin - Pas d'alerte
- [ ] Test 11: Extend - Deadline prolongée
- [ ] Test 12: Cron health - Monitoring OK

### Métriques de Succès

| Métrique | Cible | Résultat |
|----------|-------|----------|
| SMS success rate | > 99% | ___% |
| Cron execution frequency | Every 1-2 min | ___ |
| Deadman switch latency | < 2 min | ___ sec |
| Idempotence | 0 duplicates | ___ |
| Error handling | All 6 codes | ✓ |

---

## Troubleshooting

### SMS non reçu

1. Vérifier que Twilio est configuré
2. Vérifier que le numéro de contact est valide (E.164)
3. Vérifier les logs Twilio
4. Vérifier que `sms_logs.status = 'sent'`

### Cron ne tourne pas

1. Vérifier que la fonction est déployée
2. Vérifier que le CRON_SECRET est correct
3. Vérifier les logs Supabase Functions
4. Vérifier que `cron_heartbeat` est mis à jour

### SMS dupliqué

1. Vérifier que `alert_sent_at` est défini
2. Vérifier que le cron check `alert_sent_at IS NULL`
3. Vérifier les logs cron pour idempotence

---

## Rapport Final

Après avoir complété tous les tests, remplir le rapport:

```
Date: ___________
Testeur: ___________
Environnement: ___________

Tests Passés: ___ / 12
Tests Échoués: ___ / 12

Problèmes Identifiés:
1. ___________
2. ___________

Recommandations:
1. ___________
2. ___________

Status: 🟢 PRÊT POUR PRODUCTION / 🟡 BLOCANTS À CORRIGER
```

