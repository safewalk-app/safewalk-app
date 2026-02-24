# Audit Complet des Edge Functions SafeWalk

## Résumé

| Function | Déployée | Statut | Problèmes |
|----------|----------|--------|-----------|
| checkin | ✅ | 🟢 OK | 1 mineur |
| cron-check-deadlines | ✅ | 🟡 À corriger | 2 problèmes |
| extend | ✅ | 🟡 À corriger | 1 problème |
| ping-location | ✅ | 🟢 OK | 0 |
| sos | ✅ | 🟢 OK | 0 |
| start-trip | ✅ | 🟡 À corriger | 2 problèmes |
| test-sms | ✅ | 🟡 À corriger | 1 problème |
| trigger-sos | Ancienne (4j) | 🔴 OBSOLÈTE | Remplacée par `sos` |
| decrement-quota | ❌ | 🔴 OBSOLÈTE | Remplacée par RPC `consume_credit` |
| send-otp | ❌ | 🟡 Non audité | Pas déployée |
| verify-otp | ❌ | 🟡 Non audité | Pas déployée |
| send-sos-notification | ❌ | 🔴 OBSOLÈTE | Remplacée par `sos` |

---

## Problèmes Identifiés

### P0 - BLOQUANTS

#### 1. `start-trip` - Double consommation de crédit
**Fichier:** `supabase/functions/start-trip/index.ts`
**Problème:** La fonction vérifie les crédits en ligne 132-145 (check profile direct), PUIS appelle `consume_credit` RPC en ligne 170. Cela signifie que le crédit est vérifié 2 fois mais consommé 1 fois. Si un autre processus consomme le crédit entre les 2 checks, le trip sera créé sans crédit.
**Impact:** Race condition possible, incohérence crédits.
**Fix:** Supprimer le check direct du profile (lignes 96-145) et ne garder que l'appel RPC `consume_credit` qui fait tout atomiquement (check + decrement).

#### 2. `start-trip` - Body parsé APRÈS consume_credit
**Fichier:** `supabase/functions/start-trip/index.ts`
**Problème:** Le body est parsé en ligne 197-212, APRÈS l'appel `consume_credit` en ligne 170. Si le body est invalide (pas de deadlineISO), le crédit est déjà consommé mais le trip n'est pas créé.
**Impact:** Perte de crédit sans trip créé.
**Fix:** Parser et valider le body AVANT d'appeler `consume_credit`.

#### 3. `cron-check-deadlines` - Nom d'utilisateur incorrect dans le message
**Fichier:** `supabase/functions/cron-check-deadlines/index.ts`, ligne 199
**Problème:** `createOverdueAlertMessage(trip.user_phone_number || "User", ...)` - Passe le numéro de téléphone comme nom d'utilisateur au lieu du vrai nom.
**Impact:** Le SMS d'alerte affiche le numéro de téléphone au lieu du prénom.
**Fix:** La RPC `claim_overdue_trips` doit retourner `user_first_name` en plus, ou faire un SELECT sur `users.first_name`.

#### 4. `cron-check-deadlines` - Colonne `session_id` manquante dans sms_logs
**Fichier:** `supabase/functions/cron-check-deadlines/index.ts`, ligne 147
**Problème:** L'idempotence check fait `.eq("session_id", trip.trip_id)` mais la table `sms_logs` dans la migration n'a pas de colonne `session_id`.
**Impact:** L'idempotence check ne fonctionne pas → risque de SMS dupliqués.
**Fix:** Ajouter `session_id UUID REFERENCES sessions(id)` à la table `sms_logs`, ou utiliser un autre champ pour l'idempotence.

### P1 - IMPORTANTS

#### 5. `extend` - Pas de reset de `alert_sent_at`
**Fichier:** `supabase/functions/extend/index.ts`, ligne 170
**Problème:** Quand un trip est étendu, `alert_sent_at` n'est pas remis à NULL. Si le trip était déjà en état `alerted`, l'extension ne réactivera pas le monitoring.
**Impact:** Après extension d'un trip alerté, le cron ne le re-vérifiera pas.
**Fix:** Ajouter `alert_sent_at: null, status: 'active'` dans l'UPDATE.

