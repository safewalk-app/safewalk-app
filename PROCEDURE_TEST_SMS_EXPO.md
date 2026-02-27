# Procédure de Test SMS depuis Expo - SafeWalk

Cette procédure permet de tester l'envoi de SMS depuis l'application Expo vers Twilio en 5 étapes simples.

---

## ✅ Prérequis

Avant de commencer, assurez-vous que :

1. **Le serveur backend est en cours d'exécution** :

   ```bash
   cd /home/ubuntu/safewalk-app
   pnpm dev
   ```

2. **L'URL publique du backend est accessible** :
   - URL actuelle : `https://3000-i8rqllu1a9mlzen76xc6u-b9cd8fd2.us2.manus.computer`
   - Test : `curl https://3000-i8rqllu1a9mlzen76xc6u-b9cd8fd2.us2.manus.computer/api/sms/health`
   - Résultat attendu : `{"ok":true,"service":"SMS API","twilioConfigured":true}`

3. **Les credentials Twilio sont configurés** :
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_PHONE_NUMBER`

4. **L'application SafeWalk est chargée sur Expo Go** :
   - Scanner le QR code affiché dans le terminal
   - Attendre que l'app se charge complètement

---

## 📋 Procédure de Test en 5 Étapes

### Étape 1 : Vérifier l'URL API dans l'app

**Action** : Ouvrir les logs de l'app Expo dans le terminal

**Commande** :

```bash
# Les logs s'affichent automatiquement dans le terminal où vous avez lancé pnpm dev
```

**Résultat attendu** :

```
✅ API URL depuis EXPO_PUBLIC_API_URL: https://3000-i8rqllu1a9mlzen76xc6u-b9cd8fd2.us2.manus.computer
```

**Si vous voyez un fallback** :

```
⚠️ EXPO_PUBLIC_API_URL non définie, utilisation du fallback: https://...
```

→ Cela signifie que la variable d'environnement n'est pas chargée. Redémarrer le serveur avec `pnpm dev`.

---

### Étape 2 : Configurer un contact d'urgence

**Action** : Dans l'app SafeWalk, aller dans **Paramètres**

1. Remplir le **Prénom** (ex: "Test")
2. Remplir le **Contact 1** :
   - Nom : "Contact Test"
   - Téléphone : Votre numéro de téléphone au format `+33612345678`
3. Vérifier que l'icône ✓ verte apparaît à côté du numéro

**Résultat attendu** :

- Toast "Contact 1 sauvegardé" s'affiche
- Icône ✓ verte visible à droite du champ téléphone

---

### Étape 3 : Tester l'endpoint /api/sms/health

**Action** : Cliquer sur le bouton **"Test SMS"** dans les Paramètres

**Ce qui se passe** :

1. L'app vérifie d'abord la santé de l'API (`/api/sms/health`)
2. Vérifie que Twilio est configuré
3. Si tout est OK, envoie un SMS de test

**Logs attendus dans le terminal** :

```
🔍 [SMS Client] Vérification santé API: https://3000-.../api/sms/health
✅ API SMS OK, envoi du SMS de test...
📤 [SMS Client] Envoi SMS à +33612345678...
🔗 [SMS Client] Endpoint: https://3000-.../api/sms/send
```

**Logs côté serveur** :

```
📤 [SMS] Envoi SMS à +33612345678...
📝 [SMS] Message: Test SafeWalk: Ceci est un SMS de test envoyé...
✅ [SMS] SMS envoyé avec succès (SID: SM...)
```

**Résultat attendu** :

- Toast "✅ SMS envoyé à Contact Test" s'affiche dans l'app
- SMS reçu sur le téléphone dans les 30 secondes

---

### Étape 4 : Vérifier la réception du SMS

**Action** : Vérifier votre téléphone

**Contenu attendu du SMS** :

```
Test SafeWalk: Ceci est un SMS de test envoyé depuis l'app. Tout fonctionne ! 🚀
```

**Expéditeur** : Le numéro Twilio configuré dans `TWILIO_PHONE_NUMBER`

---

### Étape 5 : Tester l'alerte automatique (optionnel)

**Action** : Déclencher une alerte réelle depuis l'app

1. Aller sur l'écran **"Je sors"**
2. Définir une heure limite dans **1 minute**
3. Cliquer sur **"Démarrer"**
4. Attendre que la deadline expire (1 min + 15 min de tolérance)
5. Vérifier que le SMS d'alerte est envoyé

**Logs attendus** :

```
🚨 [triggerAlert] Début de triggerAlert
📤 [SMS] Envoi SMS à +33612345678...
✅ [SMS] SMS envoyé avec succès
```

**SMS attendu** :

```
🚨 Alerte SafeWalk

Salut ! Test n'a pas confirmé son retour à l'heure prévue (HH:MM).

📍 Dernière position connue :
https://www.google.com/maps?q=48.8566,2.3522

