# Plan de Test Détaillé - SafeWalk SMS

**Version** : 1.0  
**Date** : 23 janvier 2026  
**Auteur** : Manus AI  
**Objectif** : Valider la fonctionnalité d'envoi de SMS sur des appareils réels via Expo Go

---

## Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Prérequis](#prérequis)
3. [Configuration de l'environnement de test](#configuration-de-lenvironnement-de-test)
4. [Scénarios de test](#scénarios-de-test)
5. [Procédures de test détaillées](#procédures-de-test-détaillées)
6. [Critères de validation](#critères-de-validation)
7. [Résolution des problèmes](#résolution-des-problèmes)
8. [Rapport de test](#rapport-de-test)

---

## Vue d'ensemble

Ce plan de test couvre l'ensemble des fonctionnalités d'envoi de SMS de SafeWalk, incluant les SMS d'alerte automatiques, les SMS de relance, les SMS de confirmation et le bouton SOS d'urgence. L'objectif est de valider que tous les SMS sont envoyés correctement, au bon moment, avec le bon contenu, et sans spam ni duplication.

### Fonctionnalités à tester

SafeWalk envoie **trois types de SMS** aux contacts d'urgence configurés :

| Type de SMS | Déclencheur | Délai | Contenu |
|-------------|-------------|-------|---------|
| **SMS d'alerte** | Deadline expirée sans confirmation | Deadline + 15 min | Nom utilisateur, heure limite, note optionnelle, position GPS |
| **SMS de relance** | Pas de confirmation après alerte | Deadline + 25 min (10 min après alerte) | Nom utilisateur, position GPS mise à jour |
| **SMS de confirmation** | Utilisateur confirme "Je vais bien" | Immédiat après confirmation | Nom utilisateur, confirmation de sécurité |

De plus, l'application dispose d'un **bouton SOS** qui envoie immédiatement un SMS d'alerte d'urgence avec la position GPS actuelle.

---

## Prérequis

### Matériel requis

- **1 smartphone de test** (iOS ou Android) avec Expo Go installé
- **2 smartphones de réception** pour jouer le rôle des contacts d'urgence
- Connexion internet stable (Wi-Fi ou données mobiles)
- Accès au réseau mobile pour recevoir les SMS

### Accès et comptes

- **Compte Twilio actif** avec crédits suffisants (minimum 10 SMS pour les tests)
- **Numéro Twilio configuré** : `+33939035429`
- **Variables d'environnement** configurées dans le projet :
  - `TWILIO_ACCOUNT_SID`
  - `TWILIO_AUTH_TOKEN`
  - `TWILIO_PHONE_NUMBER`
  - `EXPO_PUBLIC_API_URL` (URL publique du serveur)

### Vérification préalable

Avant de commencer les tests, vérifier que :

1. Le serveur Express est accessible publiquement via l'URL Manus
2. Les 100+ tests unitaires passent (`pnpm test`)
3. Le projet compile sans erreurs TypeScript (`pnpm check`)
4. L'application se lance correctement sur Expo Go

---

## Configuration de l'environnement de test

### Étape 1 : Préparer les numéros de test

Vous aurez besoin de **2 numéros de téléphone réels** pour recevoir les SMS de test. Ces numéros doivent être au format français (`+33` suivi de 9 chiffres).

**Exemple de configuration** :

- **Contact 1** : Marie Dupont - `+33612345678`
- **Contact 2** : Jean Martin - `+33698765432`

> **Important** : Assurez-vous que ces numéros peuvent recevoir des SMS depuis le numéro Twilio `+33939035429`. Certains opérateurs bloquent les SMS provenant de numéros étrangers ou de services VoIP.

### Étape 2 : Vérifier le serveur

Ouvrez un terminal et vérifiez que le serveur Express est en cours d'exécution :

```bash
cd /home/ubuntu/safewalk-app
pnpm dev
```

Le serveur doit afficher :

```
[api] server listening on port 3000
```

Vérifiez que l'URL publique est accessible en ouvrant dans un navigateur :

```
https://3000-i8rqllu1a9mlzen76xc6u-b9cd8fd2.us2.manus.computer/api/health
```

Vous devriez voir une réponse JSON indiquant que le serveur est opérationnel.

### Étape 3 : Lancer l'application sur Expo Go

1. Ouvrez l'application **Expo Go** sur votre smartphone de test
2. Scannez le QR code affiché dans le terminal (commande `pnpm qr` si nécessaire)
3. L'application SafeWalk devrait se charger en quelques secondes

### Étape 4 : Configurer le profil utilisateur

Dans l'application SafeWalk :

1. Allez dans l'onglet **Paramètres** (icône ⚙️)
2. Remplissez les informations suivantes :
   - **Prénom** : Votre prénom de test (ex: "Thomas")
   - **Contact 1** : Nom et numéro du premier contact d'urgence
   - **Contact 2** : Nom et numéro du deuxième contact d'urgence (optionnel)
3. Vérifiez que les numéros affichent une **coche verte** ✓ (validation réussie)
4. Les paramètres sont sauvegardés automatiquement

---

## Scénarios de test

Ce plan couvre **8 scénarios de test** critiques pour valider l'ensemble des fonctionnalités SMS.

| ID | Scénario | Priorité | Durée estimée |
|----|----------|----------|---------------|
| **T1** | SMS d'alerte automatique à la deadline | 🔴 Critique | 20 minutes |
| **T2** | SMS de relance 10 minutes après l'alerte | 🔴 Critique | 30 minutes |
| **T3** | SMS de confirmation après "Je vais bien" | 🟡 Haute | 20 minutes |
| **T4** | Bouton SOS d'urgence | 🔴 Critique | 5 minutes |
| **T5** | Extension de deadline (+15 min) | 🟡 Haute | 25 minutes |
| **T6** | Envoi à 2 contacts simultanément | 🟡 Haute | 20 minutes |
| **T7** | SMS avec note personnalisée | 🟢 Moyenne | 20 minutes |
| **T8** | Anti-spam : blocage des SMS en double | 🔴 Critique | 10 minutes |

**Durée totale estimée** : ~2h30 (en incluant les temps d'attente)

---

## Procédures de test détaillées

### T1 : SMS d'alerte automatique à la deadline

**Objectif** : Vérifier que le SMS d'alerte est envoyé automatiquement quand la deadline expire sans confirmation.

**Durée** : 20 minutes (5 min de session + 15 min de tolérance)

#### Procédure

1. **Préparer la session**
   - Ouvrir SafeWalk sur le smartphone de test
   - Aller dans l'onglet **Accueil**
   - Définir une durée de **5 minutes**
   - Ajouter une note optionnelle : "Test SMS automatique"
   - Appuyer sur **"Démarrer la session"**

2. **Observer le timer**
   - Le timer doit afficher **05:00** et commencer le décompte
   - La barre de progression doit se remplir progressivement
   - L'écran doit afficher l'heure limite (ex: "Retour prévu à 14:05")

3. **Attendre l'expiration de la deadline**
   - Ne pas toucher l'application pendant 5 minutes
   - À **00:00**, le timer passe en rouge et affiche "Tolérance : 15:00"
   - Une **notification push** doit apparaître : "⚠️ Petit check - Tout va bien ? 😊"

4. **Attendre la fin de la tolérance**
   - Attendre encore **15 minutes** sans confirmer
   - À **00:00** de tolérance, une **notification d'alerte** doit apparaître : "🚨 Oups… on a prévenu ton contact"
   - L'écran doit afficher : "Oups… 😬 - On a prévenu ton contact."

5. **Vérifier la réception du SMS**
   - Sur les **2 smartphones de réception**, vérifier qu'un SMS a été reçu
   - Le SMS doit provenir du numéro **+33939035429**
   - Le contenu doit correspondre au format suivant :

```
SafeWalk 🫶
Thomas n'a pas encore confirmé qu'il est bien rentré (limite 14:05 + 15 min).
"Test SMS automatique"
📍 https://maps.google.com/?q=48.8566,2.3522
Tu peux lui passer un petit appel ?
```

#### Critères de succès

- ✅ Le SMS est reçu sur **les 2 contacts** dans les **60 secondes** suivant la fin de tolérance
- ✅ Le SMS contient le **prénom de l'utilisateur** (ex: "Thomas")
- ✅ Le SMS contient l'**heure limite** au format HH:MM (ex: "14:05")
- ✅ Le SMS contient la **note personnalisée** entre guillemets
- ✅ Le SMS contient un **lien Google Maps** avec les coordonnées GPS
- ✅ Le ton du SMS est **friendly et rassurant** (emojis 🫶 et 📍)

#### Logs à vérifier

Dans le terminal du serveur, vérifier les logs suivants :

```
🚨 [triggerAlert] Début de triggerAlert
📋 [triggerAlert] Settings: { firstName: "Thomas", ... }
📞 [triggerAlert] Numéros de téléphone: ["+33612345678", "+33698765432"]
📤 [triggerAlert] Appel sendFriendlyAlertSMS avec: { contacts: [...], userName: "Thomas", ... }
✅ SMS envoyé avec succès à +33612345678 (SID: SM...)
✅ SMS envoyé avec succès à +33698765432 (SID: SM...)
```

---

### T2 : SMS de relance 10 minutes après l'alerte

**Objectif** : Vérifier que le SMS de relance est envoyé 10 minutes après l'alerte si l'utilisateur ne confirme toujours pas.

**Durée** : 30 minutes (5 min session + 15 min tolérance + 10 min relance)

#### Procédure

1. **Reprendre depuis T1**
   - Suivre la procédure T1 jusqu'à l'envoi du SMS d'alerte
   - **Ne pas confirmer** "Je vais bien"

2. **Attendre 10 minutes supplémentaires**
   - Laisser l'application ouverte sans interaction
   - Le timer doit continuer à afficher "Oups… 😬"
   - Après **10 minutes** (soit 25 min après le début de la session), un nouveau SMS doit être envoyé

3. **Vérifier la réception du SMS de relance**
   - Sur les **2 smartphones de réception**, vérifier qu'un **deuxième SMS** a été reçu
   - Le SMS doit provenir du même numéro **+33939035429**
   - Le contenu doit correspondre au format suivant :

```
SafeWalk 🫶
Toujours pas de confirmation de Thomas.
Si tu peux, réessaye de l'appeler 🙏
📍 https://maps.google.com/?q=48.8566,2.3522
```

#### Critères de succès

- ✅ Le SMS de relance est reçu **exactement 10 minutes** après le premier SMS d'alerte
- ✅ Le SMS contient le **prénom de l'utilisateur**
- ✅ Le SMS contient un **lien Google Maps** avec la position GPS mise à jour
- ✅ Le ton du SMS est **bienveillant** (emoji 🙏)
- ✅ **Un seul SMS de relance** est envoyé (pas de spam)

#### Logs à vérifier

```
📤 Envoi SMS de relance...
✅ SMS de relance envoyé avec succès à +33612345678 (SID: SM...)
✅ SMS de relance envoyé avec succès à +33698765432 (SID: SM...)
```

---

### T3 : SMS de confirmation après "Je vais bien"

**Objectif** : Vérifier que le SMS de confirmation est envoyé quand l'utilisateur confirme son retour après une alerte.

**Durée** : 20 minutes (5 min session + 15 min tolérance + confirmation)

#### Procédure

1. **Reprendre depuis T1**
   - Suivre la procédure T1 jusqu'à l'envoi du SMS d'alerte
   - Attendre que le SMS d'alerte soit reçu sur les contacts

2. **Confirmer "Je vais bien"**
   - Sur le smartphone de test, appuyer sur le bouton **"Je vais bien ✅"**
   - Un message de confirmation doit apparaître : "Session terminée"
   - L'écran doit revenir à l'accueil

3. **Vérifier la réception du SMS de confirmation**
   - Sur les **2 smartphones de réception**, vérifier qu'un **nouveau SMS** a été reçu
   - Le SMS doit provenir du numéro **+33939035429**
   - Le contenu doit correspondre au format suivant :

```
SafeWalk ✅
Thomas vient de confirmer que tout va bien 🙂
Désolé pour l'inquiétude !
```

#### Critères de succès

- ✅ Le SMS de confirmation est reçu **dans les 60 secondes** après avoir appuyé sur "Je vais bien"
- ✅ Le SMS contient le **prénom de l'utilisateur**
- ✅ Le ton du SMS est **rassurant** (emoji ✅ et 🙂)
- ✅ Le SMS de confirmation est envoyé **uniquement si une alerte a été déclenchée** (pas de SMS si l'utilisateur confirme avant la deadline)

#### Logs à vérifier

```
✅ [confirmCheckIn] Envoi SMS de confirmation...
✅ SMS de confirmation envoyé avec succès à +33612345678 (SID: SM...)
✅ SMS de confirmation envoyé avec succès à +33698765432 (SID: SM...)
```

---

### T4 : Bouton SOS d'urgence

**Objectif** : Vérifier que le bouton SOS envoie immédiatement un SMS d'alerte avec la position GPS actuelle.

**Durée** : 5 minutes

#### Procédure

1. **Démarrer une session**
   - Ouvrir SafeWalk sur le smartphone de test
   - Définir une durée de **10 minutes** (pour avoir le temps de tester)
   - Appuyer sur **"Démarrer la session"**

2. **Activer le bouton SOS**
   - Sur l'écran de session active, repérer le **bouton SOS rouge** en bas
   - Appuyer sur le bouton **"🚨 SOS URGENCE"**
   - Une notification doit apparaître : "🚨 ALERTE SOS DÉCLENCHÉE"

3. **Vérifier la réception du SMS**
   - Sur les **2 smartphones de réception**, vérifier qu'un SMS a été reçu **immédiatement**
   - Le SMS doit provenir du numéro **+33939035429**
   - Le contenu doit correspondre au format d'alerte (identique à T1)

#### Critères de succès

- ✅ Le SMS est reçu **dans les 30 secondes** après avoir appuyé sur SOS
- ✅ Le SMS contient la **position GPS actuelle** (mise à jour au moment du clic)
- ✅ Le bouton SOS fonctionne **même avant la deadline**
- ✅ Un seul SMS est envoyé (pas de spam même si l'utilisateur clique plusieurs fois)

#### Logs à vérifier

```
🚨 Déclenchement SOS pour session: session_xxx
📍 Position capturée pour SOS: { latitude: 48.8566, longitude: 2.3522 }
📤 Envoi SOS avec données: { sessionId, userId, latitude, longitude }
✅ Réponse SOS: { success: true }
```

---

### T5 : Extension de deadline (+15 min)

**Objectif** : Vérifier que l'extension de deadline fonctionne correctement et reporte l'envoi du SMS.

**Durée** : 25 minutes (5 min session + 15 min extension + 5 min vérification)

#### Procédure

1. **Démarrer une session courte**
   - Définir une durée de **5 minutes**
   - Appuyer sur **"Démarrer la session"**

2. **Attendre l'expiration de la deadline**
   - Attendre que le timer atteigne **00:00**
   - La période de tolérance (15 min) doit commencer

3. **Ajouter une extension**
   - Appuyer sur le bouton **"+15 min"** en bas de l'écran
   - Un toast doit apparaître : "✅ +15 minutes ajoutées"
   - Le timer doit afficher la nouvelle heure limite (ex: "Retour prévu à 14:20")

4. **Vérifier que le SMS n'est pas envoyé**
   - Attendre la fin de la **première période de tolérance** (15 min)
   - **Aucun SMS ne doit être envoyé** car la deadline a été étendue
   - Le timer doit continuer normalement

5. **Attendre la nouvelle deadline**
   - Attendre encore **15 minutes** (nouvelle période de tolérance)
   - À la fin de cette période, le SMS d'alerte doit être envoyé

#### Critères de succès

- ✅ Le bouton "+15 min" ajoute correctement 15 minutes à la deadline
- ✅ Le toast de confirmation s'affiche avec la nouvelle heure limite
- ✅ Aucun SMS n'est envoyé pendant la période d'extension
- ✅ Le SMS d'alerte est envoyé à la fin de la **nouvelle** période de tolérance
- ✅ L'utilisateur peut ajouter jusqu'à **3 extensions** maximum

---

### T6 : Envoi à 2 contacts simultanément

**Objectif** : Vérifier que les SMS sont envoyés correctement aux 2 contacts d'urgence configurés.

**Durée** : 20 minutes

#### Procédure

1. **Configurer 2 contacts**
   - Dans les Paramètres, vérifier que **2 contacts** sont configurés :
     - Contact 1 : Marie Dupont - `+33612345678`
     - Contact 2 : Jean Martin - `+33698765432`

2. **Déclencher un SMS d'alerte**
   - Suivre la procédure T1 pour déclencher un SMS d'alerte

3. **Vérifier la réception sur les 2 contacts**
   - Vérifier que **les 2 smartphones** reçoivent le SMS
   - Les SMS doivent être reçus **simultanément** (écart < 10 secondes)
   - Le contenu doit être **identique** sur les 2 téléphones

#### Critères de succès

- ✅ Les 2 contacts reçoivent le SMS d'alerte
- ✅ Les 2 contacts reçoivent le SMS de relance (si applicable)
- ✅ Les 2 contacts reçoivent le SMS de confirmation (si applicable)
- ✅ Les SMS sont envoyés **simultanément** (pas de délai significatif)
- ✅ Le contenu est **identique** pour les 2 contacts

---

### T7 : SMS avec note personnalisée

**Objectif** : Vérifier que la note personnalisée est bien incluse dans le SMS d'alerte.

**Durée** : 20 minutes

#### Procédure

1. **Démarrer une session avec note**
   - Définir une durée de **5 minutes**
   - Dans le champ "Note (optionnelle)", saisir : **"Soirée chez Paul, retour en métro"**
   - Appuyer sur **"Démarrer la session"**

2. **Attendre l'envoi du SMS d'alerte**
   - Suivre la procédure T1 pour déclencher le SMS d'alerte

3. **Vérifier la présence de la note**
   - Sur les smartphones de réception, vérifier que le SMS contient :

```
SafeWalk 🫶
Thomas n'a pas encore confirmé qu'il est bien rentré (limite 14:05 + 15 min).
"Soirée chez Paul, retour en métro"
📍 https://maps.google.com/?q=48.8566,2.3522
Tu peux lui passer un petit appel ?
```

#### Critères de succès

- ✅ La note personnalisée est **présente entre guillemets** dans le SMS
- ✅ La note est **exactement celle saisie** par l'utilisateur (pas de modification)
- ✅ Si aucune note n'est saisie, le SMS ne contient **pas de ligne vide** ou de guillemets vides

---

### T8 : Anti-spam - Blocage des SMS en double

**Objectif** : Vérifier que le système anti-spam empêche l'envoi de SMS en double.

**Durée** : 10 minutes

#### Procédure

1. **Tester le spam sur le bouton SOS**
   - Démarrer une session
   - Appuyer **3 fois rapidement** sur le bouton SOS (< 5 secondes entre chaque clic)
   - Vérifier sur les smartphones de réception

2. **Vérifier les logs anti-spam**
   - Dans le terminal du serveur, vérifier les logs suivants :

```
🚨 Déclenchement SOS pour session: session_xxx
✅ SMS envoyé avec succès (premier clic)
🚫 [SOS] SMS bloqué par anti-spam (deuxième clic)
🚫 [SOS] SMS bloqué par anti-spam (troisième clic)
```

3. **Attendre 60 secondes**
   - Attendre **60 secondes** (intervalle minimum)
   - Appuyer à nouveau sur le bouton SOS
   - Le SMS doit être envoyé normalement

#### Critères de succès

- ✅ Un seul SMS est envoyé malgré les **3 clics rapides**
- ✅ Les logs affichent **"SMS bloqué par anti-spam"** pour les clics suivants
- ✅ Après **60 secondes**, un nouveau SMS peut être envoyé
- ✅ Le système anti-spam fonctionne pour **tous les types de SMS** (alerte, relance, SOS)

---

## Critères de validation

Pour que les tests soient considérés comme **réussis**, les critères suivants doivent être validés :

### Critères fonctionnels

| Critère | Description | Statut |
|---------|-------------|--------|
| **F1** | Tous les SMS sont reçus dans les délais attendus | ☐ |
| **F2** | Le contenu des SMS est correct (prénom, heure, note, GPS) | ☐ |
| **F3** | Les SMS sont envoyés aux 2 contacts configurés | ☐ |
| **F4** | Le système anti-spam empêche les SMS en double | ☐ |
| **F5** | Le bouton SOS fonctionne immédiatement | ☐ |
| **F6** | L'extension de deadline reporte l'envoi du SMS | ☐ |
| **F7** | Le SMS de confirmation est envoyé après "Je vais bien" | ☐ |

### Critères de qualité

| Critère | Description | Statut |
|---------|-------------|--------|
| **Q1** | Le ton des SMS est friendly et rassurant | ☐ |
| **Q2** | Les liens Google Maps sont cliquables et corrects | ☐ |
| **Q3** | Les emojis s'affichent correctement sur tous les téléphones | ☐ |
| **Q4** | Aucun SMS en double n'est envoyé (anti-spam) | ☐ |
| **Q5** | Les logs serveur sont détaillés et permettent le débogage | ☐ |

### Critères de performance

| Critère | Description | Statut |
|---------|-------------|--------|
| **P1** | SMS d'alerte reçu en < 60 secondes après la deadline | ☐ |
| **P2** | SMS de relance reçu exactement 10 min après l'alerte | ☐ |
| **P3** | SMS de confirmation reçu en < 60 secondes après "Je vais bien" | ☐ |
| **P4** | Bouton SOS envoie le SMS en < 30 secondes | ☐ |

---

## Résolution des problèmes

### Problème 1 : Aucun SMS reçu

**Symptômes** : Les SMS ne sont pas reçus sur les smartphones de réception.

**Causes possibles** :

1. **Numéro Twilio non vérifié** : Vérifier que le numéro `+33939035429` est actif sur le compte Twilio
2. **Crédits Twilio insuffisants** : Vérifier le solde du compte Twilio
3. **Numéro de réception bloqué** : Certains opérateurs bloquent les SMS depuis des numéros VoIP
4. **Variables d'environnement incorrectes** : Vérifier `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`

**Solution** :

```bash
# Vérifier les variables d'environnement
cd /home/ubuntu/safewalk-app
cat .env | grep TWILIO

# Tester l'envoi SMS manuellement via l'API Twilio
curl -X POST https://api.twilio.com/2010-04-01/Accounts/$TWILIO_ACCOUNT_SID/Messages.json \
  --data-urlencode "From=+33939035429" \
  --data-urlencode "To=+33612345678" \
  --data-urlencode "Body=Test SafeWalk" \
  -u $TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN
```

### Problème 2 : SMS reçus en double

**Symptômes** : Les contacts reçoivent plusieurs fois le même SMS.

**Causes possibles** :

1. **Système anti-spam désactivé** : Le garde-fou `canSendSMS()` n'est pas appelé
2. **Ref non initialisé** : Les refs `alertSMSRef` ou `followUpSMSRef` ne sont pas correctement gérés
3. **Timer en boucle** : Le `setInterval` est appelé plusieurs fois

**Solution** :

Vérifier les logs dans le terminal :

```
🚫 [Anti-spam] SMS bloqué pour "alert". Dernier envoi il y a 0s (min: 60s)
```

Si ce log n'apparaît pas, le système anti-spam n'est pas activé. Vérifier que `canSendSMS()` est bien appelé dans :
- `lib/context/app-context.tsx` (triggerAlert)
- `app/active-session.tsx` (follow-up SMS)
- `hooks/use-sos.ts` (bouton SOS)

### Problème 3 : Position GPS incorrecte

**Symptômes** : Le lien Google Maps pointe vers une mauvaise position ou affiche "Position indisponible".

**Causes possibles** :

1. **Permissions GPS refusées** : L'application n'a pas accès à la localisation
2. **GPS désactivé** : Le GPS du smartphone est éteint
3. **Signal GPS faible** : Le smartphone est à l'intérieur ou dans une zone sans signal

**Solution** :

1. Vérifier les permissions dans les Paramètres du smartphone :
   - **iOS** : Réglages > SafeWalk > Localisation > "Toujours" ou "Lorsque l'app est active"
   - **Android** : Paramètres > Applications > SafeWalk > Autorisations > Localisation > "Toujours autoriser"

2. Activer le GPS dans les paramètres du smartphone

3. Tester en extérieur pour un meilleur signal GPS

### Problème 4 : Serveur inaccessible

**Symptômes** : L'application affiche "Erreur réseau" ou "Impossible de contacter le serveur".

**Causes possibles** :

1. **Serveur Express arrêté** : Le serveur n'est plus en cours d'exécution
2. **URL publique expirée** : L'URL Manus a changé après un redémarrage
3. **Firewall bloquant** : Le réseau bloque les connexions vers le serveur

**Solution** :

```bash
# Vérifier que le serveur est en cours d'exécution
cd /home/ubuntu/safewalk-app
pnpm dev

# Vérifier l'URL publique dans .env
cat .env | grep EXPO_PUBLIC_API_URL

# Tester l'accès au serveur depuis un navigateur
curl https://3000-i8rqllu1a9mlzen76xc6u-b9cd8fd2.us2.manus.computer/api/health
```

---

## Rapport de test

À la fin des tests, remplir le rapport suivant pour documenter les résultats.

### Informations générales

| Champ | Valeur |
|-------|--------|
| **Date du test** | _________________ |
| **Testeur** | _________________ |
| **Version de l'application** | V1.25 |
| **Smartphone de test** | _________________ (iOS/Android) |
| **Numéros de réception** | Contact 1 : _________________ <br> Contact 2 : _________________ |

### Résultats des scénarios

| Scénario | Statut | Commentaires |
|----------|--------|--------------|
| **T1** : SMS d'alerte automatique | ☐ Réussi ☐ Échoué | _________________ |
| **T2** : SMS de relance | ☐ Réussi ☐ Échoué | _________________ |
| **T3** : SMS de confirmation | ☐ Réussi ☐ Échoué | _________________ |
| **T4** : Bouton SOS | ☐ Réussi ☐ Échoué | _________________ |
| **T5** : Extension de deadline | ☐ Réussi ☐ Échoué | _________________ |
| **T6** : Envoi à 2 contacts | ☐ Réussi ☐ Échoué | _________________ |
| **T7** : SMS avec note | ☐ Réussi ☐ Échoué | _________________ |
| **T8** : Anti-spam | ☐ Réussi ☐ Échoué | _________________ |

### Problèmes rencontrés

| Problème | Gravité | Solution appliquée |
|----------|---------|-------------------|
| _________________ | ☐ Bloquant ☐ Majeur ☐ Mineur | _________________ |
| _________________ | ☐ Bloquant ☐ Majeur ☐ Mineur | _________________ |
| _________________ | ☐ Bloquant ☐ Majeur ☐ Mineur | _________________ |

### Validation finale

- ☐ Tous les scénarios critiques (🔴) sont réussis
- ☐ Tous les critères fonctionnels (F1-F7) sont validés
- ☐ Tous les critères de qualité (Q1-Q5) sont validés
- ☐ Tous les critères de performance (P1-P4) sont validés
- ☐ Aucun problème bloquant n'a été identifié

**Conclusion** : ☐ Application prête pour le déploiement ☐ Corrections nécessaires

**Signature** : _________________  
**Date** : _________________

---

## Annexes

### Annexe A : Exemples de SMS

#### SMS d'alerte (avec note et GPS)

```
SafeWalk 🫶
Thomas n'a pas encore confirmé qu'il est bien rentré (limite 14:05 + 15 min).
"Soirée chez Paul, retour en métro"
📍 https://maps.google.com/?q=48.8566,2.3522
Tu peux lui passer un petit appel ?
```

#### SMS d'alerte (sans note)

```
SafeWalk 🫶
Thomas n'a pas encore confirmé qu'il est bien rentré (limite 14:05 + 15 min).
📍 https://maps.google.com/?q=48.8566,2.3522
Tu peux lui passer un petit appel ?
```

#### SMS d'alerte (sans GPS)

```
SafeWalk 🫶
Thomas n'a pas encore confirmé qu'il est bien rentré (limite 14:05 + 15 min).
"Soirée chez Paul, retour en métro"
📍 Position indisponible
Tu peux lui passer un petit appel ?
```

#### SMS de relance

```
SafeWalk 🫶
Toujours pas de confirmation de Thomas.
Si tu peux, réessaye de l'appeler 🙏
📍 https://maps.google.com/?q=48.8566,2.3522
```

#### SMS de confirmation

```
SafeWalk ✅
Thomas vient de confirmer que tout va bien 🙂
Désolé pour l'inquiétude !
```

### Annexe B : Commandes utiles

#### Vérifier les logs du serveur

```bash
cd /home/ubuntu/safewalk-app
pnpm dev | grep -E "SMS|triggerAlert|SOS"
```

#### Tester l'API manuellement

```bash
# Test endpoint health
curl https://3000-i8rqllu1a9mlzen76xc6u-b9cd8fd2.us2.manus.computer/api/health

# Test endpoint SOS
curl -X POST https://3000-i8rqllu1a9mlzen76xc6u-b9cd8fd2.us2.manus.computer/api/sos/trigger \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"test","userId":"test","latitude":48.8566,"longitude":2.3522}'
```

#### Réinitialiser les timestamps anti-spam

Si vous devez réinitialiser les timestamps pour retester, redémarrer le serveur :

```bash
# Arrêter le serveur (Ctrl+C)
# Relancer
pnpm dev
```

---

**Fin du plan de test**
