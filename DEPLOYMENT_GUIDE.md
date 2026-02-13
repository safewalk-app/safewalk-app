# Guide de Déploiement SafeWalk - GitHub Pages + Expo

Ce guide te montre comment déployer les pages légales sur GitHub Pages et lancer ton premier build Expo.

---

## PARTIE 1 : Déployer les pages légales sur GitHub Pages

### Étape 1 : Créer un compte GitHub (si tu n'en as pas)

1. Aller sur [github.com](https://github.com)
2. Cliquer sur **Sign up**
3. Remplir le formulaire (email, mot de passe, username)
4. Vérifier ton email
5. ✅ Compte créé !

### Étape 2 : Créer un repository GitHub

1. Aller sur [github.com/new](https://github.com/new)
2. Remplir le formulaire :
   - **Repository name** : `safewalk-app` (ou ton choix)
   - **Description** : "SafeWalk - Personal safety companion"
   - **Visibility** : Public (nécessaire pour GitHub Pages)
   - **Initialize with README** : Non (on va le faire nous-mêmes)
3. Cliquer sur **Create repository**
4. ✅ Repository créé !

### Étape 3 : Initialiser Git localement

Ouvre un terminal dans le dossier du projet :

```bash
# Aller dans le dossier du projet
cd /home/ubuntu/safewalk-app

# Initialiser git (si pas déjà fait)
git init

# Ajouter le remote GitHub
git remote add origin https://github.com/TON_USERNAME/safewalk-app.git

# Vérifier que le remote est bien ajouté
git remote -v
```

**Résultat attendu** :
```
origin  https://github.com/TON_USERNAME/safewalk-app.git (fetch)
origin  https://github.com/TON_USERNAME/safewalk-app.git (push)
```

### Étape 4 : Configurer Git (première fois seulement)

```bash
# Configurer ton identité Git
git config --global user.name "Ton Nom"
git config --global user.email "ton.email@example.com"

# Vérifier la configuration
git config --global user.name
git config --global user.email
```

### Étape 5 : Ajouter et committer les fichiers

```bash
# Ajouter tous les fichiers
git add .

# Vérifier les fichiers à committer
git status

# Committer
git commit -m "Initial commit: SafeWalk app with GitHub Pages documentation"
```

### Étape 6 : Pousser vers GitHub

```bash
# Pousser vers GitHub (première fois)
git push -u origin main

# Les fois suivantes, tu peux juste faire :
# git push
```

**Si tu reçois une erreur** :
- Si le branch s'appelle `master` au lieu de `main` :
  ```bash
  git branch -M main
  git push -u origin main
  ```

### Étape 7 : Activer GitHub Pages

1. Aller sur ton repository GitHub : `https://github.com/TON_USERNAME/safewalk-app`
2. Cliquer sur **Settings** (Paramètres)
3. Dans le menu de gauche, cliquer sur **Pages**
4. Sous **Source**, sélectionner :
   - **Branch** : `main`
   - **Folder** : `/docs`
5. Cliquer sur **Save**
6. Attendre 1-2 minutes que GitHub déploie le site
7. ✅ Pages déployées !

**Ton site sera accessible à** :
```
https://TON_USERNAME.github.io/safewalk-app/
```

### Étape 8 : Vérifier le déploiement

Ouvre les URLs suivantes dans ton navigateur :

- ✅ https://TON_USERNAME.github.io/safewalk-app/
- ✅ https://TON_USERNAME.github.io/safewalk-app/privacy.html
- ✅ https://TON_USERNAME.github.io/safewalk-app/terms.html
- ✅ https://TON_USERNAME.github.io/safewalk-app/support.html

Si tu vois les pages, c'est bon ! 🎉

### Étape 9 : Ajouter les URLs dans app.config.ts

Maintenant, mets à jour ton fichier `app.config.ts` avec les URLs :

```typescript
const config: ExpoConfig = {
  // ... autres configurations ...
  
  extra: {
    privacyPolicyUrl: "https://TON_USERNAME.github.io/safewalk-app/privacy.html",
    termsOfServiceUrl: "https://TON_USERNAME.github.io/safewalk-app/terms.html",
    supportUrl: "https://TON_USERNAME.github.io/safewalk-app/support.html",
  },
};
```

Remplace `TON_USERNAME` par ton username GitHub réel.

### Étape 10 : Committer et pousser les changements

```bash
# Ajouter les changements
git add app.config.ts

# Committer
git commit -m "Add GitHub Pages URLs to app config"

# Pousser
git push
```

✅ **Pages légales déployées avec succès !**

---

## PARTIE 2 : Créer un compte Expo et configurer EAS

### Étape 1 : Créer un compte Expo

1. Aller sur [expo.dev](https://expo.dev)
2. Cliquer sur **Sign up**
3. Remplir le formulaire (email, mot de passe, username)
4. Vérifier ton email
5. ✅ Compte Expo créé !

### Étape 2 : Installer EAS CLI

Ouvre un terminal et exécute :

```bash
# Installer EAS CLI globalement
npm install -g eas-cli

# Vérifier l'installation
eas --version
```

**Résultat attendu** :
```
eas-cli/13.x.x
```

### Étape 3 : Se connecter à Expo

```bash
# Se connecter à ton compte Expo
eas login

# Entrer ton username et mot de passe Expo
# Ou scanner le QR code
```

**Résultat attendu** :
```
✔ Logged in as TON_USERNAME
```

### Étape 4 : Configurer le projet EAS

```bash
# Aller dans le dossier du projet
cd /home/ubuntu/safewalk-app

# Configurer EAS
eas build:configure

# Répondre aux questions :
# - Platform: all (iOS et Android)
# - Proceed: yes
```

**Résultat attendu** :
```
✔ Configured EAS Build for this project
```

### Étape 5 : Vérifier la configuration

```bash
# Vérifier que eas.json est bien configuré
cat eas.json
```

Tu devrais voir les 3 profils : `development`, `preview`, `production`.

✅ **Expo et EAS configurés avec succès !**

---

## PARTIE 3 : Lancer le premier build

### Étape 1 : Lancer un build preview pour iOS

```bash
# Aller dans le dossier du projet
cd /home/ubuntu/safewalk-app

# Lancer le build preview pour iOS
eas build --profile preview --platform ios
```

**Cela va** :
1. Compiler ton app pour iOS
2. Créer un fichier `.ipa`
3. Uploader sur les serveurs Expo
4. Prendre 5-15 minutes

**Pendant le build** :
- Ne ferme pas le terminal
- Laisse le build se terminer
- Tu peux voir la progression en temps réel

### Étape 2 : Attendre la fin du build

Tu verras des messages comme :
```
[1/5] Building the app
[2/5] Uploading the app
[3/5] Processing the app
...
✔ Build finished
```

### Étape 3 : Récupérer le lien de téléchargement

À la fin du build, tu verras :
```
Build URL: https://expo.dev/accounts/TON_USERNAME/builds/BUILD_ID
```

Clique sur ce lien pour télécharger le fichier `.ipa`.

### Étape 4 : Tester le build (optionnel)

**Sur iPhone** :
1. Télécharger le fichier `.ipa`
2. Utiliser [Diawi](https://www.diawi.com/) pour installer sur iPhone
3. Ou utiliser Xcode pour installer sur le simulateur

**Sur Mac** :
```bash
# Télécharger le fichier .ipa
# Puis l'ouvrir dans Xcode
open build.ipa
```

### Étape 5 : Lancer un build preview pour Android

```bash
# Lancer le build preview pour Android
eas build --profile preview --platform android
```

**Cela va** :
1. Compiler ton app pour Android
2. Créer un fichier `.apk`
3. Prendre 5-15 minutes

### Étape 6 : Tester le build Android

**Sur Android** :
1. Télécharger le fichier `.apk`
2. Transférer sur ton téléphone
3. Installer (Paramètres > Sécurité > Sources inconnues)
4. Ouvrir l'app

### Étape 7 : Vérifier que tout fonctionne

- ✅ L'app s'ouvre
- ✅ Les écrans s'affichent
- ✅ Les boutons répondent
- ✅ Les notifications fonctionnent
- ✅ La localisation fonctionne

Si tout est bon, tu peux passer aux builds de production ! 🎉

---

## Commandes utiles

```bash
# Voir tous les builds
eas build:list

# Voir les détails d'un build
eas build:view BUILD_ID

# Télécharger un build
eas build:download BUILD_ID

# Voir les logs d'un build
eas build:logs BUILD_ID

# Annuler un build en cours
eas build:cancel BUILD_ID
```

---

## Troubleshooting

### Erreur : "No bundle identifier"

**Solution** :
```bash
# Vérifier que app.config.ts a bundleIdentifier
# Puis relancer le build
eas build --profile preview --platform ios --clear-cache
```

### Erreur : "Invalid credentials"

**Solution** :
```bash
# Réinitialiser les credentials
eas credentials

# Puis relancer le build
eas build --profile preview --platform ios
```

### Erreur : "Build failed"

**Solution** :
```bash
# Voir les logs
eas build:logs BUILD_ID

# Ou relancer avec plus de détails
eas build --profile preview --platform ios --verbose
```

---

## Prochaines étapes

1. ✅ Pages légales déployées
2. ✅ Compte Expo créé
3. ✅ Premier build lancé
4. ⏭️ **Créer compte Twilio** (pour les SMS d'alerte)
5. ⏭️ **Créer compte Apple Developer** (pour App Store)
6. ⏭️ **Créer compte Google Play Console** (pour Google Play)
7. ⏭️ **Lancer builds de production**
8. ⏭️ **Soumettre aux stores**

---

## Besoin d'aide ?

- 📖 [Documentation Expo](https://docs.expo.dev/)
- 📖 [Documentation EAS Build](https://docs.expo.dev/build/introduction/)
- 💬 [Expo Community](https://forums.expo.dev/)
- 🐛 [GitHub Issues](https://github.com/expo/expo/issues)

Bon courage ! 🚀
