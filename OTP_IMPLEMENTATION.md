# 🔐 Authentification OTP par SMS - SafeWalk V1.76

## Vue d'ensemble

SafeWalk implémente une authentification par OTP (One-Time Password) pour sécuriser l'envoi des alertes SOS. Avant de déclencher une alerte, l'utilisateur doit vérifier son numéro de téléphone avec un code à 6 chiffres envoyé par SMS.

**Objectif :** Prévenir les abus et les faux appels d'urgence tout en gardant un processus simple et rapide.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    SafeWalk Mobile App                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  1. phone-verification.tsx                                  │
│     ├─ Saisir numéro (+33...)                               │
│     └─ Appeler send-otp                                     │
│                                                               │
│  2. otp-verification.tsx                                    │
│     ├─ Saisir code 6 chiffres (OtpInput.tsx)               │
│     ├─ Timer 10 minutes                                     │
│     └─ Appeler verify-otp                                   │
│                                                               │
│  3. Flux d'alerte                                           │
│     ├─ Vérifier OTP via otpGuard.shouldRequireOtp()        │
│     ├─ Si non vérifié → rediriger vers phone-verification  │
│     └─ Si vérifié → créer session SOS normalement          │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              Supabase Edge Functions (Deno)                  │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  send-otp                                                    │
│  ├─ Valider numéro (E.164)                                  │
│  ├─ Générer code 6 chiffres                                 │
│  ├─ Envoyer SMS via Twilio                                  │
│  └─ Stocker dans otp_verifications                          │
│                                                               │
│  verify-otp                                                  │
│  ├─ Valider code (6 chiffres)                               │
│  ├─ Vérifier expiration (10 min)                            │
│  ├─ Vérifier tentatives (max 3)                             │
│  ├─ Marquer comme vérifié                                   │
│  └─ Logger dans otp_logs                                    │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              Supabase PostgreSQL Database                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  otp_verifications                                           │
│  ├─ id (UUID)                                               │
│  ├─ phone_number (unique)                                   │
│  ├─ otp_code (6 chiffres)                                   │
│  ├─ attempts (0-3)                                          │
│  ├─ created_at, expires_at (10 min)                         │
│  └─ verified_at (null jusqu'à vérification)                 │
│                                                               │
│  otp_logs (audit trail)                                     │
│  ├─ phone_number                                            │
│  ├─ action (send, verify_success, verify_failed, expired)   │
│  ├─ attempt_number                                          │
│  └─ error_message                                           │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Flux utilisateur

### 1️⃣ Premier accès - Vérification du numéro

```
Utilisateur veut créer une session SOS
        ↓
otpGuard.shouldRequireOtp() → true
        ↓
Rediriger vers /phone-verification
        ↓
Saisir numéro (+33 6 12 34 56 78)
        ↓
Appuyer "Envoyer le code"
        ↓
otpService.sendOtp("+33612345678")
        ↓
Edge Function send-otp
├─ Valider numéro
├─ Générer code (ex: 123456)
├─ Envoyer SMS "Votre code: 123456"
└─ Stocker dans otp_verifications
        ↓
Rediriger vers /otp-verification
```

### 2️⃣ Vérification du code

```
Utilisateur reçoit SMS avec code
        ↓
Saisir code 6 chiffres dans OtpInput
        ↓
Code complet → Appuyer "Vérifier"
        ↓
otpService.verifyOtp("+33612345678", "123456")
        ↓
Edge Function verify-otp
├─ Valider format code
├─ Vérifier expiration (< 10 min)
├─ Vérifier tentatives (< 3)
├─ Comparer code
└─ Marquer comme verified_at = NOW()
        ↓
otpGuard.markAsVerified("+33612345678")
        ↓
Retour à la création de session SOS
```

### 3️⃣ Création de session avec OTP vérifié

```
otpGuard.shouldRequireOtp() → false
        ↓
Créer session SOS normalement
        ↓
Envoyer SMS d'alerte aux contacts
```

---

## Services et composants

### `otp-service.ts`

Client pour les Edge Functions Supabase.

```typescript
// Envoyer OTP
const result = await otpService.sendOtp('+33612345678');
// {
//   success: true,
//   message: "OTP sent successfully",
//   expiresIn: 600  // 10 minutes en secondes
// }

// Vérifier OTP
const result = await otpService.verifyOtp('+33612345678', '123456');
// {
//   success: true,
//   message: "OTP verified successfully",
//   verified: true
// }
```

### `otp-guard.ts`

Gère l'état de vérification OTP.

```typescript
// Vérifier si OTP est requis
if (otpGuard.shouldRequireOtp()) {
  // Rediriger vers phone-verification
}

// Marquer comme vérifié
otpGuard.markAsVerified('+33612345678');

// Obtenir l'état
const state = otpGuard.getState();
// {
//   isVerified: true,
//   verifiedPhoneNumber: "+33612345678",
//   verifiedAt: 1708340000000
// }

// Effacer la vérification (logout)
otpGuard.clear();
```

### `OtpInput.tsx`

Composant pour saisir 6 chiffres.

```tsx
<OtpInput
  value={otpCode}
  onChangeText={setOtpCode}
  onComplete={(code) => handleVerify(code)}
  disabled={loading}
/>
```

**Fonctionnalités :**

- Auto-focus entre champs
- Support copier-coller (ex: "123456" → 6 champs remplis)
- Validation en temps réel
- Backspace pour revenir au champ précédent

### `phone-verification.tsx`

Écran pour saisir le numéro de téléphone.

```
┌─────────────────────────────────────┐
│          Vérification               │
│   Entrez votre numéro de téléphone  │
│                                     │
│  +33 [6 12 34 56 78]               │
│  Format: +33 6 12 34 56 78         │
│                                     │
│  [Envoyer le code]                 │
│  [Annuler]                         │
└─────────────────────────────────────┘
```

### `otp-verification.tsx`

Écran pour saisir le code OTP.

```
┌─────────────────────────────────────┐
│          Vérification               │
│   Entrez le code reçu par SMS       │
│   Numéro: +33 6 12 34 56 78        │
│                                     │
│  [1] [2] [3] [4] [5] [6]           │
│                                     │
│  Code expire dans: 9:45             │
│  2 tentative(s) restante(s)        │
│                                     │
│  [Vérifier]                        │
│  [Renvoyer le code (5:15)]         │
│  [Annuler]                         │
└─────────────────────────────────────┘
```

---

## Configuration Supabase

### 1. Créer les tables

```bash
supabase db push
```

Cela exécutera la migration `20260224_create_otp_tables.sql`.

### 2. Déployer les Edge Functions

```bash
# Authentifier
supabase login

# Lier le projet
supabase link --project-ref kycuteffcbqizyqlhczc

# Configurer les secrets Twilio
supabase secrets set TWILIO_ACCOUNT_SID=ACb64f2e874590389edb14a4878f356d4b
supabase secrets set TWILIO_AUTH_TOKEN=f50761d9f66c2196508efef4dba2e1d9
supabase secrets set TWILIO_PHONE_NUMBER=+33939035429

# Déployer les fonctions
supabase functions deploy send-otp
supabase functions deploy verify-otp

# Voir les logs
supabase functions logs send-otp --tail
supabase functions logs verify-otp --tail
```

### 3. Tester via curl

```bash
# Envoyer OTP
curl -X POST \
  https://kycuteffcbqizyqlhczc.supabase.co/functions/v1/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+33763458273"}'

# Vérifier OTP
curl -X POST \
  https://kycuteffcbqizyqlhczc.supabase.co/functions/v1/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+33763458273", "otpCode": "123456"}'
```

---

## Sécurité

### Bonnes pratiques implémentées

| Aspect            | Implémentation                     |
| ----------------- | ---------------------------------- |
| **Format numéro** | E.164 validation (+33...)          |
| **Code OTP**      | 6 chiffres aléatoires              |
| **Expiration**    | 10 minutes                         |
| **Tentatives**    | Max 3 avant blocage                |
| **Rate limiting** | À implémenter sur Edge Function    |
| **Logging**       | Audit trail dans `otp_logs`        |
| **SMS**           | Via Twilio (credentials sécurisés) |
| **Persistance**   | AsyncStorage côté client           |

### À améliorer

- [ ] Rate limiting par IP (max 5 envois/heure)
- [ ] Captcha après 3 tentatives échouées
- [ ] Notification email si tentatives suspectes
- [ ] Géolocalisation pour détecter abus
- [ ] Blacklist de numéros suspects

---

## Intégration avec le flux d'alerte

### Avant (sans OTP)

```typescript
// Utilisateur appuie "Je suis rentré en retard"
const handleAlertTimeout = async () => {
  await triggerAlert(location); // Envoie SMS immédiatement
};
```

### Après (avec OTP)

```typescript
// Utilisateur appuie "Je suis rentré en retard"
const handleAlertTimeout = async () => {
  // Vérifier si OTP est requis
  if (otpGuard.shouldRequireOtp()) {
    // Rediriger vers vérification
    router.push({
      pathname: '/phone-verification',
      params: { returnTo: '/active-session' },
    });
    return;
  }

  // OTP vérifié → créer session SOS
  await triggerAlert(location);
};
```

---

## Tests

### Tests unitaires

```bash
npm test -- tests/otp-guard.test.ts
npm test -- tests/otp-service.test.ts
```

**Couverture :**

- ✅ Validation format numéro (E.164)
- ✅ Validation format code (6 chiffres)
- ✅ Gestion tentatives (max 3)
- ✅ Gestion expiration (10 min)
- ✅ Sauvegarde/restauration état

### Tests manuels sur iPhone

1. **Test envoi OTP**
   - Saisir numéro valide
   - Vérifier SMS reçu
   - Vérifier logs Supabase

2. **Test vérification**
   - Saisir code correct → succès
   - Saisir code incorrect → erreur + compteur tentatives
   - Attendre 10 min → code expiré

3. **Test flux complet**
   - Créer session SOS
   - Attendre deadline
   - Vérifier OTP requis
   - Vérifier numéro + code
   - Vérifier SMS d'alerte envoyé

---

## Prochaines étapes

1. **Déployer sur Supabase**
   - Exécuter migrations
   - Déployer Edge Functions
   - Configurer secrets

2. **Intégrer dans le flux d'alerte**
   - Ajouter vérification OTP avant `triggerAlert`
   - Rediriger vers `phone-verification` si nécessaire
   - Persister état OTP

3. **Tester sur iPhone**
   - Créer nouvelle build EAS
   - Tester flux complet
   - Vérifier SMS reçus

4. **Améliorer la sécurité**
   - Rate limiting
   - Captcha
   - Notifications email

---

## Fichiers créés/modifiés

| Fichier                                              | Type          | Statut |
| ---------------------------------------------------- | ------------- | ------ |
| `supabase/migrations/20260224_create_otp_tables.sql` | Migration     | ✅     |
| `supabase/functions/send-otp/index.ts`               | Edge Function | ✅     |
| `supabase/functions/verify-otp/index.ts`             | Edge Function | ✅     |
| `lib/services/otp-service.ts`                        | Service       | ✅     |
| `lib/services/otp-guard.ts`                          | Service       | ✅     |
| `lib/logger.ts`                                      | Utility       | ✅     |
| `hooks/use-otp-verification.ts`                      | Hook          | ✅     |
| `components/otp-input.tsx`                           | Component     | ✅     |
| `app/phone-verification.tsx`                         | Screen        | ✅     |
| `app/otp-verification.tsx`                           | Screen        | ✅     |
| `tests/otp-guard.test.ts`                            | Test          | ✅     |
| `tests/otp-service.test.ts`                          | Test          | ✅     |

---

_Documentation créée le 24 février 2026_
