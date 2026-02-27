# SafeWalk - Guide d'Intégration du Système de Notifications dans les Services

**Version:** V5.4
**Date:** 2026-02-26
**Statut:** ✅ Guide Complet et Prêt pour Implémentation

---

## 📋 Vue d'Ensemble

Ce guide explique comment intégrer le système centralisé de notifications dans les services (trip-service.ts, sms-service.ts, api-client.ts) pour centraliser la gestion des erreurs et des succès.

### Objectifs

- ✅ Centraliser les messages d'erreur et de succès
- ✅ Réduire la duplication de code
- ✅ Améliorer la cohérence des messages
- ✅ Faciliter la maintenance et la traduction

---

## 🏗️ Architecture

### Flux Actuel (Avant)

```
Service (trip-service.ts)
  ↓
Retourne error/success
  ↓
Écran (new-session.tsx)
  ↓
Affiche notification manuelle
```

### Flux Optimisé (Après)

```
Service (trip-service.ts)
  ↓
Appelle notify() pour afficher notification
  ↓
Retourne error/success
  ↓
Écran (new-session.tsx)
  ↓
Utilise le code d'erreur pour logique UI
```

### Avantages

1. **Notifications affichées immédiatement** au niveau du service
2. **Pas de duplication** entre services et écrans
3. **Cohérence garantie** pour tous les utilisateurs
4. **Facilité de maintenance** - un seul endroit à modifier

---

## 📁 Services à Refactoriser

### 1. trip-service.ts (Priorité HAUTE)

**Fonctions:** startTrip(), checkin(), extendTrip(), sendTestSms(), triggerSOS()
**Notifications à ajouter:** 10+
**Code à supprimer:** ~30 lignes

#### Changements Clés

##### startTrip() - Erreurs

```typescript
// Avant: Message hardcodé dans le retour
if (errorCode === 'no_credits') {
  return {
    success: false,
    error: 'Crédits insuffisants',
    errorCode: 'no_credits',
  };
}

// Après: Notification centralisée
if (errorCode === 'no_credits') {
  notify('credits.empty');
  return {
    success: false,
    error: 'Crédits insuffisants',
    errorCode: 'no_credits',
  };
}
```

##### startTrip() - Succès

```typescript
// Avant: Pas de notification
logger.info('Trip started successfully', { tripId: data?.tripId });
return data as StartTripOutput;

// Après: Notification de succès
logger.info('Trip started successfully', { tripId: data?.tripId });
notify('trip.started', {
  variables: { deadline: new Date(data?.deadline).toLocaleTimeString('fr-FR') },
});
return data as StartTripOutput;
```

##### Rate Limit (429)

```typescript
// Avant: Message hardcodé
if (error.status === 429) {
  return {
    success: false,
    error: 'Trop de requêtes. Veuillez réessayer plus tard.',
    errorCode: 'rate_limit_exceeded',
  };
}

// Après: Notification avec variable
if (error.status === 429) {
  notify('error.rate_limited', {
    variables: { seconds: errorData.retryAfter || 60 },
  });
  return {
    success: false,
    error: 'Trop de requêtes. Veuillez réessayer plus tard.',
    errorCode: 'rate_limit_exceeded',
  };
}
```

### 2. sms-service.ts (Priorité HAUTE)

**Fonctions:** sendEmergencySMS(), sendFollowUpAlertSMS()
**Notifications à ajouter:** 5+
**Code à supprimer:** ~15 lignes

#### Changements Clés

```typescript
// Avant: Pas de notification
if (result.ok) {
  logger.debug('✅ SMS envoyé:', result.sid);
  return result;
}

// Après: Notification de succès
if (result.ok) {
  logger.debug('✅ SMS envoyé:', result.sid);
  notify('sms.sent', {
    variables: { phone: phone },
  });
  return result;
}

// Avant: Pas de notification d'erreur
if (result.error) {
  logger.error('❌ Erreur SMS:', result.error);
  return result;
}

// Après: Notification d'erreur
if (result.error) {
  logger.error('❌ Erreur SMS:', result.error);
  notify('error.sms_failed');
  return result;
}
```

