# Guide de Déploiement Manuel - Edge Functions SafeWalk

## 📋 Résumé

Vous devez créer 3 fichiers dans le dossier `_shared` de Supabase Edge Functions:
1. `twilio.ts` - Helper Twilio
2. `rate-limiter.ts` - Helper Rate Limiting
3. `sms-templates.ts` - Helper SMS Templates

Puis déployer les 3 Edge Functions qui les utilisent.

---

## 🚀 Étape 1: Créer les Fichiers `_shared`

### Via Supabase Dashboard

1. Aller à **Supabase Dashboard** → **Edge Functions**
2. Cliquer sur **"Deploy a new function"** (bouton vert)
3. Choisir **"Via Editor"**
4. Pour chaque fichier:
   - Entrer le chemin: `_shared/twilio.ts` (ou `_shared/rate-limiter.ts`, etc.)
   - Copier-coller le code complet ci-dessous
   - Cliquer **"Deploy"**

---

## 📄 Fichier 1: `_shared/twilio.ts`

```typescript
// Shared Twilio helper for all Edge Functions
// Handles SMS sending with error handling and logging

export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  fromNumber: string;
}

export interface SendSmsOptions {
  to: string;
  message: string;
  config: TwilioConfig;
}

export interface SendSmsResponse {
  success: boolean;
  messageSid?: string;
  error?: string;
  errorCode?: string;
}

/**
 * Send SMS via Twilio API
 * @param options SendSmsOptions with recipient, message, and Twilio config
 * @returns SendSmsResponse with messageSid or error details
 */
export async function sendSms(options: SendSmsOptions): Promise<SendSmsResponse> {
  const { to, message, config } = options;

  try {
    // Validate inputs
    if (!to || !message || !config.accountSid || !config.authToken || !config.fromNumber) {
      return {
        success: false,
        error: 'Missing required parameters',
        errorCode: 'INVALID_PARAMS',
      };
    }

    // Twilio API endpoint
    const url = `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`;

    // Prepare form data
    const formData = new URLSearchParams();
    formData.append('From', config.fromNumber);
    formData.append('To', to);
    formData.append('Body', message);

    // Create Basic Auth header
    const auth = btoa(`${config.accountSid}:${config.authToken}`);

    // Send request
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    // Parse response
    const data = await response.json() as Record<string, unknown>;

    if (!response.ok) {
      const errorData = data as Record<string, unknown>;
      return {
        success: false,
        error: (errorData.message as string) || 'Twilio API error',
        errorCode: (errorData.code as string) || 'TWILIO_ERROR',
      };
    }

    // Success
    return {
      success: true,
      messageSid: (data.sid as string) || undefined,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: errorMessage,
      errorCode: 'TWILIO_EXCEPTION',
    };
  }
}

/**
 * Format phone number for Twilio (E.164 format)
 * @param phone Phone number (with or without +)
 * @returns E.164 formatted phone number
 */
export function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');

  // If already starts with country code (11+ digits), prepend +
  if (cleaned.length >= 11) {
    return `+${cleaned}`;
  }

  // If 10 digits (US), prepend +1
  if (cleaned.length === 10) {
    return `+1${cleaned}`;
  }

  // Otherwise assume it's already in correct format or needs manual fix
  return `+${cleaned}`;
}

/**
 * Validate phone number format
 * @param phone Phone number to validate
 * @returns true if valid E.164 format
 */
export function isValidPhoneNumber(phone: string): boolean {
  // E.164 format: +[1-9]{1}[0-9]{1,14}
  const e164Regex = /^\+[1-9]\d{1,14}$/;
  return e164Regex.test(phone);
}

/**
 * Create SMS message for overdue alert
 * @param userName User's name
 * @param deadline Deadline timestamp
 * @param shareLocation Whether location is included
 * @param latitude Last known latitude (if available)
 * @param longitude Last known longitude (if available)
 * @returns SMS message text
 */
export function createOverdueAlertMessage(
  userName: string,
  deadline: Date,
  shareLocation: boolean,
  latitude?: number,
  longitude?: number
): string {
  const timeStr = deadline.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  let message = `🚨 Alerte SafeWalk: ${userName} n'a pas confirmé son retour avant ${timeStr}.`;

  if (shareLocation && latitude !== undefined && longitude !== undefined) {
    message += `\nDernière position: https://maps.google.com/?q=${latitude},${longitude}`;
  }

  message += '\n\nVérifiez son état ou contactez les autorités si nécessaire.';

  return message;
}

