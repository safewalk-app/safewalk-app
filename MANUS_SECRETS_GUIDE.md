# Guide Détaillé: Gestion des Secrets/Env Vars dans Manus

## Vue d'ensemble

Manus gère les secrets et variables d'environnement de **deux façons**:

### 1. **Secrets Manus** (Sécurisés)
- Stockés **chiffrés** dans Manus
- Accessibles via le **Management UI** (onglet Secrets)
- Injectés automatiquement dans le dev server et les Edge Functions
- Jamais exposés en clair dans le code

### 2. **Variables d'Environnement Locales** (.env)
- Stockées dans le fichier `.env` du projet
- Accessibles uniquement en développement local
- **NE PAS commiter** dans Git

---

## Architecture des Secrets Manus

```
┌─────────────────────────────────────────┐
│  Manus Management UI (Dashboard)        │
│  ├── Secrets Panel                      │
│  │   ├── EXPO_PUBLIC_SUPABASE_URL       │
│  │   ├── EXPO_PUBLIC_SUPABASE_ANON_KEY  │
│  │   ├── TWILIO_ACCOUNT_SID             │
│  │   ├── TWILIO_AUTH_TOKEN              │
│  │   ├── TWILIO_PHONE_NUMBER            │
│  │   ├── CRON_SECRET                    │
│  │   └── ... (autres secrets)           │
│  └── Chiffrement AES-256                │
└─────────────────────────────────────────┘
         ↓ (Injection automatique)
┌─────────────────────────────────────────┐
│  Dev Server (Metro Bundler)             │
│  ├── Variables disponibles via Deno.env │
│  └── Accessible dans le code            │
└─────────────────────────────────────────┘
         ↓ (Injection automatique)
┌─────────────────────────────────────────┐
│  Edge Functions (Supabase)              │
│  ├── Variables disponibles via Deno.env │
│  └── Accessible dans les fonctions      │
└─────────────────────────────────────────┘
```

---

## Types de Secrets dans SafeWalk

### A. Secrets Publics (Commencent par `EXPO_PUBLIC_`)

**Visibles dans le code compilé** - Utilisés par l'app mobile:

```typescript
// Dans app.config.ts ou le code mobile
const supabaseUrl = Deno.env.get("EXPO_PUBLIC_SUPABASE_URL");
const supabaseAnonKey = Deno.env.get("EXPO_PUBLIC_SUPABASE_ANON_KEY");
```

**Secrets publics SafeWalk:**
- `EXPO_PUBLIC_SUPABASE_URL` - URL du projet Supabase
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` - Clé publique Supabase (anon)

### B. Secrets Privés (Sans préfixe `EXPO_PUBLIC_`)

**Jamais exposés au client** - Utilisés uniquement par les Edge Functions:

```typescript
// Dans les Edge Functions (serveur-side uniquement)
const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
const cronSecret = Deno.env.get("CRON_SECRET");
```

**Secrets privés SafeWalk:**
- `TWILIO_ACCOUNT_SID` - Identifiant Twilio
- `TWILIO_AUTH_TOKEN` - Token d'authentification Twilio
- `TWILIO_PHONE_NUMBER` - Numéro de téléphone Twilio
- `CRON_SECRET` - Secret pour vérifier les appels cron
- `SUPABASE_SERVICE_ROLE_KEY` - Clé admin Supabase (service role)

---

## Flux d'Injection des Secrets

### 1. Développement Local (Manus Dev Server)

```
┌─ Manus Management UI
│  └─ Utilisateur ajoute secret via "Secrets" panel
│     └─ Manus chiffre et stocke
│
└─ Dev Server (Metro)
   ├─ Manus injecte les secrets dans Deno.env
   ├─ Code accède via: Deno.env.get("SECRET_NAME")
   └─ Disponible immédiatement (hot reload)
```

**Exemple dans le code:**
```typescript
// supabase/functions/test-sms/index.ts
const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
// ✅ Fonctionne en dev (injecté par Manus)
// ✅ Fonctionne en prod (injecté par Supabase)
```

### 2. Production (Supabase Edge Functions)

```
┌─ Manus Management UI
│  └─ Utilisateur configure secrets
│     └─ Manus les envoie à Supabase
│
└─ Supabase Edge Functions
   ├─ Supabase injecte les secrets dans Deno.env
   ├─ Code accède via: Deno.env.get("SECRET_NAME")
   └─ Sécurisé (chiffré en transit et au repos)
```

---

## Cycle de Vie des Secrets

### Étape 1: Ajouter un Secret (Manus Management UI)

```
1. Ouvrir Manus Management UI (bouton en haut à droite)
2. Aller à "Secrets" panel
3. Cliquer "+ Add Secret"
4. Remplir:
   - Key: TWILIO_ACCOUNT_SID
   - Value: ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
5. Cliquer "Save"
6. Manus chiffre et stocke
```

### Étape 2: Accéder au Secret dans le Code

```typescript
// Dans les Edge Functions
const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");

if (!twilioAccountSid) {
  throw new Error("TWILIO_ACCOUNT_SID not configured");
}

