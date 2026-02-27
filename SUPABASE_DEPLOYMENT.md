# 🚀 Déploiement Supabase Edge Functions - SafeWalk

## Vue d'ensemble

SafeWalk est maintenant **100% serverless** avec Supabase Edge Functions :

- ✅ **App mobile** - Expo sur iPhone/Android
- ✅ **Backend** - Supabase Edge Function (gratuit, inclus)
- ✅ **Base de données** - Supabase PostgreSQL
- ✅ **SMS** - Twilio

**Plus besoin de serveur Manus !** 🎉

---

## Architecture

```
iPhone (SafeWalk)
    ↓
    POST /functions/v1/trigger-sos
    ↓
Supabase Edge Function
├─ Valide les données
├─ Crée une session
├─ Envoie SMS Twilio
└─ Enregistre les résultats
    ↓
Supabase Database
└─ sessions, sms_logs, emergency_contacts
```

---

## Déploiement Étape par Étape

### 1. Installer Supabase CLI

**Sur Mac :**

```bash
brew install supabase/tap/supabase
```

**Sur Linux/Windows :**

```bash
npm install -g supabase
```

### 2. Authentifier avec Supabase

```bash
supabase login
```

Cela ouvrira une page pour vous authentifier. Suivez les instructions.

### 3. Lier le projet

```bash
cd /chemin/vers/safewalk-app
supabase link --project-ref kycuteffcbqizyqlhczc
```

### 4. Configurer les secrets Twilio

```bash
supabase secrets set TWILIO_ACCOUNT_SID=ACb64f2e874590389edb14a4878f356d4b
supabase secrets set TWILIO_AUTH_TOKEN=f50761d9f66c2196508efef4dba2e1d9
supabase secrets set TWILIO_PHONE_NUMBER=+33939035429
```

### 5. Déployer la Edge Function

```bash
supabase functions deploy trigger-sos
```

**Résultat attendu :**

```
✓ Function deployed successfully
  URL: https://kycuteffcbqizyqlhczc.supabase.co/functions/v1/trigger-sos
```

### 6. Vérifier le déploiement

```bash
supabase functions list
```

Vous devriez voir :

```
trigger-sos    https://kycuteffcbqizyqlhczc.supabase.co/functions/v1/trigger-sos
```

---

## Test de la Edge Function

### Via curl

```bash
curl -X POST \
  https://kycuteffcbqizyqlhczc.supabase.co/functions/v1/trigger-sos \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Jean",
    "emergencyContacts": [
      {
        "name": "Maman",
        "phone": "+33763458273"
      }
    ],
    "latitude": 48.8566,
    "longitude": 2.3522,
    "limitTime": "22:00"
  }'
```

### Réponse attendue

```json
{
  "success": true,
  "message": "Alert SOS triggered",
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "smsResults": [
    {
      "contact": "Maman",
      "phone": "+33763458273",
      "messageSid": "SM1234567890abcdef",
      "status": "sent"
    }
  ],
  "timestamp": 1708340000000
}
```

---

## Monitoring

### Voir les logs en temps réel

```bash
supabase functions logs trigger-sos --tail
```

### Voir les logs du dernier déploiement

```bash
supabase functions logs trigger-sos
```

### Dashboard Supabase

1. Allez sur https://app.supabase.com
2. Sélectionnez votre projet
3. Allez à "Edge Functions"
4. Cliquez sur "trigger-sos"
5. Vous verrez les logs et les invocations

---

## Vérifier les données enregistrées

### Voir les sessions

```sql
SELECT * FROM sessions ORDER BY created_at DESC LIMIT 10;
```

### Voir les SMS logs

```sql
SELECT * FROM sms_logs ORDER BY created_at DESC LIMIT 10;
```

### Voir les contacts d'urgence

```sql
SELECT * FROM emergency_contacts ORDER BY created_at DESC LIMIT 10;
```

---

## Troubleshooting

### Erreur : "Function not found"

```bash
supabase functions deploy trigger-sos
```

### Erreur : "Twilio not configured"

```bash
supabase secrets list
supabase secrets set TWILIO_ACCOUNT_SID=...
supabase secrets set TWILIO_AUTH_TOKEN=...
supabase secrets set TWILIO_PHONE_NUMBER=...
```

### Erreur : "Supabase not configured"

```bash
supabase link --project-ref kycuteffcbqizyqlhczc
```

### SMS non reçu

**Vérifier :**

1. Le numéro est au format E.164 (ex: +33763458273)
2. Twilio a du crédit
3. Vérifier les logs : `supabase functions logs trigger-sos --tail`

---

## Coûts

| Service            | Coût                   |
| ------------------ | ---------------------- |
| Supabase (gratuit) | $0                     |
| Supabase (pro)     | $25/mois               |
| Twilio             | ~$0.05 par SMS         |
| **Total**          | **Gratuit à $25/mois** |

---

## Prochaines étapes

1. ✅ Installer Supabase CLI
2. ✅ Authentifier avec Supabase
3. ✅ Lier le projet
4. ✅ Configurer les secrets
5. ✅ Déployer la fonction
6. ✅ Tester via curl
7. ✅ Créer une nouvelle build EAS
8. ✅ Installer sur iPhone
9. ✅ Tester le flux complet

---

_Guide créé le 19 Février 2026_
