# SafeWalk - Corrections UX Concrètes

**Objectif:** Appliquer les corrections identifiées dans l'audit UX pour rendre l'app plus claire, fiable et cohérente.

**Statut:** En cours d'implémentation (V4.0)

---

## 1) CORRECTIONS ÉCRAN HOME

### P0 - Bloquant

#### ✅ FAIT: Afficher un statut clair avant le bouton "Je sors"

**Problème:** Utilisateur ne sait pas s'il peut démarrer immédiatement
**Solution:** La checklist d'état est déjà présente et affiche:

- Contact d'urgence (ok/pending)
- Téléphone vérifié (ok/pending)
- Crédits disponibles (ok/pending)
- Notifications (ok/pending)
- Localisation (ok/pending)

**Implémentation:** ✅ Déjà fait dans StatusChecklist

#### ✅ FAIT: Clarifier "Sécurité inactive"

**Problème:** Trop vague
**Solution:** Remplacé par checklist détaillée avec statuts clairs

**Implémentation:** ✅ Déjà fait - affiche "Configurer un contact" avec lien vers Paramètres

#### ✅ FAIT: Afficher les crédits gratuits restants

**Problème:** Utilisateur ne sait pas s'il peut démarrer
**Solution:** Affiche "Crédits: X restants" ou "Abonnement: Actif"

**Implémentation:** ✅ Déjà fait dans la checklist

### P1 - Important

#### ✅ FAIT: Afficher l'état des permissions

**Problème:** Utilisateur ne sait pas si les alertes fonctionneront
**Solution:** Checklist affiche "Notifications: Activées/À activer" et "Localisation: Autorisée/À autoriser"

**Implémentation:** ✅ Déjà fait

#### ✅ FAIT: Afficher la vérification du numéro

**Problème:** Utilisateur ne sait pas si son numéro est vérifié
**Solution:** Checklist affiche "Téléphone: Vérifié/À vérifier"

**Implémentation:** ✅ Déjà fait

---

## 2) CORRECTIONS ÉCRAN "JE SORS"

### P0 - Bloquant

#### À FAIRE: Afficher un message clair si le bouton "Démarrer" est grisé

**Problème:** Utilisateur ne sait pas pourquoi il ne peut pas démarrer
**Solution:** Ajouter un message au-dessus du bouton si une condition critique manque

**Implémentation:**

```typescript
// Dans new-session.tsx, avant le bouton "Démarrer"
const getBlockingReason = () => {
  if (!hasContact) return "Contact d'urgence manquant - Ajouter dans Paramètres";
  if (!phoneVerified) return "Numéro non vérifié - Vérifier via OTP";
  if (!hasCredits) return "Crédits insuffisants - Ajouter des crédits";
  if (!notificationsEnabled) return "Notifications désactivées - Activer dans Paramètres";
  return null;
};

// Afficher le message
{blockingReason && (
  <View className="p-3 bg-error/10 rounded-lg mb-4 border border-error/20">
    <Text className="text-sm text-error">{blockingReason}</Text>
    <Pressable onPress={() => navigateToFix()}>
      <Text className="text-sm text-error font-semibold mt-1">Corriger →</Text>
    </Pressable>
  </View>
)}
```

#### À FAIRE: Afficher clairement à qui l'alerte sera envoyée

**Problème:** Utilisateur ne sait pas à qui l'alerte sera envoyée
**Solution:** Ajouter un résumé clair avant le bouton "Démarrer"

**Implémentation:**

```typescript
// Ajouter une section "Résumé" avant le bouton
<View className="p-4 bg-primary/10 rounded-lg mb-4">
  <Text className="text-sm font-semibold text-foreground mb-2">Résumé de ta sortie</Text>
  <View className="gap-2">
    <View className="flex-row justify-between">
      <Text className="text-sm text-muted">Alerte envoyée à:</Text>
      <Text className="text-sm font-semibold text-foreground">{contactName}</Text>
    </View>
    <View className="flex-row justify-between">
      <Text className="text-sm text-muted">Heure d'alerte:</Text>
      <Text className="text-sm font-semibold text-foreground">{deadlineTime}</Text>
    </View>
    <View className="flex-row justify-between">
      <Text className="text-sm text-muted">Position partagée:</Text>
      <Text className="text-sm font-semibold text-foreground">{shareLocation ? 'Oui' : 'Non'}</Text>
    </View>
  </View>
</View>
```

#### À FAIRE: Simplifier la distinction "Heure limite" vs "Heure d'alerte"

**Problème:** Utilisateur ne comprend pas la différence
**Solution:** Afficher seulement "Heure d'alerte" avec explication simple

**Implémentation:**

