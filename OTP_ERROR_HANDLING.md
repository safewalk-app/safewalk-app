# 🚨 Gestion des erreurs OTP - SafeWalk

## Cas d'erreur identifiés

### 1. **Code OTP incorrect**
- **Cause** : L'utilisateur saisit un code qui ne correspond pas
- **Code HTTP** : 401 Unauthorized
- **Message** : "Code incorrect. X tentative(s) restante(s)"
- **Action** : Permettre de réessayer
- **Visuel** : Champ rouge, icône d'erreur

### 2. **Trop de tentatives (3 max)**
- **Cause** : L'utilisateur a échoué 3 fois
- **Code HTTP** : 429 Too Many Requests
- **Message** : "Trop de tentatives. Demandez un nouveau code."
- **Action** : Bouton "Renvoyer le code" activé
- **Visuel** : Alerte rouge, bouton d'action

### 3. **Code OTP expiré (10 min)**
- **Cause** : L'utilisateur a attendu plus de 10 minutes
- **Code HTTP** : 410 Gone
- **Message** : "Code expiré. Demandez un nouveau code."
- **Action** : Bouton "Renvoyer le code" activé
- **Visuel** : Alerte orange, timer à 0

### 4. **Numéro de téléphone non trouvé**
- **Cause** : L'utilisateur n'a pas d'OTP en attente
- **Code HTTP** : 404 Not Found
- **Message** : "Aucun code trouvé. Demandez un nouveau code."
- **Action** : Rediriger vers phone-verification
- **Visuel** : Alerte rouge

### 5. **Format numéro invalide**
- **Cause** : Le numéro n'est pas au format E.164
- **Code HTTP** : 400 Bad Request
- **Message** : "Format invalide. Utilisez +33..."
- **Action** : Permettre de corriger le numéro
- **Visuel** : Champ rouge, message d'aide

### 6. **Format code invalide**
- **Cause** : Le code n'a pas 6 chiffres
- **Code HTTP** : 400 Bad Request
- **Message** : "Le code doit avoir 6 chiffres"
- **Action** : Permettre de réessayer
- **Visuel** : Champ rouge, message d'aide

### 7. **Erreur réseau**
- **Cause** : Pas de connexion Internet
- **Code HTTP** : Network Error
- **Message** : "Erreur réseau. Vérifiez votre connexion."
- **Action** : Bouton "Réessayer"
- **Visuel** : Alerte rouge, icône de connexion

### 8. **Erreur serveur**
- **Cause** : Supabase/Twilio indisponible
- **Code HTTP** : 500 Internal Server Error
- **Message** : "Erreur serveur. Réessayez plus tard."
- **Action** : Bouton "Réessayer"
- **Visuel** : Alerte rouge

### 9. **SMS non envoyé (Twilio)**
- **Cause** : Twilio a rejeté l'envoi
- **Code HTTP** : 500 Internal Server Error
- **Message** : "Impossible d'envoyer le SMS. Vérifiez le numéro."
- **Action** : Permettre de réessayer
- **Visuel** : Alerte rouge

### 10. **Limite d'envoi dépassée**
- **Cause** : L'utilisateur a demandé trop de codes (rate limiting)
- **Code HTTP** : 429 Too Many Requests
- **Message** : "Trop de demandes. Réessayez dans 1 heure."
- **Action** : Afficher timer
- **Visuel** : Alerte orange

---

## Stratégie de gestion

### Hiérarchie des erreurs

```
┌─────────────────────────────────────────┐
│         Erreur OTP reçue                │
└────────────────┬────────────────────────┘
                 │
        ┌────────┴────────┐
        │                 │
    ┌───▼────┐      ┌────▼────┐
    │ Erreur │      │ Erreur  │
    │ Client │      │ Serveur │
    └───┬────┘      └────┬────┘
        │                │
    ┌───┴──────────────┬─┴──────────────┐
    │                  │                │
┌───▼────┐      ┌─────▼──┐      ┌─────▼──┐
│Format  │      │Logique │      │Réseau  │
│invalide│      │métier  │      │/Serveur│
└────────┘      └────────┘      └────────┘
```

### Types d'erreurs

| Type | Cause | Récupération | Visuel |
|------|-------|--------------|--------|
| **Validation** | Format invalide | Corriger l'entrée | 🔴 Rouge |
| **Logique métier** | Code incorrect, expiré, tentatives | Renvoyer code ou réessayer | 🟠 Orange |
| **Réseau** | Pas de connexion | Réessayer | 🔴 Rouge |
| **Serveur** | Erreur 5xx | Réessayer ou contacter support | 🔴 Rouge |

