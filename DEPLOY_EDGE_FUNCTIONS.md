# Guide de Déploiement des Edge Functions SafeWalk

## Vue d'ensemble

Vous devez déployer **7 Edge Functions** sur Supabase. Ce guide vous montre comment le faire manuellement via Supabase Dashboard.

## Prérequis

- Accès à Supabase Dashboard
- Les 7 fichiers de code des Edge Functions (fournis ci-dessous)

## Étapes de déploiement

### 1. Accédez à Supabase Dashboard

1. Allez sur https://app.supabase.com
2. Sélectionnez votre projet SafeWalk
3. Cliquez sur **"Edge Functions"** dans le menu de gauche

### 2. Créez chaque Edge Function

Pour chaque fonction ci-dessous :

1. Cliquez sur **"Create Function"** (ou **"+"**)
2. Donnez-lui le **nom exact** (ex: `start-trip`)
3. Copiez-collez le **code complet** du fichier correspondant
4. Cliquez sur **"Deploy"**
5. Attendez que le déploiement soit terminé ✅

---

## 7 Edge Functions à déployer

### 1️⃣ `start-trip`

**Fichier source :** `supabase/functions/start-trip/index.ts`

**Fonction :** Créer une nouvelle session active

**Auth :** JWT user (client-auth)

**Payload :**
```json
{
  "deadlineISO": "2026-02-24T20:00:00Z",
  "shareLocation": true,
  "destinationNote": "Chez Sophie"
}
```

---

### 2️⃣ `checkin`

**Fichier source :** `supabase/functions/checkin/index.ts`

**Fonction :** Confirmer le retour de l'utilisateur

**Auth :** JWT user (client-auth)

**Payload :**
```json
{
  "tripId": "uuid-of-trip"
}
```

---

### 3️⃣ `extend`

**Fichier source :** `supabase/functions/extend/index.ts`

**Fonction :** Prolonger la deadline d'une trip

**Auth :** JWT user (client-auth)

**Payload :**
```json
{
  "tripId": "uuid-of-trip",
  "addMinutes": 30
}
```

---

### 4️⃣ `ping-location`

**Fichier source :** `supabase/functions/ping-location/index.ts`

**Fonction :** Mettre à jour la position de l'utilisateur

**Auth :** JWT user (client-auth)

**Payload :**
```json
{
  "tripId": "uuid-of-trip",
  "lat": 48.8566,
  "lng": 2.3522
}
```

---

### 5️⃣ `test-sms`

**Fichier source :** `supabase/functions/test-sms/index.ts`

**Fonction :** Envoyer un SMS de test au contact d'urgence

**Auth :** JWT user (client-auth)

**Payload :**
```json
{}
```

---

### 6️⃣ `sos`

**Fichier source :** `supabase/functions/sos/index.ts`

**Fonction :** Déclencher une alerte SOS immédiate

**Auth :** JWT user (client-auth)

**Payload :**
```json
{
  "tripId": "uuid-of-trip"
}
```

---

### 7️⃣ `cron-check-deadlines`

**Fichier source :** `supabase/functions/cron-check-deadlines/index.ts`

**Fonction :** Vérifier les trips en retard et envoyer les alertes (server-only)

**Auth :** Header `x-cron-secret` (doit correspondre à `CRON_SECRET`)

**Payload :**
```json
{}
```

**Header :**
```
x-cron-secret: {VOTRE_CRON_SECRET}
```

---

## Ordre de déploiement recommandé

1. `start-trip`
2. `checkin`
3. `extend`
4. `ping-location`
5. `test-sms`
6. `sos`
7. `cron-check-deadlines` (dernière)

---

## Vérification du déploiement

Après avoir déployé toutes les 7 fonctions :

1. Allez dans **"Edge Functions"** dans Supabase Dashboard
2. Vous devriez voir les 7 fonctions listées ✅
3. Cliquez sur chaque fonction pour vérifier qu'elle est "Active"

---

## Étapes suivantes

Après le déploiement :

1. **Configurer le Cron Job**
   - Allez dans **"Edge Functions"** → **"Cron Jobs"**
   - Créez un nouveau job pour `cron-check-deadlines`
   - Interval: `*/1 * * * *` (toutes les 1 minute)
   - Header: `x-cron-secret: {VOTRE_CRON_SECRET}`

2. **Intégrer trip-service dans app-context.tsx**
   - Importer `tripService` depuis `lib/services/trip-service.ts`
   - Remplacer les appels directs par les fonctions du service

3. **Tester les Edge Functions**
   - Utiliser Supabase Dashboard pour tester chaque fonction
   - Vérifier les logs dans **"Edge Functions"** → **"Logs"**

---

## Troubleshooting

### Erreur : "Function already exists"

- La fonction est déjà déployée
- Vous pouvez la mettre à jour en copiant-collant le nouveau code

### Erreur : "CORS error"

- C'est normal, les Edge Functions gèrent les CORS
- Vérifiez que vous utilisez le bon header `Authorization`

### Erreur : "JWT could not be decoded"

- Le token JWT est invalide ou expiré
- Vérifiez que vous utilisez un token valide

### Erreur : "No contact found"

- L'utilisateur n'a pas de contact d'urgence configuré
- Allez dans Settings et ajoutez un contact

---

## Support

Pour plus d'informations :
- Voir `ARCHITECTURE_RPC_EDGE_FUNCTIONS.md` pour la documentation complète
- Voir `lib/services/trip-service.ts` pour le client TypeScript