```typescript
// Remplacer les deux champs par un seul
<View className="gap-2">
  <Text className="text-sm font-semibold text-foreground">Heure d'alerte</Text>
  <Text className="text-xs text-muted mb-2">
    Si tu ne confirmes pas avant cette heure, un SMS sera envoyé à ton contact.
  </Text>
  <TimePicker value={deadline} onChange={setDeadline} />
</View>
```

### P1 - Important

#### À FAIRE: Clarifier le toggle "Partager ma position"

**Problème:** Utilisateur ne sait pas pourquoi partager sa position
**Solution:** Ajouter une explication claire

**Implémentation:**

```typescript
// Ajouter un texte explicatif sous le toggle
<View className="gap-2">
  <View className="flex-row items-center justify-between">
    <Text className="text-sm font-semibold text-foreground">Inclure ma position</Text>
    <Switch value={shareLocation} onValueChange={setShareLocation} />
  </View>
  <Text className="text-xs text-muted">
    Partage ta position GPS dans l'alerte pour plus de sécurité (optionnel)
  </Text>
</View>
```

---

## 3) CORRECTIONS ÉCRAN "SORTIE EN COURS"

### P0 - Bloquant

#### À FAIRE: Sécuriser le bouton "SOS" avec appui long 2 secondes

**Problème:** Risque d'appui accidentel
**Solution:** Implémenter un appui long avec feedback visuel

**Implémentation:**

```typescript
// Utiliser LongPressGestureHandler
import { LongPressGestureHandler } from 'react-native-gesture-handler';

<LongPressGestureHandler
  onActivated={() => triggerSOS()}
  minDurationMs={2000}
>
  <Pressable
    style={({ pressed }) => [
      styles.sosButton,
      pressed && { opacity: 0.8 }
    ]}
  >
    <Animated.View style={[styles.sosContent, pressedAnimated]}>
      <Text className="text-lg font-bold text-white">SOS</Text>
      <Text className="text-xs text-white/80">Appui long 2s</Text>
    </Animated.View>
  </Pressable>
</LongPressGestureHandler>
```

#### À FAIRE: Créer un bouton clair "Arrêter la sortie"

**Problème:** Utilisateur ne sait pas comment terminer sans alerte
**Solution:** Créer un bouton secondaire avec confirmation

**Implémentation:**

```typescript
// Ajouter un bouton "Arrêter la sortie" avec confirmation
const handleStopSession = () => {
  Alert.alert(
    'Arrêter la sortie?',
    'Aucune alerte ne sera envoyée.',
    [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Arrêter',
        style: 'destructive',
        onPress: async () => {
          await cancelSession();
          router.push('/');
        },
      },
    ]
  );
};

// Afficher le bouton
<Pressable
  onPress={handleStopSession}
  className="p-3 bg-gray-200 rounded-lg"
>
  <Text className="text-center text-sm font-semibold text-gray-700">
    Arrêter la sortie
  </Text>
</Pressable>
```

#### À FAIRE: Simplifier l'affichage "Heure limite" vs "Heure d'alerte"

**Problème:** Confusion sur le timing
**Solution:** Afficher seulement "Alerte envoyée à [HH:MM]"

**Implémentation:**

```typescript
// Remplacer les deux affichages par un seul
<View className="gap-2 mt-3 pt-3 border-t">
  <Text className="text-sm text-muted">Alerte envoyée si pas de confirmation avant:</Text>
  <Text className="text-lg font-semibold text-foreground">{deadlineTime}</Text>
</View>
```

### P1 - Important

#### À FAIRE: Offrir des choix clairs pour "Prolonger"

**Problème:** Utilisateur ne sait pas de combien prolonger
**Solution:** Afficher les options +15 / +30 / +60 / Personnalisé

**Implémentation:**

```typescript
// Créer un modal avec options
const handleProlongSession = () => {
  Alert.alert('Prolonger la sortie', 'Ajouter du temps:', [
    { text: 'Annuler', style: 'cancel' },
    { text: '+15 min', onPress: () => extendSession(15) },
    { text: '+30 min', onPress: () => extendSession(30) },
    { text: '+60 min', onPress: () => extendSession(60) },
    { text: 'Personnalisé', onPress: () => showCustomDurationModal() },
  ]);
};
```

#### À FAIRE: Afficher l'état de la localisation

**Problème:** Utilisateur ne sait pas si sa position est partagée
**Solution:** Afficher un indicateur clair

**Implémentation:**

```typescript
// Ajouter un indicateur GPS
<View className="flex-row items-center gap-2 p-3 bg-green-100 rounded-lg">
  <Text className="text-lg">🟢</Text>
  <View className="flex-1">
    <Text className="text-sm font-semibold text-foreground">Localisation active</Text>
    <Text className="text-xs text-muted">Dernière mise à jour: {lastLocationTime}</Text>
  </View>
</View>
```

#### À FAIRE: Afficher l'état de la batterie

