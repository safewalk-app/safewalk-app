# Guide de Redéploiement des Edge Functions SafeWalk

## Fonctions à redéployer (7)

| # | Fonction | Correction appliquée |
|---|----------|---------------------|
| 1 | `start-trip` | Body parsing AVANT consume_credit, suppression double check crédits |
| 2 | `checkin` | Colonne `checkin_at` (était `checked_in_at`) |
| 3 | `extend` | Accepte statut `alerted` + reset `alert_sent_at` |
| 4 | `test-sms` | Suppression double validation E.164 |
| 5 | `cron-check-deadlines` | `session_id` dans sms_logs + nom utilisateur corrigé |
| 6 | `sos` | Pas de changement (déjà correct) |
| 7 | `ping-location` | Pas de changement (déjà correct) |

---

## Option 1 : Supabase CLI (Recommandé)

### Prérequis
```bash
# Installer Supabase CLI si pas déjà fait
npm install -g supabase

# Se connecter
supabase login
```

### Lier le projet
```bash
cd safewalk-app
supabase link --project-ref <VOTRE_PROJECT_REF>
```

### Déployer les 7 fonctions (une par une)
```bash
supabase functions deploy start-trip --no-verify-jwt
supabase functions deploy checkin --no-verify-jwt
supabase functions deploy extend --no-verify-jwt
supabase functions deploy test-sms --no-verify-jwt
supabase functions deploy cron-check-deadlines --no-verify-jwt
supabase functions deploy sos --no-verify-jwt
supabase functions deploy ping-location --no-verify-jwt
```

### Déployer toutes en une seule commande
```bash
supabase functions deploy start-trip checkin extend test-sms cron-check-deadlines sos ping-location --no-verify-jwt
```

---

## Option 2 : Dashboard Supabase (Manuel)

Pour chaque fonction :

1. Aller sur **https://supabase.com/dashboard** → votre projet
2. Cliquer sur **Edge Functions** dans le menu latéral
3. Cliquer sur la fonction à mettre à jour (ex: `start-trip`)
4. Cliquer sur **Update function**
5. Copier-coller le contenu du fichier `supabase/functions/<nom>/index.ts`
6. Cliquer **Deploy**

### Fichiers à copier-coller :

| Fonction | Fichier source |
|----------|---------------|
| start-trip | `supabase/functions/start-trip/index.ts` |
| checkin | `supabase/functions/checkin/index.ts` |
| extend | `supabase/functions/extend/index.ts` |
| test-sms | `supabase/functions/test-sms/index.ts` |
| cron-check-deadlines | `supabase/functions/cron-check-deadlines/index.ts` |
| sos | `supabase/functions/sos/index.ts` |
| ping-location | `supabase/functions/ping-location/index.ts` |

**Important :** Pour `test-sms` et `cron-check-deadlines`, vous devez aussi déployer le fichier partagé `supabase/functions/_shared/twilio.ts`.

---

## Option 3 : Copier-coller rapide dans le Dashboard

Si vous préférez copier-coller directement, voici les 5 fonctions modifiées. Les 2 autres (sos, ping-location) n'ont pas changé.

### Ordre de déploiement recommandé :
1. `start-trip` (P0 - le plus critique)
2. `cron-check-deadlines` (P0 - idempotence + nom utilisateur)
3. `checkin` (P0 - colonne alignée)
4. `extend` (P1 - accepte alerted)
5. `test-sms` (P1 - nettoyage)

---

## Vérification post-déploiement

Après le redéploiement, vérifiez dans le Dashboard Supabase :

1. **Edge Functions** → Chaque fonction doit afficher "Updated X minutes ago"
2. **Logs** → Vérifier qu'il n'y a pas d'erreurs de démarrage
3. **Tester** → Envoyer une requête de test via l'app mobile

### Tests rapides :
```bash
# Test start-trip (doit retourner UNAUTHORIZED sans token)
curl -X POST https://<PROJECT_REF>.supabase.co/functions/v1/start-trip \
  -H "Content-Type: application/json" \
  -d '{}'

# Test checkin (doit retourner UNAUTHORIZED sans token)  
curl -X POST https://<PROJECT_REF>.supabase.co/functions/v1/checkin \
  -H "Content-Type: application/json" \
  -d '{}'
```

---

## Fonctions obsolètes à supprimer

Ces fonctions ne sont plus utilisées et peuvent être supprimées du Dashboard :

| Fonction | Raison |
|----------|--------|
| `trigger-sos` | Remplacée par `sos` |
| `decrement-quota` | Remplacée par RPC `consume_credit` |
| `send-sos-notification` | Remplacée par `sos` |
