# Architecture d'Analytics - SafeWalk

## Vue d'ensemble

Analytics track les événements utilisateur pour comprendre:
- **Engagement** - Combien d'utilisateurs créent des sorties?
- **Retention** - Combien reviennent chaque jour?
- **Safety features** - Combien utilisent SOS? Combien checkin?
- **Errors** - Quels sont les problèmes les plus fréquents?
- **Funnel** - Où les utilisateurs abandonnent-ils?

---

## Architecture Globale

```
┌─────────────────────────────────────────────────────────┐
│  App Mobile (React Native)                              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Events:                                                │
│  - app_opened                                           │
│  - session_created (start-trip)                         │
│  - sos_triggered                                        │
│  - session_checked_in (checkin)                         │
│  - session_extended (extend)                            │
│  - contact_configured                                   │
│  - error_occurred                                       │
│                                                         │
│  ↓ (POST /analytics/track)                              │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Edge Function: track-event                       │  │
│  │ - Valide l'événement                             │  │
│  │ - Enrichit avec user_id, timestamp, device_info  │  │
│  │ - Insère dans analytics_events                   │  │
│  └──────────────────────────────────────────────────┘  │
│           ↓                                             │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Database Tables                                  │  │
│  ├──────────────────────────────────────────────────┤  │
│  │ - analytics_events (raw events)                  │  │
│  │ - analytics_daily_active_users (DAU)             │  │
│  │ - analytics_session_funnel (funnel)              │  │
│  │ - analytics_user_cohorts (cohorts)               │  │
│  └──────────────────────────────────────────────────┘  │
│           ↓ (Queries)                                  │
│  ┌──────────────────────────────────────────────────┐  │
│  │ RPC Functions                                    │  │
│  ├──────────────────────────────────────────────────┤  │
│  │ - get_daily_active_users()                       │  │
│  │ - get_session_funnel()                           │  │
│  │ - get_event_distribution()                       │  │
│  │ - get_user_retention()                           │  │
│  │ - get_error_analytics()                          │  │
│  └──────────────────────────────────────────────────┘  │
│           ↓ (API)                                      │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Analytics Dashboard                              │  │
│  ├──────────────────────────────────────────────────┤  │
│  │ - DAU / MAU / Retention                          │  │
│  │ - Session funnel                                 │  │
│  │ - SOS usage                                      │  │
│  │ - Error trends                                   │  │
│  │ - User cohorts                                   │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 1. Événements à tracker

### Événements Critiques

| Événement | Données | Fréquence | Importance |
|-----------|---------|-----------|-----------|
| `app_opened` | user_id, device, app_version | À chaque ouverture | 🔴 CRITIQUE |
| `session_created` | user_id, duration, contact_id | Chaque sortie | 🔴 CRITIQUE |
| `sos_triggered` | user_id, session_id, reason | À chaque SOS | 🔴 CRITIQUE |
| `session_checked_in` | user_id, session_id, delay | Chaque checkin | 🔴 CRITIQUE |
| `session_extended` | user_id, session_id, new_duration | Chaque extension | 🟡 IMPORTANT |
| `contact_configured` | user_id, contact_id, phone_number | Chaque config | 🟡 IMPORTANT |
| `error_occurred` | user_id, error_code, error_message | Chaque erreur | 🟡 IMPORTANT |
| `test_sms_sent` | user_id, contact_id, success | Chaque test | 🟢 OPTIONNEL |
| `otp_verified` | user_id, phone_number | Chaque vérification | 🟡 IMPORTANT |

### Schéma d'événement

```typescript
interface AnalyticsEvent {
  event_name: string;           // app_opened, session_created, etc.
  user_id: string;              // UUID
  session_id?: string;          // UUID (si applicable)
  contact_id?: string;          // UUID (si applicable)
  properties: Record<string, any>; // Données supplémentaires
  device_info: {
    platform: 'ios' | 'android' | 'web';
    app_version: string;
    os_version: string;
    device_model: string;
  };
  timestamp: string;            // ISO 8601
  created_at: string;           // Timestamp serveur
}
```

---

## 2. Tables d'Analytics

### Table: analytics_events (Raw Events)

```sql
CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name VARCHAR NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id),
  session_id UUID REFERENCES sessions(id),
  contact_id UUID REFERENCES emergency_contacts(id),
  properties JSONB DEFAULT '{}',
  device_info JSONB,
  platform VARCHAR,  -- 'ios', 'android', 'web'
  app_version VARCHAR,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX idx_analytics_events_event_name ON analytics_events(event_name);
