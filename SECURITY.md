# 🔒 Guide de Sécurité SafeWalk

## Principes de Sécurité

SafeWalk suit les meilleures pratiques de sécurité pour protéger les données sensibles des utilisateurs et les credentials de l'application.

---

## 1. Gestion des Secrets

### ❌ À NE PAS FAIRE

```typescript
// ❌ JAMAIS faire cela
const TWILIO_ACCOUNT_SID = "ACb64f2e874590389edb14a4878f356d4b";
const TWILIO_AUTH_TOKEN = "f50761d9f66c2196508efef4dba2e1d9";
const SUPABASE_URL = "https://kycuteffcbqizyqlhczc.supabase.co";
```

### ✅ À FAIRE

```typescript
// ✅ Utiliser les variables d'environnement
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
```

### Configuration des Variables d'Environnement

**Supabase (Backend) :**
```bash
supabase secrets set TWILIO_ACCOUNT_SID=ACb64f2e874590389edb14a4878f356d4b
supabase secrets set TWILIO_AUTH_TOKEN=f50761d9f66c2196508efef4dba2e1d9
supabase secrets set TWILIO_PHONE_NUMBER=+33939035429
```

**Expo (Frontend) :**
```bash
# Dans app.config.ts ou .env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
```

---

## 2. Protection du Repository GitHub

### .gitignore

Le fichier `.gitignore` protège les données sensibles :

```
# Environment variables
.env
.env.local
.env.*.local

# Secrets
secrets/
credentials/
*.key
*.pem
```

### Vérifier avant de committer

```bash
# Chercher les credentials exposés
git diff HEAD --check

# Vérifier les fichiers à committer
git status

# Chercher les patterns sensibles
grep -r "ACb64f2e874590389edb14a4878f356d4b" .
grep -r "f50761d9f66c2196508efef4dba2e1d9" .
```

---

## 3. Données Confidentielles à Protéger

### Credentials Twilio

| Donnée | Où stocker | Où exposer |
|--------|-----------|-----------|
| Account SID | Supabase Secrets | ❌ JAMAIS |
| Auth Token | Supabase Secrets | ❌ JAMAIS |
| Phone Number | Supabase Secrets | ❌ JAMAIS |

### Credentials Supabase

| Donnée | Où stocker | Où exposer |
|--------|-----------|-----------|
| URL | `EXPO_PUBLIC_SUPABASE_URL` | ✅ OK (public) |
| Service Role Key | Supabase Secrets | ❌ JAMAIS |
| Anon Key | `SUPABASE_ANON_KEY` | ✅ OK (public) |

### Données Utilisateur

| Donnée | Où stocker | Où exposer |
|--------|-----------|-----------|
| Numéro d'urgence | Supabase DB | ❌ JAMAIS dans le code |
| Localisation | Supabase DB | ❌ JAMAIS dans les logs |
| Prénom utilisateur | Supabase DB | ✅ OK (chiffré) |

---

## 4. Validation et Sanitization

### Validation des Données (Zod)

```typescript
const sosRequestSchema = z.object({
  firstName: z.string().min(1).max(100),
  emergencyContacts: z.array(
    z.object({
      name: z.string().min(1).max(100),
      phone: z.string().regex(/^\+?[1-9]\d{1,14}$/), // E.164 format
    })
  ).min(1).max(5),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});
```

### Sanitization des Numéros de Téléphone

```typescript
// ✅ Accepter uniquement le format E.164
const e164Regex = /^\+?[1-9]\d{1,14}$/;

if (!e164Regex.test(phoneNumber)) {
  throw new Error('Invalid phone format');
}
```

---

## 5. Rate Limiting

### Protection contre les Abus

```typescript
const sosLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  max: 5,               // Max 5 requêtes par minute
  message: "Trop de requêtes. Veuillez réessayer dans 1 minute.",
});
```

---

## 6. CORS (Cross-Origin Resource Sharing)

### Restreindre les Origins

```typescript
// ✅ Autoriser uniquement les origins sûrs
const allowedOrigins = [
  'https://your-domain.com',
  'https://app.your-domain.com',
  'exp://localhost:8081', // Expo dev
];

if (!allowedOrigins.includes(origin)) {
  return new Response('Forbidden', { status: 403 });
}
```

