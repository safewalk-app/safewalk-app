# Audit Complet SafeWalk - MVP READY

**Date:** 24 Février 2026  
**Status:** 🔴 BLOQUANTS IDENTIFIÉS  
**Priorité:** P0 (Fiabilité) + P1 (Sécurité)

---

## 1. ARCHITECTURE & FLOWS

### 1.1 Deadman Switch (App Killée)
**Status:** ❌ CRITIQUE - À CORRIGER

**Problème:**
- Le flow "start → deadline → no checkin → SMS" dépend du cron `cron-check-deadlines`
- ✅ Le cron existe et utilise `claim_overdue_trips` RPC
- ❌ **MANQUE:** Pas de vérification que le cron tourne réellement toutes les 1-2 minutes
- ❌ **MANQUE:** Pas de heartbeat/monitoring du cron
- ❌ **MANQUE:** Pas de retry logic si cron échoue

**Impact:** Si le cron s'arrête, les utilisateurs ne reçoivent pas les alertes même si l'app est killée.

**Correction requise:**
- [ ] Vérifier la configuration du cron dans Supabase (doit tourner toutes les 1-2 min)
- [ ] Ajouter un heartbeat table pour tracker les exécutions du cron
- [ ] Implémenter une alerte si le cron n'a pas tourné depuis 5 minutes

---

### 1.2 Checkin / Prolonger / Annuler
**Status:** ⚠️ PARTIEL

**Vérifications:**
- ✅ `checkin` Edge Function existe et met à jour `status = 'checked_in'`
- ✅ `extend` Edge Function existe et prolonge la deadline
- ✅ Pas de `cancel` Edge Function trouvée

**Problèmes:**
- ❌ **MANQUE:** Pas de colonne `checkin_at` dans sessions (seulement `start_time`, `deadline`, `status`)
- ❌ **MANQUE:** Pas de colonne `cancelled_at` dans sessions
- ❌ **MANQUE:** Pas de colonne `alert_sent_at` dans sessions (critique pour idempotence cron)
- ❌ **MANQUE:** Pas de RPC `claim_overdue_trips` visible dans le code

**Impact:** 
- Impossible de tracker quand l'utilisateur a confirmé son arrivée
- Impossible de savoir si une alerte a déjà été envoyée (risque de SMS dupliqués)
- Pas de cancel flow

**Correction requise:**
- [ ] Ajouter colonnes: `checkin_at`, `cancelled_at`, `alert_sent_at` dans sessions
- [ ] Ajouter colonne `status` enum: 'active', 'checked_in', 'cancelled', 'alerted'
- [ ] Créer RPC `claim_overdue_trips` avec FOR UPDATE SKIP LOCKED

---

### 1.3 SOS Long-Press (2s)
**Status:** ⚠️ À VALIDER

**Vérifications:**
- ✅ `sos` Edge Function existe
- ✅ `use-sos.ts` hook gère le long-press avec Animated
- ❌ **MANQUE:** Pas de vérification que le haptics feedback (Heavy) est appelé
- ❌ **MANQUE:** Pas de anti-faux-clic (debounce/throttle)

**Impact:** Risque d'appuis accidentels déclenchant plusieurs SOS

**Correction requise:**
- [ ] Ajouter debounce (min 1s) sur le SOS pour éviter les doublons
- [ ] Vérifier que `Haptics.impactAsync(ImpactFeedbackStyle.Heavy)` est appelé
- [ ] Ajouter feedback visuel (toast) immédiat après SOS

---

## 2. BASE DE DONNÉES

### 2.1 Schéma Actuel
```sql
users(id, first_name, phone_number, created_at, updated_at)
emergency_contacts(id, user_id, name, phone_number, created_at, updated_at)
sessions(id, user_id, start_time, deadline, status, location_latitude, location_longitude, created_at, updated_at)
sms_logs(id, session_id, contact_id, message_sid, status, error_message, created_at, updated_at)
```

### 2.2 Colonnes Manquantes (CRITIQUE)
**Status:** 🔴 BLOQUANT

| Colonne | Table | Type | Raison |
|---------|-------|------|--------|
| `alert_sent_at` | sessions | TIMESTAMPTZ | Idempotence cron (ne pas renvoyer 2x le même SMS) |
| `checkin_at` | sessions | TIMESTAMPTZ | Tracker confirmation utilisateur |
| `cancelled_at` | sessions | TIMESTAMPTZ | Tracker annulation |
| `status` | sessions | ENUM | Remplacer VARCHAR par ENUM('active', 'checked_in', 'cancelled', 'alerted') |
| `priority` | emergency_contacts | INT | Supporter multiple contacts (priority 1, 2, 3...) |
| `opted_out` | emergency_contacts | BOOLEAN | Permettre opt-out sans suppression |
| `sms_type` | sms_logs | VARCHAR/ENUM | Normaliser: 'late', 'test', 'sos' |
| `user_id` | sms_logs | UUID | Permettre queries par user (actuellement seulement session_id) |
| `session_id` | sms_logs | UUID | Déjà présent mais nullable? |