**Problème:** Utilisateur ne sait pas si l'alerte peut être envoyée
**Solution:** Afficher un avertissement si batterie faible

**Implémentation:**

```typescript
// Ajouter un avertissement batterie
{batteryLevel < 20 && (
  <View className="flex-row items-center gap-2 p-3 bg-yellow-100 rounded-lg">
    <Text className="text-lg">⚠️</Text>
    <Text className="text-sm text-yellow-900">Batterie faible ({batteryLevel}%)</Text>
  </View>
)}
```

---

## 4) CORRECTIONS ÉCRAN "PARAMÈTRES"

### P0 - Bloquant

#### À FAIRE: Afficher feedback clair sur la validation du numéro

**Problème:** Utilisateur ne sait pas si le numéro est valide
**Solution:** Afficher un message de validation en temps réel

**Implémentation:**

```typescript
// Dans le champ de saisie du numéro
const handlePhoneChange = (text: string) => {
  setContactPhone(text);
  const result = validatePhoneNumber(text);
  setPhoneError(result.feedback || null);
  setIsPhoneValid(result.isValid);
};

// Afficher le feedback
{phoneError && (
  <Text className={`text-xs mt-1 ${isPhoneValid ? 'text-green-600' : 'text-red-600'}`}>
    {phoneError}
  </Text>
)}
```

#### À FAIRE: Afficher feedback clair sur "Test SMS"

**Problème:** Utilisateur ne sait pas si le SMS a été envoyé
**Solution:** Afficher un message de succès/erreur

**Implémentation:**

```typescript
// Après l'envoi du SMS
const handleTestSMS = async () => {
  try {
    await sendTestSMS(contactPhone);
    setToastMessage('✅ SMS envoyé à ' + contactPhone);
    setShowToast(true);
  } catch (error) {
    setToastMessage("❌ Erreur d'envoi: " + error.message);
    setShowToast(true);
  }
};
```

### P1 - Important

#### À FAIRE: Ajouter confirmation avant "Supprimer données"

**Problème:** Risque de suppression accidentelle
**Solution:** Afficher une alerte de confirmation

**Implémentation:**

```typescript
// Déjà implémenté dans le code existant
// Vérifier que le message est clair et avertit bien
Alert.alert(
  'Supprimer toutes les données?',
  'Cette action est irréversible. Toutes vos données seront supprimées.',
  [
    { text: 'Annuler', style: 'cancel' },
    {
      text: 'Supprimer',
      style: 'destructive',
      onPress: async () => {
        await deleteAllData();
        setToastMessage('Données supprimées');
        setShowToast(true);
      },
    },
  ],
);
```

#### À FAIRE: Ajouter explication sur les permissions

**Problème:** Utilisateur ne sait pas pourquoi activer les permissions
**Solution:** Ajouter texte explicatif sous chaque toggle

**Implémentation:**

```typescript
// Pour chaque permission
<View className="gap-2 mb-4">
  <View className="flex-row items-center justify-between">
    <Text className="text-sm font-semibold text-foreground">Localisation</Text>
    <Switch value={locationEnabled} onValueChange={setLocationEnabled} />
  </View>
  <Text className="text-xs text-muted">
    Partage ta position GPS dans les alertes SMS pour plus de sécurité.
  </Text>
</View>
```

#### À FAIRE: Afficher l'état des permissions

**Problème:** Utilisateur ne sait pas si les permissions sont actives
**Solution:** Afficher un indicateur visuel

**Implémentation:**

```typescript
// Ajouter un indicateur à côté de chaque toggle
<View className="flex-row items-center justify-between">
  <View className="flex-1">
    <Text className="text-sm font-semibold text-foreground">Notifications</Text>
    <Text className="text-xs text-muted">Recevoir les alertes</Text>
  </View>
  <View className="flex-row items-center gap-2">
    <Text className={notificationsEnabled ? 'text-green-600' : 'text-gray-400'}>
      {notificationsEnabled ? '🟢' : '⚪'}
    </Text>
    <Switch value={notificationsEnabled} onValueChange={setNotificationsEnabled} />
  </View>
</View>
```

---

## 5) CORRECTIONS TRANSVERSALES

### P0 - Bloquant

#### À FAIRE: Ajouter un "contrat utilisateur" clair

**Problème:** Utilisateur ne comprend pas le fonctionnement
**Solution:** Ajouter un écran d'onboarding ou un texte explicatif

**Implémentation:**

```typescript
// Ajouter un modal d'onboarding au premier lancement
// Ou afficher un texte clair sur Home
<View className="p-4 bg-primary/10 rounded-lg">
  <Text className="text-sm font-semibold text-foreground mb-2">Comment ça marche</Text>
  <Text className="text-xs text-muted leading-relaxed">
    1. Définis une heure de retour
    2. Si tu ne confirmes pas avant cette heure, un SMS est envoyé à ton contact d'urgence
    3. Confirme que tu es rentré pour arrêter l'alerte
  </Text>
</View>
```