### 3. api-client.ts (Priorité MOYENNE)

**Fonctions:** checkHealth(), makeRequest()
**Notifications à ajouter:** 3+
**Code à supprimer:** ~10 lignes

#### Changements Clés

```typescript
// Avant: Pas de notification
if (!response.ok) {
  logger.error('API error:', response.status);
  return { success: false, error: response.statusText };
}

// Après: Notification d'erreur
if (!response.ok) {
  logger.error('API error:', response.status);
  if (response.status === 429) {
    notify('error.rate_limited');
  } else if (response.status >= 500) {
    notify('error.server');
  } else {
    notify('error.api');
  }
  return { success: false, error: response.statusText };
}
```

---

## 🎯 Plan d'Implémentation

### Étape 1: Préparer les Services

- [ ] Lire le guide de refactorisation (trip-service.ts.refactored)
- [ ] Identifier tous les messages d'erreur/succès
- [ ] Mapper les messages aux clés de notification

### Étape 2: Refactoriser trip-service.ts

- [ ] Ajouter l'import `notify`
- [ ] Refactoriser startTrip() - erreurs (5 changements)
- [ ] Refactoriser startTrip() - succès (1 changement)
- [ ] Refactoriser checkin() - succès (1 changement)
- [ ] Refactoriser extendTrip() - succès (1 changement)
- [ ] Refactoriser sendTestSms() - erreurs/succès (4 changements)
- [ ] Refactoriser triggerSOS() - erreurs/succès (2 changements)
- [ ] Tester chaque fonction

### Étape 3: Refactoriser sms-service.ts

- [ ] Ajouter l'import `notify`
- [ ] Refactoriser sendEmergencySMS() (2 changements)
- [ ] Refactoriser sendFollowUpAlertSMS() (2 changements)
- [ ] Tester chaque fonction

### Étape 4: Refactoriser api-client.ts

- [ ] Ajouter l'import `notify`
- [ ] Refactoriser checkHealth() (1 changement)
- [ ] Refactoriser makeRequest() (3 changements)
- [ ] Tester chaque fonction

### Étape 5: Validation

- [ ] Tester toutes les notifications
- [ ] Vérifier que les codes d'erreur sont toujours retournés
- [ ] Vérifier que les logs sont toujours présents
- [ ] Vérifier la cohérence des messages

---

## 📊 Statistiques Attendues

### Code Supprimé

| Service         | Avant   | Après   | Supprimé |
| --------------- | ------- | ------- | -------- |
| trip-service.ts | 350     | 320     | 30       |
| sms-service.ts  | 200     | 185     | 15       |
| api-client.ts   | 150     | 140     | 10       |
| **TOTAL**       | **700** | **645** | **55**   |

### Notifications Ajoutées

| Service         | Erreurs | Succès | Total  |
| --------------- | ------- | ------ | ------ |
| trip-service.ts | 7       | 4      | 11     |
| sms-service.ts  | 2       | 2      | 4      |
| api-client.ts   | 3       | 0      | 3      |
| **TOTAL**       | **12**  | **6**  | **18** |

---

## 🔍 Détails des Changements par Service

### trip-service.ts

#### startTrip()

```typescript
// 1. Erreur: Téléphone non vérifié
notify('auth.otp_required');

// 2. Erreur: Crédits insuffisants
notify('credits.empty');

// 3. Erreur: Quota atteint
notify('alert.quota_reached');

// 4. Erreur: Twilio échoué
notify('sms.failed_retry');

// 5. Erreur: Rate limit
notify('error.rate_limited', { variables: { seconds: 60 } });

// 6. Succès
notify('trip.started', { variables: { deadline: '14:30' } });
```

#### checkin()

```typescript
// 1. Erreur: Rate limit
notify('error.rate_limited', { variables: { seconds: 60 } });

// 2. Succès
notify('trip.checked_in');
```