CREATE INDEX idx_analytics_events_created_at ON analytics_events(created_at);
CREATE INDEX idx_analytics_events_session_id ON analytics_events(session_id);
```

### Table: analytics_daily_active_users (DAU)

```sql
CREATE TABLE analytics_daily_active_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  total_users INT NOT NULL,
  new_users INT NOT NULL,
  returning_users INT NOT NULL,
  active_sessions INT NOT NULL,
  sos_triggered INT NOT NULL,
  sessions_completed INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(date)
);

CREATE INDEX idx_dau_date ON analytics_daily_active_users(date);
```

### Table: analytics_session_funnel (Funnel)

```sql
CREATE TABLE analytics_session_funnel (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  step VARCHAR NOT NULL,  -- 'app_opened', 'session_created', 'sos_triggered', 'checked_in'
  count INT NOT NULL,
  conversion_rate FLOAT,  -- % par rapport à l'étape précédente
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(date, step)
);

CREATE INDEX idx_funnel_date ON analytics_session_funnel(date);
```

### Table: analytics_user_cohorts (Cohorts)

```sql
CREATE TABLE analytics_user_cohorts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_date DATE NOT NULL,  -- Date de création de l'utilisateur
  cohort_week INT NOT NULL,   -- Semaine depuis création
  users_count INT NOT NULL,
  active_users INT NOT NULL,
  sessions_count INT NOT NULL,
  sos_count INT NOT NULL,
  retention_rate FLOAT,       -- % d'utilisateurs actifs
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(cohort_date, cohort_week)
);