---

## 7. Chiffrement des Données

### Données Sensibles en Base de Données

```sql
-- Chiffrer les numéros de téléphone
ALTER TABLE emergency_contacts
ADD COLUMN phone_number_encrypted TEXT;

-- Utiliser pgcrypto pour le chiffrement
CREATE EXTENSION IF NOT EXISTS pgcrypto;

UPDATE emergency_contacts
SET phone_number_encrypted = pgp_sym_encrypt(phone_number, 'secret-key')
WHERE phone_number IS NOT NULL;
```

---

## 8. Logging Sécurisé

### ❌ À NE PAS LOGGER

```typescript
// ❌ JAMAIS logger les données sensibles
console.log('SMS envoyé à:', phoneNumber);
console.log('Credentials:', { accountSid, authToken });
console.log('Location:', { latitude, longitude });
```

### ✅ À LOGGER

```typescript
// ✅ Logger uniquement les informations non-sensibles
logger.info('SMS sent successfully', { messageSid, status });
logger.error('SMS failed', { errorCode, errorMessage });
logger.debug('Session created', { sessionId, status });
```

---

## 9. Authentification et Autorisation

### Supabase Auth

```typescript
// ✅ Utiliser Supabase Auth pour les utilisateurs
const { data: { user } } = await supabase.auth.getUser();

if (!user) {
  return new Response('Unauthorized', { status: 401 });
}
```

### JWT Tokens

```typescript
// ✅ Valider les JWT tokens
const token = request.headers.get('Authorization')?.split(' ')[1];

if (!token) {
  return new Response('Unauthorized', { status: 401 });
}

const decoded = await verifyJWT(token);
```

---

## 10. Mise à Jour de Sécurité

### Dépendances

```bash
# Vérifier les vulnérabilités
npm audit

# Corriger les vulnérabilités
npm audit fix

# Mettre à jour les dépendances
npm update
```

### Supabase

```bash
# Mettre à jour Supabase CLI
supabase update

# Vérifier les mises à jour de sécurité
supabase --version
```

---

## 11. Checklist de Sécurité

### Avant le Déploiement

- [ ] Aucun credential exposé dans le code
- [ ] `.gitignore` configuré correctement
- [ ] Variables d'environnement définies
- [ ] Validation Zod en place
- [ ] Rate limiting activé
- [ ] CORS configuré
- [ ] Logging sécurisé
- [ ] Pas de données sensibles dans les logs
- [ ] Authentification en place
- [ ] Dépendances à jour

### Après le Déploiement

- [ ] Monitoring des logs
- [ ] Alertes de sécurité activées
- [ ] Backups réguliers
- [ ] Tests de pénétration
- [ ] Audit de sécurité régulier

---

## 12. Incident Response

### Si un Credential est Exposé

1. **Immédiatement :**
   - Révoquer le credential
   - Générer un nouveau credential
   - Mettre à jour dans Supabase Secrets

2. **Dans les 24 heures :**
   - Vérifier les logs pour les abus
   - Auditer les accès
   - Notifier les utilisateurs si nécessaire

3. **Documentation :**
   - Documenter l'incident
   - Identifier la cause
   - Implémenter des mesures préventives

### Si des Données Utilisateur sont Compromises

1. **Immédiatement :**
   - Isoler le système
   - Notifier les utilisateurs
   - Contacter les autorités si nécessaire

2. **Investigation :**
   - Analyser les logs
   - Identifier l'étendue de la compromission
   - Documenter les preuves

3. **Remédiation :**
   - Corriger la vulnérabilité
   - Réinitialiser les données
   - Mettre en place des mesures préventives

---

## 13. Ressources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Supabase Security](https://supabase.com/docs/guides/security)
- [Twilio Security](https://www.twilio.com/docs/security)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)

---

## Support

Pour toute question de sécurité :
- 📧 Email: security@safewalk.app
- 🐛 GitHub Issues: https://github.com/safewalk-app/safewalk-app/security

---

*Dernière mise à jour: 19 Février 2026*
