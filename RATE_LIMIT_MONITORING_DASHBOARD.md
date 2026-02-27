# Dashboard de Monitoring des Erreurs 429

## 📊 Vue d'ensemble

Ce guide explique comment monitorer et gérer les erreurs de rate limiting (429) en production.

---

## 🎯 Métriques Principales

### 1. Erreurs 429 par Endpoint (Dernières 24h)

```sql
SELECT
  endpoint,
  COUNT(*) as error_count,
  COUNT(DISTINCT user_id) as affected_users,
  COUNT(DISTINCT ip_address) as affected_ips,
  MAX(created_at) as last_error
FROM rate_limit_errors
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY endpoint
ORDER BY error_count DESC;
```

**Interprétation:**

- `error_count > 100`: Alerte WARNING
- `error_count > 500`: Alerte CRITICAL
- `affected_users > 10`: Possible pattern d'abus

### 2. Patterns d'Abus Détectés

```sql
SELECT
  endpoint,
  pattern_type,
  pattern_value,
  error_count,
  severity,
  is_blocked,
  last_seen_at
FROM rate_limit_abuse_patterns
WHERE severity IN ('HIGH', 'CRITICAL')
ORDER BY error_count DESC;
```

**Actions recommandées:**

- `severity = 'CRITICAL'`: Bloquer immédiatement
- `severity = 'HIGH'`: Monitorer et bloquer si nécessaire
- `severity = 'MEDIUM'`: Surveiller

### 3. Alertes Actives

```sql
SELECT
  endpoint,
  severity,
  message,
  error_count,
  affected_users,
  triggered_at,
  resolved_at
FROM rate_limit_alerts
WHERE resolved_at IS NULL
ORDER BY severity DESC, triggered_at DESC;
```

---

## 🚨 Seuils d'Alerte

| Seuil        | Condition          | Action              |
| ------------ | ------------------ | ------------------- |
| **INFO**     | 10-20 erreurs/5min | Monitorer           |
| **WARNING**  | 20-50 erreurs/5min | Notifier Slack      |
| **CRITICAL** | >50 erreurs/5min   | Slack + Email + SMS |

---

## 🔔 Configuration des Alertes

### Slack Webhook

```bash
# Dans Supabase Secrets
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

### Email Alerts

```bash
# Dans Supabase Secrets
EMAIL_ALERT_TO=ops@safewalk.app
```

### SMS Alerts

```bash
# Dans Supabase Secrets
SMS_ALERT_TO=+33612345678
```

---

## 📈 Tendances Horaires

```sql
SELECT
  DATE_TRUNC('hour', created_at) as hour,
  endpoint,
  COUNT(*) as error_count,
  COUNT(DISTINCT user_id) as affected_users
FROM rate_limit_errors
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY hour, endpoint
ORDER BY hour DESC, error_count DESC;
```

**Utilisation:**

- Identifier les heures de pointe
- Détecter les patterns d'abus récurrents
- Ajuster les limites si nécessaire

---

## 🛡️ Gestion des Abus

### Bloquer un Pattern d'Abus

```sql
-- Identifier le pattern
SELECT id FROM rate_limit_abuse_patterns
WHERE endpoint = 'start-trip'
AND pattern_type = 'user_id'
AND pattern_value = 'user-123'
AND severity = 'CRITICAL';

-- Bloquer le pattern
SELECT block_abuse_pattern('pattern-uuid', TRUE);
```

### Débloquer un Pattern

```sql
SELECT block_abuse_pattern('pattern-uuid', FALSE);
```

---

## 📊 Requêtes Utiles

### Top 10 Utilisateurs par Erreurs 429

```sql
SELECT
  user_id,
  COUNT(*) as error_count,
  COUNT(DISTINCT endpoint) as endpoints_affected,
  MAX(created_at) as last_error
FROM rate_limit_errors
WHERE user_id IS NOT NULL
AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY user_id
ORDER BY error_count DESC
LIMIT 10;
```

### Top 10 IPs par Erreurs 429

```sql
SELECT
  ip_address,
  COUNT(*) as error_count,
  COUNT(DISTINCT endpoint) as endpoints_affected,
  MAX(created_at) as last_error
FROM rate_limit_errors
WHERE ip_address IS NOT NULL
AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY ip_address
ORDER BY error_count DESC
LIMIT 10;
```

### Erreurs 429 par Heure (Dernières 24h)

```sql
SELECT
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) as error_count,
  COUNT(DISTINCT user_id) as affected_users,
  COUNT(DISTINCT ip_address) as affected_ips
FROM rate_limit_errors
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY hour
ORDER BY hour DESC;
```

---

## 🔄 Cron Job de Monitoring

La Edge Function `monitor-rate-limit-errors` s'exécute **toutes les 5 minutes** pour:

1. ✅ Vérifier les anomalies
2. ✅ Créer les alertes automatiques
3. ✅ Envoyer les notifications (Slack, Email, SMS)
4. ✅ Tracker les patterns d'abus
5. ✅ Nettoyer les anciennes erreurs (>7 jours)

**Configuration Supabase:**

```bash
# Ajouter le cron job dans Supabase
supabase functions deploy monitor-rate-limit-errors

# Configurer le cron (toutes les 5 minutes)
# Dans Supabase Dashboard → Cron Jobs
# Endpoint: /functions/v1/monitor-rate-limit-errors
# Schedule: */5 * * * *
```

---

## 📋 Checklist de Monitoring

- [ ] Vérifier les alertes actives chaque matin
- [ ] Bloquer les patterns d'abus CRITICAL
- [ ] Analyser les tendances hebdomadaires
- [ ] Ajuster les limites si nécessaire
- [ ] Nettoyer les patterns résolus
- [ ] Documenter les incidents

---

## 🚀 Optimisations Futures

1. **Machine Learning** - Détecter les patterns d'abus automatiquement
2. **Adaptive Rate Limiting** - Ajuster les limites dynamiquement
3. **Geo-blocking** - Bloquer les IPs par région
4. **User Reputation** - Tracker la réputation des utilisateurs
5. **Predictive Alerts** - Prédire les pics de charge

---

## 📞 Support

Pour des questions sur le monitoring:

- Slack: #safewalk-ops
- Email: ops@safewalk.app
