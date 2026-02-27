# Plan de Mise en Œuvre du Rate Limiting Global - SafeWalk

## 1. Vue d'ensemble

Le rate limiting protège l'application contre:

- **Attaques par force brute** (tentatives OTP, connexions)
- **Abus d'API** (appels massifs)
- **DDoS** (surcharge du serveur)
- **Coûts Twilio excessifs** (SMS non autorisés)

---

## 2. Architecture du Rate Limiting

### 2.1 Niveaux de Rate Limiting

```
┌─────────────────────────────────────────────────────────┐
│                   Utilisateur                           │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│         Rate Limiting Client (Expo App)                 │
│  - Debounce sur les boutons                             │
│  - Cooldown entre les requêtes                          │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│         Rate Limiting Edge (Supabase)                   │
│  - Par utilisateur (user_id)                            │
│  - Par endpoint (fonction)                              │
│  - Par IP (pour les endpoints publics)                  │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│         Rate Limiting Serveur (Stripe, Twilio)          │
│  - Quotas mensuels                                      │
│  - Limites API officielles                              │
└─────────────────────────────────────────────────────────┘
```

### 2.2 Stratégies de Rate Limiting

| Niveau  | Stratégie           | Implémentation   |
| ------- | ------------------- | ---------------- |
| Client  | Debounce + Cooldown | React hooks      |
| Edge    | Token Bucket        | Redis (Supabase) |
| Serveur | Quotas mensuels     | Base de données  |

---

## 3. Implémentation Détaillée

### 3.1 Rate Limiting Client (Expo App)

#### 3.1.1 Hook de Debounce

```tsx
// lib/hooks/use-debounce.ts
import { useRef, useCallback } from 'react';

interface UseDebounceOptions {
  delay?: number;
  leading?: boolean;
  trailing?: boolean;
}

export function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  options: UseDebounceOptions = {},
): T {
  const { delay = 300, leading = false, trailing = true } = options;
  const timeoutRef = useRef<NodeJS.Timeout>();
  const leadingRef = useRef(true);

  return useCallback(
    (...args: any[]) => {
      if (leading && leadingRef.current) {
        callback(...args);
        leadingRef.current = false;
      }

      clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        if (trailing) {
          callback(...args);
        }
        leadingRef.current = true;
      }, delay);
    },
    [callback, delay, leading, trailing],
  ) as T;
}
```

#### 3.1.2 Hook de Cooldown

```tsx
// lib/hooks/use-cooldown.ts
import { useState, useCallback } from 'react';

interface UseCooldownOptions {
  duration?: number; // millisecondes
}

export function useCooldown(options: UseCooldownOptions = {}) {
  const { duration = 1000 } = options;
  const [isOnCooldown, setIsOnCooldown] = useState(false);
  const [remainingTime, setRemainingTime] = useState(0);

  const trigger = useCallback(
    async (callback: () => Promise<void>) => {
      if (isOnCooldown) {
        console.warn('Action is on cooldown');
        return;
      }

      try {
        setIsOnCooldown(true);
        setRemainingTime(duration);

        // Décrémenter le temps restant
        const interval = setInterval(() => {
          setRemainingTime((prev) => {
            if (prev <= 100) {
              clearInterval(interval);
              return 0;
            }
            return prev - 100;
          });
        }, 100);

        await callback();
      } finally {
        // Cooldown reste actif pendant `duration`
        setTimeout(() => {
          setIsOnCooldown(false);
          setRemainingTime(0);
        }, duration);
      }
    },
    [isOnCooldown, duration],
  );

  return { trigger, isOnCooldown, remainingTime };
}
```

#### 3.1.3 Utilisation dans les Composants

```tsx
// app/new-session.tsx
import { useCooldown } from '@/lib/hooks/use-cooldown';

export default function NewSessionScreen() {
  const { trigger, isOnCooldown, remainingTime } = useCooldown({ duration: 2000 });

  const handleStartSession = async () => {
    await trigger(async () => {
      // Appeler l'Edge Function
      const result = await tripService.startTrip({
        return_time: new Date(),
        emergency_contact: contact,
      });

      if (result.success) {
        // Succès
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

### 3.2 Rate Limiting Edge (Supabase)

#### 3.2.1 Table de Rate Limiting

```sql
-- supabase/migrations/migrations-004-rate-limiting.sql

