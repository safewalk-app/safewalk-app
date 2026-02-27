# Prochaines Étapes - Rate Limiting Global

## ✅ Déjà Fait

- [x] Migration SQL créée (migrations-004-rate-limiting.sql)

- [x] Hooks React créés (useDebounce, useCooldown)

- [x] Middleware rate-limiter créé (\_shared/rate-limiter.ts)

- [x] Edge Function start-trip mise à jour avec rate limiting

## 📋 À Faire (Dans l'Ordre)

### Phase 1: Déployer la Migration SQL (1-2 heures)

```bash
# 1. Copier le fichier migration dans Supabase
#    Fichier: supabase/migrations/migrations-004-rate-limiting.sql

# 2. Exécuter la migration
supabase db push

# 3. Vérifier que les tables sont créées
# Aller à Supabase Dashboard → SQL Editor
# Exécuter:
SELECT * FROM rate_limit_config;
# Vous devez voir 9 lignes avec les limites par défaut
```

### Phase 2: Ajouter Rate Limiting aux Autres Edge Functions (3-5 jours)

#### 2.1 send-otp

```
// Ajouter au début de la fonction
import { checkRateLimit, logRequest, createRateLimitHttpResponse } from "../_shared/rate-limiter.ts";

// Après vérification du JWT
const ipAddress = req.headers.get("x-forwarded-for") || "unknown";
const rateLimitResult = await checkRateLimit(supabase, userId, "send-otp", ipAddress);

if (!rateLimitResult.isAllowed) {
  await logRequest(supabase, userId, "send-otp", ipAddress);
  return createRateLimitHttpResponse(rateLimitResult.resetAt);
}

await logRequest(supabase, userId, "send-otp", ipAddress);
```

#### 2.2 verify-otp

```
// Même pattern que send-otp
const rateLimitResult = await checkRateLimit(supabase, userId, "verify-otp", ipAddress);
```

#### 2.3 test-sms

```
// Même pattern
const rateLimitResult = await checkRateLimit(supabase, userId, "test-sms", ipAddress);
```

#### 2.4 sos

```
// Même pattern
const rateLimitResult = await checkRateLimit(supabase, userId, "sos", ipAddress);
```

#### 2.5 checkin

```
// Même pattern
const rateLimitResult = await checkRateLimit(supabase, userId, "checkin", ipAddress);
```

#### 2.6 extend

```
// Même pattern
const rateLimitResult = await checkRateLimit(supabase, userId, "extend", ipAddress);
```

#### 2.7 get-stripe-products (Endpoint Public)

```
// Pour les endpoints publics, utiliser l'IP au lieu de user_id
const ipAddress = req.headers.get("x-forwarded-for") || "unknown";
const rateLimitResult = await checkRateLimit(supabase, null, "get-stripe-products", ipAddress);

if (!rateLimitResult.isAllowed) {
  await logRequest(supabase, null, "get-stripe-products", ipAddress);
  return createRateLimitHttpResponse(rateLimitResult.resetAt);
}

await logRequest(supabase, null, "get-stripe-products", ipAddress);
```

#### 2.8 create-stripe-checkout

```
// Même pattern que start-trip
const rateLimitResult = await checkRateLimit(supabase, userId, "create-stripe-checkout", ipAddress);
```

### Phase 3: Mettre à Jour les Services (2-3 jours)

#### 3.1 trip-service.ts

```
export async function startTrip(params: StartTripParams) {
  try {
    const { data, error } = await supabase.functions.invoke("start-trip", {
      body: params,
    });

    if (error) {
      // ✅ Gérer l'erreur de rate limit
      if (error.status === 429) {
        const errorData = error.context?.json || {};
        return {
          success: false,
          errorCode: "rate_limit_exceeded",
          message: errorData.message || "Trop de requêtes. Veuillez réessayer plus tard.",
          retryAfter: errorData.retryAfter || 60,
        };
      }

      // Autres erreurs
      return {
        success: false,
        errorCode: error.context?.errorCode || "unknown_error",
        message: error.message,
      };
    }

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      errorCode: "network_error",
      message: "Erreur réseau",
    };
  }
}
```

#### 3.2 auth-service.ts

```
export async function sendOTP(phoneNumber: string) {
  try {
    const { data, error } = await supabase.functions.invoke("send-otp", {
      body: { phoneNumber },
    });

    if (error) {
      if (error.status === 429) {
        return {
          success: false,
          errorCode: "rate_limit_exceeded",
          message: "Trop de tentatives. Réessayez dans quelques secondes.",
          retryAfter: error.context?.json?.retryAfter || 60,
        };
      }
      // ...
    }
    // ...
  } catch (error) {
    // ...
  }
}
```

### Phase 4: Ajouter l'UI avec Cooldowns (2-3 jours)

#### 4.1 app/phone-verification.tsx