### 2.3 Indexes Manquants (PERFORMANCE)
**Status:** 🟡 IMPORTANT

Pour le cron `claim_overdue_trips`:
```sql
-- Manquant: index composite pour le cron
CREATE INDEX idx_sessions_status_deadline_alert 
  ON sessions(status, deadline, alert_sent_at) 
  WHERE status = 'active' AND alert_sent_at IS NULL;

-- Manquant: index pour les queries par user
CREATE INDEX idx_sms_logs_user_id ON sms_logs(user_id);

-- Manquant: index pour les queries par status
CREATE INDEX idx_sessions_status ON sessions(status);
```

### 2.4 Types de Données (COHÉRENCE)
**Status:** ⚠️ À CORRIGER

- ❌ `sessions.start_time` et `sessions.deadline` sont TIMESTAMP (sans timezone)
- ✅ Devrait être TIMESTAMPTZ (UTC) pour cohérence
- ❌ `emergency_contacts.phone_number` est VARCHAR(20) sans validation
- ✅ Devrait avoir constraint E.164 format

### 2.5 Contraintes FK
**Status:** ✅ OK

- ✅ `emergency_contacts.user_id` → `users.id` ON DELETE CASCADE
- ✅ `sessions.user_id` → `users.id` ON DELETE CASCADE
- ✅ `sms_logs.session_id` → `sessions.id` ON DELETE CASCADE
- ✅ `sms_logs.contact_id` → `emergency_contacts.id` ON DELETE CASCADE

---

## 3. SÉCURITÉ

### 3.1 RLS (Row Level Security)
**Status:** ❌ CRITIQUE - À VÉRIFIER

**Problèmes:**
- ❌ Pas de policies RLS visibles dans le code
- ❌ Pas de vérification que les users ne peuvent lire QUE leurs sessions/contacts/logs
- ❌ Pas de vérification que service_role key n'est pas utilisée côté client

**Correction requise:**
- [ ] Créer RLS policies pour chaque table:
  ```sql
  -- sessions: user ne lit/écrit que ses sessions
  CREATE POLICY "users_read_own_sessions" ON sessions
    FOR SELECT USING (auth.uid() = user_id);
  
  -- emergency_contacts: user ne lit/écrit que ses contacts
  CREATE POLICY "users_read_own_contacts" ON emergency_contacts
    FOR SELECT USING (auth.uid() = user_id);
  
  -- sms_logs: user ne lit que ses logs
  CREATE POLICY "users_read_own_logs" ON sms_logs
    FOR SELECT USING (auth.uid() = (SELECT user_id FROM sessions WHERE id = sms_logs.session_id));
  ```

### 3.2 Secrets & Auth
**Status:** ⚠️ À VÉRIFIER

- ❌ Pas de vérification que CRON_SECRET est utilisé dans `cron-check-deadlines`
- ✅ `cron-check-deadlines` vérifie le header `x-cron-secret`
- ❌ Pas de vérification que Twilio credentials ne sont jamais exposées au client

**Correction requise:**
- [ ] Vérifier que CRON_SECRET est configuré dans Supabase Edge Functions secrets
- [ ] Vérifier que TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN ne sont jamais utilisés côté client

### 3.3 Anti-Abus
**Status:** 🔴 BLOQUANT

**Problèmes:**
- ❌ Pas de rate limiting sur les SMS (risque de burn Twilio)
- ❌ Pas de validation OTP avant SMS réel
- ❌ Pas de quotas journaliers (sms_daily_limit, sms_sos_daily_limit)
- ❌ Pas de vérification que le user a un contact d'urgence avant de démarrer une session

**Correction requise:**
- [ ] Implémenter `consume_credit` RPC avec quotas:
  ```sql
  CREATE OR REPLACE FUNCTION consume_credit(
    p_user_id UUID,
    p_type VARCHAR -- 'late', 'test', 'sos'
  ) RETURNS TABLE(allowed BOOLEAN, reason VARCHAR) AS $$
  BEGIN
    -- Vérifier quotas journaliers
    -- Vérifier crédits
    -- Décrémenter atomiquement
  END;
  $$;
  ```
- [ ] Vérifier OTP avant SMS réel (si Supabase Auth)
- [ ] Ajouter quotas: 3 "late" gratuits (lifetime) + 1 test gratuit

### 3.4 Validation Téléphone
**Status:** ⚠️ PARTIEL

- ✅ `phone-validation-service.ts` existe
- ✅ `isValidPhoneNumber` utilisé dans `_shared/twilio.ts`
- ❌ Pas de vérification que le format E.164 est forcé côté serveur

