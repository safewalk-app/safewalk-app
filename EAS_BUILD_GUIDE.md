# Guide EAS Build - SafeWalk

## Prérequis

1. **Compte Expo** : Créer un compte sur [expo.dev](https://expo.dev)
2. **Compte Apple Developer** (iOS) : 99$/an sur [developer.apple.com](https://developer.apple.com)
3. **Compte Google Play Console** (Android) : 25$ one-time sur [play.google.com/console](https://play.google.com/console)

## Installation

```bash
# Installer EAS CLI globalement
npm install -g eas-cli

# Se connecter à Expo
eas login

# Configurer le projet
eas build:configure
```

## Builds de développement

### iOS Simulator

```bash
# Build pour simulateur iOS (gratuit, pas besoin de compte Apple Developer)
eas build --profile development --platform ios
```

### Android APK

```bash
# Build APK pour tests Android (gratuit)
eas build --profile development --platform android
```

## Builds de preview (TestFlight / Internal Testing)

### iOS (TestFlight)

```bash
# Build pour TestFlight (nécessite Apple Developer Account)
eas build --profile preview --platform ios

# Soumettre à TestFlight
eas submit --platform ios
```

### Android (Internal Testing)

```bash
# Build APK pour tests internes
eas build --profile preview --platform android
```

## Builds de production

### iOS (App Store)

```bash
# Build pour App Store
eas build --profile production --platform ios

# Soumettre à App Store
eas submit --platform ios --latest
```

### Android (Google Play)

```bash
# Build AAB pour Google Play
eas build --profile production --platform android

# Soumettre à Google Play
eas submit --platform android --latest
```

## Build pour les deux plateformes

```bash
# Development
eas build --profile development --platform all

# Preview
eas build --profile preview --platform all

# Production
eas build --profile production --platform all
```

## Configuration des credentials

### iOS

EAS gère automatiquement les certificats et provisioning profiles. Lors du premier build :

1. EAS vous demandera vos identifiants Apple Developer
2. EAS créera automatiquement les certificats nécessaires
3. Les credentials seront stockés de manière sécurisée sur les serveurs Expo

**Ou manuellement :**

```bash
eas credentials
```

### Android

EAS génère automatiquement un keystore pour signer l'app. Lors du premier build :

1. EAS créera un keystore
2. Le keystore sera stocké de manière sécurisée sur les serveurs Expo

**Ou manuellement :**

```bash
eas credentials
```

## Mettre à jour la version

### iOS

Modifier `app.config.ts` :

```typescript
const config: ExpoConfig = {
  version: "1.0.1", // Incrémenter
  ios: {
    buildNumber: "2", // Incrémenter
  },
};
```

### Android

Modifier `app.config.ts` :

```typescript
const config: ExpoConfig = {
  version: "1.0.1", // Incrémenter
  android: {
    versionCode: 2, // Incrémenter
  },
};
```

**Ou utiliser l'auto-increment** (déjà configuré dans eas.json) :

```bash
eas build --profile production --platform all --auto-submit
```

## Soumission aux stores

### App Store (iOS)

1. **Créer l'app sur App Store Connect** :
   - Aller sur [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
   - Créer une nouvelle app
   - Remplir les métadonnées (nom, description, screenshots)

2. **Soumettre le build** :
   ```bash
   eas submit --platform ios --latest
   ```

3. **Configurer dans App Store Connect** :
   - Ajouter les screenshots
   - Remplir la description
   - Ajouter l'URL de politique de confidentialité
   - Soumettre pour review

### Google Play (Android)

1. **Créer l'app sur Google Play Console** :
   - Aller sur [play.google.com/console](https://play.google.com/console)
   - Créer une nouvelle app
   - Remplir les métadonnées

2. **Configurer le service account** :
   - Créer un service account dans Google Cloud Console
   - Télécharger le fichier JSON
   - Placer dans `./google-play-service-account.json`

3. **Soumettre le build** :
   ```bash
   eas submit --platform android --latest
   ```

4. **Configurer dans Google Play Console** :
   - Ajouter les screenshots
   - Remplir la description
   - Compléter le questionnaire de contenu
   - Soumettre pour review

## Vérifier le statut des builds

```bash
# Lister tous les builds
eas build:list

# Voir les détails d'un build
eas build:view [BUILD_ID]
```

## Logs et debugging

```bash
# Voir les logs d'un build
eas build:view [BUILD_ID]

# Télécharger le build
eas build:download [BUILD_ID]
```

## Coûts

| Service | Coût |
|---------|------|
| EAS Build (plan gratuit) | 0$ (30 builds/mois) |
| Apple Developer Account | 99$/an |
| Google Play Console | 25$ (one-time) |

## Ressources

- [Documentation EAS Build](https://docs.expo.dev/build/introduction/)
- [Documentation EAS Submit](https://docs.expo.dev/submit/introduction/)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Google Play Policy Center](https://play.google.com/about/developer-content-policy/)

## Troubleshooting

### Erreur "No bundle identifier"

Vérifier que `bundleIdentifier` est bien défini dans `app.config.ts` :

```typescript
ios: {
  bundleIdentifier: "space.manus.safewalk.app.t20250119065400",
}
```

### Erreur "Invalid credentials"

Réinitialiser les credentials :

```bash
eas credentials
```

### Build échoue

Vérifier les logs :

```bash
eas build:view [BUILD_ID]
```

## Checklist avant soumission

- [ ] Version incrémentée dans `app.config.ts`
- [ ] Screenshots créés (5-8 par format)
- [ ] Description rédigée (FR + EN)
- [ ] Politique de confidentialité publiée
- [ ] URL de support configurée
- [ ] Build testé sur appareil réel
- [ ] Tous les tests passent (`pnpm test`)
- [ ] Aucune erreur TypeScript (`pnpm check`)
