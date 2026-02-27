# SafeWalk - GitHub Pages

Ce dossier contient les pages légales et de support pour SafeWalk, hébergées sur GitHub Pages.

## Contenu

- `index.html` : Page d'accueil
- `privacy.html` : Politique de confidentialité
- `terms.html` : Conditions d'utilisation
- `support.html` : Centre d'aide et FAQ
- `styles.css` : Feuille de style CSS

## Déploiement sur GitHub Pages

### 1. Créer un repository GitHub

```bash
# Initialiser git (si pas déjà fait)
git init

# Ajouter les fichiers
git add docs/
git commit -m "Add GitHub Pages documentation"

# Créer un repository sur GitHub
# Puis ajouter le remote
git remote add origin https://github.com/VOTRE_USERNAME/safewalk-app.git
git push -u origin main
```

### 2. Activer GitHub Pages

1. Aller sur le repository GitHub
2. Cliquer sur **Settings** (Paramètres)
3. Dans le menu de gauche, cliquer sur **Pages**
4. Sous **Source**, sélectionner :
   - Branch: `main`
   - Folder: `/docs`
5. Cliquer sur **Save**

GitHub Pages va automatiquement déployer le site. L'URL sera :

```
https://VOTRE_USERNAME.github.io/safewalk-app/
```

### 3. Configurer un domaine personnalisé (optionnel)

Si vous avez un domaine personnalisé (ex: safewalk.app) :

1. Acheter un domaine (ex: sur Namecheap, Google Domains)
2. Configurer les DNS :
   ```
   Type: CNAME
   Name: www
   Value: VOTRE_USERNAME.github.io
   ```
3. Dans GitHub Pages Settings, ajouter le domaine personnalisé
4. Activer **Enforce HTTPS**

## URLs à utiliser dans app.config.ts

Une fois déployé, mettre à jour `app.config.ts` avec les URLs :

```typescript
const config: ExpoConfig = {
  // ...
  ios: {
    // ...
    config: {
      usesNonExemptEncryption: false,
    },
  },
  android: {
    // ...
  },
  // URLs pour les stores
  extra: {
    privacyPolicyUrl: 'https://VOTRE_USERNAME.github.io/safewalk-app/privacy.html',
    termsOfServiceUrl: 'https://VOTRE_USERNAME.github.io/safewalk-app/terms.html',
    supportUrl: 'https://VOTRE_USERNAME.github.io/safewalk-app/support.html',
  },
};
```

## Vérification

Après le déploiement, vérifier que toutes les pages sont accessibles :

- ✅ https://VOTRE_USERNAME.github.io/safewalk-app/
- ✅ https://VOTRE_USERNAME.github.io/safewalk-app/privacy.html
- ✅ https://VOTRE_USERNAME.github.io/safewalk-app/terms.html
- ✅ https://VOTRE_USERNAME.github.io/safewalk-app/support.html

## Mise à jour

Pour mettre à jour les pages :

```bash
# Modifier les fichiers HTML
# Puis commit et push
git add docs/
git commit -m "Update legal pages"
git push

# GitHub Pages se met à jour automatiquement (1-2 minutes)
```

## Alternative : Domaine personnalisé gratuit

Si vous ne voulez pas acheter de domaine, vous pouvez utiliser :

- **GitHub Pages** : `VOTRE_USERNAME.github.io/safewalk-app`
- **Netlify** : Gratuit avec domaine personnalisé `.netlify.app`
- **Vercel** : Gratuit avec domaine personnalisé `.vercel.app`

## Checklist avant soumission aux stores

- [ ] Pages déployées sur GitHub Pages
- [ ] URLs testées et accessibles
- [ ] URLs ajoutées dans `app.config.ts`
- [ ] URLs ajoutées dans App Store Connect (iOS)
- [ ] URLs ajoutées dans Google Play Console (Android)