#### 6. `extend` - Pas de check sur le statut `alerted`
**Fichier:** `supabase/functions/extend/index.ts`, ligne 149
**Problème:** Le check `tripData.status !== "active"` rejette les trips `alerted`. Un utilisateur qui a reçu une alerte mais veut étendre ne peut pas le faire.
**Impact:** UX bloquée après alerte.
**Fix:** Accepter aussi le statut `alerted` pour l'extension.

#### 7. `test-sms` - Double validation E.164
**Fichier:** `supabase/functions/test-sms/index.ts`, ligne 176
**Problème:** `isValidPhoneNumber(contactData.phone_number) || !contactData.phone_number.match(...)` - Double validation redondante.
**Impact:** Aucun impact fonctionnel, mais code confus.
**Fix:** Garder seulement `isValidPhoneNumber()`.

#### 8. `checkin` - Colonne `checked_in_at` vs `checkin_at`
**Fichier:** `supabase/functions/checkin/index.ts`, ligne 152
**Problème:** Utilise `checked_in_at` mais la migration crée `checkin_at`.
**Impact:** L'UPDATE échouera silencieusement ou créera une colonne non-indexée.
**Fix:** Aligner le nom de colonne (utiliser `checkin_at` partout).

### P2 - MINEURS / OBSOLÈTES

#### 9. `trigger-sos` - OBSOLÈTE
**Fichier:** `supabase/functions/trigger-sos/index.ts`
**Problème:** Ancienne version de SOS (4 jours). Utilise `serve()` au lieu de `Deno.serve()`, user_id hardcodé `00000000-0000-0000-0000-000000000000`, pas de JWT auth, pas de consume_credit, écrit dans `sms_status` au lieu de `sms_logs`.
**Impact:** Si l'app appelle `trigger-sos` au lieu de `sos`, les crédits ne sont pas vérifiés.
**Fix:** Supprimer ou ne plus déployer. S'assurer que l'app mobile appelle `sos`.

#### 10. `decrement-quota` - OBSOLÈTE
**Fichier:** `supabase/functions/decrement-quota/index.ts`
**Problème:** Remplacée par la RPC `consume_credit`. Utilise `free_test_sms_remaining` qui n'existe pas dans la migration. Pas de JWT auth. Client Supabase créé au top-level (cold start issues).
**Impact:** Aucun si non appelée.
**Fix:** Ne pas déployer. Supprimer le dossier.

---

## Corrections à Appliquer

### Fix 1: `start-trip` - Réordonner body parsing et supprimer double check

```typescript
// AVANT consume_credit:
// 1. Parse body
// 2. Validate deadlineISO
// 3. Check emergency contact
// 4. Call consume_credit
// 5. Create trip
```

### Fix 2: `cron-check-deadlines` - Ajouter session_id à sms_logs + user name

```sql
ALTER TABLE sms_logs ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES sessions(id);
CREATE INDEX IF NOT EXISTS idx_sms_logs_session_id ON sms_logs(session_id);
```

### Fix 3: `extend` - Accepter statut `alerted` et reset alert_sent_at

```typescript
if (tripData.status !== "active" && tripData.status !== "alerted") {
  // reject
}

// In update:
.update({
  deadline: newDeadline.toISOString(),
  alert_sent_at: null,
  status: "active",
})
```

### Fix 4: `checkin` - Aligner colonne checkin_at

```typescript
.update({
  status: "checked_in",
  checkin_at: new Date().toISOString(),  // was checked_in_at
})
```

---

## Vérification Client Mobile

| Edge Function | Appelée par | Fichier client |
|---------------|-------------|----------------|
| start-trip | `tripService.startTrip()` | lib/services/trip-service.ts |
| test-sms | `tripService.sendTestSms()` | lib/services/trip-service.ts |
| sos | `tripService.triggerSos()` | lib/services/trip-service.ts |
| checkin | `tripService.confirmCheckIn()` | lib/services/trip-service.ts |
| extend | `tripService.extendTrip()` | lib/services/trip-service.ts |
| ping-location | `tripService.pingLocation()` | lib/services/trip-service.ts |
| cron-check-deadlines | Supabase Cron | N/A (server-only) |
| trigger-sos | ❌ NE DOIT PLUS ÊTRE APPELÉE | Vérifier trip-service.ts |