// Utiliser le secret
const url = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
```

### Étape 3: Déployer sur Supabase

```
1. Créer checkpoint dans Manus
2. Les secrets sont synchronisés avec Supabase
3. Les Edge Functions peuvent les utiliser en production
```

---

## Secrets SafeWalk - Configuration Complète

### A. Secrets Publics (Visibles dans l'app)

| Secret | Valeur | Où le trouver |
|--------|--------|---------------|
| `EXPO_PUBLIC_SUPABASE_URL` | `https://xxxxx.supabase.co` | Supabase Console → Settings → API |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGc...` | Supabase Console → Settings → API |

### B. Secrets Privés (Edge Functions)

| Secret | Valeur | Où le trouver |
|--------|--------|---------------|
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGc...` | Supabase Console → Settings → API |
| `TWILIO_ACCOUNT_SID` | `ACxxxxxxxx` | Twilio Console → Account Info |
| `TWILIO_AUTH_TOKEN` | `xxxxxxxx` | Twilio Console → Account Info |
| `TWILIO_PHONE_NUMBER` | `+1234567890` | Twilio Console → Phone Numbers |
| `CRON_SECRET` | Générer une clé aléatoire | `openssl rand -hex 32` |

---

## Bonnes Pratiques

### ✅ À FAIRE

1. **Utiliser les secrets Manus** pour tous les tokens/clés
   ```typescript
   const apiKey = Deno.env.get("API_KEY"); // ✅ Bon
   ```

2. **Préfixer les secrets publics** avec `EXPO_PUBLIC_`
   ```typescript
   const supabaseUrl = Deno.env.get("EXPO_PUBLIC_SUPABASE_URL"); // ✅ Bon
   ```

3. **Vérifier la présence** des secrets avant utilisation
   ```typescript
   if (!twilioAccountSid) {
     throw new Error("TWILIO_ACCOUNT_SID not configured");
   }
   ```

4. **Rotation régulière** des tokens sensibles (Twilio, etc.)

### ❌ À NE PAS FAIRE

1. **Hardcoder les secrets** dans le code
   ```typescript
   const apiKey = "sk_live_xxxxx"; // ❌ Mauvais!
   ```

2. **Commiter le fichier .env** dans Git
   ```bash
   git add .env  # ❌ Mauvais!
   ```

3. **Afficher les secrets** dans les logs
   ```typescript
   console.log("API Key:", apiKey); // ❌ Mauvais!
   ```

4. **Utiliser les mêmes secrets** en dev et prod
   ```typescript
   // ❌ Mauvais: Utiliser le token prod en dev
   const token = "prod_token_xxxxx";
   ```

---

## Troubleshooting

### Problème: "Secret not found" en dev

**Cause:** Le secret n'a pas été ajouté dans Manus Management UI

**Solution:**
1. Ouvrir Manus Management UI
2. Aller à "Secrets"
3. Ajouter le secret manquant
4. Redémarrer le dev server

### Problème: Secret fonctionne en dev mais pas en prod

**Cause:** Le secret n'a pas été synchronisé avec Supabase

**Solution:**
1. Vérifier que le secret est dans Manus Management UI
2. Créer un checkpoint (cela synchronise les secrets)
3. Vérifier dans Supabase Console → Edge Functions → Settings

### Problème: "Invalid TWILIO_ACCOUNT_SID"

**Cause:** Le secret a une valeur incorrecte

**Solution:**
1. Vérifier la valeur dans Twilio Console
2. Mettre à jour le secret dans Manus Management UI
3. Redémarrer le dev server

---

## Résumé

| Aspect | Détail |
|--------|--------|
| **Où stocker** | Manus Management UI (Secrets panel) |
| **Chiffrement** | AES-256 (Manus) + TLS (transit) |
| **Accès** | `Deno.env.get("SECRET_NAME")` |
| **Publics** | Préfixe `EXPO_PUBLIC_` |
| **Privés** | Sans préfixe (Edge Functions seulement) |
| **Sync prod** | Automatique via checkpoint |
| **Rotation** | Manuelle via Manus Management UI |

---

## Exemple Complet: Configurer Twilio

### 1. Obtenir les credentials Twilio
```
1. Aller à https://www.twilio.com/console
2. Copier: Account SID, Auth Token
3. Aller à Phone Numbers
4. Copier: Numéro de téléphone (format E.164: +1234567890)
```

### 2. Ajouter dans Manus
```
Manus Management UI → Secrets
├── TWILIO_ACCOUNT_SID = ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
├── TWILIO_AUTH_TOKEN = xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
└── TWILIO_PHONE_NUMBER = +1234567890
```

### 3. Utiliser dans Edge Function
```typescript
// supabase/functions/test-sms/index.ts
const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
const twilioFromNumber = Deno.env.get("TWILIO_PHONE_NUMBER");

const auth = btoa(`${twilioAccountSid}:${twilioAuthToken}`);
const response = await fetch("https://api.twilio.com/2010-04-01/Accounts/...", {
  headers: {
    Authorization: `Basic ${auth}`,
  },
});
```

### 4. Tester en dev
```
1. Ajouter les secrets dans Manus
2. Redémarrer le dev server
3. Appeler la fonction test-sms
4. Vérifier que le SMS est envoyé
```

### 5. Déployer en prod
```
1. Créer un checkpoint
2. Manus synchronise les secrets avec Supabase
3. Les Edge Functions en prod utilisent les mêmes secrets
```