/**
 * Create SMS message for test alert
 * @returns SMS message text
 */
export function createTestSmsMessage(): string {
  return '✅ SafeWalk: Ceci est un SMS de test. Votre contact d\'urgence a bien été configuré.';
}

/**
 * Create SMS message for SOS alert
 * @param userName User's name
 * @param shareLocation Whether location is included
 * @param latitude Last known latitude (if available)
 * @param longitude Last known longitude (if available)
 * @returns SMS message text
 */
export function createSosAlertMessage(
  userName: string,
  shareLocation: boolean,
  latitude?: number,
  longitude?: number
): string {
  let message = `🆘 Alerte SOS SafeWalk: ${userName} a déclenché une alerte d'urgence immédiate.`;

  if (shareLocation && latitude !== undefined && longitude !== undefined) {
    message += `\nPosition: https://maps.google.com/?q=${latitude},${longitude}`;
  }

  message += '\n\nContactez immédiatement les autorités si nécessaire.';

  return message;
}
```

---

## 📄 Fichier 2: `_shared/rate-limiter.ts`

```typescript
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

export interface RateLimitResult {
  isAllowed: boolean;
  requestsMade: number;
  limitRemaining: number;
  resetAt: string;
}

export interface RateLimitResponse {
  error: string;
  message: string;
  resetAt: string;
  retryAfter: number;
}

/**
 * Vérifier si une requête est autorisée selon le rate limit
 *
 * @param supabase - Client Supabase
 * @param userId - ID de l'utilisateur (peut être null pour les endpoints publics)
 * @param endpoint - Nom de l'endpoint (ex: "start-trip")
 * @param ipAddress - Adresse IP (optionnel)
 * @returns Résultat du rate limit
 */
export async function checkRateLimit(
  supabase: ReturnType<typeof createClient>,
  userId: string | null,
  endpoint: string,
  ipAddress?: string
): Promise<RateLimitResult> {
  try {
    const { data, error } = await supabase.rpc("check_rate_limit", {
      p_user_id: userId,
      p_endpoint: endpoint,
      p_ip_address: ipAddress,
    });

    if (error) {
      console.error("Rate limit check error:", error);
      // Laisser passer en cas d'erreur (fail-open)
      return {
        isAllowed: true,
        requestsMade: 0,
        limitRemaining: -1,
        resetAt: new Date().toISOString(),
      };
    }

    if (!data || data.length === 0) {
      return {
        isAllowed: true,
        requestsMade: 0,
        limitRemaining: -1,
        resetAt: new Date().toISOString(),
      };
    }

    return {
      isAllowed: data[0].is_allowed,
      requestsMade: data[0].requests_made,
      limitRemaining: data[0].limit_remaining,
      resetAt: data[0].reset_at,
    };
  } catch (error) {
    console.error("Rate limit check exception:", error);
    // Laisser passer en cas d'erreur
    return {
      isAllowed: true,
      requestsMade: 0,
      limitRemaining: -1,
      resetAt: new Date().toISOString(),
    };
  }
}

/**
 * Enregistrer une requête dans les logs de rate limit
 *
 * @param supabase - Client Supabase
 * @param userId - ID de l'utilisateur
 * @param endpoint - Nom de l'endpoint
 * @param ipAddress - Adresse IP (optionnel)
 */
export async function logRequest(
  supabase: ReturnType<typeof createClient>,
  userId: string | null,
  endpoint: string,
  ipAddress?: string
): Promise<void> {
  try {
    await supabase.rpc("log_request", {
      p_user_id: userId,
      p_endpoint: endpoint,
      p_ip_address: ipAddress,
    });
  } catch (error) {
    console.error("Rate limit log error:", error);
    // Continuer même si le logging échoue
  }
}

/**
 * Créer une réponse d'erreur de rate limit
 *
 * @param resetAt - Date de réinitialisation
 * @returns Réponse d'erreur formatée
 */
