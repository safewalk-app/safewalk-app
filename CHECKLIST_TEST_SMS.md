# Checklist de Test SMS - SafeWalk

**Version** : 1.0  
**Date** : _________________  
**Testeur** : _________________

---

## ✅ Préparation (avant de commencer)

- [ ] Serveur Express en cours d'exécution (`pnpm dev`)
- [ ] URL publique accessible (test avec `/api/health`)
- [ ] Application SafeWalk chargée sur Expo Go
- [ ] 2 smartphones de réception prêts pour recevoir les SMS
- [ ] Contacts d'urgence configurés dans les Paramètres
- [ ] Validation des numéros (coche verte ✓)
- [ ] Crédits Twilio suffisants (minimum 10 SMS)

---

## 🧪 Tests Critiques (obligatoires)

### T1 : SMS d'alerte automatique
- [ ] Session démarrée (5 min)
- [ ] Deadline expirée (timer à 00:00)
- [ ] Notification push "Petit check" reçue
- [ ] Tolérance expirée (15 min)
- [ ] Notification "Oups… on a prévenu" reçue
- [ ] SMS reçu sur Contact 1 (< 60s)
- [ ] SMS reçu sur Contact 2 (< 60s)
- [ ] SMS contient le prénom utilisateur
- [ ] SMS contient l'heure limite
- [ ] SMS contient la note (si saisie)
- [ ] SMS contient le lien Google Maps
- [ ] Lien Google Maps cliquable et correct

**Temps écoulé** : _____ min  
**Statut** : ☐ Réussi ☐ Échoué  
**Commentaires** : _________________

---

### T2 : SMS de relance
- [ ] SMS d'alerte envoyé (T1 réussi)
- [ ] Pas de confirmation "Je vais bien"
- [ ] Attente de 10 minutes
- [ ] SMS de relance reçu sur Contact 1
- [ ] SMS de relance reçu sur Contact 2
- [ ] SMS contient le prénom utilisateur
- [ ] SMS contient le lien Google Maps mis à jour
- [ ] Un seul SMS de relance envoyé (pas de spam)

**Temps écoulé** : _____ min  
**Statut** : ☐ Réussi ☐ Échoué  
**Commentaires** : _________________

---

### T4 : Bouton SOS
- [ ] Session active en cours
- [ ] Bouton "🚨 SOS URGENCE" visible
- [ ] Clic sur le bouton SOS
- [ ] Notification "ALERTE SOS DÉCLENCHÉE" reçue
- [ ] SMS reçu sur Contact 1 (< 30s)
- [ ] SMS reçu sur Contact 2 (< 30s)
- [ ] SMS contient la position GPS actuelle
- [ ] Test spam : 3 clics rapides
- [ ] Un seul SMS envoyé (anti-spam OK)

**Temps écoulé** : _____ min  
**Statut** : ☐ Réussi ☐ Échoué  
**Commentaires** : _________________

---

### T8 : Anti-spam
- [ ] Test SOS : 3 clics rapides
- [ ] Un seul SMS envoyé
- [ ] Logs "SMS bloqué par anti-spam" visibles
- [ ] Attente de 60 secondes
- [ ] Nouveau clic SOS
- [ ] SMS envoyé normalement après 60s

**Temps écoulé** : _____ min  
**Statut** : ☐ Réussi ☐ Échoué  
**Commentaires** : _________________

---

## 🟡 Tests Haute Priorité (recommandés)

### T3 : SMS de confirmation
- [ ] SMS d'alerte envoyé
- [ ] Clic sur "Je vais bien ✅"
- [ ] Message "Session terminée" affiché
- [ ] SMS de confirmation reçu sur Contact 1 (< 60s)
- [ ] SMS de confirmation reçu sur Contact 2 (< 60s)
- [ ] SMS contient le prénom utilisateur
- [ ] Ton rassurant (emoji ✅ et 🙂)

**Temps écoulé** : _____ min  
**Statut** : ☐ Réussi ☐ Échoué  
**Commentaires** : _________________

---

### T5 : Extension de deadline
- [ ] Session démarrée (5 min)
- [ ] Deadline expirée (timer à 00:00)
- [ ] Clic sur "+15 min"
- [ ] Toast "✅ +15 minutes ajoutées" affiché
- [ ] Nouvelle heure limite affichée
- [ ] Aucun SMS envoyé pendant l'extension
- [ ] Attente de la nouvelle deadline
- [ ] SMS d'alerte envoyé à la nouvelle deadline

**Temps écoulé** : _____ min  
**Statut** : ☐ Réussi ☐ Échoué  
**Commentaires** : _________________

---

### T6 : Envoi à 2 contacts
- [ ] 2 contacts configurés dans Paramètres
- [ ] SMS d'alerte déclenché
- [ ] SMS reçu sur Contact 1
- [ ] SMS reçu sur Contact 2
- [ ] SMS reçus simultanément (écart < 10s)
- [ ] Contenu identique sur les 2 téléphones

**Temps écoulé** : _____ min  
**Statut** : ☐ Réussi ☐ Échoué  
**Commentaires** : _________________

---

## 🟢 Tests Moyens (optionnels)

### T7 : SMS avec note
- [ ] Session avec note : "Test note personnalisée"
- [ ] SMS d'alerte déclenché
- [ ] SMS contient la note entre guillemets
- [ ] Note exactement identique à la saisie
- [ ] Test sans note : aucune ligne vide dans le SMS

**Temps écoulé** : _____ min  
**Statut** : ☐ Réussi ☐ Échoué  
**Commentaires** : _________________

---

## 📊 Critères de validation globale

### Fonctionnels
- [ ] F1 : Tous les SMS reçus dans les délais
- [ ] F2 : Contenu des SMS correct (prénom, heure, note, GPS)
- [ ] F3 : SMS envoyés aux 2 contacts
- [ ] F4 : Anti-spam empêche les SMS en double
- [ ] F5 : Bouton SOS fonctionne immédiatement
- [ ] F6 : Extension de deadline reporte l'envoi
- [ ] F7 : SMS de confirmation après "Je vais bien"

### Qualité
- [ ] Q1 : Ton friendly et rassurant
- [ ] Q2 : Liens Google Maps cliquables
- [ ] Q3 : Emojis affichés correctement
- [ ] Q4 : Aucun SMS en double (anti-spam)
- [ ] Q5 : Logs serveur détaillés

### Performance
- [ ] P1 : SMS d'alerte < 60s après deadline
- [ ] P2 : SMS de relance exactement 10 min après
- [ ] P3 : SMS de confirmation < 60s après "Je vais bien"
- [ ] P4 : Bouton SOS < 30s

---

## 🐛 Problèmes rencontrés

| Problème | Gravité | Solution |
|----------|---------|----------|
| _________________ | ☐ Bloquant ☐ Majeur ☐ Mineur | _________________ |
| _________________ | ☐ Bloquant ☐ Majeur ☐ Mineur | _________________ |
| _________________ | ☐ Bloquant ☐ Majeur ☐ Mineur | _________________ |

---

## ✅ Validation finale

- [ ] Tous les tests critiques (🔴) réussis
- [ ] Tous les critères fonctionnels validés
- [ ] Tous les critères de qualité validés
- [ ] Tous les critères de performance validés
- [ ] Aucun problème bloquant

**Conclusion** : ☐ Prêt pour déploiement ☐ Corrections nécessaires

**Signature** : _________________  
**Date** : _________________