CREATE INDEX idx_cohorts_date ON analytics_user_cohorts(cohort_date);
```

---

## 3. RPC Functions pour Analytics

### RPC: get_daily_active_users()

```sql
CREATE FUNCTION get_daily_active_users(p_days INT DEFAULT 30)
RETURNS TABLE (
  date DATE,
  total_users INT,
  new_users INT,
  returning_users INT,
  active_sessions INT,
  sos_triggered INT,
  sessions_completed INT,
  dau_trend VARCHAR  -- 'up', 'down', 'stable'
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH daily_stats AS (
    SELECT 
      DATE(ae.created_at) as date,
      COUNT(DISTINCT ae.user_id) as total_users,
      COUNT(DISTINCT CASE 
        WHEN NOT EXISTS (
          SELECT 1 FROM analytics_events ae2 
          WHERE ae2.user_id = ae.user_id 
          AND DATE(ae2.created_at) < DATE(ae.created_at)
        ) THEN ae.user_id 
      END) as new_users,
      COUNT(DISTINCT CASE 
        WHEN EXISTS (
          SELECT 1 FROM analytics_events ae2 
          WHERE ae2.user_id = ae.user_id 
          AND DATE(ae2.created_at) < DATE(ae.created_at)
        ) THEN ae.user_id 
      END) as returning_users,
      COUNT(DISTINCT CASE WHEN ae.event_name = 'session_created' THEN ae.session_id END) as active_sessions,
      COUNT(DISTINCT CASE WHEN ae.event_name = 'sos_triggered' THEN ae.session_id END) as sos_triggered,
      COUNT(DISTINCT CASE WHEN ae.event_name = 'session_checked_in' THEN ae.session_id END) as sessions_completed
    FROM analytics_events ae
    WHERE ae.created_at > NOW() - (p_days || ' days')::INTERVAL
    GROUP BY DATE(ae.created_at)
  ),
  with_trend AS (
    SELECT 
      *,
      LAG(total_users) OVER (ORDER BY date) as prev_total_users
    FROM daily_stats
  )
  SELECT 
    date,
    total_users,
    new_users,
    returning_users,
    active_sessions,
    sos_triggered,
    sessions_completed,
    CASE 
      WHEN prev_total_users IS NULL THEN 'new'
      WHEN total_users > prev_total_users THEN 'up'
      WHEN total_users < prev_total_users THEN 'down'
      ELSE 'stable'
    END as dau_trend
  FROM with_trend
  ORDER BY date DESC;
END;
$$;
```

### RPC: get_session_funnel()

```sql
CREATE FUNCTION get_session_funnel(p_days INT DEFAULT 30)
RETURNS TABLE (
  step VARCHAR,
  count INT,
  conversion_rate FLOAT,
  step_order INT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH funnel_steps AS (
    SELECT 
      'app_opened' as step,
      COUNT(DISTINCT CASE WHEN event_name = 'app_opened' THEN user_id END) as count,
      1 as step_order
    FROM analytics_events
    WHERE created_at > NOW() - (p_days || ' days')::INTERVAL
    UNION ALL
    SELECT 
      'session_created' as step,
      COUNT(DISTINCT CASE WHEN event_name = 'session_created' THEN user_id END) as count,
      2 as step_order
    FROM analytics_events
    WHERE created_at > NOW() - (p_days || ' days')::INTERVAL
    UNION ALL
    SELECT 
      'sos_triggered' as step,
      COUNT(DISTINCT CASE WHEN event_name = 'sos_triggered' THEN session_id END) as count,
      3 as step_order
    FROM analytics_events
    WHERE created_at > NOW() - (p_days || ' days')::INTERVAL
    UNION ALL
    SELECT 
      'session_checked_in' as step,
      COUNT(DISTINCT CASE WHEN event_name = 'session_checked_in' THEN session_id END) as count,
      4 as step_order
    FROM analytics_events
    WHERE created_at > NOW() - (p_days || ' days')::INTERVAL
  ),
  with_conversion AS (
    SELECT 
      step,
      count,
      ROUND(100.0 * count / (SELECT count FROM funnel_steps WHERE step_order = 1), 2) as conversion_rate,
      step_order
    FROM funnel_steps
  )
  SELECT * FROM with_conversion ORDER BY step_order;
END;
$$;
```

### RPC: get_user_retention()

```sql
CREATE FUNCTION get_user_retention(p_cohort_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
  week INT,
  users_count INT,
  active_users INT,
  retention_rate FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    auc.cohort_week,
    auc.users_count,
    auc.active_users,
    auc.retention_rate
  FROM analytics_user_cohorts auc
  WHERE auc.cohort_date = p_cohort_date
  ORDER BY auc.cohort_week;
END;
$$;
```

### RPC: get_error_analytics()

```sql
CREATE FUNCTION get_error_analytics(p_days INT DEFAULT 7)
RETURNS TABLE (
  error_code VARCHAR,
  count INT,
  percentage FLOAT,
  affected_users INT,
  trend VARCHAR
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH error_events AS (
    SELECT 
      ae.properties->>'error_code' as error_code,
      ae.user_id,
      COUNT(*) as count
    FROM analytics_events ae
    WHERE ae.event_name = 'error_occurred'
      AND ae.created_at > NOW() - (p_days || ' days')::INTERVAL
    GROUP BY ae.properties->>'error_code', ae.user_id
  ),
  error_stats AS (
    SELECT 
      error_code,
      SUM(count) as total_count,
      COUNT(DISTINCT user_id) as affected_users
    FROM error_events
    GROUP BY error_code
  ),
  with_percentage AS (
    SELECT 
      error_code,
      total_count as count,
      ROUND(100.0 * total_count / (SELECT SUM(total_count) FROM error_stats), 2) as percentage,
      affected_users
    FROM error_stats
  )
  SELECT 
    error_code,
    count,
    percentage,
    affected_users,
    'stable' as trend  -- À améliorer avec comparaison période précédente
  FROM with_percentage
  ORDER BY count DESC;
END;
$$;
```

---

## 4. Edge Function: track-event

```typescript
// supabase/functions/track-event/index.ts

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

interface TrackEventRequest {
  event_name: string;
  session_id?: string;
  contact_id?: string;
  properties?: Record<string, any>;
}

async function trackEvent(req: Request) {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { event_name, session_id, contact_id, properties } = await req.json() as TrackEventRequest;

  // Récupérer l'utilisateur depuis le JWT
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response("Unauthorized", { status: 401 });
  }

  const token = authHeader.replace("Bearer ", "");
  const { data: { user } } = await supabase.auth.getUser(token);

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Valider l'événement
  const validEvents = [
    "app_opened",
    "session_created",
    "sos_triggered",
    "session_checked_in",
    "session_extended",
    "contact_configured",
    "error_occurred",
    "test_sms_sent",
    "otp_verified",
  ];

  if (!validEvents.includes(event_name)) {
    return new Response(
      JSON.stringify({ error: "Invalid event name" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Extraire les infos du device depuis le header User-Agent
  const userAgent = req.headers.get("User-Agent") || "";
  const deviceInfo = {
    platform: userAgent.includes("iOS") ? "ios" : userAgent.includes("Android") ? "android" : "web",
    app_version: properties?.app_version || "unknown",
    os_version: properties?.os_version || "unknown",
    device_model: properties?.device_model || "unknown",
  };

  // Insérer l'événement
  const { error } = await supabase.from("analytics_events").insert({
    event_name,
    user_id: user.id,
    session_id,
    contact_id,
    properties: properties || {},
    device_info: deviceInfo,
    platform: deviceInfo.platform,
    app_version: deviceInfo.app_version,
  });

  if (error) {
    console.error("Error tracking event:", error);
    return new Response(
      JSON.stringify({ error: "Failed to track event" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(trackEvent);
```

---

## 5. Intégration dans l'App Mobile

### Service: analytics.ts

```typescript
// lib/services/analytics.ts

import { supabase } from "@/lib/supabase";

export interface AnalyticsEvent {
  event_name: string;
  session_id?: string;
  contact_id?: string;
  properties?: Record<string, any>;
}

class AnalyticsService {
  async trackEvent(event: AnalyticsEvent): Promise<void> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/track-event`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(event),
        }
      );

      if (!response.ok) {
        console.error("Failed to track event:", response.statusText);
      }
    } catch (error) {
      console.error("Error tracking event:", error);
    }
  }

  async trackAppOpened(): Promise<void> {
    await this.trackEvent({ event_name: "app_opened" });
  }

  async trackSessionCreated(session_id: string, duration: number): Promise<void> {
    await this.trackEvent({
      event_name: "session_created",
      session_id,
      properties: { duration },
    });
  }

  async trackSosTriggered(session_id: string): Promise<void> {
    await this.trackEvent({
      event_name: "sos_triggered",
      session_id,
    });
  }

  async trackSessionCheckedIn(session_id: string, delay: number): Promise<void> {
    await this.trackEvent({
      event_name: "session_checked_in",
      session_id,
      properties: { delay },
    });
  }

  async trackError(error_code: string, error_message: string): Promise<void> {
    await this.trackEvent({
      event_name: "error_occurred",
      properties: { error_code, error_message },
    });
  }
}

export const analyticsService = new AnalyticsService();
```

### Utilisation dans les composants

```typescript
// app/new-session.tsx

import { analyticsService } from "@/lib/services/analytics";

export default function NewSessionScreen() {
  const handleStartSession = async () => {
    try {
      // Créer la sortie
      const session = await tripService.startTrip(contactId, duration);
      
      // Tracker l'événement
      await analyticsService.trackSessionCreated(session.id, duration);
      
      // Naviguer vers la sortie active
      router.push(`/active-session/${session.id}`);
    } catch (error) {
      // Tracker l'erreur
      await analyticsService.trackError(
        error.code || "unknown_error",
        error.message
      );
    }
  };

  return (
    // ...
  );
}
```

---

## 6. Dashboard d'Analytics

### Métriques affichées

```
┌─────────────────────────────────────────────────────────┐
│  SafeWalk - Analytics Dashboard                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Key Metrics (Last 30 Days)                             │
│  ├─ DAU: 1,234 (↑ 12%)                                  │
│  ├─ MAU: 5,678 (↑ 8%)                                   │
│  ├─ New Users: 456 (↑ 15%)                              │
│  └─ Retention: 68% (↓ 2%)                               │
│                                                         │
│  Session Funnel                                         │
│  ├─ App Opened: 10,000 (100%)                           │
│  ├─ Session Created: 5,234 (52.3%)                      │
│  ├─ SOS Triggered: 234 (4.5%)                           │
│  └─ Checked In: 4,890 (93.4%)                           │
│                                                         │
│  Safety Features                                        │
│  ├─ SOS Usage: 234 times (4.5% of sessions)             │
│  ├─ Avg Response Time: 2.3s                             │
│  ├─ Contact Configured: 87% of users                    │
│  └─ Test SMS Sent: 1,234 (98.5% success)                │
│                                                         │
│  Error Analytics                                        │
│  ├─ no_credits: 45 (5.2%)                               │
│  ├─ twilio_failed: 12 (1.4%)                            │
│  ├─ phone_not_verified: 8 (0.9%)                        │
│  └─ Other: 28 (3.2%)                                    │
│                                                         │
│  User Cohorts (Retention by Week)                       │
│  ├─ Week 0: 100% (5,678 users)                          │
│  ├─ Week 1: 68% (3,861 users)                           │
│  ├─ Week 2: 45% (2,555 users)                           │
│  ├─ Week 3: 32% (1,817 users)                           │
│  └─ Week 4: 22% (1,249 users)                           │
│                                                         │
│  Platform Distribution                                  │
│  ├─ iOS: 55% (6,234 events)                             │
│  ├─ Android: 40% (4,534 events)                         │
│  └─ Web: 5% (567 events)                                │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 7. Implémentation Étape par Étape

### Phase 1: Tables et RPC (3 jours)
- [ ] Créer table `analytics_events`
- [ ] Créer table `analytics_daily_active_users`
- [ ] Créer table `analytics_session_funnel`
- [ ] Créer table `analytics_user_cohorts`
- [ ] Créer RPC `get_daily_active_users()`
- [ ] Créer RPC `get_session_funnel()`
- [ ] Créer RPC `get_user_retention()`
- [ ] Créer RPC `get_error_analytics()`

### Phase 2: Edge Function (2 jours)
- [ ] Créer `track-event` Edge Function
- [ ] Tester le tracking avec des événements de test
- [ ] Vérifier que les événements sont insérés correctement

### Phase 3: Intégration App (3 jours)
- [ ] Créer `analytics.ts` service
- [ ] Intégrer le tracking dans `new-session.tsx`
- [ ] Intégrer le tracking dans `active-session.tsx`
- [ ] Intégrer le tracking dans `settings.tsx`
- [ ] Tester le tracking end-to-end

### Phase 4: Dashboard (5 jours)
- [ ] Créer page React pour le dashboard
- [ ] Afficher DAU/MAU/Retention
- [ ] Afficher le funnel
- [ ] Afficher les erreurs
- [ ] Afficher les cohorts
- [ ] Ajouter les filtres (date range, platform)
- [ ] Ajouter les graphiques (Chart.js)

---

## 8. Coûts Estimés

| Service | Coût | Notes |
|---------|------|-------|
| Supabase (DB + RPC) | Inclus | Déjà utilisé |
| Storage (analytics_events) | ~$0.10/GB | ~1GB/mois = $0.10 |
| Dashboard hosting | Gratuit | Sur Vercel/Netlify |
| **Total** | **~$0.10/mois** | Minimal |

---

## 9. Bonnes Pratiques

### ✅ À faire
- Tracker les événements importants seulement
- Utiliser des noms d'événement cohérents
- Inclure les IDs pertinents (user_id, session_id)
- Batch les événements si possible
- Nettoyer les données anciennes (> 1 an)

### ❌ À ne pas faire
- Tracker trop d'événements (spam)
- Envoyer les événements de manière synchrone
- Stocker des données sensibles (mots de passe, tokens)
- Tracker sans consentement utilisateur
- Oublier de nettoyer les données

---

## 10. Checklist de Déploiement

- [ ] Créer les tables d'analytics
- [ ] Créer les RPC d'analytics
- [ ] Déployer la Edge Function `track-event`
- [ ] Intégrer le tracking dans l'app mobile
- [ ] Tester le tracking end-to-end
- [ ] Créer le dashboard d'analytics
- [ ] Configurer les alertes (ex: DAU < 100)
- [ ] Former l'équipe à l'utilisation du dashboard
- [ ] Mettre en place la politique de rétention des données
