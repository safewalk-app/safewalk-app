# Guide de Test Critique: SafeWalk MVP

Avant de lancer en production, tester les 3 points critiques:
1. **Codes d'erreur** - Affichage correct des toasts
2. **Deadman switch** - Cron déclenche les alertes
3. **Twilio** - SMS reçus correctement

---

## 1. TEST: Codes d'Erreur (Toasts)

### Objectif
Vérifier que les 4 codes d'erreur affichent les bons messages en français.

### Codes d'erreur à tester

| Code | Message Attendu | Où le tester |
|------|-----------------|--------------|
| `no_credits` | "Vous n'avez plus de crédits. Achetez-en pour continuer." | start-trip, test-sms, sos |
| `quota_reached` | "Vous avez atteint votre limite d'alertes. Réessayez demain." | start-trip, test-sms, sos |
| `phone_not_verified` | "Votre numéro de téléphone n'a pas été vérifié." | start-trip |
| `twilio_failed` | "Impossible d'envoyer l'alerte. Réessayera automatiquement." | test-sms, sos |

### Test 1.1: no_credits (Créer sortie)

**Préparation:**
```sql
-- Dans Supabase SQL Editor
UPDATE profiles 
SET free_alerts_remaining = 0 
WHERE user_id = 'YOUR_USER_ID';
```

**Étapes:**
1. Ouvrir l'app SafeWalk
2. Aller à "Je sors"
3. Cliquer "Créer une sortie"
4. **Résultat attendu:** Toast rouge "Vous n'avez plus de crédits..."

**Vérification:**
- ✅ Message en français
- ✅ Couleur rouge
- ✅ Disparaît après 3 secondes
- ✅ Pas de sortie créée

---

### Test 1.2: quota_reached (Test SMS)

**Préparation:**
```sql
-- Dans Supabase SQL Editor
UPDATE profiles 
SET free_alerts_remaining = 0 
WHERE user_id = 'YOUR_USER_ID';
```

**Étapes:**
1. Ouvrir l'app SafeWalk
2. Aller à "Paramètres"
3. Cliquer "Envoyer un SMS de test"
4. **Résultat attendu:** Toast rouge "Vous avez atteint votre limite..."

**Vérification:**
- ✅ Message en français
- ✅ Couleur rouge
- ✅ Pas de SMS envoyé

---

### Test 1.3: phone_not_verified (Créer sortie)

**Préparation:**
```sql
-- Dans Supabase SQL Editor
UPDATE users 
SET phone_verified = false 
WHERE id = 'YOUR_USER_ID';
```

**Étapes:**
1. Ouvrir l'app SafeWalk
2. Aller à "Je sors"
3. Cliquer "Créer une sortie"
4. **Résultat attendu:** Toast rouge "Votre numéro de téléphone n'a pas été vérifié..."

**Vérification:**
- ✅ Message en français
- ✅ Couleur rouge
- ✅ Pas de sortie créée

---

### Test 1.4: twilio_failed (Test SMS - Mock Twilio Down)

**Préparation:**
```sql
-- Dans Supabase SQL Editor
-- Changer le TWILIO_ACCOUNT_SID à une valeur invalide
-- (Simuler Twilio down)
```

**Étapes:**
1. Ouvrir l'app SafeWalk
2. Aller à "Paramètres"
3. Cliquer "Envoyer un SMS de test"
4. **Résultat attendu:** Toast rouge "Impossible d'envoyer l'alerte..."

**Vérification:**
- ✅ Message en français
- ✅ Couleur rouge
- ✅ Mention du retry automatique

---

### Checklist Codes d'Erreur

- [ ] no_credits affiche le bon message
- [ ] quota_reached affiche le bon message
- [ ] phone_not_verified affiche le bon message
- [ ] twilio_failed affiche le bon message
- [ ] Tous les messages sont en français
- [ ] Tous les toasts sont rouges
- [ ] Les toasts disparaissent après 3 secondes
- [ ] Pas d'action effectuée en cas d'erreur

---

## 2. TEST: Deadman Switch (Cron)

