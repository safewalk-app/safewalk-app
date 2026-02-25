# Déployer les Edge Functions Standalone dans Supabase Dashboard

Le problème: Supabase Dashboard ne supporte pas les imports de fichiers partagés (`_shared/twilio.ts`). 

**Solution:** Utiliser les versions **standalone** qui ont tout le code inlinisé.

## Fichiers Standalone Disponibles

```
supabase/functions/
├── test-sms/index-standalone.ts          ← Copier dans test-sms
├── cron-check-deadlines/index-standalone.ts  ← Copier dans cron-check-deadlines
├── sos/index-standalone.ts               ← Copier dans sos
├── start-trip/index.ts                   ← Déjà sans imports externes
├── checkin/index.ts                      ← Déjà sans imports externes
├── extend/index.ts                       ← Déjà sans imports externes
└── ping-location/index.ts                ← Déjà sans imports externes
```

## Étapes de Déploiement

### 1. Ouvrir Supabase Dashboard
- Aller à votre projet Supabase
- Menu: **Edge Functions**

### 2. Déployer les 3 fonctions standalone

Pour chaque fonction, copier le contenu du fichier `index-standalone.ts` dans l'éditeur de la fonction correspondante:

#### test-sms
1. Cliquer sur la fonction `test-sms`
2. Copier le contenu de `/supabase/functions/test-sms/index-standalone.ts`
3. Coller dans l'éditeur (remplacer tout le contenu)
4. Cliquer "Deploy"

#### cron-check-deadlines
1. Cliquer sur la fonction `cron-check-deadlines`
2. Copier le contenu de `/supabase/functions/cron-check-deadlines/index-standalone.ts`
3. Coller dans l'éditeur
4. Cliquer "Deploy"

#### sos
1. Cliquer sur la fonction `sos`
2. Copier le contenu de `/supabase/functions/sos/index-standalone.ts`
3. Coller dans l'éditeur
4. Cliquer "Deploy"

### 3. Vérifier les autres fonctions

Les fonctions suivantes n'ont pas d'imports externes et peuvent être déployées normalement:
- `start-trip` ✅ (déjà sans imports)
- `checkin` ✅ (déjà sans imports)
- `extend` ✅ (déjà sans imports)
- `ping-location` ✅ (déjà sans imports)

## Vérification Post-Déploiement

Après chaque déploiement, vérifier:
1. ✅ Pas d'erreurs de déploiement
2. ✅ Fonction accessible dans la liste
3. ✅ Les variables d'environnement sont configurées:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_PHONE_NUMBER`
   - `CRON_SECRET` (pour cron-check-deadlines)

## Troubleshooting

**Erreur: "Module not found"**
→ Utiliser les fichiers `index-standalone.ts` qui ont tout inlinisé

**Erreur: "Missing environment variables"**
→ Configurer les variables dans Supabase Dashboard → Edge Functions → Settings

**Erreur: "Invalid CRON_SECRET"**
→ Pour `cron-check-deadlines`, vérifier que le header `x-cron-secret` correspond à `CRON_SECRET`