---

## Composants d'erreur

### 1. **ErrorAlert** - Alerte d'erreur générique

```tsx
<ErrorAlert
  title="Code incorrect"
  message="Vous avez 2 tentative(s) restante(s)"
  type="error"  // 'error' | 'warning' | 'info'
  icon="alert-circle"
  action={{
    label: "Réessayer",
    onPress: handleRetry
  }}
/>
```

### 2. **ErrorMessage** - Message d'erreur simple

```tsx
<ErrorMessage
  text="Le code doit avoir 6 chiffres"
  type="error"
/>
```

### 3. **ErrorState** - État d'erreur avec action

```tsx
<ErrorState
  title="Code expiré"
  description="Votre code a expiré après 10 minutes"
  action={{
    label: "Demander un nouveau code",
    onPress: handleResend
  }}
  retryCount={2}
/>
```

---

## Flux de gestion d'erreurs

### Écran `phone-verification`

```
┌─────────────────────────────────────────┐
│    Saisir numéro de téléphone           │
│  +33 [6 12 34 56 78]                   │
│                                         │
│  [Envoyer le code]                     │
└────────────┬────────────────────────────┘
             │
      ┌──────▼──────┐
      │ Validation  │
      └──────┬──────┘
             │
    ┌────────┴────────┐
    │                 │
┌───▼────┐      ┌────▼────┐
│ Valide │      │ Invalide│
└───┬────┘      └────┬────┘
    │                │
    │         ┌──────▼──────┐
    │         │ Afficher    │
    │         │ ErrorMessage│
    │         │ "Format:+33"│
    │         └─────────────┘
    │
┌───▼────────────────────────────────┐
│ Appeler otpService.sendOtp()       │
└───┬────────────────────────────────┘
    │
    ├─ Succès → Rediriger vers otp-verification
    │
    ├─ Erreur réseau → ErrorAlert "Erreur réseau"
    │
    └─ Erreur serveur → ErrorAlert "Erreur serveur"
```

### Écran `otp-verification`

```
┌─────────────────────────────────────────┐
│    Saisir le code (6 chiffres)          │
│  [1] [2] [3] [4] [5] [6]               │
│                                         │
│  Code expire dans: 9:45                │
│  [Vérifier]                            │
└────────────┬────────────────────────────┘
             │
      ┌──────▼──────┐
      │ Validation  │
      └──────┬──────┘
             │
    ┌────────┴────────┐
    │                 │
┌───▼────┐      ┌────▼────┐
│ Valide │      │ Invalide│
│(6 dig) │      │(< 6 dig)│
└───┬────┘      └────┬────┘
    │                │
    │         ┌──────▼──────────────┐
    │         │ ErrorMessage        │
    │         │ "6 chiffres requis" │
    │         └────────────────────┘
    │
┌───▼──────────────────────────────┐
│ Appeler otpService.verifyOtp()   │
└───┬──────────────────────────────┘
    │
    ├─ Succès → Rediriger vers retour
    │
    ├─ Code incorrect (tentatives restantes)
    │  └─ ErrorAlert "Code incorrect. X tentative(s)"
    │
    ├─ Code expiré
    │  └─ ErrorState + Bouton "Renvoyer le code"
    │
    ├─ Trop de tentatives
    │  └─ ErrorState + Bouton "Renvoyer le code"
    │
    ├─ Numéro non trouvé
    │  └─ ErrorAlert + Redirection phone-verification
    │
    ├─ Erreur réseau
    │  └─ ErrorAlert "Erreur réseau" + Bouton "Réessayer"
    │
    └─ Erreur serveur
       └─ ErrorAlert "Erreur serveur" + Bouton "Réessayer"
```

---

## Messages d'erreur par langue

### Français