### Objectif
Vérifier que le cron `cron-check-deadlines` déclenche les alertes quand une sortie dépasse la deadline.

### Architecture du Deadman Switch

```
1. Utilisateur crée une sortie avec deadline = NOW() + 30 min
2. Cron s'exécute toutes les 5 minutes
3. Cron détecte trips avec deadline <= NOW()
4. Cron appelle consume_credit (vérifier les crédits)
5. Cron envoie SMS au contact d'urgence
6. Cron marque alert_sent_at = NOW()
7. Contact reçoit SMS: "🚨 Alerte SafeWalk: [Nom] n'a pas confirmé son retour..."
```

### Test 2.1: Cron déclenche alerte (Deadline dépassée)

**Préparation:**
```sql
-- Dans Supabase SQL Editor
-- Créer une sortie avec deadline passée
INSERT INTO sessions (
  id, user_id, status, deadline, alert_sent_at, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  'YOUR_USER_ID',
  'active',
  NOW() - INTERVAL '5 minutes',  -- Deadline passée
  NULL,  -- Pas d'alerte encore
  NOW(),
  NOW()
);
```

**Étapes:**
1. Insérer la sortie avec deadline passée (voir SQL ci-dessus)
2. Attendre que le cron s'exécute (5 minutes max)
3. **Résultat attendu:** Contact d'urgence reçoit un SMS

**Vérification:**
- ✅ SMS reçu dans les 5 minutes
- ✅ SMS contient: "🚨 Alerte SafeWalk: [Nom] n'a pas confirmé son retour"
- ✅ SMS contient l'heure de la deadline
- ✅ SMS contient la position GPS (si share_location = true)
- ✅ Colonne `alert_sent_at` mise à jour dans la DB

**Logs à vérifier:**
```sql
-- Vérifier que l'alerte a été envoyée
SELECT * FROM sms_logs 
WHERE sms_type = 'alert' 
AND created_at > NOW() - INTERVAL '10 minutes'
ORDER BY created_at DESC;

-- Vérifier que la sortie est marquée comme alertée
SELECT id, status, alert_sent_at 
FROM sessions 
WHERE id = 'TRIP_ID';
```

---

### Test 2.2: Idempotence (Cron ne renvoie pas 2x le même SMS)

**Préparation:**
```sql
-- Créer une sortie avec deadline passée ET alert_sent_at défini
INSERT INTO sessions (
  id, user_id, status, deadline, alert_sent_at, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  'YOUR_USER_ID',
  'active',
  NOW() - INTERVAL '10 minutes',
  NOW() - INTERVAL '5 minutes',  -- Alerte déjà envoyée
  NOW(),
  NOW()
);
```

**Étapes:**
1. Insérer la sortie avec alert_sent_at déjà défini
2. Attendre 2 cycles de cron (10 minutes)
3. **Résultat attendu:** Contact reçoit 1 SMS seulement (pas 2)

**Vérification:**
- ✅ Un seul SMS reçu
- ✅ Pas de SMS dupliqué
- ✅ Idempotence garantie

**Logs à vérifier:**
```sql
-- Vérifier qu'un seul SMS a été envoyé
SELECT COUNT(*) FROM sms_logs 
WHERE sms_type = 'alert' 
AND session_id = 'TRIP_ID';
-- Résultat attendu: 1
```

---

### Test 2.3: Cron Heartbeat (Monitoring)

**Préparation:**
Aucune préparation nécessaire.

**Étapes:**
1. Attendre que le cron s'exécute
2. Vérifier la table `cron_heartbeat`

**Vérification:**
```sql
-- Vérifier que le cron a exécuté
SELECT * FROM cron_heartbeat 
WHERE function_name = 'cron-check-deadlines'
ORDER BY last_run_at DESC
LIMIT 5;

-- Résultat attendu:
-- ✅ Dernière exécution < 5 minutes
-- ✅ Status = 'success'
-- ✅ processed >= 0
-- ✅ sent >= 0 ou failed >= 0
```

---

### Checklist Deadman Switch

