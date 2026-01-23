# Guide d'Utilisation des Tests SMS - SafeWalk

Ce guide vous explique comment utiliser les documents de test pour valider la fonctionnalité d'envoi de SMS de SafeWalk sur des appareils réels.

---

## 📚 Documents disponibles

Le dossier de test contient **3 documents** complémentaires :

### 1. **PLAN_DE_TEST_SMS.md** (Document principal)

Le plan de test détaillé avec toutes les procédures pas-à-pas. Ce document contient :

- Vue d'ensemble des fonctionnalités à tester
- Prérequis et configuration de l'environnement
- 8 scénarios de test détaillés avec procédures complètes
- Critères de validation (fonctionnels, qualité, performance)
- Guide de résolution des problèmes
- Modèle de rapport de test

**Quand l'utiliser** : Pour comprendre le contexte complet des tests et suivre les procédures détaillées.

### 2. **CHECKLIST_TEST_SMS.md** (Checklist imprimable)

Une checklist concise pour suivre l'avancement des tests en temps réel. Ce document contient :

- Cases à cocher pour chaque étape de test
- Espace pour noter les temps écoulés
- Section pour documenter les problèmes rencontrés
- Validation finale avec signature

**Quand l'utiliser** : Pendant l'exécution des tests pour cocher les étapes au fur et à mesure. Peut être imprimé pour faciliter la prise de notes.

### 3. **scripts/test-sms-logs.sh** (Script de logs)

Un script bash qui filtre et colore les logs du serveur pour faciliter le débogage pendant les tests.

**Quand l'utiliser** : Lancer ce script dans un terminal séparé pendant les tests pour voir les logs SMS en temps réel.

---

## 🚀 Démarrage rapide

### Étape 1 : Préparer l'environnement

Avant de commencer les tests, assurez-vous que :

1. **Le serveur Express est en cours d'exécution** :
   ```bash
   cd /home/ubuntu/safewalk-app
   pnpm dev
   ```

2. **L'application SafeWalk est chargée sur Expo Go** :
   - Ouvrir Expo Go sur votre smartphone
   - Scanner le QR code affiché dans le terminal
   - Attendre que l'application se charge

3. **Les contacts d'urgence sont configurés** :
   - Ouvrir SafeWalk > Paramètres
   - Remplir le prénom et les 2 contacts d'urgence
   - Vérifier que les numéros affichent une coche verte ✓

### Étape 2 : Lancer le script de logs (optionnel mais recommandé)

Dans un **terminal séparé**, lancer le script de logs pour voir les événements SMS en temps réel :

```bash
cd /home/ubuntu/safewalk-app
./scripts/test-sms-logs.sh
```

Ce script affichera les logs avec des couleurs :
- 🚨 **Rouge** : Logs d'alerte (triggerAlert)
- 📤 **Vert** : Logs d'envoi SMS
- 🆘 **Jaune** : Logs du bouton SOS
- 🚫 **Bleu** : Logs anti-spam
- 📍 **Bleu** : Logs de position GPS
- ❌ **Rouge** : Erreurs

### Étape 3 : Ouvrir la checklist

Ouvrir le fichier **CHECKLIST_TEST_SMS.md** dans un éditeur de texte ou l'imprimer. Vous allez cocher les cases au fur et à mesure des tests.

### Étape 4 : Suivre les procédures du plan de test

Ouvrir le fichier **PLAN_DE_TEST_SMS.md** et suivre les procédures détaillées pour chaque scénario de test.

**Ordre recommandé** :

1. **T4 : Bouton SOS** (5 min) - Test rapide pour valider que tout fonctionne
2. **T1 : SMS d'alerte automatique** (20 min) - Test critique principal
3. **T3 : SMS de confirmation** (20 min) - Enchaîner après T1
4. **T8 : Anti-spam** (10 min) - Test rapide de sécurité
5. **T2 : SMS de relance** (30 min) - Test long, à faire en dernier

Les tests **T5, T6, T7** sont optionnels et peuvent être faits si le temps le permet.

---

## 📋 Exemple de session de test

Voici un exemple de session de test complète (durée : ~1h30) :

### 09:00 - Préparation
- Lancer le serveur Express
- Charger SafeWalk sur Expo Go
- Configurer les contacts d'urgence
- Lancer le script de logs dans un terminal séparé

