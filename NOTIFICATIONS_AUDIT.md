# SafeWalk - Audit du Hardcode de Notifications

**Date:** 2026-02-26
**Statut:** Audit en cours

---

## 📊 Vue d'ensemble

Ce document identifie tous les messages hardcodés dispersés dans le code SafeWalk et propose une stratégie de refactorisation.

---

## 🔍 Audit par Fichier

### 1. app/home.tsx

#### Messages Identifiés:

```tsx
// Line ~111
setToastMessage('Configure un contact d\'urgence');

// Line ~162
<Text className="text-4xl font-bold text-foreground">
  SafeWalk
</Text>

// Line ~163
<Text className="text-base text-muted">
  Reste en sécurité, partout.
</Text>
```

**Problèmes:**

- ❌ Message d'erreur hardcodé dans le handler
- ❌ Textes de branding en dur
- ⚠️ Pas de contexte dynamique

**À Refactoriser:**

- `'Configure un contact d\'urgence'` → `notify('contact.missing')`

---

### 2. app/new-session.tsx

#### Messages Identifiés:

```tsx
// Line ~74
return {
  reason: 'Contact d\'urgence manquant',
  message: 'Ajoute un contact d\'urgence pour démarrer une sortie.',
  action: 'Aller aux Paramètres',
  ...
};

// Line ~81
return {
  reason: 'Numéro non vérifié',
  message: 'Vérifie ton numéro pour activer les alertes SMS.',
  action: 'Vérifier maintenant',
  ...
};

// Line ~91
return {
  reason: 'Crédits insuffisants',
  message: 'Tu as atteint la limite d\'aujourd\'hui. Ajoute des crédits pour continuer.',
  action: 'Ajouter des crédits',
  ...
};

// Line ~99
return {
  reason: 'Localisation désactivée',
  message: 'Active la localisation dans Paramètres pour partager ta position en cas d\'alerte.',
  action: 'Aller aux Paramètres',
  ...
};
```

**Problèmes:**

- ❌ Messages d'erreur/blocage hardcodés dans la logique
- ❌ Dupliqués (certains messages apparaissent ailleurs)
- ❌ Pas de gestion centralisée des raisons de blocage

**À Refactoriser:**

- Créer un système de blocages contextuels
- Centraliser les messages de raison/action

---

### 3. app/active-session.tsx

#### Messages Identifiés:

```tsx
// Line ~657
<Text className="text-xs text-error font-semibold">
  🚨 Alerte déclenchée ! Vos contacts d'urgence ont été notifiés.
</Text>

// Line ~705
Alert.alert('Limite atteinte', 'Tu as atteint la limite d\'alertes SOS pour aujourd\'hui.');

// Line ~707
Alert.alert('Erreur d\'envoi', 'Impossible d\'envoyer l\'alerte SOS. Réessaiera automatiquement.');

// Line ~709
Alert.alert('Erreur SOS', result.error || 'Erreur lors de l\'envoi de l\'alerte SOS.');

// Line ~721
Alert.alert(
  'Declencher SOS ?',
  'Etes-vous en danger ? Cette action alertera vos contacts d\'urgence.',
  ...
);

// Line ~748
Alert.alert(
  'Annuler la sortie ?',
  'Êtes-vous sûr de vouloir annuler cette sortie ?',
  ...
);
```

**Problèmes:**

- ❌ Messages d'alerte hardcodés dans les handlers
- ❌ Confirmations écrites en dur
- ❌ Pas de gestion centralisée des erreurs SOS

**À Refactoriser:**

- Centraliser les messages de confirmation
- Créer des templates pour les erreurs SOS
- Utiliser un système d'affichage unique

---

### 4. app/settings.tsx

#### Messages Identifiés:

```tsx
// Line ~90
setPhoneError('Format invalide. Utilisez +33 suivi de 9 chiffres (ex: +33612345678)');

// Line ~98
setToastMessage('Contact 1 sauvegardé');

// Line ~111
setToastMessage('Localisation activée');

// Line ~117
setToastMessage('Localisation désactivée');

// Line ~206
Alert.alert(
  'Supprimer toutes les données ?',
  'Cette action est irréversible.',
  ...
);
```

**Problèmes:**

- ❌ Messages de validation hardcodés
- ❌ Messages de succès hardcodés
- ❌ Confirmations écrites en dur

**À Refactoriser:**

- Centraliser les messages de validation
- Utiliser des clés pour les succès
- Créer des confirmations contextuelles

---