- [ ] Cron déclenche alerte quand deadline dépassée
- [ ] SMS contient le nom de l'utilisateur
- [ ] SMS contient l'heure de la deadline
- [ ] SMS contient la position GPS (si share_location = true)
- [ ] Idempotence: pas de SMS dupliqué
- [ ] alert_sent_at est mis à jour
- [ ] Cron heartbeat enregistré
- [ ] Pas d'erreur dans les logs

---

## 3. TEST: Twilio (SMS)

### Objectif
Vérifier que les SMS sont envoyés correctement via Twilio et reçus par le contact d'urgence.

### Architecture Twilio

```
SafeWalk App
    ↓
Edge Function (test-sms, sos, cron-check-deadlines)
    ↓
Twilio API (https://api.twilio.com/2010-04-01/Accounts/...)
    ↓
SMS Gateway
    ↓
Contact d'urgence (reçoit SMS)
```

### Test 3.1: Test SMS (Depuis l'app)

**Préparation:**
1. Configurer un contact d'urgence dans l'app
2. Vérifier que le numéro est au format E.164 (+33612345678)
3. Avoir un téléphone pour recevoir le SMS

**Étapes:**
1. Ouvrir l'app SafeWalk
2. Aller à "Paramètres"
3. Cliquer "Envoyer un SMS de test"
4. **Résultat attendu:** SMS reçu dans les 10 secondes

**Vérification:**
- ✅ SMS reçu
- ✅ Contenu: "✅ SafeWalk: Ceci est un SMS de test..."
- ✅ Numéro d'expéditeur = TWILIO_PHONE_NUMBER
- ✅ Pas de délai excessif (< 10s)

**Logs à vérifier:**
```sql
-- Vérifier que le SMS a été enregistré
SELECT * FROM sms_logs 
WHERE sms_type = 'test' 
AND status = 'sent'
ORDER BY created_at DESC
LIMIT 1;

-- Résultat attendu:
-- ✅ status = 'sent'
-- ✅ message_sid = 'SM...' (Twilio message ID)
-- ✅ created_at récent
```

---

### Test 3.2: SOS SMS

**Préparation:**
1. Créer une sortie active
2. Avoir un contact d'urgence configuré
3. Avoir un téléphone pour recevoir le SMS

**Étapes:**
1. Ouvrir l'app SafeWalk
2. Aller à "Sortie Active"
3. Long-press (2s) sur le bouton SOS
4. **Résultat attendu:** SMS reçu dans les 10 secondes

**Vérification:**
- ✅ SMS reçu
- ✅ Contenu: "🆘 Alerte SOS SafeWalk: [Nom] a déclenché une alerte d'urgence..."
- ✅ SMS contient la position GPS (si share_location = true)
- ✅ Pas de délai excessif (< 10s)

**Logs à vérifier:**
```sql
-- Vérifier que le SOS a été enregistré
SELECT * FROM sms_logs 
WHERE sms_type = 'sos' 
AND status = 'sent'
ORDER BY created_at DESC
LIMIT 1;

-- Résultat attendu:
-- ✅ status = 'sent'
-- ✅ message_sid = 'SM...'
```

---

### Test 3.3: Cron Alert SMS

**Préparation:**
1. Créer une sortie avec deadline passée
2. Avoir un contact d'urgence configuré
3. Avoir un téléphone pour recevoir le SMS

**Étapes:**
1. Insérer une sortie avec deadline passée (voir Test 2.1)
2. Attendre que le cron s'exécute (5 minutes max)
3. **Résultat attendu:** SMS reçu

**Vérification:**
- ✅ SMS reçu
- ✅ Contenu: "🚨 Alerte SafeWalk: [Nom] n'a pas confirmé son retour..."
- ✅ SMS contient l'heure de la deadline
- ✅ SMS contient la position GPS (si share_location = true)

---

### Test 3.4: Validation E.164 (Numéro invalide)

**Préparation:**
```sql
-- Mettre à jour le contact avec un numéro invalide
UPDATE emergency_contacts 
SET phone_number = '0612345678'  -- Format invalide (pas de +)
WHERE user_id = 'YOUR_USER_ID';
```