export function createRateLimitResponse(resetAt: string): RateLimitResponse {
  const resetDate = new Date(resetAt);
  const now = new Date();
  const retryAfter = Math.ceil((resetDate.getTime() - now.getTime()) / 1000);

  return {
    error: "rate_limit_exceeded",
    message: "Trop de requêtes. Veuillez réessayer plus tard.",
    resetAt,
    retryAfter: Math.max(1, retryAfter),
  };
}

/**
 * Créer une réponse HTTP 429 (Too Many Requests)
 *
 * @param resetAt - Date de réinitialisation
 * @returns Réponse HTTP
 */
export function createRateLimitHttpResponse(resetAt: string) {
  const errorData = createRateLimitResponse(resetAt);

  return new Response(JSON.stringify(errorData), {
    status: 429,
    headers: {
      "Content-Type": "application/json",
      "Retry-After": errorData.retryAfter.toString(),
    },
  });
}
```

---

## 📄 Fichier 3: `_shared/sms-templates.ts`

```typescript
/**
 * SMS Templates Helper
 * Generates dynamic SMS messages for SafeWalk alerts
 * Supports multiple variants based on available data
 */

export interface SmsTemplateParams {
  firstName?: string | null;
  deadline?: string | null;
  lat?: number | null;
  lng?: number | null;
  userPhone?: string | null;
  shareUserPhoneInAlerts?: boolean;
}

/**
 * Validates and formats phone number for SMS
 */
function formatPhoneNumber(phone: string | null | undefined): string | null {
  if (!phone || typeof phone !== 'string') return null;
  
  const cleaned = phone.trim();
  if (!cleaned || cleaned === 'undefined' || cleaned === 'null') return null;
  
  // Basic E.164 validation
  if (!/^\+\d{1,15}$/.test(cleaned)) return null;
  
  return cleaned;
}

/**
 * Generates Google Maps link from coordinates
 */
function generateMapLink(lat: number | null | undefined, lng: number | null | undefined): string | null {
  if (lat === null || lat === undefined || lng === null || lng === undefined) return null;
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;
  
  return `https://maps.google.com/maps?q=${lat},${lng}`;
}

/**
 * Formats time difference for SMS (e.g., "2h30")
 */
