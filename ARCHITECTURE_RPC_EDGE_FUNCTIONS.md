# SafeWalk V1.88+ : Architecture RPC & Edge Functions

## Vue d'ensemble

SafeWalk utilise une architecture **serverless** avec Supabase pour gérer les trips, les crédits, et les alertes SMS de manière **atomique** et **idempotente**.

### Composants clés

1. **RPC SQL Functions** - Logique métier atomique côté base de données
2. **Edge Functions** - API serverless pour les opérations client et serveur
3. **Helper Twilio** - Utilitaires partagés pour l'envoi SMS
4. **Services TypeScript** - Clients pour les Edge Functions

---

## RPC SQL Functions

### 1. `claim_overdue_trips(p_limit int DEFAULT 50)`

**Objectif** : Récupérer les trips en retard de manière atomique avec `FOR UPDATE SKIP LOCKED`.

**Paramètres**
- `p_limit` : Nombre maximum de trips à traiter (défaut: 50)

**Retour**
```typescript
{
  trip_id: uuid;
  user_id: uuid;
  deadline: timestamp;
  contact_id: uuid;
  contact_phone_number: string;
  user_phone_number: string;
  share_location: boolean;
  location_latitude: numeric;
  location_longitude: numeric;
  last_seen_at: timestamp;
}[]
```

**Logique**
1. Sélectionne les trips avec `status='active' AND deadline<=now AND alert_sent_at IS NULL`
2. Utilise `FOR UPDATE SKIP LOCKED` pour éviter les race conditions
3. Met à jour `status='alerted'` et `alert_sent_at=now()`
4. Retourne les trips claimés avec les infos de contact

**Sécurité** : `SECURITY DEFINER`, accessible uniquement via `service_role`

---

### 2. `consume_credit(p_user_id uuid, p_type text)`

**Objectif** : Consommer les crédits de manière atomique avec validation des quotas.

**Paramètres**
- `p_user_id` : UUID de l'utilisateur
- `p_type` : Type de crédit (`'late'`, `'test'`, `'sos'`)

**Retour**
```typescript
{
  allowed: boolean;
  reason: string;
  remaining_credits: int;
}
```

**Raisons possibles**
- `'subscription_active'` - Utilisateur abonné (quotas uniquement)
- `'credit_consumed'` - Crédit consommé avec succès
- `'sos_allowed'` - SOS autorisé (quota OK)
- `'no_credits'` - Pas de crédits gratuits (type='late')
- `'no_test_credit'` - Pas de SMS de test (type='test')
- `'quota_reached'` - Quota journalier dépassé
- `'user_not_found'` - Utilisateur introuvable
- `'invalid_type'` - Type de crédit invalide

**Logique par type**

#### Type = `'late'` (alerte retard)
- Si `subscription_active=true` : Vérifier quota journalier `sms_daily_limit`
- Sinon : Vérifier `free_alerts_remaining > 0` ET quota journalier
- Si OK : Décrémenter `free_alerts_remaining` et retourner `allowed=true`
- Sinon : Retourner `allowed=false` avec raison

#### Type = `'test'` (SMS de test)
- Si `subscription_active=true` : Vérifier quota journalier
- Sinon : Vérifier `free_test_sms_remaining > 0` ET quota journalier
- Si OK : Décrémenter `free_test_sms_remaining` et retourner `allowed=true`
- Sinon : Retourner `allowed=false` avec raison

#### Type = `'sos'` (alerte SOS)
- Vérifier quota SOS journalier `sms_sos_daily_limit`
- Si OK : Retourner `allowed=true` (pas de déduction de crédit en MVP)
- Sinon : Retourner `allowed=false`

**Quotas journaliers** (réinitialisés à minuit)
- `sms_daily_limit` : 10 SMS/jour (late + test)
- `sms_sos_daily_limit` : 3 SOS/jour

**Sécurité** : `SECURITY DEFINER`, accessible uniquement via `service_role`

---

### 3. `get_sms_daily_count(p_user_id uuid, p_type text DEFAULT NULL)`

**Objectif** : Compter les SMS envoyés dans les dernières 24h.

**Paramètres**
- `p_user_id` : UUID de l'utilisateur
- `p_type` : Type de SMS optionnel (null = tous les types)

**Retour**
```typescript
int // Nombre de SMS envoyés
```

---

## Edge Functions

### Client-Auth Functions (JWT user)

Toutes les fonctions client-auth utilisent le JWT de l'utilisateur pour l'authentification.

#### 1. `start-trip`

**Endpoint** : `POST /functions/v1/start-trip`

**Auth** : JWT user (Authorization header)

