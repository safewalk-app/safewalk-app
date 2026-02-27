# SafeWalk - Guide des Labels ARIA pour l'Accessibilité

**Version:** V4.6
**Date:** 2026-02-26

---

## 📋 Vue d'ensemble

Ce guide fournit des instructions pour ajouter des labels ARIA (Accessible Rich Internet Applications) à tous les composants de SafeWalk. Les labels ARIA améliorent l'accessibilité en fournissant des descriptions textuelles aux lecteurs d'écran.

---

## 🎯 Propriétés ARIA Principales

### 1. accessibilityLabel

Fournit une description textuelle pour un élément. Utilisé par les lecteurs d'écran pour annoncer l'élément.

**Syntaxe React Native:**

```tsx
<TouchableOpacity accessibilityLabel="Bouton Démarrer la sortie" onPress={handleStart}>
  <Text>Commencer</Text>
</TouchableOpacity>
```

**Bonnes pratiques:**

- Être concis et descriptif (< 50 caractères)
- Inclure le type d'élément (Bouton, Champ, etc.)
- Utiliser le français clair et accessible
- Éviter les abréviations

### 2. accessibilityHint

Fournit une indication supplémentaire sur comment utiliser un élément.

**Syntaxe React Native:**

```tsx
<TouchableOpacity
  accessibilityLabel="Bouton SOS"
  accessibilityHint="Appui long 2 secondes pour déclencher l'alerte"
  onPress={handleSOS}
>
  <Text>SOS</Text>
</TouchableOpacity>
```

**Bonnes pratiques:**

- Fournir des instructions d'utilisation
- Expliquer les gestes spéciaux
- Être concis (< 100 caractères)

### 3. accessibilityRole

Définit le rôle sémantique d'un élément (button, checkbox, radio, etc.).

**Syntaxe React Native:**

```tsx
<View accessible={true} accessibilityRole="button" accessibilityLabel="Bouton Démarrer">
  <Text>Commencer</Text>
</View>
```

**Rôles disponibles:**

- `button` - Bouton
- `checkbox` - Case à cocher
- `radio` - Bouton radio
- `switch` - Commutateur
- `text` - Texte
- `link` - Lien
- `header` - En-tête
- `image` - Image

### 4. accessible

Indique si un élément est accessible aux lecteurs d'écran.

**Syntaxe React Native:**

```tsx
<View accessible={true}>
  <Text>Contenu accessible</Text>
</View>
```

**Valeurs:**

- `true` - Élément accessible
- `false` - Élément non accessible (par défaut)

### 5. accessibilityState

Décrit l'état actuel d'un élément (disabled, selected, checked, etc.).

**Syntaxe React Native:**

```tsx
<TouchableOpacity
  accessible={true}
  accessibilityRole="button"
  accessibilityLabel="Bouton Démarrer"
  accessibilityState={{ disabled: isLoading }}
>
  <Text>{isLoading ? 'Chargement...' : 'Commencer'}</Text>
</TouchableOpacity>
```

**États disponibles:**

- `disabled` - Élément désactivé
- `selected` - Élément sélectionné
- `checked` - Case cochée
- `busy` - Élément en cours de traitement
- `expanded` - Élément étendu

---

## 🏠 Écran Home - Labels ARIA

### Bouton "Je sors"

```tsx
<TouchableOpacity
  accessible={true}
  accessibilityRole="button"
  accessibilityLabel="Bouton Je sors"
  accessibilityHint="Appuyez pour démarrer une nouvelle sortie"
  onPress={handleStartSession}
>
  <Text>Je sors</Text>
</TouchableOpacity>
```

### Checklist d'État

```tsx
<View
  accessible={true}
  accessibilityRole="text"
  accessibilityLabel="Contact configuré"
>
  <Text>Contact d'alerte configuré</Text>
</View>

<View
  accessible={true}
  accessibilityRole="text"
  accessibilityLabel="Téléphone configuré"
>
  <Text>Numéro de téléphone configuré</Text>
</View>

<View
  accessible={true}
  accessibilityRole="text"
  accessibilityLabel="Crédits disponibles"
  accessibilityHint="Vous avez suffisamment de crédits pour utiliser l'app"
>
  <Text>Crédits disponibles</Text>
</View>
```

### Conseil du Jour

```tsx
<View
  accessible={true}
  accessibilityRole="text"
  accessibilityLabel="Conseil du jour"
  accessibilityHint={adviceText}
>
  <Text>{adviceText}</Text>
</View>
```

---

## 🚀 Écran "Je sors" - Labels ARIA

### Sélecteur d'Heure

```tsx
<View
  accessible={true}
  accessibilityRole="text"
  accessibilityLabel="Heure de retour"
  accessibilityHint={`Défini à ${returnTime}`}
>
  <Text>Heure de retour: {returnTime}</Text>
</View>
```

### Sélecteur de Contact