### 5. lib/services/trip-service.ts

#### Messages Identifiés (potentiels):

```tsx
// Besoin de vérifier les réponses d'erreur
// et les messages de statut
```

**À Analyser:**

- Messages d'erreur API
- Messages de statut de voyage
- Réponses de succès

---

### 6. lib/services/sms-service.ts

#### Messages Identifiés (potentiels):

```tsx
// Besoin de vérifier les messages d'envoi SMS
// et les erreurs Twilio
```

**À Analyser:**

- Messages d'envoi SMS
- Erreurs Twilio
- Statut de livraison

---

## 📈 Statistiques du Hardcode

| Catégorie             | Nombre  | Fichiers                    |
| --------------------- | ------- | --------------------------- |
| Messages Toast        | 5       | home, new-session, settings |
| Alertes (Alert.alert) | 6       | active-session, settings    |
| Textes de blocage     | 4       | new-session                 |
| Textes d'erreur       | 3+      | active-session, settings    |
| **Total**             | **18+** | **6**                       |

---

## 🎯 Problèmes Identifiés

### P0 - Critique

- ❌ Messages d'erreur dispersés dans les handlers
- ❌ Pas de source unique de vérité
- ❌ Difficile à maintenir et à traduire

### P1 - Important

- ❌ Dupliquation de messages (ex: "Contact d'urgence manquant")
- ❌ Pas de gestion centralisée des variables dynamiques
- ❌ Ton incohérent entre les messages

### P2 - Amélioration

- ⚠️ Pas de fallback pour les variables manquantes
- ⚠️ Pas de contexte utilisateur dans les messages
- ⚠️ Pas de système de niveaux de notification

---

## 🔑 Clés de Notifications Identifiées

### Voyage (Trip)

- `trip.started` - Sortie démarrée
- `trip.extended` - Sortie prolongée
- `trip.checked_in` - Check-in confirmé
- `trip.stopped` - Sortie arrêtée
- `trip.cancelled` - Sortie annulée

### Alertes (Alert)

- `alert.warning` - Alerte imminente
- `alert.sent` - Alerte envoyée
- `alert.failed` - Échec d'alerte
- `alert.quota_reached` - Quota atteint

### SOS

- `sos.sending` - SOS en cours d'envoi
- `sos.sent` - SOS envoyé
- `sos.failed` - Échec SOS
- `sos.quota_reached` - Quota SOS atteint

### Contact

- `contact.saved` - Contact sauvegardé
- `contact.deleted` - Contact supprimé
- `contact.missing` - Contact manquant
- `contact.invalid` - Contact invalide

### Authentification

- `auth.otp_required` - OTP requis
- `auth.otp_sent` - OTP envoyé
- `auth.otp_failed` - Échec OTP

### Crédits

- `credits.empty` - Crédits épuisés
- `credits.low` - Crédits faibles
- `credits.added` - Crédits ajoutés

### Permissions

- `permission.location_required` - Localisation requise
- `permission.notifications_required` - Notifications requises
- `permission.phone_required` - Téléphone requis

### Erreurs

- `error.network` - Erreur réseau
- `error.sms_failed` - Échec SMS
- `error.unknown` - Erreur inconnue

### SMS

- `sms.test_sent` - SMS de test envoyé
- `sms.test_failed` - Échec SMS de test

---

## 📋 Checklist de Refactorisation

### Phase 1: Audit (✅ En cours)

- [x] Identifier tous les messages hardcodés
- [x] Lister les clés de notifications
- [x] Documenter les problèmes

### Phase 2: Système Dynamique

- [ ] Créer le registre central (notifications.config.ts)
- [ ] Créer le service d'affichage (notification.service.ts)
- [ ] Implémenter la gestion des variables dynamiques
- [ ] Créer les templates pour chaque clé

### Phase 3: Refactorisation

- [ ] Refactoriser home.tsx
- [ ] Refactoriser new-session.tsx
- [ ] Refactoriser active-session.tsx
- [ ] Refactoriser settings.tsx
- [ ] Refactoriser les services

### Phase 4: Validation

- [ ] Tester chaque notification
- [ ] Valider les variables dynamiques
- [ ] Vérifier la cohérence des messages
- [ ] Documenter le système

---

## 🚀 Prochaines Étapes

1. **Créer le registre central** - notifications.config.ts
2. **Créer le service d'affichage** - notification.service.ts
3. **Refactoriser le code existant** - Écran par écran
4. **Valider et documenter** - Checklist de test

---

**Fin de l'audit**