#### extendTrip()

```typescript
// 1. Succès
notify('trip.extended', { variables: { minutes: 15 } });
```

#### sendTestSms()

```typescript
// 1. Erreur: Crédits insuffisants
notify('credits.empty');

// 2. Erreur: Quota atteint
notify('alert.quota_reached');

// 3. Erreur: Twilio échoué
notify('sms.test_failed');

// 4. Succès
notify('sms.test_sent', { variables: { phone: '+33612345678' } });
```

#### triggerSOS()

```typescript
// 1. Erreur: Twilio échoué
notify('error.sos_failed');

// 2. Succès
notify('alert.sent', { variables: { contactName: 'Mom' } });
```

### sms-service.ts

#### sendEmergencySMS()

```typescript
// 1. Succès
notify('sms.sent', { variables: { phone: '+33612345678' } });

// 2. Erreur
notify('error.sms_failed');
```

#### sendFollowUpAlertSMS()

```typescript
// 1. Succès
notify('sms.sent', { variables: { phone: '+33612345678' } });

// 2. Erreur
notify('error.sms_failed');
```

### api-client.ts

#### checkHealth()

```typescript
// 1. Erreur: Rate limit
notify('error.rate_limited');

// 2. Erreur: Serveur
notify('error.server');

// 3. Erreur: API
notify('error.api');
```

---

## ✅ Checklist d'Implémentation

### trip-service.ts

- [ ] Ajouter l'import notify
- [ ] Refactoriser startTrip() - Erreur téléphone
- [ ] Refactoriser startTrip() - Erreur crédits
- [ ] Refactoriser startTrip() - Erreur quota
- [ ] Refactoriser startTrip() - Erreur Twilio
- [ ] Refactoriser startTrip() - Erreur rate limit
- [ ] Refactoriser startTrip() - Succès
- [ ] Refactoriser checkin() - Erreur rate limit
- [ ] Refactoriser checkin() - Succès
- [ ] Refactoriser extendTrip() - Succès
- [ ] Refactoriser sendTestSms() - Erreurs/succès
- [ ] Refactoriser triggerSOS() - Erreurs/succès
- [ ] Tester tous les changements

### sms-service.ts

- [ ] Ajouter l'import notify
- [ ] Refactoriser sendEmergencySMS() - Succès
- [ ] Refactoriser sendEmergencySMS() - Erreur
- [ ] Refactoriser sendFollowUpAlertSMS() - Succès
- [ ] Refactoriser sendFollowUpAlertSMS() - Erreur
- [ ] Tester tous les changements

### api-client.ts

- [ ] Ajouter l'import notify
- [ ] Refactoriser checkHealth() - Erreurs
- [ ] Refactoriser makeRequest() - Erreurs
- [ ] Tester tous les changements

### Validation

- [ ] Tester toutes les notifications
- [ ] Vérifier que les codes d'erreur sont toujours retournés
- [ ] Vérifier que les logs sont toujours présents
- [ ] Vérifier la cohérence des messages
- [ ] Vérifier que les variables dynamiques fonctionnent

---

## 🚀 Prochaines Étapes

1. **Implémenter les changements** dans trip-service.ts (priorité HAUTE)
2. **Implémenter les changements** dans sms-service.ts (priorité HAUTE)
3. **Implémenter les changements** dans api-client.ts (priorité MOYENNE)
4. **Tester chaque notification** en suivant la checklist
5. **Créer checkpoint V5.4** avec intégration complète
6. **Documenter pour les développeurs** les bonnes pratiques

---

## 💡 Conseils d'Implémentation

1. **Implémenter un service à la fois** pour éviter les conflits
2. **Tester après chaque changement** pour valider rapidement
3. **Garder les codes d'erreur** dans les retours pour la logique UI
4. **Garder les logs** pour le debugging
5. **Utiliser git diff** pour vérifier les changements

---

**Fin du guide d'intégration**