Merci de vérifier que tout va bien ! 🙏
```

---

## 🐛 Résolution des Problèmes

### Problème 1 : Toast "❌ API non accessible"

**Cause** : L'app ne peut pas atteindre le backend

**Solutions** :

1. Vérifier que le serveur est en cours d'exécution :

   ```bash
   ps aux | grep "tsx.*server" | grep -v grep
   ```

2. Tester l'URL publique manuellement :

   ```bash
   curl https://3000-i8rqllu1a9mlzen76xc6u-b9cd8fd2.us2.manus.computer/api/sms/health
   ```

3. Vérifier que `EXPO_PUBLIC_API_URL` est bien définie :
   - Redémarrer le serveur avec `pnpm dev`
   - Vérifier les logs au démarrage de l'app

---

### Problème 2 : Toast "❌ Twilio non configuré"

**Cause** : Les credentials Twilio ne sont pas définis

**Solutions** :

1. Vérifier les variables d'environnement :

   ```bash
   # Depuis le terminal, vérifier que les variables sont définies
   # (les valeurs ne seront pas affichées pour des raisons de sécurité)
   ```

2. Vérifier l'endpoint `/api/sms/health` :

   ```bash
   curl https://3000-i8rqllu1a9mlzen76xc6u-b9cd8fd2.us2.manus.computer/api/sms/health
   ```

   Résultat attendu :

   ```json
   {
     "ok": true,
     "service": "SMS API",
     "twilioConfigured": true
   }
   ```

---

### Problème 3 : Toast "❌ Échec: ..."

**Cause** : Erreur Twilio lors de l'envoi du SMS

**Solutions** :

1. Vérifier les logs du serveur pour voir l'erreur exacte :

   ```
   ❌ [SMS] Erreur Twilio: { message: "...", code: 21211, ... }
   ```

2. Erreurs Twilio courantes :
   - **Code 21211** : Numéro de téléphone invalide
     → Vérifier le format du numéro (+33612345678)
   - **Code 21608** : Numéro non vérifié (compte Twilio Trial)
     → Ajouter le numéro dans la liste des numéros vérifiés sur Twilio
   - **Code 20003** : Authentification échouée
     → Vérifier `TWILIO_ACCOUNT_SID` et `TWILIO_AUTH_TOKEN`

3. Tester l'envoi manuellement depuis le backend :
   ```bash
   curl -X POST https://3000-i8rqllu1a9mlzen76xc6u-b9cd8fd2.us2.manus.computer/api/sms/send \
     -H "Content-Type: application/json" \
     -d '{"to":"+33612345678","message":"Test manuel"}'
   ```

---

### Problème 4 : Aucun SMS reçu (mais pas d'erreur)

**Cause** : Le SMS a été envoyé mais pas reçu

**Solutions** :

1. Vérifier le SID du SMS dans les logs :

   ```
   ✅ [SMS] SMS envoyé avec succès (SID: SM...)
   ```

2. Vérifier le statut du SMS sur Twilio Console :
   - Aller sur https://console.twilio.com/us1/monitor/logs/sms
   - Chercher le SID dans les logs
   - Vérifier le statut : `sent`, `delivered`, `failed`, etc.

3. Attendre jusqu'à 2 minutes (délai de livraison)

4. Vérifier que le numéro de téléphone est correct

---

## 📊 Logs de Débogage

### Logs côté App (Expo)

```
🔍 [SMS Client] Vérification santé API: https://3000-.../api/sms/health
✅ API SMS OK, envoi du SMS de test...
📤 [SMS Client] Envoi SMS à +33612345678...
🔗 [SMS Client] Endpoint: https://3000-.../api/sms/send
✅ [SMS Client] SMS envoyé avec succès (SID: SM...)
```

### Logs côté Serveur (Backend)

```
📤 [SMS] Envoi SMS à +33612345678...
📝 [SMS] Message: Test SafeWalk: Ceci est un SMS de test envoyé...
✅ [SMS] SMS envoyé avec succès (SID: SM...)
```

### Logs en cas d'erreur

**App** :

```
❌ [SMS Client] Erreur HTTP 500: {"success":false,"error":"Failed to send SMS","details":{...}}
```

**Serveur** :

```
❌ [SMS] Erreur Twilio: { message: "...", code: 21211, moreInfo: "..." }
```

---

## ✅ Checklist de Validation

- [ ] Serveur backend en cours d'exécution
- [ ] URL publique accessible (`/api/sms/health` retourne `ok: true`)
- [ ] Credentials Twilio configurés (`twilioConfigured: true`)
- [ ] `EXPO_PUBLIC_API_URL` définie et chargée dans l'app
- [ ] Contact d'urgence configuré avec numéro valide
- [ ] Bouton "Test SMS" visible dans Paramètres
- [ ] Clic sur "Test SMS" → Toast "✅ SMS envoyé"
- [ ] SMS reçu sur le téléphone (< 30s)
- [ ] Logs serveur montrent `✅ SMS envoyé avec succès`
- [ ] Logs app montrent `✅ [SMS Client] SMS envoyé avec succès`

---

## 🎯 Résultat Final

Si tous les tests passent, vous devriez avoir :

1. ✅ Un SMS de test reçu sur votre téléphone
2. ✅ Des logs détaillés côté app et serveur
3. ✅ La confirmation que l'app Expo peut envoyer des SMS via le backend

**L'intégration SMS est fonctionnelle !** 🎉

Vous pouvez maintenant tester l'alerte automatique en créant une session avec une deadline courte.
