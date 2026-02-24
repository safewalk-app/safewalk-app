# Guide de Déploiement des Edge Functions SafeWalk

Ce guide explique comment déployer les Edge Functions Supabase pour SafeWalk.

## Edge Functions à Déployer

| Fonction | Endpoint | Méthode | Description |
|----------|----------|--------|-------------|
| `start-trip` | `/functions/v1/start-trip` | POST | Crée une nouvelle sortie/trip |
| `test-sms` | `/functions/v1/test-sms` | POST | Envoie un SMS de test au contact d'urgence |
| `checkin` | `/functions/v1/checkin` | POST | Confirme l'arrivée et ferme la sortie |
| `trigger-sos` | `/functions/v1/trigger-sos` | POST | Déclenche une alerte SOS |

## Codes d'Erreur Implémentés

Les Edge Functions retournent les codes d'erreur standardisés suivants:

### Codes d'erreur métier

| Code | HTTP | Description | Exemple |
|------|------|-------------|---------|
| `phone_not_verified` | 403 | Téléphone non vérifié | L'utilisateur doit vérifier son numéro via OTP |
| `no_credits` | 402 | Pas de crédits disponibles | L'utilisateur doit acheter un abonnement |
| `quota_reached` | 402 | Limite quotidienne atteinte | L'utilisateur a dépassé son quota quotidien |
| `twilio_failed` | 500 | Erreur d'envoi SMS Twilio | Problème avec le service Twilio |

### Codes d'erreur techniques

| Code | HTTP | Description |
|------|------|-------------|
| `UNAUTHORIZED` | 401 | En-tête Authorization manquant |
| `INVALID_TOKEN` | 401 | Token JWT invalide ou expiré |
| `CONFIG_ERROR` | 500 | Configuration Supabase/Twilio manquante |
| `DB_ERROR` | 500 | Erreur de base de données |
| `NOT_FOUND` | 404 | Ressource non trouvée |
| `INVALID_INPUT` | 400 | Paramètres d'entrée invalides |

## Déploiement via Supabase CLI

### 1. Installer Supabase CLI

```bash
npm install -g supabase
```

### 2. Se connecter à Supabase

```bash
supabase login
```

### 3. Déployer les Edge Functions

```bash
# Depuis la racine du projet
supabase functions deploy start-trip
supabase functions deploy test-sms
supabase functions deploy checkin
supabase functions deploy trigger-sos
```

### 4. Vérifier le déploiement

```bash
supabase functions list
```

## Déploiement via Console Supabase

### 1. Accéder à la Console Supabase

1. Aller à https://app.supabase.com
2. Sélectionner votre projet
3. Aller à **Edge Functions** dans le menu latéral

### 2. Créer une nouvelle Edge Function

1. Cliquer sur **Create a new function**
2. Nommer la fonction (ex: `start-trip`)
3. Copier le contenu du fichier `supabase/functions/start-trip/index.ts`
4. Coller dans l'éditeur
5. Cliquer sur **Deploy**

### 3. Répéter pour chaque fonction

Répéter les étapes 1-5 pour:
- `test-sms`
- `checkin`
- `trigger-sos`

## Configuration des Variables d'Environnement

Les Edge Functions nécessitent les variables d'environnement suivantes:

### Variables Supabase (automatiques)

- `SUPABASE_URL` - URL de votre projet Supabase
- `SUPABASE_SERVICE_ROLE_KEY` - Clé de service Supabase

### Variables Twilio (à configurer)

1. Aller à **Project Settings** → **Edge Functions**
2. Cliquer sur **Secrets** ou **Environment Variables**
3. Ajouter les variables:

```
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number
```

## Tester les Edge Functions

### Via cURL

```bash
# Test start-trip
curl -X POST https://your-project.supabase.co/functions/v1/start-trip \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "deadlineISO": "2026-02-25T10:00:00Z",
    "shareLocation": true,
    "destinationNote": "Gym"
  }'
```

### Via l'app mobile

Les Edge Functions sont appelées automatiquement par:
- `tripService.startTrip()` → appelle `start-trip`
- `tripService.sendTestSms()` → appelle `test-sms`
- `tripService.checkin()` → appelle `checkin`
- `tripService.triggerSos()` → appelle `trigger-sos`

## Gestion des Erreurs dans l'App

Les codes d'erreur retournés par les Edge Functions sont mappés dans `lib/services/trip-service.ts`:

```typescript
// Exemple de mapping
if (errorCode === 'phone_not_verified') {
  showWarningToast('Vérifiez votre téléphone');
} else if (errorCode === 'no_credits') {
  router.push('/paywall');
} else if (errorCode === 'twilio_failed') {
  showErrorToast('Erreur SMS');
}
```

## Monitoring et Logs

### Logs en temps réel

1. Aller à **Edge Functions** dans la console Supabase
2. Cliquer sur la fonction
3. Voir les logs en bas de l'écran

### Logs détaillés

Les Edge Functions utilisent `console.log()` et `console.error()` pour le logging:

```typescript
console.log("[SafeWalk] Session created:", sessionId);
console.error("[Twilio] Error:", error);
```

## Troubleshooting

### Erreur: "Function not found"

- Vérifier que la fonction est déployée
- Vérifier le nom de la fonction (doit correspondre au dossier)
- Vérifier que le JWT token est valide

### Erreur: "Twilio not configured"

- Vérifier que les variables Twilio sont définies
- Vérifier que les valeurs ne contiennent pas d'espaces
- Redéployer la fonction après modification des variables

### Erreur: "Phone number not verified"

- L'utilisateur doit vérifier son téléphone via OTP
- Vérifier que `phone_verified` est `true` dans la table `profiles`

### Erreur: "No credits available"

- L'utilisateur n'a pas d'abonnement actif et pas de crédits gratuits
- Rediriger vers la page paywall

## Prochaines Étapes

1. ✅ Déployer les Edge Functions sur Supabase
2. ✅ Configurer les variables d'environnement Twilio
3. ✅ Tester chaque fonction via cURL
4. ✅ Tester via l'app mobile
5. ✅ Monitorer les logs en production