| Cas | Message | Action |
|-----|---------|--------|
| Code incorrect | "Code incorrect. X tentative(s) restante(s)" | Réessayer |
| Trop de tentatives | "Trop de tentatives. Demandez un nouveau code." | Renvoyer |
| Code expiré | "Code expiré. Demandez un nouveau code." | Renvoyer |
| Numéro non trouvé | "Aucun code trouvé. Demandez un nouveau code." | Renvoyer |
| Format numéro | "Format invalide. Utilisez +33..." | Corriger |
| Format code | "Le code doit avoir 6 chiffres" | Corriger |
| Erreur réseau | "Erreur réseau. Vérifiez votre connexion." | Réessayer |
| Erreur serveur | "Erreur serveur. Réessayez plus tard." | Réessayer |
| SMS non envoyé | "Impossible d'envoyer le SMS. Vérifiez le numéro." | Réessayer |
| Limite dépassée | "Trop de demandes. Réessayez dans 1 heure." | Attendre |

---

## Codes d'erreur standardisés

```typescript
enum OtpErrorCode {
  // Validation (400)
  INVALID_PHONE_FORMAT = "INVALID_PHONE_FORMAT",
  INVALID_OTP_FORMAT = "INVALID_OTP_FORMAT",
  EMPTY_PHONE = "EMPTY_PHONE",
  EMPTY_OTP = "EMPTY_OTP",

  // Logique métier (4xx)
  OTP_NOT_FOUND = "OTP_NOT_FOUND",           // 404
  OTP_EXPIRED = "OTP_EXPIRED",               // 410
  OTP_INVALID = "OTP_INVALID",               // 401
  MAX_ATTEMPTS_EXCEEDED = "MAX_ATTEMPTS_EXCEEDED", // 429
  RATE_LIMIT = "RATE_LIMIT",                 // 429

  // Serveur (5xx)
  SMS_SEND_FAILED = "SMS_SEND_FAILED",       // 500
  DATABASE_ERROR = "DATABASE_ERROR",         // 500
  SERVER_ERROR = "SERVER_ERROR",             // 500

  // Réseau
  NETWORK_ERROR = "NETWORK_ERROR",
  TIMEOUT = "TIMEOUT",
}
```

---

## Exemple d'implémentation

### Service avec gestion d'erreurs

```typescript
async verifyOtp(phone: string, code: string): Promise<VerifyOtpResponse> {
  try {
    // Validation
    if (!phone || !code) {
      return {
        success: false,
        errorCode: "EMPTY_FIELDS",
        message: "Tous les champs sont requis"
      };
    }

    if (!this.isValidPhone(phone)) {
      return {
        success: false,
        errorCode: "INVALID_PHONE_FORMAT",
        message: "Format de numéro invalide"
      };
    }

    if (!this.isValidOtp(code)) {
      return {
        success: false,
        errorCode: "INVALID_OTP_FORMAT",
        message: "Le code doit avoir 6 chiffres"
      };
    }

    // Appel API
    const response = await fetch(...);

    if (!response.ok) {
      const data = await response.json();
      
      // Mapper les erreurs serveur
      return {
        success: false,
        errorCode: data.errorCode || "SERVER_ERROR",
        message: data.message || "Erreur serveur",
        attemptsRemaining: data.attemptsRemaining,
        retryAfter: data.retryAfter
      };
    }

    return await response.json();

  } catch (error) {
    // Erreur réseau
    return {
      success: false,
      errorCode: "NETWORK_ERROR",
      message: "Erreur réseau. Vérifiez votre connexion."
    };
  }
}
```

### Composant avec gestion d'erreurs

```tsx
export default function OtpVerificationScreen() {
  const [error, setError] = useState<OtpError | null>(null);
  const [attemptsRemaining, setAttemptsRemaining] = useState(3);

  const handleVerify = async () => {
    const result = await otpService.verifyOtp(phone, code);

    if (!result.success) {
      // Mapper le code d'erreur à un message
      const errorMessage = getErrorMessage(result.errorCode);
      
      setError({
        code: result.errorCode,
        message: errorMessage,
        attemptsRemaining: result.attemptsRemaining,
        action: getErrorAction(result.errorCode)
      });

      setAttemptsRemaining(result.attemptsRemaining || 3);
      return;
    }

    // Succès
    setError(null);
    router.back();
  };

  return (
    <ScreenContainer>
      {error && (
        <ErrorAlert
          title={getErrorTitle(error.code)}
          message={error.message}
          type={getErrorType(error.code)}
          action={error.action}
        />
      )}
      
      <OtpInput value={code} onChangeText={setCode} />
      
      <TouchableOpacity onPress={handleVerify}>
        <Text>Vérifier</Text>
      </TouchableOpacity>
    </ScreenContainer>
  );
}
```

---

*Documentation créée le 24 février 2026*