**Correction requise:**
- [ ] Ajouter constraint DB: `phone_number ~ '^\+[1-9]\d{1,14}$'` (E.164)

---

## 4. RPC / TRANSACTIONS

### 4.1 `claim_overdue_trips` RPC
**Status:** 🔴 MANQUANT

**Problème:** Pas trouvé dans le code

**Requis pour:**
- Cron pour récupérer les trips overdue
- Idempotence (FOR UPDATE SKIP LOCKED)
- Atomicité (update status + alert_sent_at en une transaction)

**Correction requise:**
- [ ] Créer RPC:
  ```sql
  CREATE OR REPLACE FUNCTION claim_overdue_trips(p_limit INT DEFAULT 50)
  RETURNS TABLE(...) AS $$
  BEGIN
    -- SELECT sessions WHERE status='active' AND deadline < NOW() AND alert_sent_at IS NULL
    -- FOR UPDATE SKIP LOCKED
    -- UPDATE sessions SET alert_sent_at = NOW()
    -- RETURN claimed trips
  END;
  $$;
  ```

### 4.2 `consume_credit` RPC
**Status:** ⚠️ PARTIEL

- ✅ Utilisé dans `cron-check-deadlines` et `test-sms`
- ❌ Pas trouvé dans le code (probablement à créer)
- ❌ Pas de vérification des codes d'erreur standardisés

**Correction requise:**
- [ ] Créer RPC avec:
  - Vérification quotas journaliers
  - Vérification crédits
  - Codes d'erreur standardisés: `no_credits`, `quota_reached`, `invalid_type`
  - Décrément atomique

### 4.3 Idempotence
**Status:** 🔴 CRITIQUE

**Problème:**
- ❌ Pas de protection contre les SMS dupliqués si le cron tourne 2x
- ❌ `alert_sent_at` manquant (colonne critique)

**Impact:** Utilisateur peut recevoir 2 SMS pour la même deadline

**Correction requise:**
- [ ] Ajouter `alert_sent_at` colonne
- [ ] Modifier RPC `claim_overdue_trips` pour vérifier `alert_sent_at IS NULL`

---

## 5. EDGE FUNCTIONS

### 5.1 Endpoints Existants
**Status:** ✅ PRÉSENTS

- ✅ `start-trip` - Crée une session
- ✅ `checkin` - Confirme arrivée
- ✅ `extend` - Prolonge deadline
- ✅ `cancel` - ❌ MANQUANT
- ✅ `sos` - Déclenche SOS
- ✅ `test-sms` - Envoie SMS de test
- ✅ `cron-check-deadlines` - Cron pour alerts overdue
- ❌ `ping-location` - Existe mais pas documenté

### 5.2 Gestion Erreurs Twilio
**Status:** ⚠️ PARTIEL

- ✅ `cron-check-deadlines` log les erreurs Twilio
- ✅ `sos` et `test-sms` gèrent les erreurs
- ❌ Pas de retry logic (Twilio peut être temporairement down)
- ❌ Pas de exponential backoff

**Correction requise:**
- [ ] Ajouter retry logic avec exponential backoff
- [ ] Ajouter max 3 retries avant marquer comme failed
- [ ] Ajouter timestamp `retry_at` dans sms_logs

### 5.3 SMS Logs
**Status:** ⚠️ INCOMPLET

**Problèmes:**
- ❌ Pas de colonne `sms_type` (doit être: 'late', 'test', 'sos')
- ❌ Pas de colonne `user_id` (pour queries rapides)
- ❌ Status enum pas standardisé (doit être: 'queued', 'sent', 'failed')
- ❌ Pas de colonne `retry_count` pour tracker les retries

**Correction requise:**
- [ ] Ajouter colonnes: `sms_type`, `user_id`, `retry_count`
- [ ] Changer `status` en ENUM('queued', 'sent', 'failed')

### 5.4 Format Téléphone E.164
**Status:** ⚠️ PARTIEL

- ✅ `isValidPhoneNumber` existe
- ❌ Pas de vérification côté serveur (Edge Functions)
- ❌ Pas de normalisation (ex: +33 → +33)

**Correction requise:**
- [ ] Ajouter validation E.164 dans chaque Edge Function
- [ ] Ajouter normalisation (supprimer espaces, tirets)

---

## 6. CRON / SCHEDULING

### 6.1 Configuration Cron
**Status:** ❌ À VÉRIFIER

**Problèmes:**
- ❌ Pas de vérification que le cron est configuré dans Supabase
- ❌ Pas de vérification de la fréquence (doit être 1-2 minutes)
- ❌ Pas de monitoring/heartbeat

