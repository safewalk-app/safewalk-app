# SafeWalk - Supabase Tables Setup Guide

## 📋 Tables Requises

SafeWalk nécessite **11 tables** dans Supabase:

| Table | Purpose | Status |
|-------|---------|--------|
| `users` | Profils utilisateurs | ✅ |
| `emergency_contacts` | Contacts d'urgence | ✅ |
| `sessions` | Sorties actives | ✅ |
| `sms_logs` | Logs des SMS envoyés | ✅ |
| `otp_verifications` | Codes OTP en attente | ✅ |
| `otp_logs` | Logs des tentatives OTP | ✅ |
| `rate_limit_config` | Configuration rate limiting | ✅ |
| `rate_limit_logs` | Logs des requêtes | ✅ |
| `rate_limit_errors` | Logs des erreurs | ✅ |
| `rate_limit_alerts` | Alertes rate limiting | ✅ |
| `rate_limit_abuse_patterns` | Patterns d'abus détectés | ✅ |

---

## 🚀 Comment Exécuter le Script

### Option 1: Via Supabase Dashboard (Recommandé)

1. **Aller à:** Supabase Dashboard → SQL Editor
2. **Créer une nouvelle requête:** "New Query"
3. **Copier le contenu** de `supabase/migrations/init_all_tables.sql`
4. **Exécuter:** Cliquer "Run"
5. **Vérifier:** Aller à "Tables" pour voir les 11 tables créées

### Option 2: Via Supabase CLI

```bash
# 1. Installer Supabase CLI
npm install -g supabase

# 2. Lier le projet
supabase link --project-ref your_project_ref

# 3. Exécuter la migration
supabase db push

# 4. Vérifier
supabase db list
```

### Option 3: Via Docker (Local Development)

```bash
# 1. Démarrer Supabase localement
supabase start

# 2. Exécuter le script
psql postgresql://postgres:postgres@localhost:54322/postgres < supabase/migrations/init_all_tables.sql

# 3. Vérifier
supabase db list
```

---

## ✅ Vérification des Tables

### Via Supabase Dashboard

1. Aller à "Tables" dans le menu gauche
2. Vérifier que les 11 tables sont présentes:
   - ✅ users
   - ✅ emergency_contacts
   - ✅ sessions
   - ✅ sms_logs
   - ✅ otp_verifications
   - ✅ otp_logs
   - ✅ rate_limit_config
   - ✅ rate_limit_logs
   - ✅ rate_limit_errors
   - ✅ rate_limit_alerts
   - ✅ rate_limit_abuse_patterns

### Via SQL Query

```sql
-- Vérifier toutes les tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
```

---

## 🔐 Row Level Security (RLS)

Le script active RLS sur les tables sensibles:

- ✅ `users` - Les utilisateurs ne voient que leurs propres données
- ✅ `emergency_contacts` - Chaque utilisateur ne voit que ses contacts
- ✅ `sessions` - Chaque utilisateur ne voit que ses sorties
- ✅ `sms_logs` - Chaque utilisateur ne voit que ses logs

### Tester RLS

```sql
-- Vérifier les policies
SELECT * FROM pg_policies WHERE tablename = 'users';
```

---

## 📊 Données Initiales

Le script insère automatiquement les configurations de rate limiting:

```sql
-- Configurations rate limiting pré-insérées
- send-otp: 5 requêtes/heure
- verify-otp: 10 requêtes/heure
- start-session: 10 requêtes/heure
- end-session: 10 requêtes/heure
- send-sms: 20 requêtes/heure
```

---

## 🔗 Relationships (Foreign Keys)

```
users
  ├── emergency_contacts (1:N)
  ├── sessions (1:N)
  └── sms_logs (1:N)

sessions
  └── sms_logs (1:N)

emergency_contacts
  └── sms_logs (1:N)
```

---

## 📈 Indexes

Le script crée automatiquement les indexes pour performance:

```
- idx_users_phone_number
- idx_emergency_contacts_user_id
- idx_sessions_user_id
- idx_sessions_status
- idx_sms_logs_session_id
- idx_sms_logs_user_id
- idx_otp_verifications_phone_number
- idx_otp_logs_phone_number
- idx_rate_limit_logs_user_id
- idx_rate_limit_logs_endpoint
- idx_rate_limit_errors_endpoint
```

---

## 🚨 Troubleshooting

### Erreur: "Table already exists"

**Solution:** Le script utilise `CREATE TABLE IF NOT EXISTS`, donc il est safe d'exécuter plusieurs fois.

### Erreur: "Foreign key constraint failed"

**Solution:** Vérifier que les tables parent existent d'abord. Le script respecte l'ordre de création.

### Erreur: "Permission denied"

**Solution:** Utiliser un compte avec permissions `SUPERUSER` ou `ROLE_ADMIN`.

---

## ✨ Prochaines Étapes

1. ✅ Exécuter le script SQL
2. ✅ Vérifier les 11 tables
3. ✅ Configurer les Edge Functions (send-otp, verify-otp)
4. ✅ Tester le flux OTP complet
5. ✅ Déployer sur TestFlight/Google Play

**Status:** Prêt pour production! 🚀
