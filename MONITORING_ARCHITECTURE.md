# Architecture du Monitoring et des Alertes - SafeWalk

## Vue d'ensemble

Le monitoring surveille la santé de l'app en production en trackant:
- **Cron health** - Le cron s'exécute-t-il correctement?
- **SMS delivery** - Les SMS sont-ils envoyés/reçus?
- **Error rates** - Quel est le taux d'erreur?
- **Database health** - La base de données répond-elle?
- **API latency** - Les Edge Functions sont-elles rapides?

---

## Architecture Globale

```
┌─────────────────────────────────────────────────────────┐
│  Production Environment                                 │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Edge Functions                                   │  │
│  ├──────────────────────────────────────────────────┤  │
│  │ - start-trip                                     │  │
│  │ - test-sms                                       │  │
│  │ - sos                                            │  │
│  │ - cron-check-deadlines (+ heartbeat)             │  │
│  │ - monitoring-check (collecte les métriques)      │  │
│  └──────────────────────────────────────────────────┘  │
│           ↓ (Logs + Heartbeat)                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Database Tables                                  │  │
│  ├──────────────────────────────────────────────────┤  │
│  │ - cron_heartbeat                                 │  │
│  │ - sms_logs (+ error tracking)                    │  │
│  │ - monitoring_metrics                             │  │
│  │ - monitoring_alerts                              │  │
│  └──────────────────────────────────────────────────┘  │
│           ↓ (Queries)                                  │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Monitoring RPC Functions                         │  │
│  ├──────────────────────────────────────────────────┤  │
│  │ - get_cron_health()                              │  │
│  │ - get_sms_stats()                                │  │
│  │ - get_error_rate()                               │  │
│  │ - get_system_health()                            │  │
│  └──────────────────────────────────────────────────┘  │
│           ↓ (API)                                      │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Alerting System                                  │  │
│  ├──────────────────────────────────────────────────┤  │
│  │ - Slack notifications                            │  │
│  │ - Email alerts                                   │  │
│  │ - PagerDuty integration (optionnel)              │  │
│  └──────────────────────────────────────────────────┘  │
│           ↓ (Notifications)                            │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Admin Dashboard                                  │  │
│  ├──────────────────────────────────────────────────┤  │
│  │ - Cron status                                    │  │
│  │ - SMS delivery rate                              │  │
│  │ - Error trends                                   │  │
│  │ - System health                                  │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 1. Cron Health Monitoring

### Objectif
Vérifier que le cron `cron-check-deadlines` s'exécute correctement toutes les 5 minutes.

### Métriques à tracker

| Métrique | Seuil d'alerte | Fréquence |
|----------|----------------|-----------|
| Dernière exécution | > 5 min | Toutes les 2 min |
| Taux de succès | < 95% | Toutes les heures |
| Temps d'exécution | > 30s | Toutes les 5 min |
| Erreurs | > 0 | En temps réel |

### Table: cron_heartbeat

```sql
CREATE TABLE cron_heartbeat (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name VARCHAR NOT NULL,
  last_run_at TIMESTAMPTZ NOT NULL,
  status VARCHAR NOT NULL,  -- 'success', 'failed', 'timeout'
  processed INT DEFAULT 0,
  sent INT DEFAULT 0,
  failed INT DEFAULT 0,
  error_message TEXT,
  execution_time_ms INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### RPC: get_cron_health()

```sql
CREATE FUNCTION get_cron_health()
RETURNS TABLE (
  function_name VARCHAR,
  last_run_at TIMESTAMPTZ,
  minutes_since_last_run INT,
  status VARCHAR,
  success_rate FLOAT,
  avg_execution_time_ms INT,
  alert_level VARCHAR  -- 'green', 'yellow', 'red'
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH recent_runs AS (
    SELECT 
      function_name,
      last_run_at,
      status,
      execution_time_ms,
      ROW_NUMBER() OVER (PARTITION BY function_name ORDER BY created_at DESC) as rn
    FROM cron_heartbeat
    WHERE created_at > NOW() - INTERVAL '1 hour'
  ),
  stats AS (
    SELECT 
      function_name,
      MAX(last_run_at) as last_run_at,
      EXTRACT(EPOCH FROM (NOW() - MAX(last_run_at))) / 60 as minutes_since_last_run,
      (SELECT status FROM recent_runs WHERE rn = 1 LIMIT 1) as status,
      ROUND(100.0 * SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate,
      ROUND(AVG(execution_time_ms)) as avg_execution_time_ms
    FROM recent_runs
    GROUP BY function_name
  )
  SELECT 
    function_name,
    last_run_at,
    minutes_since_last_run::INT,
    status,
    success_rate,
    avg_execution_time_ms,
    CASE 
      WHEN minutes_since_last_run > 10 THEN 'red'
      WHEN minutes_since_last_run > 5 THEN 'yellow'
      WHEN success_rate < 90 THEN 'red'
      WHEN success_rate < 95 THEN 'yellow'
      ELSE 'green'
    END as alert_level
  FROM stats;
END;
$$;
```

---

## 2. SMS Delivery Monitoring

### Objectif
Tracker le taux de livraison des SMS et identifier les erreurs Twilio.

### Métriques à tracker

| Métrique | Seuil d'alerte | Fréquence |
|----------|----------------|-----------|
| Taux de succès | < 95% | Toutes les heures |
| Erreurs Twilio | > 5% | En temps réel |
| Délai moyen | > 5s | Toutes les heures |
| Numéros invalides | > 1% | Toutes les 24h |

### RPC: get_sms_stats()

```sql
CREATE FUNCTION get_sms_stats(p_hours INT DEFAULT 24)
RETURNS TABLE (
  sms_type VARCHAR,
  total INT,
  sent INT,
  failed INT,
  success_rate FLOAT,
  avg_delay_seconds FLOAT,
  top_errors VARCHAR[],
  alert_level VARCHAR
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH sms_data AS (
    SELECT 
      sms_type,
      status,
      error_message,
      EXTRACT(EPOCH FROM (created_at - updated_at)) as delay_seconds,
      ROW_NUMBER() OVER (PARTITION BY sms_type, status ORDER BY created_at DESC) as rn
    FROM sms_logs
    WHERE created_at > NOW() - (p_hours || ' hours')::INTERVAL
  ),
  stats AS (
    SELECT 
      sms_type,
      COUNT(*) as total,
      SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
      ROUND(100.0 * SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate,
      ROUND(AVG(CASE WHEN status = 'sent' THEN delay_seconds ELSE NULL END)::NUMERIC, 2) as avg_delay_seconds,
      ARRAY_AGG(DISTINCT error_message ORDER BY error_message) FILTER (WHERE error_message IS NOT NULL) as top_errors
    FROM sms_data
    GROUP BY sms_type
  )
  SELECT 
    sms_type,
    total,
    sent,
    failed,
    success_rate,
    avg_delay_seconds,
    top_errors,
    CASE 
      WHEN success_rate < 90 THEN 'red'
      WHEN success_rate < 95 THEN 'yellow'
      WHEN avg_delay_seconds > 5 THEN 'yellow'
      ELSE 'green'
    END as alert_level
  FROM stats;
END;
$$;
```

---

## 3. Error Rate Monitoring

### Objectif
Tracker les erreurs par type et identifier les patterns.

### Métriques à tracker

| Métrique | Seuil d'alerte | Fréquence |
|----------|----------------|-----------|
| Erreurs totales | > 100/h | En temps réel |
| no_credits | > 10/h | Toutes les heures |
| twilio_failed | > 5/h | En temps réel |
| phone_not_verified | > 5/h | Toutes les heures |

### Table: monitoring_metrics

```sql
CREATE TABLE monitoring_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name VARCHAR NOT NULL,
  metric_value FLOAT NOT NULL,
  threshold FLOAT,
  alert_level VARCHAR,  -- 'green', 'yellow', 'red'
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### RPC: get_error_rate()

```sql
CREATE FUNCTION get_error_rate(p_hours INT DEFAULT 1)
RETURNS TABLE (
  error_type VARCHAR,
  count INT,
  percentage FLOAT,
  trend VARCHAR,  -- 'up', 'down', 'stable'
  alert_level VARCHAR
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH current_errors AS (
    SELECT 
      error_message as error_type,
      COUNT(*) as count
    FROM sms_logs
    WHERE status = 'failed'
      AND created_at > NOW() - (p_hours || ' hours')::INTERVAL
    GROUP BY error_message
  ),
  previous_errors AS (
    SELECT 
      error_message as error_type,
      COUNT(*) as count
    FROM sms_logs
    WHERE status = 'failed'
      AND created_at > NOW() - ((p_hours * 2) || ' hours')::INTERVAL
      AND created_at <= NOW() - (p_hours || ' hours')::INTERVAL
    GROUP BY error_message
  ),
  total_current AS (
    SELECT COUNT(*) as total FROM sms_logs WHERE created_at > NOW() - (p_hours || ' hours')::INTERVAL
  )
  SELECT 
    ce.error_type,
    ce.count,
    ROUND(100.0 * ce.count / (SELECT total FROM total_current), 2) as percentage,
    CASE 
      WHEN ce.count > COALESCE((SELECT count FROM previous_errors WHERE error_type = ce.error_type), 0) THEN 'up'
      WHEN ce.count < COALESCE((SELECT count FROM previous_errors WHERE error_type = ce.error_type), 0) THEN 'down'
      ELSE 'stable'
    END as trend,
    CASE 
      WHEN ce.count > 10 THEN 'red'
      WHEN ce.count > 5 THEN 'yellow'
      ELSE 'green'
    END as alert_level
  FROM current_errors ce
  ORDER BY ce.count DESC;
END;
$$;
```

---

## 4. System Health Monitoring

### Objectif
Vue globale de la santé du système.

### RPC: get_system_health()

```sql
CREATE FUNCTION get_system_health()
RETURNS TABLE (
  component VARCHAR,
  status VARCHAR,  -- 'healthy', 'degraded', 'down'
  last_check TIMESTAMPTZ,
  details JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'cron' as component,
    CASE 
      WHEN (SELECT minutes_since_last_run FROM get_cron_health() LIMIT 1) > 10 THEN 'down'
      WHEN (SELECT minutes_since_last_run FROM get_cron_health() LIMIT 1) > 5 THEN 'degraded'
      ELSE 'healthy'
    END as status,
    (SELECT last_run_at FROM get_cron_health() LIMIT 1) as last_check,
    (SELECT jsonb_build_object('alert_level', alert_level) FROM get_cron_health() LIMIT 1) as details
  UNION ALL
  SELECT 
    'sms' as component,
    CASE 
      WHEN (SELECT success_rate FROM get_sms_stats() WHERE sms_type = 'test' LIMIT 1) < 90 THEN 'down'
      WHEN (SELECT success_rate FROM get_sms_stats() WHERE sms_type = 'test' LIMIT 1) < 95 THEN 'degraded'
      ELSE 'healthy'
    END as status,
    NOW() as last_check,
    (SELECT jsonb_build_object('success_rate', success_rate) FROM get_sms_stats() WHERE sms_type = 'test' LIMIT 1) as details
  UNION ALL
  SELECT 
    'database' as component,
    'healthy' as status,
    NOW() as last_check,
    jsonb_build_object('connections', 'ok') as details;
END;
$$;
```

---

## 5. Alerting Rules

### Règles d'alerte

| Condition | Sévérité | Action |
|-----------|----------|--------|
| Cron > 10 min sans exécution | 🔴 CRITIQUE | Slack + Email + PagerDuty |
| SMS success rate < 90% | 🔴 CRITIQUE | Slack + Email |
| SMS success rate < 95% | 🟡 AVERTISSEMENT | Slack |
| Erreurs Twilio > 5/h | 🔴 CRITIQUE | Slack + Email |
| Numéros invalides > 1% | 🟡 AVERTISSEMENT | Slack |
| Délai SMS > 5s | 🟡 AVERTISSEMENT | Slack |

### Edge Function: monitoring-alerts

```typescript
// supabase/functions/monitoring-alerts/index.ts
// Exécutée toutes les 5 minutes par cron
// Collecte les métriques et envoie les alertes

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

interface Alert {
  severity: 'critical' | 'warning' | 'info';
  component: string;
  message: string;
  timestamp: string;
}

async function checkCronHealth(supabase): Promise<Alert[]> {
  const { data } = await supabase.rpc('get_cron_health');
  const alerts: Alert[] = [];
  
  for (const health of data) {
    if (health.alert_level === 'red') {
      alerts.push({
        severity: 'critical',
        component: 'cron',
        message: `Cron ${health.function_name} n'a pas exécuté depuis ${health.minutes_since_last_run} minutes`,
        timestamp: new Date().toISOString(),
      });
    }
  }
  
  return alerts;
}

async function checkSmsDelivery(supabase): Promise<Alert[]> {
  const { data } = await supabase.rpc('get_sms_stats');
  const alerts: Alert[] = [];
  
  for (const stat of data) {
    if (stat.alert_level === 'red') {
      alerts.push({
        severity: 'critical',
        component: 'sms',
        message: `SMS ${stat.sms_type} success rate: ${stat.success_rate}%`,
        timestamp: new Date().toISOString(),
      });
    } else if (stat.alert_level === 'yellow') {
      alerts.push({
        severity: 'warning',
        component: 'sms',
        message: `SMS ${stat.sms_type} success rate: ${stat.success_rate}%`,
        timestamp: new Date().toISOString(),
      });
    }
  }
  
  return alerts;
}

async function sendAlerts(alerts: Alert[]): Promise<void> {
  // Envoyer à Slack
  const slackWebhook = Deno.env.get('SLACK_WEBHOOK_URL');
  if (slackWebhook && alerts.length > 0) {
    await fetch(slackWebhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `🚨 SafeWalk Alerts: ${alerts.length} issues detected`,
        blocks: alerts.map(alert => ({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*[${alert.severity.toUpperCase()}]* ${alert.component}: ${alert.message}`,
          },
        })),
      }),
    });
  }
}

async function monitoringAlerts(req: Request) {
  const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
  
  const cronAlerts = await checkCronHealth(supabase);
  const smsAlerts = await checkSmsDelivery(supabase);
  const allAlerts = [...cronAlerts, ...smsAlerts];
  
  await sendAlerts(allAlerts);
  
  return new Response(JSON.stringify({ alerts: allAlerts.length }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

Deno.serve(monitoringAlerts);
```

---

## 6. Dashboard de Monitoring

### Métriques affichées

```
┌─────────────────────────────────────────────────────────┐
│  SafeWalk - Monitoring Dashboard                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  System Health                                          │
│  ├─ Cron: 🟢 Healthy (Last run: 2 min ago)             │
│  ├─ SMS: 🟢 Healthy (Success rate: 98.5%)              │
│  └─ Database: 🟢 Healthy                               │
│                                                         │
│  Cron Metrics (Last 24h)                                │
│  ├─ Executions: 288 (every 5 min)                      │
│  ├─ Success rate: 99.7%                                │
│  ├─ Avg execution time: 2.3s                           │
│  └─ Alerts sent: 156                                   │
│                                                         │
│  SMS Metrics (Last 24h)                                 │
│  ├─ Test SMS: 98.2% success (45/46)                    │
│  ├─ SOS SMS: 99.1% success (112/113)                   │
│  ├─ Alert SMS: 97.8% success (176/180)                 │
│  └─ Top error: Invalid phone number (3 occurrences)    │
│                                                         │
│  Error Trends (Last 24h)                                │
│  ├─ no_credits: 12 (↓ 20%)                             │
│  ├─ twilio_failed: 3 (↑ 50%)                           │
│  ├─ phone_not_verified: 5 (→ stable)                   │
│  └─ invalid_phone: 3 (↑ new)                           │
│                                                         │
│  Recent Alerts                                          │
│  ├─ [WARNING] SMS success rate < 95% (2h ago)          │
│  ├─ [INFO] Cron executed successfully (5 min ago)      │
│  └─ [INFO] 3 SOS alerts sent (1h ago)                  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 7. Configuration des Alertes

### Variables d'environnement

```
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
SLACK_CHANNEL=#safewalk-alerts
PAGERDUTY_API_KEY=xxxxx (optionnel)
ALERT_EMAIL=admin@safewalk.com
ALERT_THRESHOLD_CRON_MINUTES=10
ALERT_THRESHOLD_SMS_SUCCESS_RATE=95
ALERT_THRESHOLD_ERROR_RATE=100
```

### Slack Notifications

```
🔴 [CRITICAL] Cron Health
Cron cron-check-deadlines hasn't run in 12 minutes
Last run: 2026-02-25 10:15:00 UTC
Expected: Every 5 minutes

Actions:
1. Check Supabase Edge Functions logs
2. Verify CRON_SECRET is configured
3. Restart the cron job
```

---

## 8. Implémentation Étape par Étape

### Phase 1: Tables et RPC (Semaine 1)
- [ ] Créer table `cron_heartbeat`
- [ ] Créer table `monitoring_metrics`
- [ ] Créer RPC `get_cron_health()`
- [ ] Créer RPC `get_sms_stats()`
- [ ] Créer RPC `get_error_rate()`
- [ ] Créer RPC `get_system_health()`

### Phase 2: Edge Functions (Semaine 2)
- [ ] Créer `monitoring-alerts` Edge Function
- [ ] Configurer Slack webhook
- [ ] Tester les alertes

### Phase 3: Dashboard (Semaine 3)
- [ ] Créer dashboard web (React)
- [ ] Afficher les métriques en temps réel
- [ ] Ajouter les graphiques (Chart.js)
- [ ] Implémenter les filtres

### Phase 4: Intégrations (Semaine 4)
- [ ] PagerDuty integration
- [ ] Email alerts
- [ ] SMS alerts (optionnel)

---

## 9. Coûts Estimés

| Service | Coût | Notes |
|---------|------|-------|
| Supabase (DB + RPC) | Inclus | Déjà utilisé |
| Slack webhooks | Gratuit | Illimité |
| PagerDuty | $9-99/mois | Optionnel |
| Email (SendGrid) | $0.10/email | ~100/mois = $10 |
| **Total** | **~$20/mois** | Minimal |

---

## 10. Checklist de Déploiement

- [ ] Créer les tables de monitoring
- [ ] Créer les RPC de monitoring
- [ ] Configurer Slack webhook
- [ ] Tester les alertes
- [ ] Déployer `monitoring-alerts` Edge Function
- [ ] Configurer le cron pour `monitoring-alerts`
- [ ] Créer le dashboard
- [ ] Former l'équipe aux alertes
- [ ] Documenter les runbooks