function formatTimeDifference(deadline: string | null | undefined): string {
  if (!deadline) return "quelques heures";
  
  try {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const diffMs = now.getTime() - deadlineDate.getTime();
    
    if (diffMs < 0) return "quelques heures";
    
    const diffMins = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    
    if (hours === 0) return `${mins}min`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h${mins}`;
  } catch {
    return "quelques heures";
  }
}

/**
 * Builds late alert SMS with dynamic variants
 * Supports: firstName, phone, position
 */
export function buildLateSms(params: SmsTemplateParams): string {
  const {
    firstName,
    deadline,
    lat,
    lng,
    userPhone,
    shareUserPhoneInAlerts = false,
  } = params;

  const hasFirstName = firstName && firstName.trim() && firstName !== 'undefined' && firstName !== 'null';
  const hasPhone = shareUserPhoneInAlerts && formatPhoneNumber(userPhone);
  const hasPosition = generateMapLink(lat, lng);
  const timeDiff = formatTimeDifference(deadline);

  const personRef = hasFirstName ? firstName.trim() : "Utilisateur";
  const mapLink = generateMapLink(lat, lng);

  // Build the message based on available data
  let message = `SafeWalk : pas de confirmation depuis ${timeDiff}. Essayez de contacter ${personRef}`;

  // Add phone if available
  if (hasPhone) {
    message += ` immédiatement au ${hasPhone}.`;
  } else {
    message += " immédiatement.";
  }

  // Add position if available
  if (mapLink) {
    message += ` Dernière position : ${mapLink}`;
  }

  return message;
}

/**
 * Builds SOS alert SMS with dynamic variants
 * Supports: firstName, phone, position
 */
export function buildSosSms(params: SmsTemplateParams): string {
  const {
    firstName,
    lat,
    lng,
    userPhone,
    shareUserPhoneInAlerts = false,
  } = params;

  const hasFirstName = firstName && firstName.trim() && firstName !== 'undefined' && firstName !== 'null';
  const hasPhone = shareUserPhoneInAlerts && formatPhoneNumber(userPhone);
  const mapLink = generateMapLink(lat, lng);

  let message: string;

  if (hasFirstName) {
    message = `SafeWalk SOS : ${firstName.trim()} a déclenché une alerte urgente. Appelez-le/la maintenant`;
  } else {
    message = `SafeWalk SOS : Utilisateur a déclenché une alerte urgente. Appelez-le/la maintenant`;
  }

  // Add phone if available
  if (hasPhone) {
    message += ` au ${hasPhone}.`;
  } else {
    message += ".";
  }

  // Add position if available
  if (mapLink) {
    message += ` Dernière position : ${mapLink}`;
  }

  return message;
}

/**
 * Builds test SMS with dynamic variants
 * Supports: firstName
 */
export function buildTestSms(params: SmsTemplateParams): string {
  const { firstName } = params;

  const hasFirstName = firstName && firstName.trim() && firstName !== 'undefined' && firstName !== 'null';

  if (hasFirstName) {
    return `SafeWalk test : tout est bien configuré. Vous recevrez un SMS comme celui-ci si ${firstName.trim()} ne confirme pas son arrivée.`;
  } else {
    return `SafeWalk test : tout est bien configuré. Vous recevrez un SMS comme celui-ci si Utilisateur ne confirme pas son arrivée.`;
  }
}

/**
 * Validates SMS template parameters
 */
export function validateSmsParams(params: SmsTemplateParams): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate firstName if provided
  if (params.firstName !== null && params.firstName !== undefined) {
    if (typeof params.firstName !== 'string') {
      errors.push('firstName must be a string');
    }
  }

  // Validate deadline if provided
  if (params.deadline !== null && params.deadline !== undefined) {
    if (typeof params.deadline !== 'string') {
      errors.push('deadline must be a string');
    } else {
      try {
        new Date(params.deadline);
      } catch {
        errors.push('deadline must be a valid ISO date string');
      }
    }
  }

  // Validate coordinates
  if (params.lat !== null && params.lat !== undefined) {
    if (typeof params.lat !== 'number' || isNaN(params.lat)) {
      errors.push('lat must be a valid number');
    }
  }

  if (params.lng !== null && params.lng !== undefined) {
    if (typeof params.lng !== 'number' || isNaN(params.lng)) {
      errors.push('lng must be a valid number');
    }
  }

  // Validate userPhone if provided
  if (params.userPhone !== null && params.userPhone !== undefined) {
    if (typeof params.userPhone !== 'string') {
      errors.push('userPhone must be a string');
    }
  }

  // Validate shareUserPhoneInAlerts
  if (params.shareUserPhoneInAlerts !== undefined) {
    if (typeof params.shareUserPhoneInAlerts !== 'boolean') {
      errors.push('shareUserPhoneInAlerts must be a boolean');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
```

---

## ✅ Étape 2: Vérifier que les Fichiers sont Créés

1. Aller à **Supabase Dashboard** → **Edge Functions**
2. Vérifier que vous voyez les 3 fichiers dans le dossier `_shared`:
   - `_shared/twilio.ts`
   - `_shared/rate-limiter.ts`
   - `_shared/sms-templates.ts`

---

## 🚀 Étape 3: Déployer les Edge Functions

Les Edge Functions suivantes utilisent les fichiers `_shared`:
- `cron-check-deadlines` - Utilise `buildLateSms()`
- `sos` - Utilise `buildSosSms()`
- `test-sms` - Utilise `buildTestSms()`

Ces fonctions devraient être **automatiquement mises à jour** une fois que les fichiers `_shared` sont créés.

---

## ✅ Vérification

1. Aller à **Supabase Dashboard** → **Edge Functions**
2. Cliquer sur `cron-check-deadlines`
3. Vérifier qu'il n'y a pas d'erreurs d'import
4. Tester en cliquant sur **"Test"** ou en attendant le prochain cron

---

## 🆘 Troubleshooting

**Erreur: "Module not found"**
- Vérifier que les fichiers `_shared` sont bien créés
- Vérifier le chemin d'import: `import { buildLateSms } from "../_shared/sms-templates.ts";`

**Erreur: "Function deployment failed"**
- Vérifier la syntaxe TypeScript
- Vérifier que tous les imports sont corrects
- Vérifier les logs dans Supabase Dashboard

**Les SMS ne sont pas envoyés**
- Vérifier que Twilio est configuré (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER)
- Vérifier les logs dans Supabase Dashboard
- Vérifier que le contact d'urgence a un numéro valide en format E.164 (+1234567890)
