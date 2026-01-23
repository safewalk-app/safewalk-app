# ✅ Checklist de Test Final - SafeWalk

## 🎯 Objectif
Valider que SafeWalk fonctionne à 100% avec SMS depuis Expo Go.

---

## 📋 Tests à effectuer (dans l'ordre)

### 1. Vérifier l'URL API dans l'app
**Sur téléphone (Expo Go)**
- Ouvrir l'app SafeWalk
- Regarder les logs de la console Metro
- Vérifier que vous voyez : `🔗 [API Client] URL configurée: https://3000-i8rqllu1a9mlzen76xc6u-b9cd8fd2.us2.manus.computer`

**✅ Succès** : L'URL est affichée et commence par `https://`

---

### 2. Tester /health depuis le navigateur
**Sur téléphone (Safari/Chrome)**
- Ouvrir cette URL : `https://3000-i8rqllu1a9mlzen76xc6u-b9cd8fd2.us2.manus.computer/api/sms/health`
- Vérifier la réponse JSON :
  ```json
  {
    "ok": true,
    "service": "SMS API",
    "timestamp": "...",
    "twilioConfigured": true
  }
  ```

**✅ Succès** : `ok: true` et `twilioConfigured: true`

---

### 3. Configurer un contact dans l'app
**Dans Expo Go → SafeWalk → Paramètres**
1. Remplir "Prénom" : Votre prénom
2. Remplir "Contact 1" :
   - Nom : Votre nom ou "Test"
   - Téléphone : Votre numéro au format `+33 6 12 34 56 78`
3. Vérifier que l'icône ✓ verte apparaît à droite du numéro

**✅ Succès** : Icône ✓ verte visible

---

### 4. Test SMS depuis l'app
**Dans Paramètres → Bouton "Test SMS"**
1. Cliquer sur le bouton "Test SMS"
2. Observer le toast qui s'affiche :
   - **Succès** : `✅ SMS envoyé à [nom]`
   - **Erreur** : `❌ Échec: [raison]`
3. Vérifier la réception du SMS dans les 30 secondes
4. Contenu attendu : `Test SafeWalk: Ceci est un SMS de test envoyé depuis l'app. Tout fonctionne ! 🚀`

**✅ Succès** : SMS reçu avec le bon contenu

---

### 5. Déclencher une alerte (test complet)
**Dans l'app → Je sors**
1. Définir heure limite dans **2 minutes**
2. Cliquer "Démarrer"
3. Attendre 2 minutes (ne PAS cliquer sur "Je vais bien")
4. Observer :
   - Notification push : "🚨 Oups... on a prévenu ton contact"
   - SMS reçu par le contact avec position GPS
5. Vérifier le contenu du SMS :
   - Nom de l'utilisateur
   - Heure limite dépassée
   - Lien Google Maps avec position

**✅ Succès** : SMS d'alerte reçu avec toutes les informations

---

## 🐛 En cas d'erreur

### Erreur : "❌ API non accessible"
**Cause** : Le serveur backend n'est pas joignable
**Solution** :
1. Vérifier que le serveur est en cours d'exécution : `pnpm dev`
2. Vérifier l'URL dans les logs : doit être `https://3000-...`
3. Tester /health dans le navigateur

### Erreur : "❌ Twilio non configuré"
**Cause** : Les credentials Twilio ne sont pas définis
**Solution** :
1. Vérifier les variables d'environnement :
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_PHONE_NUMBER`
2. Redémarrer le serveur après configuration

### Erreur : "❌ Numéro invalide"
**Cause** : Le numéro de téléphone n'est pas au bon format
**Solution** :
- Format attendu : `+33 6 12 34 56 78` (avec espaces)
- Commence par `+33` (France) ou autre indicatif pays
- 10 chiffres après l'indicatif

### Erreur : "❌ Échec: [détails Twilio]"
**Cause** : Twilio refuse d'envoyer le SMS
**Solutions possibles** :
1. Vérifier le solde du compte Twilio
2. Vérifier que le numéro destinataire est validé (compte trial)
3. Vérifier que le numéro FROM est bien configuré dans Twilio

---

## 📊 Résumé des résultats

Cochez les tests réussis :

- [ ] 1. URL API affichée dans les logs
- [ ] 2. /health accessible depuis le navigateur
- [ ] 3. Contact configuré avec ✓ verte
- [ ] 4. Test SMS reçu
- [ ] 5. Alerte SMS reçue avec position GPS

**Si tous les tests sont ✅** : SafeWalk est 100% fonctionnel ! 🎉

**Si un test échoue** : Consulter la section "En cas d'erreur" ci-dessus.