-- Table pour tracker les requêtes
CREATE TABLE IF NOT EXISTS rate_limit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL, -- Nom de la fonction (ex: "start-trip")
  ip_address TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT rate_limit_logs_endpoint_check CHECK (endpoint ~ '^[a-z0-9_-]+$')
);

-- Index pour les requêtes rapides
CREATE INDEX idx_rate_limit_logs_user_endpoint_timestamp
ON rate_limit_logs(user_id, endpoint, timestamp DESC);

CREATE INDEX idx_rate_limit_logs_ip_endpoint_timestamp
ON rate_limit_logs(ip_address, endpoint, timestamp DESC);

-- Table pour les limites configurables
CREATE TABLE IF NOT EXISTS rate_limit_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint TEXT NOT NULL UNIQUE,
  max_requests INT NOT NULL DEFAULT 10,
  window_seconds INT NOT NULL DEFAULT 60,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT rate_limit_config_endpoint_check CHECK (endpoint ~ '^[a-z0-9_-]+$'),
  CONSTRAINT rate_limit_config_max_requests_check CHECK (max_requests > 0),
  CONSTRAINT rate_limit_config_window_check CHECK (window_seconds > 0)
);

-- Insérer les limites par défaut
INSERT INTO rate_limit_config (endpoint, max_requests, window_seconds, description) VALUES
('send-otp', 5, 60, 'Limiter les tentatives OTP à 5 par minute'),
('verify-otp', 10, 60, 'Limiter les vérifications OTP à 10 par minute'),
('start-trip', 10, 60, 'Limiter la création de sorties à 10 par minute'),
('test-sms', 5, 60, 'Limiter les SMS de test à 5 par minute'),
('sos', 20, 60, 'Limiter les SOS à 20 par minute'),
('checkin', 20, 60, 'Limiter les check-in à 20 par minute'),
('extend', 10, 60, 'Limiter les extensions à 10 par minute'),
('get-stripe-products', 100, 60, 'Limiter les requêtes produits à 100 par minute'),
('create-stripe-checkout', 50, 60, 'Limiter les sessions de paiement à 50 par minute');

-- RPC pour vérifier le rate limit
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_user_id UUID,
  p_endpoint TEXT,
  p_ip_address TEXT DEFAULT NULL
)
RETURNS TABLE (
  is_allowed BOOLEAN,
  requests_made INT,
  limit_remaining INT,
  reset_at TIMESTAMPTZ
) AS $$
DECLARE
  v_max_requests INT;
  v_window_seconds INT;
  v_requests_made INT;
  v_limit_remaining INT;
  v_reset_at TIMESTAMPTZ;
BEGIN
  -- Récupérer la configuration du rate limit
  SELECT max_requests, window_seconds
  INTO v_max_requests, v_window_seconds
  FROM rate_limit_config
  WHERE endpoint = p_endpoint;

  IF NOT FOUND THEN
    -- Pas de limite configurée pour cet endpoint
    RETURN QUERY SELECT true, 0, -1, NOW();
    RETURN;
  END IF;

  -- Compter les requêtes dans la fenêtre de temps
  SELECT COUNT(*)
  INTO v_requests_made
  FROM rate_limit_logs
  WHERE
    (p_user_id IS NOT NULL AND user_id = p_user_id)
    OR (p_ip_address IS NOT NULL AND ip_address = p_ip_address)
    AND endpoint = p_endpoint
    AND timestamp > NOW() - (v_window_seconds || ' seconds')::INTERVAL;

  v_limit_remaining := GREATEST(0, v_max_requests - v_requests_made);
  v_reset_at := NOW() + (v_window_seconds || ' seconds')::INTERVAL;

  RETURN QUERY SELECT
    v_requests_made < v_max_requests,
    v_requests_made,
    v_limit_remaining,
    v_reset_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC pour enregistrer une requête