### 09:10 - Test T4 (Bouton SOS)
- Démarrer une session de 10 minutes
- Cliquer sur le bouton SOS
- Vérifier la réception des SMS sur les 2 contacts
- Tester le spam (3 clics rapides)
- **Résultat** : ✅ Réussi

### 09:20 - Test T1 (SMS d'alerte automatique)
- Démarrer une session de 5 minutes
- Attendre l'expiration de la deadline (5 min)
- Attendre la fin de la tolérance (15 min)
- Vérifier la réception des SMS d'alerte
- **Résultat** : ✅ Réussi

### 09:45 - Test T3 (SMS de confirmation)
- Reprendre depuis T1
- Cliquer sur "Je vais bien ✅"
- Vérifier la réception des SMS de confirmation
- **Résultat** : ✅ Réussi

### 10:00 - Test T8 (Anti-spam)
- Démarrer une session
- Cliquer 3 fois rapidement sur SOS
- Vérifier qu'un seul SMS est envoyé
- Vérifier les logs "SMS bloqué par anti-spam"
- **Résultat** : ✅ Réussi

### 10:15 - Test T2 (SMS de relance)
- Démarrer une session de 5 minutes
- Attendre l'expiration de la deadline (5 min)
- Attendre la fin de la tolérance (15 min)
- Ne pas confirmer "Je vais bien"
- Attendre 10 minutes supplémentaires
- Vérifier la réception du SMS de relance
- **Résultat** : ✅ Réussi

### 10:45 - Remplir le rapport de test
- Compléter la section "Résultats des scénarios" dans PLAN_DE_TEST_SMS.md
- Documenter les problèmes rencontrés (s'il y en a)
- Valider les critères fonctionnels, qualité et performance
- Signer et dater le rapport

---

## 🐛 Résolution rapide des problèmes

### Problème : Aucun SMS reçu

**Solutions rapides** :

1. Vérifier les variables d'environnement Twilio :
   ```bash
   cat .env | grep TWILIO
   ```

2. Tester l'endpoint SMS manuellement :
   ```bash
   curl -X POST https://3000-i8rqllu1a9mlzen76xc6u-b9cd8fd2.us2.manus.computer/api/sos/trigger \
     -H "Content-Type: application/json" \
     -d '{"sessionId":"test","userId":"test","latitude":48.8566,"longitude":2.3522}'
   ```

3. Vérifier les logs du serveur pour voir les erreurs

### Problème : SMS reçus en double

**Solutions rapides** :

1. Vérifier que les logs affichent "SMS bloqué par anti-spam"
2. Si ce n'est pas le cas, le système anti-spam n'est pas activé
3. Redémarrer le serveur pour réinitialiser les timestamps

### Problème : Position GPS incorrecte

**Solutions rapides** :

1. Vérifier les permissions de localisation dans les Paramètres du smartphone
2. Activer le GPS
3. Tester en extérieur pour un meilleur signal

### Problème : Serveur inaccessible

**Solutions rapides** :

1. Vérifier que le serveur est en cours d'exécution :
   ```bash
   pnpm dev
   ```

2. Tester l'URL publique dans un navigateur :
   ```
   https://3000-i8rqllu1a9mlzen76xc6u-b9cd8fd2.us2.manus.computer/api/health
   ```

---

## 📊 Interprétation des résultats

### Tous les tests critiques réussis ✅

Si tous les tests critiques (T1, T2, T4, T8) sont réussis, l'application est **prête pour le déploiement**.

### Un ou plusieurs tests critiques échoués ❌

Si un test critique échoue, il faut **corriger le problème** avant de déployer. Consulter la section "Résolution des problèmes" dans PLAN_DE_TEST_SMS.md.

### Tests haute priorité échoués ⚠️

Si un test haute priorité (T3, T5, T6) échoue, évaluer la gravité du problème :
- **Bloquant** : Empêche l'utilisation de l'application → Correction obligatoire
- **Majeur** : Fonctionnalité importante mais contournable → Correction recommandée
- **Mineur** : Problème cosmétique ou cas rare → Correction optionnelle

---

## 📞 Support

Si vous rencontrez des problèmes pendant les tests, consultez :

1. **PLAN_DE_TEST_SMS.md** - Section "Résolution des problèmes"
2. **Logs du serveur** - Terminal avec `pnpm dev` ou `./scripts/test-sms-logs.sh`
3. **Tests unitaires** - Exécuter `pnpm test` pour vérifier l'intégrité du code

---

**Bon courage pour les tests ! 🚀**
