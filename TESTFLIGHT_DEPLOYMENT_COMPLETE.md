# SafeWalk - TestFlight Deployment Guide

## 📋 Prérequis

Avant de commencer, assurez-vous d'avoir:

- ✅ Apple Developer Account actif ($99/an)
- ✅ EAS Account (gratuit ou payant)
- ✅ App ID créé dans Apple Developer Console
- ✅ Certificate & Provisioning Profile configurés
- ✅ Xcode installé (Mac uniquement)

---

## 🚀 Étape 1: Créer eas.json

Créez un fichier `eas.json` à la racine du projet:

```json
{
  "cli": {
    "version": ">= 5.0.0",
    "promptToConfigurePushNotifications": false
  },
  "build": {
    "production": {
      "ios": {
        "buildType": "archive"
      }
    },
    "preview": {
      "ios": {
        "buildType": "simulator"
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "ascAppId": "YOUR_APP_ID",
        "appleId": "YOUR_APPLE_ID",
        "appleTeamId": "YOUR_TEAM_ID",
        "appleAppSpecificPassword": "YOUR_APP_SPECIFIC_PASSWORD"
      }
    }
  }
}
```

### Remplacer les valeurs:

- `YOUR_APP_ID`: Votre App ID (ex: 1234567890)
- `YOUR_APPLE_ID`: Votre email Apple
- `YOUR_TEAM_ID`: Votre Team ID (10 caractères)
- `YOUR_APP_SPECIFIC_PASSWORD`: Généré dans Apple ID Settings

---

## 🔑 Étape 2: Générer App-Specific Password

1. Aller à: https://appleid.apple.com/account/manage
2. Cliquer "Security" → "App-Specific Passwords"
3. Générer un nouveau mot de passe pour "Expo"
4. Copier le mot de passe dans `eas.json`

---

## 🏗️ Étape 3: Builder l'App

### Option 1: Build Local (Recommandé pour Testing)

```bash
# 1. Installer EAS CLI
npm install -g eas-cli

# 2. Login à EAS
eas login

# 3. Builder pour iOS
eas build --platform ios --profile production

# 4. Attendre 10-15 minutes
# Vous recevrez un lien de téléchargement
```

### Option 2: Build Cloud (Plus Rapide)

```bash
# EAS construit dans le cloud
eas build --platform ios --profile production --remote
```

---

## 📤 Étape 4: Soumettre à TestFlight

### Option 1: Via EAS (Automatique)

```bash
# Soumettre directement à TestFlight
eas submit --platform ios --latest
```

### Option 2: Via Xcode (Manuel)

```bash
# 1. Télécharger le fichier .ipa depuis EAS
# 2. Ouvrir Xcode
# 3. Window → Organizer
# 4. Sélectionner votre app
# 5. Cliquer "Distribute App"
# 6. Choisir "TestFlight"
# 7. Suivre les instructions
```

### Option 3: Via App Store Connect (Web)

1. Aller à: https://appstoreconnect.apple.com
2. Sélectionner votre app
3. Aller à "TestFlight" → "iOS Builds"
4. Cliquer "+"
5. Uploader le fichier .ipa
6. Remplir les infos de test
7. Cliquer "Submit for Review"

---

## 👥 Étape 5: Inviter les Testeurs

### Via App Store Connect

1. Aller à: TestFlight → Testers
2. Cliquer "+" pour ajouter un testeur
3. Entrer l'email du testeur
4. Sélectionner les groupes de test
5. Cliquer "Send Invite"

### Groupes de Test Recommandés

```
- Internal Testing (équipe interne)
- Beta Testing (utilisateurs beta)
- Friends & Family (amis et famille)
```

---

## 📊 Checklist Avant Submission

- [ ] Version number mis à jour (ex: 1.0.0)
- [ ] Build number incrémenté
- [ ] Tous les tests passent
- [ ] Pas de console errors
- [ ] Screenshots et descriptions complètes
- [ ] Privacy Policy configurée
- [ ] Terms of Service configurés
- [ ] App Icon et Launch Screen présents
- [ ] Permissions justifiées

---

## 🔍 Vérification Finale

```bash
# 1. Vérifier la version
grep '"version"' app.config.ts

# 2. Vérifier les dépendances
npm list

# 3. Vérifier les erreurs TypeScript
npm run check

# 4. Vérifier les tests
npm run test
```

---

## 📱 Tester sur TestFlight

### Avant de Soumettre

1. **Tester localement** avec Expo Go
2. **Tester sur device réel** si possible
3. **Tester tous les flux** (OTP, sessions, etc.)
4. **Vérifier les performances**
5. **Vérifier la batterie/réseau**

### Après Submission

1. **Attendre l'approbation** (24-48h)
2. **Inviter les testeurs**
3. **Collecter le feedback**
4. **Corriger les bugs**
5. **Soumettre à l'App Store**

---

## 🚨 Troubleshooting

### Erreur: "Certificate not found"

**Solution:** Créer un nouveau certificate dans Apple Developer Console

### Erreur: "Provisioning profile not found"

**Solution:** Créer un nouveau provisioning profile

### Erreur: "App rejected"

**Solution:** Vérifier les guidelines Apple:
- Pas de hardcoded URLs
- Pas de test accounts
- Pas de debug mode
- Permissions justifiées

### Build Timeout

**Solution:** Augmenter le timeout ou utiliser EAS Cloud

---

## 📈 Monitoring en Production

Après le déploiement:

1. **Monitorer les crashes** avec Sentry
2. **Monitorer les performances** avec Firebase
3. **Collecter le feedback** des testeurs
4. **Corriger les bugs critiques**
5. **Préparer la v1.1**

---

## ✨ Prochaines Étapes

1. ✅ Créer `eas.json`
2. ✅ Générer App-Specific Password
3. ✅ Builder l'app avec EAS
4. ✅ Soumettre à TestFlight
5. ✅ Inviter les testeurs
6. ✅ Collecter le feedback
7. ✅ Soumettre à l'App Store

**Status:** Prêt pour TestFlight! 🚀
