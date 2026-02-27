# Guide de Génération des Screenshots - SafeWalk

## Formats requis pour les stores

### App Store (iOS)

| Appareil                 | Résolution     | Ratio  |
| ------------------------ | -------------- | ------ |
| iPhone 6.7" (15 Pro Max) | 1290 x 2796 px | 9:19.5 |
| iPhone 6.5" (11 Pro Max) | 1242 x 2688 px | 9:19.5 |
| iPhone 5.5" (8 Plus)     | 1242 x 2208 px | 9:16   |
| iPad Pro 12.9"           | 2048 x 2732 px | 3:4    |

### Google Play (Android)

| Type       | Résolution             | Ratio |
| ---------- | ---------------------- | ----- |
| Phone      | 1080 x 1920 px minimum | 9:16  |
| 7" Tablet  | 1200 x 1920 px         | 5:8   |
| 10" Tablet | 1600 x 2560 px         | 5:8   |

## Screenshots à créer

### 1. Écran Home (Accueil)

**Fichier** : `01-home.png`

**Contenu** :

- Titre "SafeWalk"
- Sous-titre "Reste en sécurité, partout."
- Hero Card violette avec rocket "Je sors"
- Status Card (Sécurité inactive)
- Conseil du jour

**Texte marketing (overlay)** :

> "Rentre en sécurité  
> Alerte automatique si tu ne confirmes pas ton retour"

### 2. Écran New Session (Je sors)

**Fichier** : `02-new-session.png`

**Contenu** :

- Titre "Je sors"
- Card "Heure limite" (ex: 02:30)
- Card "Où vas-tu ?" (optionnel)
- Card "Contact d'urgence" (Marie +33 6 12 34 56 78)
- Card "Localisation" (toggle ON)
- Bouton "Démarrer"

**Texte marketing (overlay)** :

> "Définis ton heure de retour  
> Ajoute un contact de confiance"

### 3. Écran Active Session (Sortie en cours)

**Fichier** : `03-active-session.png`

**Contenu** :

- Titre "Sortie en cours"
- Timer géant "01:45:23" (temps restant)
- "Heure limite : 02:30"
- "Tolérance : 15 min"
- Bouton vert "Je suis rentré"
- Bouton "+15 min"
- Bouton danger "Annuler ta sortie"

**Texte marketing (overlay)** :

> "Confirme ton retour en un clic  
> Ou ajoute 15 minutes si besoin"

### 4. Écran Settings (Paramètres)

**Fichier** : `04-settings.png`

**Contenu** :

- Card "Ton prénom" (Ben)
- Card "Contact d'urgence" (Marie +33 6 12 34 56 78)
- Segmented control "Tolérance" (10/15/30)
- Toggle "Localisation GPS"
- Bouton danger "Supprimer mes données"

**Texte marketing (overlay)** :

> "Personnalise ta sécurité  
> Toutes les données restent sur ton téléphone"

### 5. Écran Alert Sent (Alerte envoyée)

**Fichier** : `05-alert-sent.png`

**Contenu** :

- Titre "🚨 Alerte envoyée"
- Recap : "Marie a été prévenue par SMS"
- Position GPS (si disponible)
- Bouton "Je vais bien"
- Bouton "Appeler Marie"
- Bouton "Appeler 112"

**Texte marketing (overlay)** :

> "Alerte automatique avec ta position GPS  
> Tes proches sont prévenus immédiatement"

## Méthode 1 : Capture manuelle (Recommandé)

### Sur iPhone (Expo Go)

1. **Installer Expo Go** :

   ```bash
   # Scanner le QR code dans l'interface Preview
   # Ou télécharger depuis l'App Store
   ```

2. **Ouvrir SafeWalk** :
   - Scanner le QR code
   - Naviguer vers chaque écran
   - Prendre des screenshots (Volume + Power)

3. **Transférer les screenshots** :
   - AirDrop vers Mac
   - Ou via iCloud Photos

### Sur Android (Expo Go)

1. **Installer Expo Go** :

   ```bash
   # Scanner le QR code dans l'interface Preview
   # Ou télécharger depuis Google Play
   ```

2. **Ouvrir SafeWalk** :
   - Scanner le QR code
   - Naviguer vers chaque écran
   - Prendre des screenshots (Volume Down + Power)

3. **Transférer les screenshots** :
   - USB vers ordinateur
   - Ou via Google Photos

## Méthode 2 : Simulateur iOS

```bash
# Lancer le simulateur
pnpm ios

# Naviguer vers chaque écran
# Prendre des screenshots : Cmd + S

# Les screenshots sont sauvegardés sur le Bureau
```

## Méthode 3 : Émulateur Android

```bash
# Lancer l'émulateur
pnpm android

# Naviguer vers chaque écran
# Prendre des screenshots : Bouton caméra dans l'émulateur

# Les screenshots sont dans ~/Android/sdk/screenshots/
```

## Post-traitement

### Redimensionner pour les stores

```bash
# Installer ImageMagick
brew install imagemagick  # macOS
sudo apt install imagemagick  # Linux

# Redimensionner pour iPhone 6.7"
convert 01-home.png -resize 1290x2796 screenshots/ios-6.7/01-home.png

# Redimensionner pour Android
convert 01-home.png -resize 1080x1920 screenshots/android/01-home.png
```

### Ajouter du texte marketing (optionnel)

Utiliser un outil comme :

- **Figma** (gratuit) : figma.com
- **Canva** (gratuit) : canva.com
- **Photoshop** (payant)

**Template recommandé** :

- Font : SF Pro Display (iOS) ou Roboto (Android)
- Taille : 48-64px
- Couleur : Blanc avec ombre portée
- Position : Haut ou bas de l'écran

## Checklist finale

- [ ] 5 screenshots créés (Home, New Session, Active Session, Settings, Alert Sent)
- [ ] Redimensionnés pour iPhone 6.7" (1290 x 2796 px)
- [ ] Redimensionnés pour Android (1080 x 1920 px)
- [ ] Texte marketing ajouté (optionnel mais recommandé)
- [ ] Screenshots sauvegardés dans `/screenshots/ios/` et `/screenshots/android/`
- [ ] Nommés correctement (01-home.png, 02-new-session.png, etc.)

## Ressources

- [App Store Screenshot Specifications](https://developer.apple.com/help/app-store-connect/reference/screenshot-specifications)
- [Google Play Screenshot Guidelines](https://support.google.com/googleplay/android-developer/answer/9866151)
- [Figma](https://figma.com) - Design tool gratuit
- [ImageMagick](https://imagemagick.org) - Redimensionnement en ligne de commande