**Étapes:**
1. Aller à "Paramètres"
2. Cliquer "Envoyer un SMS de test"
3. **Résultat attendu:** Toast d'erreur "Numéro de téléphone invalide..."

**Vérification:**
- ✅ Pas de SMS envoyé
- ✅ Toast d'erreur en français
- ✅ Erreur enregistrée dans sms_logs

---

### Test 3.5: Twilio Error Handling (Quota Twilio)

**Préparation:**
Simuler une erreur Twilio (ex: quota dépassé).

**Étapes:**
1. Envoyer plusieurs SMS de test rapidement
2. **Résultat attendu:** Après N SMS, erreur Twilio

**Vérification:**
- ✅ Toast d'erreur: "Impossible d'envoyer l'alerte..."
- ✅ Erreur enregistrée dans sms_logs
- ✅ retry_count et retry_at définis

---

### Checklist Twilio

- [ ] Test SMS envoyé et reçu
- [ ] SOS SMS envoyé et reçu
- [ ] Cron Alert SMS envoyé et reçu
- [ ] Validation E.164 fonctionne
- [ ] Erreur Twilio gérée correctement
- [ ] message_sid enregistré dans sms_logs
- [ ] Pas de délai excessif (< 10s)
- [ ] Tous les SMS contiennent le bon contenu

---

## Résumé des Tests

### Codes d'Erreur (Test 1)
- [ ] no_credits
- [ ] quota_reached
- [ ] phone_not_verified
- [ ] twilio_failed

### Deadman Switch (Test 2)
- [ ] Cron déclenche alerte
- [ ] Idempotence (pas de SMS dupliqué)
- [ ] Cron heartbeat enregistré

### Twilio (Test 3)
- [ ] Test SMS
- [ ] SOS SMS
- [ ] Cron Alert SMS
- [ ] Validation E.164
- [ ] Error handling

---

## Rapport de Test

Après avoir complété tous les tests, remplir ce rapport:

```
Date: _______________
Testeur: _______________
Environnement: Staging / Production

CODES D'ERREUR:
- no_credits: ✅ / ❌
- quota_reached: ✅ / ❌
- phone_not_verified: ✅ / ❌
- twilio_failed: ✅ / ❌

DEADMAN SWITCH:
- Cron déclenche alerte: ✅ / ❌
- Idempotence: ✅ / ❌
- Cron heartbeat: ✅ / ❌

TWILIO:
- Test SMS: ✅ / ❌
- SOS SMS: ✅ / ❌
- Cron Alert SMS: ✅ / ❌
- Validation E.164: ✅ / ❌
- Error handling: ✅ / ❌

ISSUES TROUVÉES:
1. _______________
2. _______________
3. _______________

VERDICT: ✅ PRÊT POUR PRODUCTION / ❌ BLOCAGES IDENTIFIÉS
```

---

## Troubleshooting

### SMS non reçu
1. Vérifier que le numéro est au format E.164 (+33612345678)
2. Vérifier que TWILIO_PHONE_NUMBER est configuré
3. Vérifier que les crédits Twilio ne sont pas épuisés
4. Vérifier les logs: `SELECT * FROM sms_logs ORDER BY created_at DESC LIMIT 10;`

### Cron ne s'exécute pas
1. Vérifier que CRON_SECRET est configuré
2. Vérifier que le cron est activé dans Supabase
3. Vérifier les logs: `SELECT * FROM cron_heartbeat ORDER BY last_run_at DESC LIMIT 5;`

### Toast d'erreur ne s'affiche pas
1. Vérifier que l'erreur est bien retournée par l'Edge Function
2. Vérifier que trip-service.ts mappe correctement le code d'erreur
3. Vérifier les logs console de l'app

### Idempotence cassée (SMS dupliqué)
1. Vérifier que `alert_sent_at` est mis à jour par le cron
2. Vérifier que le check `alert_sent_at IS NULL` fonctionne
3. Vérifier que `session_id` est enregistré dans sms_logs