```tsx
import { useCooldown } from '@/lib/hooks/use-cooldown';

export default function PhoneVerificationScreen() {
  const { trigger, isOnCooldown, remainingTime } = useCooldown({ duration: 60000 }); // 60 secondes

  const handleSendOTP = async () => {
    await trigger(async () => {
      const result = await authService.sendOTP(phoneNumber);

      if (!result.success) {
        if (result.errorCode === 'rate_limit_exceeded') {
          showToast({
            type: 'error',
            title: 'Trop de requêtes',
            message: result.message,
            duration: 3,
          });
        } else {
          showToast({
            type: 'error',
            title: 'Erreur',
            message: result.message,
          });
        }
      } else {
        showToast({
          type: 'success',
          title: 'OTP envoyé',
          message: 'Vérifiez votre SMS',
        });
      }
    });
  };

  return (
    <TouchableOpacity
      onPress={handleSendOTP}
      disabled={isOnCooldown}
      className={cn('bg-primary py-3 px-6 rounded-lg', isOnCooldown && 'opacity-50')}
    >
      <Text className="text-white font-bold">
        {isOnCooldown ? `Attendre ${Math.ceil(remainingTime / 1000)}s` : 'Envoyer OTP'}
      </Text>
    </TouchableOpacity>
  );
}
```

#### 4.2 app/new-session.tsx

```tsx
import { useCooldown } from '@/lib/hooks/use-cooldown';

export default function NewSessionScreen() {
  const { trigger, isOnCooldown, remainingTime } = useCooldown({ duration: 2000 }); // 2 secondes

  const handleStartSession = async () => {
    await trigger(async () => {
      const result = await tripService.startTrip({
        deadlineISO: deadline.toISOString(),
        shareLocation: true,
        destinationNote: note,
      });

      if (!result.success) {
        if (result.errorCode === 'rate_limit_exceeded') {
          showToast({
            type: 'error',
            title: 'Trop de requêtes',
            message: 'Attendez quelques secondes avant de réessayer.',
          });
        } else {
          showToast({
            type: 'error',
            title: 'Erreur',
            message: result.message,
          });
        }
      } else {
        // Succès
        navigation.navigate('active-session', { tripId: result.data.tripId });
      }
    });
  };

  return (
    <TouchableOpacity
      onPress={handleStartSession}
      disabled={isOnCooldown}
      className={cn('bg-primary py-3 px-6 rounded-lg', isOnCooldown && 'opacity-50')}
    >
      <Text className="text-white font-bold">
        {isOnCooldown ? `Attendre ${Math.ceil(remainingTime / 1000)}s` : 'Commencer'}
      </Text>
    </TouchableOpacity>
  );
}
```

### Phase 5: Tester (2-3 jours)

#### 5.1 Tester le rate limiting

```bash
# 1. Ouvrir l'app
# 2. Aller à Phone Verification
# 3. Cliquer "Envoyer OTP" 6 fois rapidement
# 4. À la 6ème tentative, vous devez voir:
#    - Message d'erreur "Trop de requêtes"
#    - Bouton désactivé pendant 60 secondes
#    - Timer "Attendre 60s"

# 5. Vérifier les logs dans Supabase
# Aller à Supabase Dashboard → SQL Editor
# Exécuter:
SELECT user_id, endpoint, COUNT(*) as count
FROM rate_limit_logs
WHERE timestamp > NOW() - INTERVAL '5 minutes'
GROUP BY user_id, endpoint
ORDER BY count DESC;
```

#### 5.2 Tester les autres endpoints

- Cliquer "Commencer" 11 fois rapidement → Rate limit à la 11ème

- Cliquer "SOS" 21 fois rapidement → Rate limit à la 21ème

- Etc.

### Phase 6: Déployer (1 jour)

```bash
# 1. Déployer les Edge Functions mises à jour
supabase functions deploy send-otp
supabase functions deploy verify-otp
supabase functions deploy test-sms
supabase functions deploy sos
supabase functions deploy checkin
supabase functions deploy extend
supabase functions deploy get-stripe-products
supabase functions deploy create-stripe-checkout

# 2. Déployer l'app mobile
# Créer un checkpoint et publier

# 3. Monitorer les logs
# Aller à Supabase Dashboard → SQL Editor
# Exécuter régulièrement:
SELECT endpoint, COUNT(*) as violations
FROM rate_limit_logs
WHERE timestamp > NOW() - INTERVAL '1 hour'
GROUP BY endpoint
ORDER BY violations DESC;
```

---

## 📊 Checklist Complète

- [ ] Migration SQL déployée

- [ ] send-otp avec rate limiting

- [ ] verify-otp avec rate limiting

- [ ] test-sms avec rate limiting

- [ ] sos avec rate limiting

- [ ] checkin avec rate limiting

- [ ] extend avec rate limiting

- [ ] get-stripe-products avec rate limiting

- [ ] create-stripe-checkout avec rate limiting

- [ ] trip-service.ts mis à jour

- [ ] auth-service.ts mis à jour

- [ ] phone-verification.tsx mis à jour

- [ ] new-session.tsx mis à jour

- [ ] Tests passent

- [ ] Déploiement en production

---

## 📞 Support

Si vous avez des questions:

1. Consulter le RATE_LIMITING_IMPLEMENTATION_PLAN.md

1. Vérifier les logs Supabase

1. Tester avec des requêtes manuelles

---

## ⏱️ Estimation Totale

- Phase 1: 1-2 heures

- Phase 2: 3-5 jours

- Phase 3: 2-3 jours

- Phase 4: 2-3 jours

- Phase 5: 2-3 jours

- Phase 6: 1 jour

**Total: 2-3 semaines**