CREATE OR REPLACE FUNCTION log_request(
  p_user_id UUID,
  p_endpoint TEXT,
  p_ip_address TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO rate_limit_logs (user_id, endpoint, ip_address)
  VALUES (p_user_id, p_endpoint, p_ip_address);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies
ALTER TABLE rate_limit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own rate limit logs"
ON rate_limit_logs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert rate limit logs"
ON rate_limit_logs FOR INSERT
WITH CHECK (true);

ALTER TABLE rate_limit_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view rate limit config"
ON rate_limit_config FOR SELECT
USING (true);
```

#### 3.2.2 Middleware Rate Limiting

```ts
// supabase/functions/_shared/rate-limiter.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

interface RateLimitResult {
  isAllowed: boolean;
  requestsMade: number;
  limitRemaining: number;
  resetAt: string;
}

export async function checkRateLimit(
  supabase: ReturnType<typeof createClient>,
  userId: string | null,
  endpoint: string,
  ipAddress?: string,
): Promise<RateLimitResult> {
  try {
    const { data, error } = await supabase.rpc('check_rate_limit', {
      p_user_id: userId,
      p_endpoint: endpoint,
      p_ip_address: ipAddress,
    });

    if (error) {
      console.error('Rate limit check error:', error);
      // Laisser passer en cas d'erreur (fail-open)
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
    console.error('Rate limit check exception:', error);
    return {
      isAllowed: true,
      requestsMade: 0,
      limitRemaining: -1,
      resetAt: new Date().toISOString(),
    };
  }
}

export async function logRequest(
  supabase: ReturnType<typeof createClient>,
  userId: string | null,
  endpoint: string,
  ipAddress?: string,
): Promise<void> {
  try {
    await supabase.rpc('log_request', {
      p_user_id: userId,
      p_endpoint: endpoint,
      p_ip_address: ipAddress,
    });
  } catch (error) {
    console.error('Rate limit log error:', error);
    // Continuer même si le logging échoue
  }
}
```

#### 3.2.3 Utilisation dans les Edge Functions

```ts
// supabase/functions/start-trip/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { checkRateLimit, logRequest } from '../_shared/rate-limiter.ts';

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Récupérer le JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.substring(7);
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Vérifier le JWT
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // ✅ VÉRIFIER LE RATE LIMIT
    const ipAddress = req.headers.get('x-forwarded-for') || 'unknown';
    const rateLimitResult = await checkRateLimit(supabase, user.id, 'start-trip', ipAddress);

    if (!rateLimitResult.isAllowed) {
      // ✅ ENREGISTRER LA TENTATIVE
      await logRequest(supabase, user.id, 'start-trip', ipAddress);

      return new Response(
        JSON.stringify({
          error: 'rate_limit_exceeded',
          message: 'Trop de requêtes. Veuillez réessayer plus tard.',
          resetAt: rateLimitResult.resetAt,
          retryAfter: Math.ceil((new Date(rateLimitResult.resetAt).getTime() - Date.now()) / 1000),
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': Math.ceil(
              (new Date(rateLimitResult.resetAt).getTime() - Date.now()) / 1000,
            ).toString(),
          },
        },
      );
    }

    // ✅ ENREGISTRER LA REQUÊTE AUTORISÉE
    await logRequest(supabase, user.id, 'start-trip', ipAddress);

    // Continuer avec la logique de la fonction
    const body = await req.json();
    // ... reste du code
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
```

### 3.3 Gestion des Erreurs de Rate Limit

#### 3.3.1 Service Trip Mis à Jour

```ts
// lib/services/trip-service.ts
export async function startTrip(params: StartTripParams) {
  try {
    const { data, error } = await supabase.functions.invoke('start-trip', {
      body: params,
    });

    if (error) {
      // ✅ Gérer l'erreur de rate limit
      if (error.status === 429) {
        const errorData = error.context?.json || {};
        return {
          success: false,
          errorCode: 'rate_limit_exceeded',
          message: errorData.message || 'Trop de requêtes. Veuillez réessayer plus tard.',
          retryAfter: errorData.retryAfter || 60,
        };
      }

      // Autres erreurs
      return {
        success: false,
        errorCode: error.context?.errorCode || 'unknown_error',
        message: error.message,
      };
    }

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      errorCode: 'network_error',
      message: 'Erreur réseau',
    };
  }
}
```

#### 3.3.2 Affichage de l'Erreur dans l'UI

```tsx
// app/new-session.tsx
const handleStartSession = async () => {
  const result = await tripService.startTrip({
    return_time: new Date(),
    emergency_contact: contact,
  });

  if (!result.success) {
    if (result.errorCode === 'rate_limit_exceeded') {
      // ✅ Afficher un message spécifique
      showToast({
        type: 'error',
        title: 'Trop de requêtes',
        message: result.message,
        duration: result.retryAfter || 5,
      });

      // Désactiver le bouton pendant `retryAfter` secondes
      setIsDisabled(true);
      setTimeout(() => setIsDisabled(false), (result.retryAfter || 60) * 1000);
    } else {
      showToast({
        type: 'error',
        title: 'Erreur',
        message: result.message,
      });
    }
  }
};
```

---

## 4. Configuration des Limites

### 4.1 Limites Recommandées

| Endpoint               | Max Requêtes | Fenêtre | Raison                                |
| ---------------------- | ------------ | ------- | ------------------------------------- |
| send-otp               | 5            | 60s     | Prévenir les attaques par force brute |
| verify-otp             | 10           | 60s     | Permettre les erreurs de saisie       |
| start-trip             | 10           | 60s     | Éviter les créations accidentelles    |
| test-sms               | 5            | 60s     | Limiter les coûts Twilio              |
| sos                    | 20           | 60s     | Permettre les urgences réelles        |
| get-stripe-products    | 100          | 60s     | Cache 5 minutes = peu de requêtes     |
| create-stripe-checkout | 50           | 60s     | Limiter les sessions de paiement      |

### 4.2 Ajuster les Limites

```sql
-- Augmenter la limite pour un endpoint
UPDATE rate_limit_config
SET max_requests = 20
WHERE endpoint = 'start-trip';

