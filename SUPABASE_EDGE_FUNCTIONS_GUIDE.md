# 🚀 Guide Supabase Edge Functions - SafeWalk

## Vue d'ensemble

Au lieu d'héberger un serveur Express sur Manus, nous utilisons **Supabase Edge Functions** pour gérer les alertes SOS. Cela signifie :

- ✅ **Gratuit** - Inclus dans Supabase
- ✅ **Serverless** - Pas de serveur à gérer
- ✅ **Scalable** - Gère automatiquement le trafic
- ✅ **Sécurisé** - Exécuté dans l'infrastructure Supabase

---

## Architecture

```
App Mobile (iPhone)
    ↓
    └─→ POST /functions/v1/trigger-sos
        ↓
        Supabase Edge Function
        ├─→ Valide les données
        ├─→ Crée une session
        ├─→ Envoie SMS via Twilio
        ├─→ Enregistre les résultats
        └─→ Retourne la réponse
```

---

## Fichiers créés

```
supabase/
├── config.toml                    # Configuration Supabase
└── functions/
    └── trigger-sos/
        └── index.ts               # Edge Function pour déclencher les alertes
```

---

## Déploiement

### 1. Installer Supabase CLI

```bash
npm install -g supabase
```

### 2. Authentifier avec Supabase

```bash
supabase login
```

### 3. Lier le projet

```bash
cd /chemin/vers/safewalk-app
supabase link --project-ref kycuteffcbqizyqlhczc
```

### 4. Configurer les secrets

```bash
supabase secrets set TWILIO_ACCOUNT_SID=ACb64f2e874590389edb14a4878f356d4b
supabase secrets set TWILIO_AUTH_TOKEN=f50761d9f66c2196508efef4dba2e1d9
supabase secrets set TWILIO_PHONE_NUMBER=+33939035429
```

### 5. Déployer la fonction

```bash
supabase functions deploy trigger-sos
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

## Utilisation

### URL de la fonction

```
https://kycuteffcbqizyqlhczc.supabase.co/functions/v1/trigger-sos
```

### Exemple de requête

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

### Réponse

```json
{
  "success": true,
  "message": "Alert SOS triggered",
  "sessionId": "uuid-here",
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

## Mise à jour de l'app mobile

### Avant (avec Manus)

```typescript
const response = await fetch(
  'https://3000-izg08xkxsyk2siv7372nz-49e5cc45.us1.manus.computer/api/sos/trigger',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({...})
  }
);
```

### Après (avec Supabase)

```typescript
const response = await fetch(
  'https://kycuteffcbqizyqlhczc.supabase.co/functions/v1/trigger-sos',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({...})
  }
);
```

---

## Avantages

| Aspect          | Express (Manus)       | Edge Functions (Supabase) |
| --------------- | --------------------- | ------------------------- |
| **Coût**        | Gratuit (temporaire)  | Gratuit (inclus)          |
| **Maintenance** | Vous gérez le serveur | Supabase gère tout        |
| **Scalabilité** | Limitée               | Illimitée                 |
| **Déploiement** | Manuel                | Automatique               |
| **Monitoring**  | Logs Manus            | Logs Supabase             |

---

## Monitoring

### Voir les logs

```bash
supabase functions logs trigger-sos
```

### Voir les erreurs

```bash
supabase functions logs trigger-sos --tail
```

### Dashboard Supabase

Allez sur https://app.supabase.com → Votre projet → Edge Functions → trigger-sos

---

## Troubleshooting

### Erreur : "Function not found"

```bash
# Redéployer
supabase functions deploy trigger-sos
```

### Erreur : "Twilio not configured"

```bash
# Vérifier les secrets
supabase secrets list

# Ajouter les secrets manquants
supabase secrets set TWILIO_ACCOUNT_SID=...
```

### Erreur : "Supabase not configured"

```bash
# Vérifier que le projet est lié
supabase link --project-ref kycuteffcbqizyqlhczc
```

---

## Prochaines étapes

1. ✅ Installer Supabase CLI
2. ✅ Authentifier avec Supabase
3. ✅ Lier le projet
4. ✅ Configurer les secrets
5. ✅ Déployer la fonction
6. ✅ Mettre à jour l'app mobile
7. ✅ Tester sur iPhone

---

## Ressources

- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Supabase CLI](https://supabase.com/docs/reference/cli/introduction)
- [Deno Documentation](https://deno.land/manual)

---

_Guide créé le 19 Février 2026_