**Payload**
```typescript
{
  deadlineISO: string;        // ISO 8601 timestamp (future)
  shareLocation: boolean;     // Inclure la position dans les alertes
  destinationNote?: string;   // Note optionnelle (ex: "Chez Sophie")
}
```

**Réponse**
```typescript
{
  success: boolean;
  tripId?: string;
  status?: string;            // "active"
  deadline?: string;
  message?: string;
  error?: string;
  errorCode?: string;
}
```

**Codes d'erreur**
- `UNAUTHORIZED` - Token invalide/expiré
- `CONFIG_ERROR` - Configuration Supabase manquante
- `INVALID_INPUT` - deadlineISO manquant
- `INVALID_DEADLINE` - Format invalide ou date passée
- `DB_ERROR` - Erreur lors de l'insertion
- `EXCEPTION` - Erreur non gérée

---

#### 2. `checkin`

**Endpoint** : `POST /functions/v1/checkin`

**Auth** : JWT user

**Payload**
```typescript
{
  tripId: string;
}
```

**Réponse**
```typescript
{
  success: boolean;
  tripId?: string;
  status?: string;            // "checked_in"
  message?: string;
  error?: string;
  errorCode?: string;
}
```

**Codes d'erreur**
- `UNAUTHORIZED` - Token invalide
- `INVALID_INPUT` - tripId manquant
- `NOT_FOUND` - Trip non trouvé ou non autorisé
- `TRIP_NOT_ACTIVE` - Trip déjà terminé
- `DB_ERROR` - Erreur lors de la mise à jour

---

#### 3. `extend`

**Endpoint** : `POST /functions/v1/extend`

**Auth** : JWT user

**Payload**
```typescript
{
  tripId: string;
  addMinutes: number;         // 1-1440 minutes
}
```

**Réponse**
```typescript
{
  success: boolean;
  tripId?: string;
  newDeadline?: string;
  message?: string;
  error?: string;
  errorCode?: string;
}
```

**Codes d'erreur**
- `UNAUTHORIZED` - Token invalide
- `INVALID_INPUT` - tripId ou addMinutes manquant/invalide
- `EXTENSION_TOO_LONG` - Extension > 24h
- `NOT_FOUND` - Trip non trouvé
- `TRIP_NOT_ACTIVE` - Trip déjà terminé
- `DB_ERROR` - Erreur lors de la mise à jour

---

#### 4. `ping-location`

**Endpoint** : `POST /functions/v1/ping-location`

**Auth** : JWT user

**Payload**
```typescript
{
  tripId: string;
  lat: number;                // -90 à 90
  lng: number;                // -180 à 180
}
```

**Réponse**
```typescript
{
  success: boolean;
  tripId?: string;
  message?: string;
  error?: string;
  errorCode?: string;
}
```

**Codes d'erreur**
- `UNAUTHORIZED` - Token invalide
- `INVALID_INPUT` - Paramètres manquants
- `INVALID_COORDINATES` - Format ou plage invalide
- `NOT_FOUND` - Trip non trouvé
- `TRIP_NOT_ACTIVE` - Trip déjà terminé
- `DB_ERROR` - Erreur lors de la mise à jour

---

#### 5. `test-sms`

**Endpoint** : `POST /functions/v1/test-sms`

**Auth** : JWT user

**Payload**
```typescript
{}
```

**Réponse**
```typescript
{
  success: boolean;
  message?: string;
  smsSent?: boolean;
  error?: string;
  errorCode?: string;
}
```

**Logique**
1. Appelle `consume_credit(user_id, 'test')`
2. Si `allowed=false` : Retourne erreur avec raison
3. Récupère le contact d'urgence principal (priority=1, opted_out=false)
4. Envoie SMS via Twilio
5. Enregistre dans `sms_logs`

**Codes d'erreur**
- `UNAUTHORIZED` - Token invalide
- `CONFIG_ERROR` - Configuration manquante
- `CREDIT_CHECK_FAILED` - Erreur lors de la vérification des crédits
- `no_credits` / `quota_reached` - Pas de crédit/quota
- `NO_CONTACT` - Aucun contact d'urgence
- `INVALID_PHONE` - Numéro invalide
- `SMS_FAILED` - Erreur Twilio
- `EXCEPTION` - Erreur non gérée

---

#### 6. `sos`

**Endpoint** : `POST /functions/v1/sos`

**Auth** : JWT user

**Payload**
```typescript
{
  tripId?: string;            // Optionnel, pour inclure la position
}
```

**Réponse**
```typescript
{
  success: boolean;
  message?: string;
  smsSent?: boolean;
  error?: string;
  errorCode?: string;
}
```