-- Vérifier les limites actuelles
SELECT endpoint, max_requests, window_seconds
FROM rate_limit_config
ORDER BY endpoint;
```

---

## 5. Monitoring et Alertes

### 5.1 Dashboard de Monitoring

```sql
-- Voir les utilisateurs qui dépassent les limites
SELECT
  user_id,
  endpoint,
  COUNT(*) as request_count,
  MAX(timestamp) as last_request
FROM rate_limit_logs
WHERE timestamp > NOW() - INTERVAL '1 hour'
GROUP BY user_id, endpoint
HAVING COUNT(*) > (
  SELECT max_requests
  FROM rate_limit_config
  WHERE endpoint = rate_limit_logs.endpoint
)
ORDER BY request_count DESC;

-- Voir les IPs suspectes
SELECT
  ip_address,
  endpoint,
  COUNT(*) as request_count,
  COUNT(DISTINCT user_id) as unique_users
FROM rate_limit_logs
WHERE timestamp > NOW() - INTERVAL '1 hour'
GROUP BY ip_address, endpoint
HAVING COUNT(*) > 100
ORDER BY request_count DESC;
```

### 5.2 Alertes

```ts
// supabase/functions/monitor-rate-limits/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

serve(async (req: Request) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Chercher les utilisateurs qui dépassent les limites
  const { data: violators, error } = await supabase
    .from('rate_limit_logs')
    .select('user_id, endpoint, COUNT(*) as count')
    .gt('timestamp', new Date(Date.now() - 3600000).toISOString())
    .group_by('user_id, endpoint');

  if (error) {
    console.error('Error fetching violators:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }

  // Envoyer une alerte pour chaque violation
  for (const violator of violators || []) {
    if (violator.count > 50) {
      // Alerte Slack, email, etc.
      console.warn(
        `Rate limit violation: user ${violator.user_id} on ${violator.endpoint} (${violator.count} requests)`,
      );
    }
  }

  return new Response(JSON.stringify({ success: true }), { status: 200 });
});
```

---

## 6. Plan de Déploiement

### Phase 1: Préparation (1-2 jours)

- [ ] Créer la migration SQL (migrations-004-rate-limiting.sql)
- [ ] Créer le hook useDebounce
- [ ] Créer le hook useCooldown
- [ ] Créer le middleware rate-limiter.ts

### Phase 2: Implémentation (3-5 jours)

- [ ] Ajouter le rate limiting à start-trip
- [ ] Ajouter le rate limiting à send-otp
- [ ] Ajouter le rate limiting à verify-otp
- [ ] Ajouter le rate limiting à test-sms
- [ ] Ajouter le rate limiting à sos
- [ ] Mettre à jour les services pour gérer les erreurs 429

### Phase 3: UI/UX (2-3 jours)

- [ ] Ajouter le cooldown au bouton "Commencer"
- [ ] Ajouter le cooldown au bouton "Envoyer OTP"
- [ ] Ajouter les messages d'erreur "Trop de requêtes"
- [ ] Ajouter le timer "Réessayer dans X secondes"

### Phase 4: Testing (2-3 jours)

- [ ] Tester le rate limiting avec des requêtes massives
- [ ] Vérifier que les logs sont enregistrés
- [ ] Tester les messages d'erreur
- [ ] Tester le monitoring

### Phase 5: Déploiement (1 jour)

- [ ] Déployer la migration SQL
- [ ] Déployer les Edge Functions mises à jour
- [ ] Déployer l'app mobile mise à jour
- [ ] Monitorer les logs pour les violations

---

## 7. Coûts et Impact

### 7.1 Coûts Supabase

| Ressource      | Impact                             |
| -------------- | ---------------------------------- |
| Stockage       | +100 MB/mois (rate_limit_logs)     |
| Requêtes       | +10% (vérifications de rate limit) |
| Bande passante | Négligeable                        |

### 7.2 Performance

| Métrique          | Avant    | Après        |
| ----------------- | -------- | ------------ |
| Latence moyenne   | 200ms    | 220ms (+10%) |
| Requêtes bloquées | 0%       | <1%          |
| Coûts Twilio      | Variable | Stable       |

---

## 8. Maintenance et Amélioration

### 8.1 Maintenance Mensuelle

```sql
-- Nettoyer les logs anciens (garder 30 jours)
DELETE FROM rate_limit_logs
WHERE timestamp < NOW() - INTERVAL '30 days';

-- Analyser les patterns de violation
SELECT
  endpoint,
  COUNT(*) as violations,
  AVG(requests_made) as avg_requests
FROM rate_limit_logs
WHERE timestamp > NOW() - INTERVAL '30 days'
GROUP BY endpoint
ORDER BY violations DESC;
```

### 8.2 Améliorations Futures

1. **Rate limiting adaptatif** - Augmenter les limites pour les utilisateurs de confiance
2. **Whitelist d'IP** - Permettre les requêtes massives depuis certaines IPs
3. **Rate limiting par géolocalisation** - Limites différentes par région
4. **Machine learning** - Détecter les patterns anormaux

---

## 9. Checklist de Déploiement

- [ ] Migration SQL créée et testée
- [ ] Hooks React créés et testés
- [ ] Middleware rate-limiter créé
- [ ] Toutes les Edge Functions mises à jour
- [ ] Services mis à jour pour gérer les erreurs 429
- [ ] UI mise à jour avec les messages d'erreur
- [ ] Tests unitaires passent
- [ ] Tests d'intégration passent
- [ ] Documentation mise à jour
- [ ] Monitoring configuré
- [ ] Alertes configurées
- [ ] Déploiement en production

---

## 10. Conclusion

Ce plan fournit une implémentation complète du rate limiting global pour SafeWalk:

✅ **Protège contre les abus**
✅ **Limite les coûts Twilio**
✅ **Améliore la sécurité**
✅ **Maintient la performance**
✅ **Facile à maintenir et à améliorer**

**Estimation totale:** 2-3 semaines de développement