```tsx
<View
  accessible={true}
  accessibilityRole="text"
  accessibilityLabel="Contact d'alerte"
  accessibilityHint={`Sélectionné: ${selectedContact}`}
>
  <Text>Contact: {selectedContact}</Text>
</View>
```

### Bouton "Commencer"

```tsx
<TouchableOpacity
  accessible={true}
  accessibilityRole="button"
  accessibilityLabel="Bouton Commencer"
  accessibilityHint="Appuyez pour démarrer la sortie"
  accessibilityState={{ disabled: isLoading }}
  onPress={handleStart}
>
  <Text>{isLoading ? 'Démarrage...' : 'Commencer'}</Text>
</TouchableOpacity>
```

### Messages d'Erreur

```tsx
<View
  accessible={true}
  accessibilityRole="alert"
  accessibilityLabel="Erreur"
  accessibilityHint={errorMessage}
>
  <Text>{errorMessage}</Text>
</View>
```

---

## 🎯 Écran "Sortie en cours" - Labels ARIA

### Affichage du Statut

```tsx
<View
  accessible={true}
  accessibilityRole="text"
  accessibilityLabel="Sortie en cours"
  accessibilityHint={`Heure de retour: ${returnTime}, Temps restant: ${timeRemaining}`}
>
  <Text>Sortie en cours</Text>
</View>
```

### Indicateur GPS

```tsx
<View
  accessible={true}
  accessibilityRole="text"
  accessibilityLabel={`Statut GPS: ${gpsStatus}`}
  accessibilityHint={`Dernière mise à jour: ${lastUpdate}`}
>
  <Text>{gpsStatus}</Text>
</View>
```

### Bouton "Je suis rentré"

```tsx
<TouchableOpacity
  accessible={true}
  accessibilityRole="button"
  accessibilityLabel="Bouton Je suis rentré"
  accessibilityHint="Appuyez pour confirmer votre retour"
  accessibilityState={{ disabled: isLoading }}
  onPress={handleReturn}
>
  <Text>{isLoading ? 'Confirmation...' : 'Je suis rentré'}</Text>
</TouchableOpacity>
```

### Bouton "+ 15 min"

```tsx
<TouchableOpacity
  accessible={true}
  accessibilityRole="button"
  accessibilityLabel="Bouton Prolonger 15 minutes"
  accessibilityHint="Appuyez pour ajouter 15 minutes à votre sortie"
  accessibilityState={{ disabled: isLoading }}
  onPress={handleExtend}
>
  <Text>{isLoading ? 'Prolongation...' : '+ 15 min'}</Text>
</TouchableOpacity>
```

### Bouton SOS

```tsx
<TouchableOpacity
  accessible={true}
  accessibilityRole="button"
  accessibilityLabel="Bouton SOS"
  accessibilityHint="Appui long 2 secondes pour déclencher l'alerte d'urgence"
  accessibilityState={{ disabled: isLoading }}
  onLongPress={handleSOS}
>
  <Text>SOS</Text>
</TouchableOpacity>
```

### Bouton "Arrêter la sortie"

```tsx
<TouchableOpacity
  accessible={true}
  accessibilityRole="button"
  accessibilityLabel="Bouton Arrêter la sortie"
  accessibilityHint="Appuyez pour terminer la sortie sans confirmer le retour"
  accessibilityState={{ disabled: isLoading }}
  onPress={handleCancel}
>
  <Text>{isLoading ? 'Arrêt...' : 'Arrêter la sortie'}</Text>
</TouchableOpacity>
```

---

## ⚙️ Écran Paramètres - Labels ARIA

### Champ Contact

```tsx
<TextInput
  accessible={true}
  accessibilityLabel="Champ Contact d'alerte"
  accessibilityHint="Entrez le nom du contact d'alerte"
  accessibilityRole="text"
  placeholder="Nom du contact"
  value={contact}
  onChangeText={setContact}
/>
```

### Champ Téléphone

```tsx
<TextInput
  accessible={true}
  accessibilityLabel="Champ Numéro de téléphone"
  accessibilityHint="Entrez votre numéro de téléphone au format E.164 (ex: +33612345678)"
  accessibilityRole="text"
  placeholder="+33612345678"
  value={phone}
  onChangeText={setPhone}
  keyboardType="phone-pad"
/>
```

### Commutateur Notifications

```tsx
<Switch
  accessible={true}
  accessibilityLabel="Commutateur Notifications"
  accessibilityHint="Activez pour recevoir des notifications"
  accessibilityRole="switch"
  accessibilityState={{ checked: notificationsEnabled }}
  value={notificationsEnabled}
  onValueChange={setNotificationsEnabled}
/>
```

### Commutateur Localisation

```tsx
<Switch
  accessible={true}
  accessibilityLabel="Commutateur Localisation"
  accessibilityHint="Activez pour partager votre localisation"
  accessibilityRole="switch"
  accessibilityState={{ checked: locationEnabled }}
  value={locationEnabled}
  onValueChange={setLocationEnabled}
/>
```

### Bouton "Test SMS"