**Logique**
1. Appelle `consume_credit(user_id, 'sos')`
2. Si `allowed=false` : Retourne erreur avec raison
3. Récupère le trip (si fourni) pour la position
4. Récupère le contact d'urgence principal
5. Envoie SMS SOS via Twilio
6. Enregistre dans `sms_logs`
7. Met à jour trip status à `'sos_triggered'`

**Codes d'erreur**
- Identiques à `test-sms` + `quota_reached` pour SOS

---

### Server-Only Function (CRON_SECRET)

#### `cron-check-deadlines`

**Endpoint** : `POST /functions/v1/cron-check-deadlines`

**Auth** : Header `x-cron-secret` (doit correspondre à `CRON_SECRET` env var)

**Payload**
```typescript
{}
```

**Réponse**
```typescript
{
  success: boolean;
  processed: number;          // Trips traités
  sent: number;               // Alertes envoyées
  failed: number;             // Alertes échouées
  message?: string;
  error?: string;
  errorCode?: string;
}
```

**Logique**
1. Vérifie le header `x-cron-secret`
2. Appelle `claim_overdue_trips(50)`
3. Pour chaque trip :
   a. Appelle `consume_credit(user_id, 'late')`
   b. Si `allowed=true` : Envoie SMS via Twilio
   c. Enregistre dans `sms_logs` (sent ou failed)
   d. Si `allowed=false` : Enregistre failed avec raison
4. Retourne statistiques

**Appel recommandé** : Toutes les 1-2 minutes via Supabase Cron

**Exemple cron** :
```
0 */1 * * * *  # Toutes les 1 minute
```

---

## Helper Twilio

### `sendSms(options: SendSmsOptions)`

**Signature**
```typescript
interface SendSmsOptions {
  to: string;                 // Numéro E.164 (+33612345678)
  message: string;
  config: TwilioConfig;
}

interface SendSmsResponse {
  success: boolean;
  messageSid?: string;
  error?: string;
  errorCode?: string;
}
```

**Logique**
1. Valide les paramètres
2. Crée Basic Auth header (Base64)
3. POST vers `https://api.twilio.com/2010-04-01/Accounts/{SID}/Messages.json`
4. Parse la réponse
5. Retourne `messageSid` ou erreur

---

### `formatPhoneNumber(phone: string)`

Formate un numéro au format E.164.

**Exemple**
```typescript
formatPhoneNumber("0612345678")      // "+33612345678"
formatPhoneNumber("612345678")       // "+33612345678"
formatPhoneNumber("+33612345678")    // "+33612345678"
```

---

### `isValidPhoneNumber(phone: string)`

Valide le format E.164 : `^\+[1-9]\d{1,14}$`

---

### Message Builders

#### `createOverdueAlertMessage(userName, deadline, shareLocation, lat?, lng?)`

Exemple :
```
🚨 Alerte SafeWalk: Alice n'a pas confirmé son retour avant 14:30.
Dernière position: https://maps.google.com/?q=48.8566,2.3522

Vérifiez son état ou contactez les autorités si nécessaire.
```

#### `createTestSmsMessage()`

Exemple :
```
✅ SafeWalk: Ceci est un SMS de test. Votre contact d'urgence a bien été configuré.
```

#### `createSosAlertMessage(userName, shareLocation, lat?, lng?)`

Exemple :
```
🆘 Alerte SOS SafeWalk: Alice a déclenché une alerte d'urgence immédiate.
Position: https://maps.google.com/?q=48.8566,2.3522

Contactez immédiatement les autorités si nécessaire.
```

---

## Services TypeScript

### `trip-service.ts`

Client pour toutes les Edge Functions.

**Fonctions**
- `startTrip(input: StartTripInput)` → `StartTripOutput`
- `checkin(input: CheckinInput)` → `CheckinOutput`
- `extendTrip(input: ExtendInput)` → `ExtendOutput`
- `pingLocation(input: PingLocationInput)` → `PingLocationOutput`
- `sendTestSms()` → `TestSmsOutput`
- `triggerSos(input: SosInput)` → `SosOutput`

**Logging**
- Tous les appels sont loggés via `logger.ts`
- Erreurs incluent le code d'erreur pour le monitoring

---

## Flux Complet

### 1. Utilisateur démarre une session

```
Frontend: startTrip()
  ↓
Edge Function: start-trip
  ↓
Database: INSERT sessions (status='active')
  ↓
Frontend: Affiche Active Session
```

### 2. Deadline approche

```
Cron Job: POST /cron-check-deadlines (toutes les 1-2 min)
  ↓
RPC: claim_overdue_trips() [FOR UPDATE SKIP LOCKED]
  ↓
Pour chaque trip:
  - RPC: consume_credit(user_id, 'late')
  - Si allowed: sendSms() via Twilio
  - INSERT sms_logs
  ↓
Cron Response: { processed: 5, sent: 4, failed: 1 }
```