**Correction requise:**
- [ ] Vérifier que le cron est configuré dans Supabase Dashboard
- [ ] Vérifier la fréquence (doit être ≤ 2 minutes)
- [ ] Implémenter heartbeat table pour tracker les exécutions

### 6.2 Latence Acceptable
**Status:** ⚠️ À DÉFINIR

**Problème:**
- ❌ Pas de SLA défini (ex: alerte envoyée dans les 2 minutes après deadline)

**Correction requise:**
- [ ] Définir SLA: alerte envoyée dans les 2 minutes après deadline
- [ ] Ajouter monitoring pour tracker la latence

---

## 7. ÉCONOMIE / COÛTS

### 7.1 Gating Crédits
**Status:** 🔴 BLOQUANT

**Problèmes:**
- ❌ Pas de vérification que l'utilisateur a des crédits avant de démarrer une session
- ❌ Pas de quotas définis (3 "late" gratuits? 1 test gratuit?)
- ❌ Pas de paywall gating quand crédits = 0

**Correction requise:**
- [ ] Ajouter colonne `profiles.free_alerts_remaining` (default 3)
- [ ] Ajouter colonne `profiles.subscription_active` (default false)
- [ ] Vérifier dans `start-trip` que user a des crédits
- [ ] Rediriger vers paywall si crédits = 0

### 7.2 Quotas Twilio
**Status:** 🔴 BLOQUANT

**Problèmes:**
- ❌ Pas de limite quotidienne sur les SMS (risque de burn Twilio)
- ❌ Pas de distinction entre SMS "late" et SMS "sos"

**Correction requise:**
- [ ] Ajouter quotas dans RPC `consume_credit`:
  - `sms_daily_limit`: 100 SMS/jour (late + test)
  - `sms_sos_daily_limit`: 50 SMS/jour (sos uniquement)
- [ ] Tracker les SMS par type et par jour

---

## 8. UX / COPY "SÉCURITÉ"

### 8.1 Bouton Démarrer
**Status:** ⚠️ À VÉRIFIER

**Problèmes:**
- ❌ Pas de vérification que le bouton est grisé si pas de contact d'urgence
- ❌ Pas de vérification que le bouton est grisé si pas de crédits

**Correction requise:**
- [ ] Vérifier que le bouton est disabled si:
  - Pas de contact d'urgence configuré
  - Pas de crédits (subscription_active = false ET free_alerts_remaining = 0)
  - Téléphone non vérifié

### 8.2 Affichage Clair
**Status:** ⚠️ À VÉRIFIER

**Problèmes:**
- ❌ Pas de message clair: "Alerte envoyée à [contact] si pas de confirmation"
- ❌ Pas de affichage du temps restant avant alerte

**Correction requise:**
- [ ] Afficher sur l'écran actif: "Alerte envoyée à [contact name] si pas de confirmation dans [X minutes]"
- [ ] Afficher le countdown du temps restant

### 8.3 Paramètres
**Status:** ⚠️ À VÉRIFIER

**Problèmes:**
- ❌ Pas de vérification que Settings a:
  - Test SMS button
  - Privacy toggle "position uniquement si alerte"
  - Suppression données button

**Correction requise:**
- [ ] Vérifier que Settings a tous les éléments
- [ ] Ajouter privacy toggle dans `profiles.share_location_only_on_alert`

---

## RÉSUMÉ DES ÉCARTS

### 🔴 BLOQUANTS (P0) - À CORRIGER AVANT MVP
1. Colonnes manquantes dans sessions: `alert_sent_at`, `checkin_at`, `cancelled_at`
2. RPC `claim_overdue_trips` manquant
3. RPC `consume_credit` incomplet
4. Pas de RLS policies
5. Pas de quotas Twilio
6. Pas de gating crédits
7. Pas de vérification OTP avant SMS réel

### 🟡 IMPORTANTS (P1) - À CORRIGER RAPIDEMENT
1. Indexes manquants pour performance
2. Pas de monitoring/heartbeat du cron
3. Pas de retry logic Twilio
4. Pas de validation E.164 côté serveur
5. Pas de debounce sur SOS
6. Pas de affichage clair des messages de sécurité

### 🟢 MINEURS (P2) - À CORRIGER APRÈS MVP
1. Pas de exponential backoff Twilio
2. Pas de SLA défini pour les alerts
3. Pas de monitoring de la latence cron

---

## PROCHAINES ÉTAPES

1. ✅ Créer les migrations SQL (colonnes + indexes + RLS)
2. ✅ Créer les RPC (`claim_overdue_trips`, `consume_credit`)
3. ✅ Corriger les Edge Functions (validation, retry logic)
4. ✅ Ajouter le gating crédits
5. ✅ Ajouter les tests de cas limites
6. ✅ Vérifier le cron configuration
7. ✅ Vérifier l'UX et les messages