```tsx
<TouchableOpacity
  accessible={true}
  accessibilityRole="button"
  accessibilityLabel="Bouton Test SMS"
  accessibilityHint="Appuyez pour envoyer un SMS de test"
  accessibilityState={{ disabled: isLoading || !phone }}
  onPress={handleTestSMS}
>
  <Text>{isLoading ? 'Envoi...' : 'Test SMS'}</Text>
</TouchableOpacity>
```

---

## 📝 Composant Réutilisable avec ARIA

```tsx
interface AccessibleButtonProps {
  label: string;
  hint?: string;
  disabled?: boolean;
  onPress: () => void;
  children: React.ReactNode;
}

export function AccessibleButton({
  label,
  hint,
  disabled = false,
  onPress,
  children,
}: AccessibleButtonProps) {
  return (
    <TouchableOpacity
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
    >
      {children}
    </TouchableOpacity>
  );
}

// Utilisation
<AccessibleButton
  label="Bouton Démarrer"
  hint="Appuyez pour démarrer la sortie"
  onPress={handleStart}
>
  <Text>Commencer</Text>
</AccessibleButton>;
```

---

## ✅ Checklist d'Implémentation

### Écran Home

- [ ] Bouton "Je sors" - accessibilityLabel + accessibilityHint
- [ ] Checklist d'état - accessibilityLabel pour chaque élément
- [ ] Conseil du jour - accessibilityLabel + accessibilityHint

### Écran "Je sors"

- [ ] Sélecteur d'heure - accessibilityLabel + accessibilityHint
- [ ] Sélecteur de contact - accessibilityLabel + accessibilityHint
- [ ] Bouton "Commencer" - accessibilityLabel + accessibilityHint + accessibilityState
- [ ] Messages d'erreur - accessibilityRole="alert"

### Écran "Sortie en cours"

- [ ] Affichage du statut - accessibilityLabel + accessibilityHint
- [ ] Indicateur GPS - accessibilityLabel + accessibilityHint
- [ ] Bouton "Je suis rentré" - accessibilityLabel + accessibilityHint + accessibilityState
- [ ] Bouton "+ 15 min" - accessibilityLabel + accessibilityHint + accessibilityState
- [ ] Bouton SOS - accessibilityLabel + accessibilityHint + accessibilityState
- [ ] Bouton "Arrêter la sortie" - accessibilityLabel + accessibilityHint + accessibilityState

### Écran Paramètres

- [ ] Champ Contact - accessibilityLabel + accessibilityHint
- [ ] Champ Téléphone - accessibilityLabel + accessibilityHint
- [ ] Commutateur Notifications - accessibilityLabel + accessibilityHint + accessibilityState
- [ ] Commutateur Localisation - accessibilityLabel + accessibilityHint + accessibilityState
- [ ] Bouton "Test SMS" - accessibilityLabel + accessibilityHint + accessibilityState

---

## 🧪 Test des Labels ARIA

### Avec VoiceOver (iOS)

1. **Activer VoiceOver**
   - Paramètres → Accessibilité → VoiceOver → Activer

2. **Tester chaque élément**
   - Appuyer une fois pour sélectionner
   - VoiceOver devrait annoncer: `[accessibilityLabel], [accessibilityRole]`
   - Balayer vers le haut avec deux doigts pour entendre l'hint

### Avec TalkBack (Android)

1. **Activer TalkBack**
   - Paramètres → Accessibilité → TalkBack → Activer

2. **Tester chaque élément**
   - Appuyer une fois pour sélectionner
   - TalkBack devrait annoncer: `[accessibilityLabel], [accessibilityRole]`
   - Balayer vers le bas avec deux doigts pour entendre l'hint

---

## 📚 Ressources

### Documentation Officielle

- [React Native Accessibility](https://reactnative.dev/docs/accessibility)
- [WCAG 2.1 - 4.1.3 Name, Role, Value](https://www.w3.org/WAI/WCAG21/Understanding/name-role-value.html)
- [Apple Accessibility Guidelines](https://developer.apple.com/design/human-interface-guidelines/accessibility)
- [Android Accessibility Guidelines](https://developer.android.com/guide/topics/ui/accessibility)

### Outils de Test

- [Accessibility Scanner (Android)](https://play.google.com/store/apps/details?id=com.google.android.apps.accessibility.auditor)
- [VoiceOver (iOS)](https://www.apple.com/accessibility/voiceover/)
- [TalkBack (Android)](https://support.google.com/accessibility/android/answer/6283677)

---

## 🎯 Prochaines Étapes

1. **Implémenter les labels ARIA** - Ajouter accessibilityLabel et accessibilityHint à tous les éléments
2. **Tester avec VoiceOver/TalkBack** - Valider que tous les labels sont annoncés correctement
3. **Ajouter des rôles sémantiques** - Utiliser accessibilityRole pour clarifier le type d'élément
4. **Documenter les résultats** - Créer un rapport de test d'accessibilité

---

**Fin du guide ARIA**