### 3. Utilisateur confirme son retour

```
Frontend: checkin()
  ↓
Edge Function: checkin
  ↓
Database: UPDATE sessions (status='checked_in')
  ↓
Frontend: Affiche Alert Sent ou Home
```

---

## Idempotence & Atomicité

### Idempotence

- **RPC `claim_overdue_trips`** : Utilise `FOR UPDATE SKIP LOCKED` + `alert_sent_at IS NULL`
  - Appels multiples = même résultat (trips déjà claimés ignorés)
  
- **RPC `consume_credit`** : Décrément atomique
  - Appels multiples = crédits décrémentés à chaque fois (OK pour MVP)

- **Edge Functions** : Pas d'idempotence native
  - Recommandation : Ajouter `idempotency_key` header en v2

### Atomicité

- **RPC `claim_overdue_trips`** : Transaction SQL atomique
  - SELECT + UPDATE dans une seule transaction
  - `FOR UPDATE SKIP LOCKED` évite les race conditions

- **RPC `consume_credit`** : Décrément atomique
  - UPDATE + SELECT dans une seule transaction

- **Edge Functions** : Pas d'atomicité multi-étapes
  - Recommandation : Utiliser RPC pour les opérations critiques

---

## Monitoring & Alertes

### Métriques à tracker

1. **SMS envoyés** : `SELECT COUNT(*) FROM sms_logs WHERE created_at > now() - interval '24h'`
2. **Crédits consommés** : `SELECT SUM(free_alerts_remaining) FROM users`
3. **Quotas atteints** : `SELECT COUNT(*) FROM sms_logs WHERE created_at > date_trunc('day', now()) GROUP BY user_id HAVING COUNT(*) >= 10`
4. **Erreurs Twilio** : `SELECT COUNT(*) FROM sms_logs WHERE status='failed'`

### Alertes recommandées

- Erreur Twilio > 5% des SMS
- Quota atteint pour > 10% des utilisateurs
- Cron job échoue 3 fois de suite
- Crédit consommé > 100 SMS/jour

---

## Déploiement

### 1. Migrations SQL

```bash
supabase migration up
```

Déploie les RPC et indexes.

### 2. Edge Functions

```bash
supabase functions deploy start-trip
supabase functions deploy checkin
supabase functions deploy extend
supabase functions deploy ping-location
supabase functions deploy test-sms
supabase functions deploy sos
supabase functions deploy cron-check-deadlines
```

### 3. Secrets

```bash
supabase secrets set TWILIO_ACCOUNT_SID=...
supabase secrets set TWILIO_AUTH_TOKEN=...
supabase secrets set TWILIO_PHONE_NUMBER=...
supabase secrets set CRON_SECRET=...
```

### 4. Cron Job

Configurer dans Supabase Dashboard :
```
POST /functions/v1/cron-check-deadlines
Header: x-cron-secret: {CRON_SECRET}
Interval: */1 * * * *  (toutes les 1 minute)
```

---

## Troubleshooting

### Trips non claimés

**Symptôme** : Alertes non envoyées après deadline

**Causes possibles**
1. Cron job ne s'exécute pas → Vérifier Supabase Cron
2. RPC `claim_overdue_trips` échoue → Vérifier logs Edge Function
3. Crédit insuffisant → Vérifier `free_alerts_remaining`
4. Twilio error → Vérifier `sms_logs` status='failed'

**Debug**
```sql
SELECT * FROM sessions WHERE status='active' AND deadline < now();
SELECT * FROM sms_logs WHERE created_at > now() - interval '1h' ORDER BY created_at DESC;
```

### SMS non envoyés

**Symptôme** : `sms_logs` status='failed'

**Causes possibles**
1. Numéro invalide → Vérifier `emergency_contacts.phone_number`
2. Twilio error → Vérifier `sms_logs.error_message`
3. Quota dépassé → Vérifier `consume_credit` reason='quota_reached'
4. Crédit insuffisant → Vérifier `consume_credit` reason='no_credits'

**Debug**
```sql
SELECT * FROM sms_logs WHERE status='failed' ORDER BY created_at DESC LIMIT 10;
SELECT * FROM emergency_contacts WHERE user_id = '...' AND priority = 1;
```

---

## Références

- [Supabase RPC Documentation](https://supabase.com/docs/guides/database/functions)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Twilio SMS API](https://www.twilio.com/docs/sms/api)
- [PostgreSQL FOR UPDATE](https://www.postgresql.org/docs/current/sql-select.html#SQL-FOR-UPDATE-SHARE)