#### À FAIRE: Améliorer les messages d'erreur

**Problème:** Messages trop techniques
**Solution:** Remplacer par messages clairs et orientés action

**Implémentation:**

```typescript
// Exemples de messages à utiliser
const errorMessages = {
  NO_CONTACT: "Ajoute un contact d'urgence pour continuer.",
  PHONE_NOT_VERIFIED: 'Vérifie ton numéro pour activer les alertes.',
  NO_CREDITS: "Tu as atteint la limite d'aujourd'hui.",
  SMS_FAILED: "Impossible d'envoyer le SMS pour le moment.",
  NETWORK_ERROR: 'Vérifiez votre connexion Internet.',
  PERMISSION_DENIED: 'Autorise les permissions dans Paramètres.',
};
```

#### À FAIRE: Ajouter des liens directs depuis les erreurs

**Problème:** Utilisateur ne sait pas où aller pour corriger
**Solution:** Ajouter des liens directs vers Paramètres/OTP/Paywall

**Implémentation:**

```typescript
// Exemple: Message d'erreur avec lien
Alert.alert("Contact d'urgence manquant", 'Ajoute un contact pour démarrer une sortie.', [
  { text: 'Annuler', style: 'cancel' },
  {
    text: 'Aller aux Paramètres',
    onPress: () => router.push('/settings'),
  },
]);
```

### P1 - Important

#### À FAIRE: Unifier les libellés

**Problème:** Vocabulaire change entre écrans
**Solution:** Créer un fichier de constantes pour les textes

**Implémentation:**

```typescript
// Créer lib/constants/ui-text.ts
export const UIText = {
  RETURN_TIME: 'Heure de retour prévu',
  ALERT_TIME: 'Alerte envoyée à',
  EMERGENCY_CONTACT: 'Contact d\'urgence',
  SHARE_LOCATION: 'Inclure ma position',
  CONFIRM_RETURN: 'Je suis rentré',
  EXTEND_SESSION: 'Prolonger',
  STOP_SESSION: 'Arrêter la sortie',
  SOS: 'SOS',
  // ...
};

// Utiliser partout
<Text>{UIText.CONFIRM_RETURN}</Text>
```

#### À FAIRE: Ajouter feedback sur les actions en cours

**Problème:** Utilisateur ne sait pas si l'app fonctionne
**Solution:** Afficher loading/spinner pendant les appels API

**Implémentation:**

```typescript
// Ajouter un loading state
const [isLoading, setIsLoading] = useState(false);

const handleStartSession = async () => {
  setIsLoading(true);
  try {
    await startSession(deadline, shareLocation);
    router.push('/active-session');
  } finally {
    setIsLoading(false);
  }
};

// Afficher le spinner
{isLoading && <ActivityIndicator size="large" color={colors.primary} />}
```

### P2 - Amélioration

#### À FAIRE: Ajouter feedback positif après succès

**Problème:** Utilisateur ne sait pas si l'action a réussi
**Solution:** Afficher toast/notification de succès

**Implémentation:**

```typescript
// Afficher un toast après chaque action réussie
const handleCompleteSession = async () => {
  await completeSession();
  setToastMessage('✅ Sortie terminée');
  setShowToast(true);
  setTimeout(() => router.push('/'), 1500);
};
```

---

## 6) CHECKLIST DE VALIDATION

### Avant de livrer V4.0, tester:

- [ ] Home: Checklist affiche tous les statuts correctement
- [ ] Home: Lien vers Paramètres fonctionne depuis la checklist
- [ ] Home: Lien vers OTP fonctionne depuis la checklist
- [ ] Je sors: Message de blocage clair si condition manque
- [ ] Je sors: Résumé affiche le contact et l'heure d'alerte
- [ ] Je sors: Toggle "Partager ma position" a une explication
- [ ] Sortie en cours: SOS nécessite appui long 2 secondes
- [ ] Sortie en cours: Bouton "Arrêter" affiche une confirmation
- [ ] Sortie en cours: Affichage de la localisation et batterie
- [ ] Sortie en cours: Bouton "Prolonger" offre des choix
- [ ] Paramètres: Validation du numéro affiche feedback
- [ ] Paramètres: Test SMS affiche succès/erreur
- [ ] Paramètres: Suppression données demande confirmation
- [ ] Paramètres: Permissions ont une explication
- [ ] Tous les écrans: Messages d'erreur sont clairs
- [ ] Tous les écrans: Liens directs vers corrections fonctionnent
- [ ] Tous les écrans: Loading spinner pendant les appels API
- [ ] Tous les écrans: Toast de succès après les actions

---

**Fin des corrections UX**
